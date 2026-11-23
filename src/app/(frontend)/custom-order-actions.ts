"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { appAuth } from "@/lib/app-auth"
import { getTr } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { resolveProvince } from "@/lib/provinces"
import { quoteShipping } from "@/lib/shipping-server"
import { rememberOrderAccess } from "@/lib/order-access"
import { toPoint, type ShippingQuoteLine } from "@/lib/shipping"
import { getPaymentAccount } from "@/lib/payment-settings"
import { createOrderTree } from "@/lib/orders-server"
import type { CustomJerseyRequest } from "@/payload-types"
import type { CheckoutDestination } from "./shop-actions"

/** What the checkout page shows for an accepted custom-jersey quote. */
export type CustomCheckout = {
  id: string
  code: string
  designName: string
  shopId: string
  shopName: string
  quantity: number
  unitPrice: number
  total: number
  jerseySize: string
  pants: boolean
  contactName: string
  contactPhone: string
}

export type CustomCheckoutPreview = {
  ok: boolean
  provinceKnown: boolean
  /** Automatic shipping line for the making shop. */
  shop: ShippingQuoteLine | null
  /** Whether BOAI's VietQR receiving account is set up. */
  transferReady: boolean
}

type Fail = { ok: false; error: string }
const idOf = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")

async function ownAcceptedRequest(requestId: string) {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { error: tr("Vui lòng đăng nhập để đặt đơn.", "Please sign in to place the order.") } as const
  if (typeof requestId !== "string" || !/^[\w-]{1,64}$/.test(requestId)) return { error: tr("Yêu cầu không hợp lệ.", "Invalid request.") } as const
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    where: { and: [{ id: { equals: requestId } }, { customer: { equals: user.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const request = docs[0]
  if (!request) return { error: tr("Không tìm thấy yêu cầu may áo.", "Custom request not found.") } as const
  if (request.status !== "accepted" || !request.quotePrice)
    return { error: tr("Chỉ đặt đơn được sau khi bạn chấp nhận báo giá của shop.", "You can order only after accepting the shop's quote.") } as const
  const orderId = idOf(request.order)
  if (orderId) {
    const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true, select: { status: true, code: true } }).catch(() => null)
    if (order && order.status !== "cancelled")
      return { error: tr(`Yêu cầu này đã có đơn ${order.code}.`, `This request already has order ${order.code}.`), orderCode: order.code } as const
  }
  return { user, payload, request }
}

const toView = (request: CustomJerseyRequest): CustomCheckout => ({
  id: String(request.id),
  code: request.code ?? "",
  designName: request.designName,
  shopId: idOf(request.shop),
  shopName: request.shopName ?? "Shop",
  quantity: request.quantity,
  unitPrice: request.quotePrice ?? 0,
  total: (request.quotePrice ?? 0) * request.quantity,
  jerseySize: request.jerseySize,
  pants: Boolean((request.art as { pants?: { enabled?: boolean } } | null)?.pants?.enabled),
  contactName: request.contactName,
  contactPhone: request.contactPhone,
})

export async function getCustomCheckoutAction(requestId: string): Promise<{ ok: true; request: CustomCheckout } | (Fail & { orderCode?: string })> {
  const found = await ownAcceptedRequest(requestId)
  if ("error" in found) return { ok: false, error: found.error!, orderCode: "orderCode" in found ? found.orderCode : undefined }
  return { ok: true, request: toView(found.request) }
}

export async function previewCustomCheckoutAction(requestId: string, destination: CheckoutDestination): Promise<CustomCheckoutPreview> {
  const found = await ownAcceptedRequest(requestId)
  if ("error" in found) return { ok: false, provinceKnown: false, shop: null, transferReady: false }
  const view = toView(found.request)
  const province = resolveProvince(destination?.province)
  const account = await getPaymentAccount(found.payload)
  if (!province) return { ok: true, provinceKnown: false, shop: null, transferReady: account.ready }
  const quote = await quoteShipping(found.payload, [{ sellerId: view.shopId, subtotal: view.total }], {
    province,
    point: toPoint(destination?.lat, destination?.lng),
  })
  return { ok: true, provinceKnown: true, shop: quote.lines[0] ?? null, transferReady: account.ready }
}

/**
 * Turns an accepted quote into a real order (COD or VietQR to BOAI): a parent
 * order plus the making shop's child order with automatic shipping. The shop
 * already agreed to make it; production status stays on the linked request.
 */
export async function placeCustomOrderAction(input: {
  requestId: string
  fullName: string
  phone: string
  email?: string
  address: string
  province: string
  lat?: number | null
  lng?: number | null
  note?: string
  payment: "cod" | "online"
}): Promise<{ ok: boolean; error?: string; code?: string }> {
  const tr = await getTr()
  const fullName = String(input?.fullName ?? "").trim().slice(0, 80)
  const phone = String(input?.phone ?? "").replace(/\s/g, "")
  const address = String(input?.address ?? "").trim().slice(0, 300)
  if (fullName.length < 2) return { ok: false, error: tr("Vui lòng nhập họ tên người nhận.", "Please enter the recipient's name.") }
  if (!/^0\d{9}$/.test(phone)) return { ok: false, error: tr("Số điện thoại cần 10 chữ số, bắt đầu bằng 0.", "Phone number must be 10 digits starting with 0.") }
  if (address.length < 8) return { ok: false, error: tr("Vui lòng nhập địa chỉ giao hàng đầy đủ.", "Please enter a full delivery address.") }
  const province = resolveProvince(input?.province)
  if (!province) return { ok: false, error: tr("Vui lòng chọn tỉnh/thành phố nhận hàng.", "Please choose the delivery province.") }
  const payment = input?.payment === "online" ? "online" : "cod"

  const found = await ownAcceptedRequest(input?.requestId)
  if ("error" in found) return { ok: false, error: found.error }
  const { user, payload, request } = found
  const view = toView(request)
  if (payment === "online" && !(await getPaymentAccount(payload)).ready)
    return { ok: false, error: tr("BOAI chưa mở nhận chuyển khoản. Vui lòng chọn thanh toán khi nhận hàng.", "BOAI isn't accepting bank transfers yet. Please choose cash on delivery.") }
  let code: string
  let childId: string
  try {
    const { parent, children } = await createOrderTree(payload, {
      customer: String(user.id),
      fullName,
      phone,
      email: String(input?.email ?? "").trim().slice(0, 120) || user.email,
      address: address.toLowerCase().includes(province.name.toLowerCase()) ? address : `${address}, ${province.name}`,
      destination: { province, point: toPoint(input?.lat, input?.lng) },
      note: String(input?.note ?? "").trim().slice(0, 500),
      payment,
      lines: [
        {
          seller: view.shopId,
          name: `Áo custom “${view.designName}” · #${view.code}${view.pants ? " (bộ áo + quần)" : ""}`,
          size: view.jerseySize,
          price: view.unitPrice,
          quantity: view.quantity,
        },
      ],
      customRequest: view.id,
    })
    code = parent.code
    childId = String(children[0].id)
  } catch (error) {
    console.error("placeCustomOrderAction: order create failed", error)
    return { ok: false, error: tr("Không thể tạo đơn hàng lúc này. Vui lòng thử lại.", "Couldn't create the order right now. Please try again.") }
  }
  // The request follows the making shop's own order (its status drives delivery).
  await payload.update({
    collection: "custom-jersey-requests",
    id: view.id,
    overrideAccess: true,
    context: { customActor: "system", skipCustomNotify: true },
    data: { order: childId },
  })
  await rememberOrderAccess(code, phone).catch(() => undefined)
  after(() => {
    revalidatePath("/kenh-ban-hang", "layout")
  })
  return { ok: true, code }
}
