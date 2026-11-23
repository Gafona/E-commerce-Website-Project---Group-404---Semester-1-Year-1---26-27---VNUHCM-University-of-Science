"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { after } from "next/server"
import { getTr } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { appAuth } from "@/lib/app-auth"
import { isAppAdmin } from "@/access/roles"
import { STRINGING_FEE } from "@/lib/vouchers"
import { applyActiveEventPricing } from "@/lib/event-pricing"
import { sellerIdOf } from "@/lib/shop-payouts"
import { resolveProvince } from "@/lib/provinces"
import { toPoint, type ShippingQuoteLine } from "@/lib/shipping"
import { quoteShipping } from "@/lib/shipping-server"
import { missingSize } from "@/lib/product-size"
import { hasOrderAccess, rememberOrderAccess } from "@/lib/order-access"
import { clientIp, hit } from "@/lib/rate-limit"
import { DISCOUNT_ERRORS, discountAmount, lookupDiscountCode } from "@/lib/discount-codes"
import { getPaymentAccount } from "@/lib/payment-settings"
import { cancelChildOrders, createOrderTree, loadOrderTree, restoreStock, type OrderLineInput } from "@/lib/orders-server"
import { isCancellable } from "@/lib/order-flow"
import type { Order } from "@/payload-types"

export type CheckoutItem = { id: string; quantity: number; color?: string; size?: string; stringing?: boolean }
/** Delivery point for shipping: the province is required, exact coordinates are optional. */
export type CheckoutDestination = { province: string; lat?: number | null; lng?: number | null }

export type CheckoutPreview = {
  ok: boolean
  /** True once the delivery province is recognised (fees are available). */
  provinceKnown: boolean
  shops: ShippingQuoteLine[]
  subtotal: number
  shipping: number
  discount: { code: string; percent: number; amount: number } | null
  /** Why a previously applied code no longer works (it was switched off meanwhile). */
  discountError?: string
  total: number
  /** Whether BOAI's VietQR receiving account is set up (bank transfer available). */
  transferReady: boolean
  /** Cart lines for shoes/apparel saved without a size; checkout is blocked until fixed. */
  missingSize: { key: string; slug: string; name: string }[]
}

const clampQuantity = (value: unknown) => Math.max(1, Math.min(20, Math.floor(Number(value) || 1)))

/** Server-side prices for the cart lines (Payload prices and live event offers, never the client's). */
async function priceCart(items: CheckoutItem[]) {
  const list = (Array.isArray(items) ? items : []).slice(0, 50)
  const ids = list.map((i) => String(i?.id ?? "")).filter(Boolean)
  const payload = await getPayloadClient()
  if (!ids.length) return { payload, products: [], list }
  const { docs } = await payload.find({ collection: "products", where: { id: { in: ids } }, depth: 0, limit: 100, overrideAccess: false })
  const products = await applyActiveEventPricing(payload, docs)
  return { payload, products, list }
}

/** Validates a buyer-typed discount code (Áp dụng button). */
export async function checkDiscountAction(raw: string): Promise<{ ok: true; code: string; percent: number } | { ok: false; error: string }> {
  const tr = await getTr()
  if (!hit(`discount-check:${await clientIp()}`, 30, 10 * 60_000).ok)
    return { ok: false, error: tr("Bạn đã thử quá nhiều mã. Vui lòng thử lại sau ít phút.", "Too many attempts. Try again in a few minutes.") }
  if (!String(raw ?? "").trim()) return { ok: false, error: tr("Nhập mã giảm giá trước khi áp dụng.", "Enter a code first.") }
  const result = await lookupDiscountCode(await getPayloadClient(), raw)
  if (!result.ok) return { ok: false, error: tr(...DISCOUNT_ERRORS[result.reason]) }
  return result
}

/**
 * Checkout summary: goods, the automatic shipping fee of every shop (exact
 * when the delivery point is known, province estimate otherwise), the applied
 * discount code and the total to pay.
 */
