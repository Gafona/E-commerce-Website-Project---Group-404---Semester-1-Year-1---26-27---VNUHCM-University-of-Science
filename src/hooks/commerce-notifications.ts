import type { CollectionAfterChangeHook } from "payload"
import { broadcast, excerpt, notifyAdmins, notifyFollowers, notifyUsers, relId, shopNameOf } from "../lib/notifications"

const money = (value: unknown) => `${Number(value ?? 0).toLocaleString("vi-VN")}₫`
const day = (value: unknown) =>
  value ? new Date(String(value)).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : ""

/** Website-wide campaigns reach every visitor; sellers also get a registration invite. */
export const notifyEventChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const status = doc.status as string
  const before = (previousDoc?.status as string | undefined) ?? "draft"
  if (status === before || !["scheduled", "active"].includes(status)) return doc
  const image = relId(doc.campaignImage) || null
  const window = `${day(doc.startDate)} – ${day(doc.endDate)}`
  const summary = excerpt(doc.slogan || doc.description, 120)
  if (before === "draft") {
    await broadcast(req, "all", {
      category: "event",
      kind: status === "active" ? "event-live" : "event-published",
      title: status === "active" ? `${doc.name} đang diễn ra` : `Sự kiện mới: ${doc.name}`,
      message: [summary, window].filter(Boolean).join(" · "),
      href: "/giam-gia",
      image,
      dedupeKey: `event:${doc.id}:published`,
    })
    await broadcast(req, "sellers", {
      category: "event",
      kind: "event-open",
      title: `Mở đăng ký sự kiện: ${doc.name}`,
      message: `Đăng ký sản phẩm của shop để xuất hiện trong chiến dịch ${window}.`,
      href: `/kenh-ban-hang/su-kien/${doc.id}`,
      image,
      dedupeKey: `event:${doc.id}:sellers`,
    })
  } else if (status === "active") {
    await broadcast(req, "all", {
      category: "event",
      kind: "event-live",
      title: `${doc.name} đã bắt đầu`,
      message: [summary, `Kết thúc ${day(doc.endDate)}`].filter(Boolean).join(" · "),
      href: "/giam-gia",
      image,
      dedupeKey: `event:${doc.id}:live`,
    })
  }
  return doc
}

type SaleLine = { id?: string | null; status?: string | null; discountPercent?: number | null; reviewNote?: string | null }

/**
 * Per-product review notifications: BOAI hears about newly submitted products,
 * the shop hears which products were approved or rejected (with the reason),
 * and followers hear when a shop first goes live in an event.
 */
