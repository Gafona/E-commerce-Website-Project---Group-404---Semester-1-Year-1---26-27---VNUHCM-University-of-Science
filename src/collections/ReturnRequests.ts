import type {
  Access,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
  Where,
} from "payload"
import { APIError } from "payload"
import { isStaff } from "../access/roles"
import { notifyUsers, relId } from "../lib/notifications"
import {
  RETURN_REASONS,
  RETURN_SELLER_TRANSITIONS,
  RETURN_STATUSES,
  RETURN_STATUS_LABELS,
  RETURN_TYPES,
  canRequestReturn,
  type ReturnStatus,
} from "../lib/returns"

const userId = (user: unknown) =>
  user && typeof user === "object" && (user as { collection?: string }).collection === "users"
    ? String((user as { id: string | number }).id)
    : ""

const fail = (message: string, status = 400): never => {
  throw new APIError(message, status, null, true)
}

const parties: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const id = userId(req.user)
  if (!id) return false
  const where: Where = { or: [{ customer: { equals: id } }, { seller: { equals: id } }] }
  return where
}
const serverOnly: FieldAccess = () => false
const sellerOrStaff: FieldAccess = ({ req, doc }) => isStaff(req.user) || (!!userId(req.user) && relId(doc?.seller) === userId(req.user))

type LineInput = { lineId?: string; quantity?: number }