export async function previewCheckoutAction(
  items: CheckoutItem[],
  destinationInput: CheckoutDestination,
  discountCode?: string,
): Promise<CheckoutPreview> {
  const tr = await getTr()
  const { payload, products, list } = await priceCart(items)
  const province = resolveProvince(destinationInput?.province)
  const point = toPoint(destinationInput?.lat, destinationInput?.lng)
  const groups = new Map<string, number>()
  const missing: CheckoutPreview["missingSize"] = []
  for (const item of list) {
    const product = products.find((p) => String(p.id) === String(item.id))
    if (!product) continue
    if (missingSize(product.category, item.size))
      missing.push({ key: [item.id, item.color, item.size, item.stringing ? "s" : ""].join("|"), slug: product.slug, name: product.name })
    const sellerId = sellerIdOf(product.seller)
    const stringing = !!item.stringing && product.sport === "badminton"
    groups.set(sellerId, (groups.get(sellerId) ?? 0) + (product.price + (stringing ? STRINGING_FEE : 0)) * clampQuantity(item.quantity))
  }
  const subtotal = [...groups.values()].reduce((sum, value) => sum + value, 0)
  const [account, quote, discountResult] = await Promise.all([
    getPaymentAccount(payload),
    province && groups.size
      ? quoteShipping(payload, [...groups.entries()].map(([sellerId, groupSubtotal]) => ({ sellerId, subtotal: groupSubtotal })), { province, point })
      : Promise.resolve(null),
    discountCode ? lookupDiscountCode(payload, discountCode) : Promise.resolve(null),
  ])
  const discount =
    discountResult?.ok ? { code: discountResult.code, percent: discountResult.percent, amount: discountAmount(subtotal, discountResult.percent) } : null
  const shipping = quote ? quote.lines.reduce((sum, line) => sum + line.fee, 0) : 0
  return {
    ok: true,
    provinceKnown: !!province,
    shops: quote?.lines ?? [],
    subtotal,
    shipping,
    discount,
    discountError: discountResult && !discountResult.ok ? tr(...DISCOUNT_ERRORS[discountResult.reason]) : undefined,
    total: Math.max(0, subtotal - (discount?.amount ?? 0)) + shipping,
    transferReady: account.ready,
    missingSize: missing,
  }
}

export type CheckoutState = { ok: boolean; error?: string; code?: string }