export const notifyRegistrationChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  if (context?.saleCounter) return doc
  const seller = relId(doc.seller)
  const eventId = relId(doc.event)
  const lines = (doc.items ?? []) as SaleLine[]
  const before = new Map(((previousDoc?.items ?? []) as SaleLine[]).map((line) => [String(line.id), line.status]))
  const became = (status: string) =>
    lines.filter((line) => line.status === status && (operation === "create" || before.get(String(line.id)) !== status))
  const submitted = became("pending")
  const approved = became("approved")
  const rejected = became("rejected")
  if (!submitted.length && !approved.length && !rejected.length) return doc
  const event = await req.payload
    .findByID({ collection: "events", id: eventId, depth: 0, overrideAccess: true, select: { name: true, campaignImage: true }, req })
    .catch(() => null)
  const eventName = event?.name ?? "sự kiện"
  const shop = await shopNameOf(req, seller)
  const top = (items: SaleLine[]) => Math.max(0, ...items.map((line) => Number(line.discountPercent ?? 0)))
  if (submitted.length) {
    await notifyAdmins(req, {
      category: "event",
      kind: "admin-registration",
      title: `${shop} gửi ${submitted.length} sản phẩm cho ${eventName}`,
      message: `Giảm đến ${top(submitted)}%. Duyệt từng sản phẩm trong mục Sự kiện.`,
      href: "/quan-tri/su-kien/dang-ky",
      actorName: shop,
    })
  }
  if (approved.length) {
    await notifyUsers(req, [seller], {
      category: "event",
      kind: "registration-approved",
      title: `Đã duyệt ${approved.length} sản phẩm tham gia ${eventName}`,
      message: "Giá sự kiện tự áp dụng trong đúng khung giờ của sự kiện.",
      href: `/kenh-ban-hang/su-kien/${eventId}`,
    })
    const wasLive = ((previousDoc?.items ?? []) as SaleLine[]).some((line) => line.status === "approved")
    if (!wasLive) {
      await notifyFollowers(req, seller, {
        category: "event",
        kind: "follow-event",
        title: `${shop} tham gia ${eventName}`,
        message: `Giảm đến ${top(approved)}% cho sản phẩm của shop.`,
        href: `/cua-hang/${seller}`,
        actorName: shop,
        image: relId(event?.campaignImage) || null,
        dedupeKey: `registration:${doc.id}:approved`,
      })
    }
  }
  if (rejected.length) {
    const reason = rejected.map((line) => line.reviewNote).find(Boolean) || doc.reviewNote
    await notifyUsers(req, [seller], {
      category: "event",
      kind: "registration-rejected",
      title: `${rejected.length} sản phẩm chưa được duyệt cho ${eventName}`,
      message: reason || "Vui lòng điều chỉnh mức giảm hoặc sản phẩm rồi gửi lại.",
      href: `/kenh-ban-hang/su-kien/${eventId}`,
    })
  }
  return doc
}

type HookReq = Parameters<CollectionAfterChangeHook>[0]["req"]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderLike = Record<string, any>

const REFUND_NOTE = "BOAI sẽ hoàn tiền trong 3–5 ngày làm việc."

async function sellersOfOrder(req: HookReq, items: { product?: unknown; seller?: unknown }[] = []) {
  // Lines store their shop; older orders only reference the product.
  const direct = items.map((item) => relId(item.seller)).filter(Boolean)
  const ids = [...new Set(items.filter((item) => !relId(item.seller)).map((item) => relId(item.product)).filter(Boolean))]
  if (!ids.length) return [...new Set(direct)]
  const { docs } = await req.payload.find({
    collection: "products",
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { seller: true },
    req,
  })
  return [...new Set([...direct, ...docs.map((doc) => relId(doc.seller)).filter(Boolean)])]
}

/**
 * Sent once a checkout has created its parent and every child order (the
 * creates themselves run with skipNotifications so a failed checkout is silent).
 */
export async function announceNewOrder(req: HookReq, parent: OrderLike, children: OrderLike[]) {
  const code = `#${parent.code}`
  const count = Number(parent.itemCount ?? 0)
  await notifyUsers(
    req,
    [parent.customer],
    {
      category: "order",
      kind: "order-placed",
      title: `Đặt hàng thành công ${code}`,
      message:
        parent.payment === "online"
          ? `${count} sản phẩm · ${money(parent.total)}. Vui lòng chuyển khoản VietQR theo hướng dẫn trong đơn để hoàn tất.`
          : `${count} sản phẩm · ${money(parent.total)} (gồm phí ship ${money(parent.shipping)}) · thanh toán khi nhận hàng.`,
      href: `/don-hang?ma=${encodeURIComponent(parent.code)}`,
    },
    { pref: "orders" },
  )
  // Shops only hear about transfer orders once BOAI has the money.
  if (parent.payment === "online") return
  for (const child of children) {
    await notifyUsers(
      req,
      [child.seller],
      {
        category: "order",
        kind: "order-new",
        title: child.customRequest ? `Khách đã đặt đơn áo custom #${child.code}` : `Đơn hàng mới #${child.code}`,
        message: child.customRequest
          ? `${child.fullName} · COD ${money(child.total)}. Bạn có thể bắt đầu sản xuất trong mục Đặt may custom.`
          : `${child.fullName} · ${child.itemCount ?? 0} sản phẩm · thu COD ${money(child.total)}. Hãy xác nhận và giao hàng.`,
        href: child.customRequest ? "/kenh-ban-hang/custom-ao?tab=dang-lam" : "/kenh-ban-hang/don-hang?status=pending",
      },
      { pref: "orders" },
    )
  }
}