const validateReturn: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const me = userId(req.user)
  if (operation === "create") {
    if (isStaff(req.user) && !me) return data
    if (!me) fail("Vui lòng đăng nhập để yêu cầu đổi trả.", 401)
    const order = await req.payload
      .findByID({ collection: "orders", id: relId(data.order), depth: 0, overrideAccess: true, req })
      .catch(() => null)
    if (!order || relId(order.customer) !== me) fail("Không tìm thấy đơn hàng của bạn.", 404)
    if (!canRequestReturn(order!)) fail("Đơn hàng đã quá hạn đổi trả 30 ngày hoặc chưa giao thành công.")
    const sellerId = relId(data.seller)
    if (!sellerId) fail("Sản phẩm do BOAI bán: vui lòng liên hệ hotline để đổi trả.")
    const requested = (Array.isArray(data.items) ? (data.items as LineInput[]) : []).filter((row) => row?.lineId)
    if (!requested.length) fail("Hãy chọn ít nhất một sản phẩm cần đổi trả.")
    // Quantities already in open or finished requests cannot be claimed twice.
    const previous = await req.payload.find({
      collection: "return-requests",
      where: { and: [{ order: { equals: order!.id } }, { status: { not_in: ["rejected", "cancelled"] } }] },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const claimed = new Map<string, number>()
    for (const doc of previous.docs) for (const row of doc.items ?? []) claimed.set(row.lineId, (claimed.get(row.lineId) ?? 0) + Number(row.quantity ?? 0))
    const products = new Map<string, string>()
    const productIds = [...new Set((order!.items ?? []).map((item) => relId(item.product)).filter(Boolean))]
    if (productIds.length) {
      const { docs } = await req.payload.find({
        collection: "products",
        where: { id: { in: productIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        select: { seller: true },
        req,
      })
      for (const product of docs) products.set(String(product.id), relId(product.seller))
    }
    const lines = requested.map((row) => {
      const item = (order!.items ?? []).find((entry) => entry.id === row.lineId)
      if (!item) return fail("Sản phẩm không thuộc đơn hàng này.")
      const owner = relId(item.seller) || products.get(relId(item.product)) || ""
      if (owner !== sellerId) return fail("Mỗi yêu cầu chỉ gồm sản phẩm của một shop.")
      const left = Number(item.quantity) - (claimed.get(item.id!) ?? 0)
      const quantity = Math.floor(Number(row.quantity))
      if (!(quantity >= 1 && quantity <= left)) return fail(`Số lượng đổi trả “${item.name}” không hợp lệ.`)
      return {
        lineId: item.id!,
        product: relId(item.product) || null,
        name: item.name,
        size: item.size ?? null,
        color: item.color ?? null,
        price: item.price,
        quantity,
      }
    })
    const shop = await req.payload
      .findByID({ collection: "users", id: sellerId, depth: 0, overrideAccess: true, select: { name: true, seller: { shopName: true } }, req })
      .catch(() => null)
    const photos = Array.isArray(data.photos) ? data.photos.map(relId).filter(Boolean).slice(0, 5) : []
    for (const photo of photos) {
      const media = await req.payload.findByID({ collection: "media", id: photo, depth: 0, overrideAccess: true, req }).catch(() => null)
      if (!media || relId(media.communityOwner) !== me || !media.mimeType?.startsWith("image/")) fail("Ảnh minh chứng không hợp lệ.")
    }
    if (!RETURN_REASONS.includes(data.reason)) fail("Hãy chọn lý do đổi trả.")
    if (!RETURN_TYPES.includes(data.type)) data.type = "return"
    const description = typeof data.description === "string" ? data.description.replace(/\r\n/g, "\n").trim().slice(0, 1000) : ""
    if (description.length < 10) fail("Mô tả tình trạng cần ít nhất 10 ký tự.")
    return {
      ...data,
      code: `RT${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
      order: order!.id,
      orderCode: order!.code,
      customer: me,
      customerName: order!.fullName,
      seller: sellerId,
      shopName: shop?.seller?.shopName?.trim() || shop?.name || "Shop",
      items: lines,
      photos,
      description,
      status: "requested",
      sellerNote: null,
    }
  }
  // Updates: staff anything; seller one step at a time; customer may only withdraw a waiting request.
  if (isStaff(req.user) || !me) return data
  const from = originalDoc?.status as ReturnStatus
  const to = (data.status ?? from) as ReturnStatus
  if (to === from) return data
  if (relId(originalDoc?.seller) === me && RETURN_SELLER_TRANSITIONS[from]?.includes(to)) {
    if (to === "rejected" && !(typeof data.sellerNote === "string" && data.sellerNote.trim().length >= 5))
      fail("Nhập lý do từ chối để khách hiểu (ít nhất 5 ký tự).")
    return data
  }
  if (relId(originalDoc?.customer) === me && from === "requested" && to === "cancelled") return data
  return fail("Không thể chuyển yêu cầu đổi trả sang trạng thái này.", 403)
}

type HistoryRow = { status: ReturnStatus; at: string; note?: string | null }

const stampHistory: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  const now = new Date().toISOString()
  if (operation === "create") {
    data.history = [{ status: "requested", at: now }]
    return data
  }
  if (data.status && data.status !== originalDoc?.status) {
    const history = [...((originalDoc?.history as HistoryRow[] | undefined) ?? [])]
    history.push({ status: data.status, at: now, note: typeof data.sellerNote === "string" ? data.sellerNote.slice(0, 200) : null })
    data.history = history.slice(-20)
    if (["completed", "rejected", "cancelled"].includes(data.status)) data.resolvedAt = now
  }
  return data
}

const notifyReturn: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const label = `#${doc.code}`
  if (operation === "create") {
    await notifyUsers(
      req,
      [doc.seller],
      {
        category: "order",
        kind: "return-new",
        title: `Yêu cầu đổi trả mới ${label}`,
        message: `Đơn ${doc.orderCode} · ${(doc.items ?? []).length} sản phẩm · ${doc.customerName ?? ""}`,
        href: "/kenh-ban-hang/doi-tra",
      },
      { pref: "orders" },
    )
    return doc
  }
  if (previousDoc?.status === doc.status) return doc
  const status = RETURN_STATUS_LABELS[doc.status as ReturnStatus]
  if (doc.status === "cancelled") {
    await notifyUsers(req, [doc.seller], { category: "order", kind: "return-cancelled", title: `Khách đã hủy yêu cầu đổi trả ${label}`, message: `Đơn ${doc.orderCode}`, href: "/kenh-ban-hang/doi-tra" }, { pref: "orders" })
    return doc
  }
  const messages: Partial<Record<ReturnStatus, string>> = {
    approved: "Shop đã chấp nhận. Vui lòng đóng gói và gửi sản phẩm về shop theo hướng dẫn.",
    rejected: doc.sellerNote || "Shop không chấp nhận yêu cầu này.",
    received: "Shop đã nhận lại sản phẩm và đang hoàn tất xử lý.",
    completed: doc.type === "exchange" ? "Shop đã gửi sản phẩm đổi cho bạn." : "Shop đã hoàn tiền cho bạn.",
  }
  await notifyUsers(
    req,
    [doc.customer],
    {
      category: "order",
      kind: `return-${doc.status}`,
      title: `Đổi trả ${label}: ${status?.vi ?? doc.status}`,
      message: [messages[doc.status as ReturnStatus], doc.sellerNote && doc.status !== "rejected" ? doc.sellerNote : null].filter(Boolean).join(" · "),
      href: `/don-hang?ma=${encodeURIComponent(doc.orderCode)}`,
    },
    { pref: "orders" },
  )
  return doc
}

export const ReturnRequests: CollectionConfig = {
  slug: "return-requests",
  labels: { singular: "Yêu cầu đổi trả", plural: "Đổi trả" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "code",
    defaultColumns: ["code", "orderCode", "shopName", "status", "createdAt"],
  },
  access: {
    create: ({ req }) => Boolean(userId(req.user)) || isStaff(req.user),
    read: parties,
    update: parties,
    delete: ({ req }) => isStaff(req.user),
  },
  hooks: { beforeValidate: [validateReturn], beforeChange: [stampHistory], afterChange: [notifyReturn] },
  fields: [
    { name: "code", type: "text", index: true, access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
    { name: "order", type: "relationship", relationTo: "orders", required: true, index: true, access: { update: serverOnly } },
    { name: "orderCode", type: "text", access: { create: serverOnly, update: serverOnly } },
    // Optional so the record (an order document) survives if the customer later deletes the account.
    { name: "customer", type: "relationship", relationTo: "users", index: true, access: { create: serverOnly, update: serverOnly } },
    { name: "customerName", type: "text", access: { create: serverOnly, update: serverOnly } },
    // One request per shop: the client names the shop, the hook verifies every line belongs to it.
    { name: "seller", type: "relationship", relationTo: "users", required: true, index: true, access: { update: serverOnly } },
    { name: "shopName", type: "text", access: { create: serverOnly, update: serverOnly } },
    {
      name: "items",
      type: "array",
      minRows: 1,
      access: { update: serverOnly },
      fields: [
        { name: "lineId", type: "text", required: true },
        { name: "product", type: "relationship", relationTo: "products" },
        { name: "name", type: "text", required: true },
        { name: "size", type: "text" },
        { name: "color", type: "text" },
        { name: "price", type: "number", min: 0 },
        { name: "quantity", type: "number", required: true, min: 1 },
      ],
    },
    { name: "type", type: "select", required: true, defaultValue: "return", options: [...RETURN_TYPES], access: { update: serverOnly } },
    { name: "reason", type: "select", required: true, options: [...RETURN_REASONS], access: { update: serverOnly } },
    { name: "description", type: "textarea", required: true, maxLength: 1000, access: { update: serverOnly } },
    { name: "photos", type: "upload", relationTo: "media", hasMany: true, maxRows: 5, access: { update: serverOnly } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "requested",
      index: true,
      options: RETURN_STATUSES.map((value) => ({ label: RETURN_STATUS_LABELS[value].vi, value })),
    },
    { name: "sellerNote", label: "Phản hồi của shop", type: "textarea", maxLength: 500, access: { create: serverOnly, update: sellerOrStaff } },
    { name: "resolvedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
    {
      name: "history",
      type: "array",
      maxRows: 20,
      access: { create: serverOnly, update: serverOnly },
      admin: { readOnly: true },
      fields: [
        { name: "status", type: "select", required: true, options: [...RETURN_STATUSES] },
        { name: "at", type: "date", required: true },
        { name: "note", type: "text", maxLength: 200 },
      ],
    },
  ],
}