export async function placeOrderAction(input: {
  items: CheckoutItem[]
  fullName: string
  phone: string
  email?: string
  address: string
  province: string
  lat?: number | null
  lng?: number | null
  note?: string
  payment: "cod" | "online"
  discountCode?: string
}): Promise<CheckoutState> {
  const tr = await getTr()
  const fullName = String(input?.fullName ?? "").trim().slice(0, 80)
  const phone = String(input?.phone ?? "").replace(/\s/g, "")
  const address = String(input?.address ?? "").trim().slice(0, 300)
  const email = String(input?.email ?? "").trim().slice(0, 120)
  if (!input?.items?.length) return { ok: false, error: tr("Giỏ hàng đang trống.", "Your cart is empty.") }
  if (fullName.length < 2) return { ok: false, error: tr("Vui lòng nhập họ tên người nhận.", "Please enter the recipient's name.") }
  if (!/^0\d{9}$/.test(phone)) return { ok: false, error: tr("Số điện thoại cần 10 chữ số, bắt đầu bằng 0.", "Phone number must be 10 digits starting with 0.") }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: tr("Email không hợp lệ.", "Enter a valid email.") }
  if (address.length < 8) return { ok: false, error: tr("Vui lòng nhập địa chỉ giao hàng đầy đủ.", "Please enter a full delivery address.") }
  const province = resolveProvince(input.province)
  if (!province) return { ok: false, error: tr("Vui lòng chọn tỉnh/thành phố nhận hàng.", "Please choose the delivery province.") }
  // 0% installment needs a card gateway BOAI does not have, so only COD and VietQR are accepted.
  if ((input.payment as string) === "installment")
    return { ok: false, error: tr("Trả góp hiện chưa hỗ trợ. Vui lòng chọn thanh toán khi nhận hàng hoặc chuyển khoản.", "Installments are not available yet. Please choose cash on delivery or bank transfer.") }
  const payment = input.payment === "online" ? "online" : "cod"
  if (!hit(`checkout:${await clientIp()}`, 20, 10 * 60_000).ok)
    return { ok: false, error: tr("Bạn đã đặt quá nhiều đơn trong thời gian ngắn. Vui lòng thử lại sau ít phút.", "Too many orders in a short time. Please try again in a few minutes.") }

  const { payload, products, list } = await priceCart(input.items)
  const user = await appAuth.currentUser()
  if (payment === "online" && !(await getPaymentAccount(payload)).ready)
    return { ok: false, error: tr("BOAI chưa mở nhận chuyển khoản. Vui lòng chọn thanh toán khi nhận hàng.", "BOAI isn't accepting bank transfers yet. Please choose cash on delivery.") }

  // Shoes and apparel cannot be ordered without one of their sizes (old carts may lack it).
  for (const item of list) {
    const product = products.find((d) => String(d.id) === String(item.id))
    if (product && missingSize(product.category, item.size))
      return { ok: false, error: tr(`Vui lòng chọn kích thước cho “${product.name}”.`, `Please choose a size for “${product.name}”.`) }
  }
  const lines: OrderLineInput[] = list.flatMap((item) => {
    const product = products.find((d) => String(d.id) === String(item.id))
    if (!product) return []
    const stringing = !!item.stringing && product.sport === "badminton"
    const extra = stringing ? STRINGING_FEE : 0
    return [{
      product: String(product.id),
      seller: sellerIdOf(product.seller) || undefined,
      name: product.name,
      color: typeof item.color === "string" ? item.color.slice(0, 40) : undefined,
      size: typeof item.size === "string" ? item.size.slice(0, 20) : undefined,
      price: product.price + extra,
      // Price snapshot: later price or event changes never alter this order.
      originalPrice: (product.eventOriginalPrice ?? product.price) + extra,
      eventDiscount: product.eventDiscount ?? undefined,
      eventName: product.eventName ?? undefined,
      eventRegistration: product.eventRegistrationId ? String(product.eventRegistrationId) : undefined,
      eventItemId: product.eventItemId ?? undefined,
      quantity: clampQuantity(item.quantity),
      stringing,
    }]
  })
  if (!lines.length) return { ok: false, error: tr("Sản phẩm trong giỏ không còn tồn tại.", "The products in your cart are no longer available.") }

  // Event offers can be limited to a number of units ("suất").
  const quotaUse = new Map<string, { registrationId: string; itemId: string; quantity: number; left: number; name: string }>()
  for (const line of lines) {
    const product = products.find((d) => String(d.id) === line.product)
    if (!product?.eventRegistrationId || !product.eventItemId) continue
    const key = `${product.eventRegistrationId}:${product.eventItemId}`
    const use = quotaUse.get(key) ?? { registrationId: String(product.eventRegistrationId), itemId: product.eventItemId, quantity: 0, left: product.eventQuotaLeft ?? Infinity, name: product.name }
    use.quantity += line.quantity
    quotaUse.set(key, use)
  }
  for (const use of quotaUse.values()) {
    if (use.quantity > use.left)
      return { ok: false, error: tr(`“${use.name}” chỉ còn ${use.left} suất giá sự kiện. Vui lòng giảm số lượng.`, `Only ${use.left} event-price units of “${use.name}” are left. Please lower the quantity.`) }
  }

  // One code per order, checked again here (it may have been switched off since it was applied).
  let discount: { code: string; percent: number } | null = null
  if (input.discountCode?.trim()) {
    const result = await lookupDiscountCode(payload, input.discountCode)
    if (!result.ok) return { ok: false, error: tr(...DISCOUNT_ERRORS[result.reason]) }
    discount = { code: result.code, percent: result.percent }
  }

  const preorder = lines.some((line) => (products.find((d) => String(d.id) === line.product)?.stock ?? 1) <= 0)
  let code: string
  try {
    const { parent } = await createOrderTree(payload, {
      customer: user ? String(user.id) : null,
      fullName,
      phone,
      email: email || user?.email,
      address: address.toLowerCase().includes(province.name.toLowerCase()) ? address : `${address}, ${province.name}`,
      destination: { province, point: toPoint(input.lat, input.lng) },
      note: String(input.note ?? "").trim().slice(0, 500),
      payment,
      preorder,
      lines,
      discount,
    })
    code = parent.code
  } catch (error) {
    console.error("placeOrderAction: order create failed", error)
    return { ok: false, error: tr("Không thể tạo đơn hàng lúc này. Vui lòng kiểm tra thông tin và thử lại.", "Couldn't create the order right now. Please check your details and try again.") }
  }
  // Count the event-price units this order used (trusted counter write; a hiccup must not fail the checkout).
  const soldByRegistration = new Map<string, Map<string, number>>()
  for (const use of quotaUse.values()) {
    const used = soldByRegistration.get(use.registrationId) ?? new Map<string, number>()
    used.set(use.itemId, (used.get(use.itemId) ?? 0) + use.quantity)
    soldByRegistration.set(use.registrationId, used)
  }
  await Promise.all(
    [...soldByRegistration].map(async ([registrationId, used]) => {
      try {
        const registration = await payload.findByID({ collection: "event-registrations", id: registrationId, depth: 0, overrideAccess: true })
        await payload.update({
          collection: "event-registrations",
          id: registrationId,
          depth: 0,
          overrideAccess: true,
          context: { saleCounter: true },
          data: {
            items: (registration.items ?? []).map((line) => {
              const count = line.id ? used.get(line.id) : undefined
              return count ? { ...line, sold: Number(line.sold ?? 0) + count } : line
            }),
          },
        })
      } catch (error) {
        console.error("placeOrderAction: sale counter update failed", error)
      }
    }),
  )
  // Keep inventory in sync; out-of-stock items stay at 0 as pre-orders.
  await Promise.all(
    lines.map((line) => {
      const product = products.find((d) => String(d.id) === line.product)
      if (!product) return null
      return payload
        .update({ collection: "products", id: product.id, overrideAccess: true, data: { stock: Math.max(0, product.stock - line.quantity) } })
        .catch((error) => console.error("placeOrderAction: stock update failed", error))
    }),
  )
  // The buyer (signed in or not) can reopen this order without putting the phone number in the URL.
  await rememberOrderAccess(code, phone).catch(() => undefined)
  // Stock badges live on prerendered pages; refresh them after responding.
  after(() => revalidatePath("/", "layout"))
  return { ok: true, code }
}