async function notifyParent(req: HookReq, doc: OrderLike, previousDoc: OrderLike | undefined, context: Record<string, unknown>) {
  const code = `#${doc.code}`
  if (doc.paymentInfo?.claimedAt && !previousDoc?.paymentInfo?.claimedAt) {
    await notifyAdmins(req, {
      category: "order",
      kind: "admin-payment-claimed",
      title: `Khách báo đã chuyển khoản ${code}`,
      message: `${doc.fullName} · ${money(doc.total)}. Kiểm tra tài khoản BOAI rồi xác nhận đã nhận tiền.`,
      href: "/quan-tri/don-hang?tab=cho-thanh-toan",
      actorName: doc.fullName,
    })
  }
  if (previousDoc?.status === "awaiting_payment" && doc.status === "pending") {
    await notifyUsers(
      req,
      [doc.customer],
      {
        category: "order",
        kind: "order-paid",
        title: `BOAI đã nhận thanh toán ${code}`,
        message: `${money(doc.paymentInfo?.paidAmount ?? doc.total)}. Các shop sẽ xác nhận và giao hàng cho bạn.`,
        href: `/don-hang?ma=${encodeURIComponent(doc.code)}`,
      },
      { pref: "orders" },
    )
  }
  // A whole-order cancellation tells the buyer once here (each shop hears from its child order).
  if (doc.status === "cancelled" && previousDoc?.status !== "cancelled" && context?.cancelBatch) {
    const paid = Boolean(doc.paymentInfo?.paidAt)
    await notifyUsers(
      req,
      [doc.customer],
      {
        category: "order",
        kind: "order-cancelled",
        title: `Đơn hàng ${code} đã hủy`,
        message: paid ? REFUND_NOTE : "Đơn hàng không còn hiệu lực.",
        href: `/don-hang?ma=${encodeURIComponent(doc.code)}`,
      },
      { pref: "orders" },
    )
  }
}