const relKey = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : ""

/** Signed-in owner, or a browser that proved code + phone (stored proof, or the phone given now). */
async function canActOn(order: Order, phone?: string) {
  const user = await appAuth.currentUser()
  return (
    (!!user && relKey(order.customer) === String(user.id)) ||
    (typeof phone === "string" && phone.replace(/\s/g, "") === order.phone) ||
    (await hasOrderAccess(order))
  )
}

const LEGACY_CANCELLABLE = ["pending", "awaiting_payment"] as const

/**
 * Buyer cancellation of a whole order (`childCode` empty) or of one shop's
 * part. Unpaid transfer orders can only be cancelled as a whole; after
 * payment BOAI refunds the cancelled part in 3–5 working days.
 */
export async function cancelOrderAction(code: string, phone?: string, childCode?: string): Promise<{ ok: boolean; error?: string; refund?: boolean }> {
  const tr = await getTr()
  const payload = await getPayloadClient()
  const tree = await loadOrderTree(payload, String(code ?? ""))
  if (!tree || !(await canActOn(tree.order, phone))) return { ok: false, error: tr("Không tìm thấy đơn hàng.", "Order not found.") }
  const { order, children } = tree
  const blockedByProduction = async (list: Order[]) => {
    for (const item of list) {
      if (!item.customRequest) continue
      const request = await payload.findByID({ collection: "custom-jersey-requests", id: relKey(item.customRequest), depth: 0, overrideAccess: true, select: { status: true } }).catch(() => null)
      if (request && (request.status === "in_production" || request.status === "completed")) return true
    }
    return false
  }

  // Orders placed before shop splitting.
  if (!order.role) {
    if (!(LEGACY_CANCELLABLE as readonly string[]).includes(order.status))
      return { ok: false, error: tr("Chỉ hủy được đơn đang chờ xác nhận hoặc chờ thanh toán.", "Only orders awaiting confirmation or payment can be cancelled.") }
    if ((order.sellerPayments ?? []).some((entry) => entry.status === "paid"))
      return { ok: false, error: tr("Đã có shop xác nhận nhận tiền. Hãy chat với shop để hủy và được hoàn tiền.", "A shop has already received your payment. Please chat with the shop to cancel and get a refund.") }
    if (await blockedByProduction([order]))
      return { ok: false, error: tr("Shop đã bắt đầu may áo. Hãy nhắn tin với shop để thỏa thuận hủy.", "The shop has started production. Please message the shop to agree on a cancellation.") }
    const result = await payload.update({
      collection: "orders",
      where: { and: [{ id: { equals: order.id } }, { status: { in: [...LEGACY_CANCELLABLE] } }] },
      overrideAccess: true,
      data: { status: "cancelled", cancellation: { by: "customer", at: new Date().toISOString() } },
    })
    if (!result.docs.length) return { ok: false, error: tr("Đơn hàng đã được cập nhật, vui lòng tải lại trang.", "The order has changed, please reload the page.") }
    await restoreStock(payload, order.items)
    after(() => revalidatePath("/", "layout"))
    return { ok: true }
  }

  const targets = childCode ? children.filter((child) => child.code === String(childCode).trim().toUpperCase()) : children
  if (childCode && !targets.length) return { ok: false, error: tr("Không tìm thấy phần đơn của shop này.", "That shop's part of the order wasn't found.") }
  if (order.status === "awaiting_payment") {
    if (childCode) return { ok: false, error: tr("Đơn chưa thanh toán chỉ có thể hủy toàn bộ.", "An unpaid order can only be cancelled as a whole.") }
    if (order.paymentInfo?.claimedAt)
      return { ok: false, error: tr("Bạn đã báo chuyển khoản. Vui lòng liên hệ hotline BOAI để hủy và được hoàn tiền nếu tiền đã đến.", "You reported a transfer. Please call BOAI's hotline to cancel and get a refund if the money arrived.") }
  }
  const cancellable = targets.filter((child) => isCancellable(child.status))
  if (!cancellable.length)
    return { ok: false, error: tr("Phần đơn này đã được giao cho đơn vị vận chuyển nên không thể hủy.", "This part has already been handed to the courier and can't be cancelled.") }
  if (!childCode && cancellable.length !== children.filter((child) => child.status !== "cancelled").length)
    return { ok: false, error: tr("Một phần đơn đã được giao đi. Bạn chỉ có thể hủy phần của shop chưa giao.", "Part of the order has shipped. You can only cancel the shops that haven't shipped.") }
  if (await blockedByProduction(cancellable))
    return { ok: false, error: tr("Shop đã bắt đầu may áo. Hãy nhắn tin với shop để thỏa thuận hủy.", "The shop has started production. Please message the shop to agree on a cancellation.") }
  const changed = await cancelChildOrders(payload, { parent: order, children: cancellable, by: "customer", batch: !childCode })
  if (!changed) return { ok: false, error: tr("Đơn hàng đã được cập nhật, vui lòng tải lại trang.", "The order has changed, please reload the page.") }
  after(() => revalidatePath("/", "layout"))
  return { ok: true, refund: order.payment === "online" && !!order.paymentInfo?.paidAt }
}

/** "Tôi đã chuyển khoản": tells BOAI to check its account for this order's transfer. */
export async function claimTransferAction(code: string): Promise<{ ok: boolean; error?: string }> {
  const tr = await getTr()
  if (!hit(`claim-transfer:${await clientIp()}`, 10, 10 * 60_000).ok)
    return { ok: false, error: tr("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", "Too many attempts. Try again in a few minutes.") }
  const payload = await getPayloadClient()
  const tree = await loadOrderTree(payload, String(code ?? ""))
  if (!tree || !(await canActOn(tree.order))) return { ok: false, error: tr("Không tìm thấy đơn hàng.", "Order not found.") }
  const { order } = tree
  if (order.role !== "parent" || order.payment !== "online") return { ok: false, error: tr("Đơn này không thanh toán bằng chuyển khoản.", "This order isn't paid by bank transfer.") }
  if (order.status !== "awaiting_payment") return { ok: false, error: tr("Đơn hàng đã được xác nhận thanh toán hoặc đã hủy.", "This order is already paid or cancelled.") }
  if (order.paymentInfo?.claimedAt) return { ok: true }
  await payload.update({
    collection: "orders",
    where: { and: [{ id: { equals: order.id } }, { status: { equals: "awaiting_payment" } }] },
    overrideAccess: true,
    depth: 0,
    data: { paymentInfo: { ...(order.paymentInfo ?? {}), claimedAt: new Date().toISOString() } },
  })
  return { ok: true }
}