async function notifyChild(req: HookReq, doc: OrderLike, previousDoc: OrderLike | undefined, context: Record<string, unknown>) {
  const code = `#${doc.code}`
  const parentCode = String(doc.code ?? "").replace(/-\d+$/, "")
  const href = `/don-hang?ma=${encodeURIComponent(parentCode)}`
  const self = req.user?.collection === "users" ? req.user.id : ""
  const before = previousDoc?.status
  if (before !== doc.status) {
    if (before === "awaiting_payment" && doc.status === "pending") {
      await notifyUsers(
        req,
        [doc.seller],
        {
          category: "order",
          kind: "order-new",
          title: doc.customRequest ? `Đơn áo custom #${doc.code} đã thanh toán` : `Đơn mới #${doc.code} đã được thanh toán`,
          message: `${doc.fullName} · ${doc.itemCount ?? 0} sản phẩm · ${money(doc.subtotal)}. Hãy xác nhận và giao hàng.`,
          href: doc.customRequest ? "/kenh-ban-hang/custom-ao?tab=dang-lam" : "/kenh-ban-hang/don-hang?status=pending",
        },
        { pref: "orders" },
      )
    } else if (doc.status === "shipping") {
      await notifyUsers(
        req,
        [doc.customer],
        { category: "order", kind: "order-shipping", title: `Đơn ${code} đang được giao`, message: `${doc.shopName ?? "Shop"} đã xác nhận và gửi hàng cho bạn.`, href },
        { pref: "orders" },
      )
    } else if (doc.status === "delivered") {
      await notifyUsers(
        req,
        [doc.customer],
        { category: "order", kind: "order-delivered", title: `Đơn ${code} đã giao thành công`, message: "Hãy để lại đánh giá để giúp cộng đồng chọn đồ tốt hơn.", href },
        { pref: "orders" },
      )
    } else if (doc.status === "cancelled") {
      const by = doc.cancellation?.by
      const reason = doc.cancellation?.reason ? `Lý do: ${doc.cancellation.reason}` : ""
      if (by !== "shop") {
        await notifyUsers(
          req,
          [doc.seller],
          {
            category: "order",
            kind: "order-cancelled-seller",
            title: `Đơn ${code} đã bị hủy`,
            message: [by === "admin" ? "BOAI đã hủy đơn này." : "Khách hàng đã hủy đơn.", reason].filter(Boolean).join(" "),
            href: "/kenh-ban-hang/don-hang?status=cancelled",
          },
          { pref: "orders", exclude: [self] },
        )
      }
      if (by !== "customer" && !context?.cancelBatch) {
        await notifyUsers(
          req,
          [doc.customer],
          {
            category: "order",
            kind: "order-cancelled",
            title: `Đơn ${code} (${doc.shopName ?? "shop"}) đã bị hủy`,
            message: [reason, doc.refund?.due ? REFUND_NOTE : ""].filter(Boolean).join(" ") || "Phần đơn của shop này không còn hiệu lực.",
            href,
          },
          { pref: "orders", exclude: [self] },
        )
      }
    }
  }
  if (doc.refund?.due && !previousDoc?.refund?.due) {
    await notifyAdmins(req, {
      category: "order",
      kind: "admin-refund-due",
      title: `Cần hoàn ${money(doc.refund?.amount)} cho đơn ${code}`,
      message: `${doc.fullName} · ${doc.shopName ?? "Shop"}. Hoàn tiền trong 3–5 ngày làm việc rồi đánh dấu đã hoàn.`,
      href: "/quan-tri/doi-soat?tab=hoan-tien",
    })
  }
  if (doc.refund?.refundedAt && !previousDoc?.refund?.refundedAt) {
    await notifyUsers(
      req,
      [doc.customer],
      { category: "order", kind: "order-refunded", title: `BOAI đã hoàn ${money(doc.refund?.amount)} cho đơn ${code}`, message: "Tiền sẽ về tài khoản của bạn theo thời gian xử lý của ngân hàng.", href },
      { pref: "orders" },
    )
  }
  if (doc.payout?.status === "paid" && previousDoc?.payout?.status !== "paid") {
    await notifyUsers(
      req,
      [doc.seller],
      { category: "order", kind: "payout-paid", title: `BOAI đã chi ${money(doc.payout?.amount)} cho đơn ${code}`, message: "Xem chi tiết trong mục Tiền chờ nhận.", href: "/kenh-ban-hang/tien-cho-nhan" },
      { pref: "orders" },
    )
  }
}