/**
 * Guest order lookup (POST). Rate limited per IP and per code; every wrong
 * combination gets the same answer. On success the browser keeps a hashed
 * proof and the URL only carries the order code.
 */
export async function lookupOrderAction(formData: FormData): Promise<void> {
  const code = String(formData.get("ma") ?? "").trim().toUpperCase().slice(0, 44)
  const phone = String(formData.get("sdt") ?? "").replace(/\s/g, "").slice(0, 15)
  if (!code || !phone) redirect("/don-hang?tra-cuu=thieu")
  const ip = await clientIp()
  if (!hit(`lookup-ip:${ip}`, 10, 15 * 60_000).ok || !hit(`lookup-code:${code}`, 5, 15 * 60_000).ok) redirect("/don-hang?tra-cuu=cho")
  const payload = await getPayloadClient()
  const tree = await loadOrderTree(payload, code)
  if (!tree || tree.order.phone !== phone) redirect("/don-hang?tra-cuu=khong-thay")
  await rememberOrderAccess(tree.order.code, tree.order.phone)
  redirect(`/don-hang?ma=${encodeURIComponent(tree.order.code)}`)
}

export type ReviewState = { ok: boolean; error?: string; message?: string }

export async function submitReviewAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: (await getTr())("Vui lòng đăng nhập để đánh giá.", "Please sign in to leave a review.") }
  const productId = String(formData.get("productId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const rating = Math.round(Number(formData.get("rating")))
  const comment = String(formData.get("comment") ?? "").trim()
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: (await getTr())("Hãy chọn số sao.", "Please choose a star rating.") }
  if (comment.length < 10) return { ok: false, error: (await getTr())("Nhận xét cần ít nhất 10 ký tự.", "Your comment needs at least 10 characters.") }

  const payload = await getPayloadClient()
  const bought = await payload.count({
    collection: "orders",
    overrideAccess: true,
    where: { and: [{ customer: { equals: user.id } }, { "items.product": { equals: productId } }, { status: { not_in: ["cancelled", "awaiting_payment"] } }] },
  })
  const existing = await payload.find({
    collection: "reviews",
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { and: [{ author: { equals: user.id } }, { product: { equals: productId } }] },
  })
  const data = { product: productId, author: user.id, authorName: user.name, rating, comment, level: user.level ?? undefined, verifiedPurchase: bought.totalDocs > 0 }
  if (existing.docs[0]) await payload.update({ collection: "reviews", id: existing.docs[0].id, overrideAccess: true, data })
  else await payload.create({ collection: "reviews", overrideAccess: true, data })
  revalidatePath(`/san-pham/${slug}`)
  return { ok: true, message: existing.docs[0] ? (await getTr())("Đã cập nhật đánh giá của bạn.", "Your review has been updated.") : (await getTr())("Cảm ơn bạn đã đánh giá!", "Thanks for your review!") }
}

export type ProfileState = { ok: boolean; error?: string; message?: string }