/** Orders placed before the parent/child flow keep their simple notifications. */
async function notifyLegacy(req: HookReq, doc: OrderLike, previousDoc: OrderLike | undefined) {
  const code = `#${doc.code}`
  const LEGACY: Record<string, { title: string; message: string }> = {
    shipping: { title: "Đơn hàng đang được giao", message: "Đơn vị vận chuyển đang trên đường tới bạn." },
    delivered: { title: "Đơn hàng đã giao thành công", message: "Hãy để lại đánh giá để giúp cộng đồng chọn đồ tốt hơn." },
    cancelled: { title: "Đơn hàng đã bị hủy", message: "Nếu đã chuyển khoản, shop sẽ liên hệ để hoàn tiền." },
  }
  if (previousDoc && previousDoc.status !== doc.status && LEGACY[doc.status]) {
    const copy = LEGACY[doc.status]
    await notifyUsers(req, [doc.customer], { category: "order", kind: `order-${doc.status}`, title: `${copy.title} ${code}`, message: copy.message, href: "/don-hang" }, { pref: "orders" })
    if (doc.status === "cancelled") {
      await notifyUsers(
        req,
        await sellersOfOrder(req, doc.items),
        { category: "order", kind: "order-cancelled-seller", title: `Đơn hàng ${code} đã bị hủy`, message: doc.fullName, href: "/kenh-ban-hang/don-hang" },
        { pref: "orders", exclude: [req.user?.collection === "users" ? req.user.id : ""] },
      )
    }
  }
  const paidBefore = new Set((previousDoc?.sellerPayments ?? []).filter((p: { status?: string }) => p.status === "paid").map((p: { seller?: unknown }) => relId(p.seller)))
  for (const payment of doc.sellerPayments ?? []) {
    if (payment.status === "paid" && !paidBefore.has(relId(payment.seller))) {
      await notifyUsers(
        req,
        [doc.customer],
        { category: "order", kind: "order-paid", title: `${payment.shopName} đã nhận tiền chuyển khoản`, message: `${money(payment.amount)} cho đơn ${code}.`, href: "/don-hang" },
        { pref: "orders" },
      )
    }
  }
}

export const notifyOrderChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  // New checkouts are announced by announceNewOrder once every order exists.
  if (operation === "create") return doc
  try {
    if (doc.role === "parent") await notifyParent(req, doc, previousDoc, context ?? {})
    else if (doc.role === "child") await notifyChild(req, doc, previousDoc, context ?? {})
    else await notifyLegacy(req, doc, previousDoc)
  } catch (error) {
    console.error("notifyOrderChanges failed", error)
  }
  return doc
}

async function productInfo(req: Parameters<CollectionAfterChangeHook>[0]["req"], id: unknown) {
  return req.payload
    .findByID({ collection: "products", id: relId(id), depth: 0, overrideAccess: true, select: { name: true, slug: true, seller: true, image: true }, req })
    .catch(() => null)
}

export const notifyNewReview: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc
  const product = await productInfo(req, doc.product)
  if (!product) return doc
  await notifyUsers(
    req,
    [product.seller],
    {
      category: "shop",
      kind: "product-review",
      title: `${doc.authorName} đánh giá ${doc.rating} sao`,
      message: `${product.name}: “${excerpt(doc.comment, 80)}”`,
      href: `/san-pham/${product.slug}#danh-gia`,
      actorName: doc.authorName,
      image: relId(product.image) || null,
    },
    { exclude: [doc.author] },
  )
  return doc
}

export const notifyProductComment: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc
  const product = await productInfo(req, doc.product)
  if (!product) return doc
  const href = `/san-pham/${product.slug}#binh-luan`
  let parentAuthor = ""
  if (doc.parent) {
    const parent = await req.payload
      .findByID({ collection: "product-comments", id: relId(doc.parent), depth: 0, overrideAccess: true, select: { author: true }, req })
      .catch(() => null)
    parentAuthor = relId(parent?.author)
    await notifyUsers(
      req,
      [parentAuthor],
      { category: "shop", kind: "product-comment-reply", title: `${doc.isSeller ? "Shop" : doc.authorName} đã trả lời câu hỏi của bạn`, message: `${product.name}: “${excerpt(doc.body, 80)}”`, href, actorName: doc.authorName },
      { pref: "community", exclude: [doc.author] },
    )
  }
  if (!doc.isSeller) {
    await notifyUsers(
      req,
      [product.seller],
      { category: "shop", kind: "product-question", title: `${doc.authorName} hỏi về sản phẩm của bạn`, message: `${product.name}: “${excerpt(doc.body, 80)}”`, href, actorName: doc.authorName },
      { exclude: [doc.author, parentAuthor] },
    )
  }
  return doc
}