type DeliveryAddressInput = {
  id?: string
  label: string
  recipientName: string
  phone: string
  addressLine: string
  ward?: string
  district: string
  province: string
  lat?: number | null
  lng?: number | null
  isDefault?: boolean
}

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: tr("Bạn cần đăng nhập.", "You need to sign in.") }
  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  if (name.length < 2) return { ok: false, error: tr("Họ tên quá ngắn.", "Name is too short.") }
  if (phone && !/^\d{9,12}$/.test(phone.replace(/\D/g, ""))) {
    return { ok: false, error: tr("Số điện thoại chưa hợp lệ.", "The phone number is invalid.") }
  }

  let input: DeliveryAddressInput[] = []
  try {
    const parsed: unknown = JSON.parse(String(formData.get("addresses") ?? "[]"))
    if (!Array.isArray(parsed) || parsed.length > 8) throw new Error()
    input = parsed as DeliveryAddressInput[]
  } catch {
    return { ok: false, error: tr("Danh sách địa chỉ chưa hợp lệ.", "The address list is invalid.") }
  }

  const addresses = input.map((item) => ({
    ...(typeof item.id === "string" && item.id ? { id: item.id } : {}),
    label: String(item.label ?? "").trim(),
    recipientName: String(item.recipientName ?? "").trim(),
    phone: String(item.phone ?? "").trim(),
    addressLine: String(item.addressLine ?? "").trim(),
    ward: String(item.ward ?? "").trim(),
    district: String(item.district ?? "").trim(),
    province: String(item.province ?? "").trim(),
    // Exact point from the address search; dropped when it falls outside Vietnam.
    lat: toPoint(item.lat, item.lng)?.lat ?? null,
    lng: toPoint(item.lat, item.lng)?.lng ?? null,
    isDefault: Boolean(item.isDefault),
  }))
  if (addresses.some((item) => !item.label || !item.recipientName || !item.phone || !item.addressLine || !item.district || !item.province)) {
    return { ok: false, error: tr("Vui lòng điền đủ thông tin bắt buộc của từng địa chỉ.", "Please complete every required address field.") }
  }
  // Shipping fees depend on the province, so it must be one we recognise.
  for (const item of addresses) {
    const province = resolveProvince(item.province)
    if (!province) return { ok: false, error: tr("Vui lòng chọn tỉnh/thành phố từ danh sách cho từng địa chỉ.", "Please choose each address's province from the list.") }
    item.province = province.name
  }
  if (addresses.some((item) => !/^\d{9,12}$/.test(item.phone.replace(/\D/g, "")))) {
    return { ok: false, error: tr("Số điện thoại người nhận chưa hợp lệ.", "A recipient phone number is invalid.") }
  }
  if (addresses.length && !addresses.some((item) => item.isDefault)) addresses[0].isDefault = true
  let foundDefault = false
  for (const item of addresses) {
    if (item.isDefault && !foundDefault) foundDefault = true
    else if (item.isDefault) item.isDefault = false
  }

  const payload = await getPayloadClient()
  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: false,
    user,
    data: {
      name,
      phone,
      addresses,
    },
  })
  revalidatePath("/tai-khoan")
  return { ok: true, message: tr("Đã lưu thông tin và địa chỉ giao hàng.", "Your details and delivery addresses have been saved.") }
}

export type DeleteReviewResult = { ok: true } | { ok: false; error: string }

/** Moderators may delete any review; customers may delete their own. */
export async function deleteReviewAction(id: string): Promise<DeleteReviewResult> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập.", "Please sign in.") }
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: tr("Yêu cầu không hợp lệ.", "Invalid request.") }
  try {
    const payload = await getPayloadClient()
    if (isAppAdmin(user)) {
      await payload.delete({ collection: "reviews", id, overrideAccess: false, user })
    } else {
      const review = await payload.findByID({ collection: "reviews", id, depth: 0, overrideAccess: true })
      const author = typeof review.author === "object" ? review.author.id : review.author
      if (String(author) !== String(user.id)) return { ok: false, error: tr("Bạn không thể xóa đánh giá này.", "You cannot delete this review.") }
      await payload.delete({ collection: "reviews", id, overrideAccess: true })
    }
    return { ok: true }
  } catch {
    return { ok: false, error: tr("Không thể xóa đánh giá.", "Could not delete the review.") }
  }
}
