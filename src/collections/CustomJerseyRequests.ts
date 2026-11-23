import type {
  Access,
  Where,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
} from "payload"
import { APIError } from "payload"
import { isStaff, staffField } from "../access/roles"
import { hex, validArt } from "./JerseyDesigns"
import { notifyUsers, relId } from "../lib/notifications"
import {
  CUSTOM_STATUSES,
  CUSTOM_STATUS_LABELS,
  CUSTOMER_TRANSITIONS,
  MAX_CUSTOM_QUANTITY,
  SHOP_TRANSITIONS,
  type CustomStatus,
} from "../lib/custom-jersey"

const appUserId = (user: unknown) =>
  user && typeof user === "object" && (user as { collection?: string }).collection === "users"
    ? String((user as { id: string | number }).id)
    : ""

// Customers see what they sent; shops see what they received.
const participants: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const id = appUserId(req.user)
  if (!id) return false
  const where: Where = { or: [{ customer: { equals: id } }, { shop: { equals: id } }] }
  return where
}

const shopOfDoc: FieldAccess = ({ req, doc }) =>
  isStaff(req.user) || (!!appUserId(req.user) && relId(doc?.shop) === appUserId(req.user))

const customerOfDoc: FieldAccess = ({ req, doc }) =>
  isStaff(req.user) || (!!appUserId(req.user) && relId(doc?.customer) === appUserId(req.user))

const createOnly: FieldAccess = ({ req }) => isStaff(req.user)
const serverOnly: FieldAccess = () => false

const fail = (message: string, status = 400): never => {
  throw new APIError(message, status, null, true)
}

const money = (value: unknown) => `${new Intl.NumberFormat("vi-VN").format(Number(value ?? 0))}₫`

/** Active (not cancelled) order linked to the request, read with system access. */
async function activeOrder(req: Parameters<CollectionBeforeValidateHook>[0]["req"], orderId: string) {
  if (!orderId) return null
  const order = await req.payload
    .findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true, select: { status: true }, req })
    .catch(() => null)
  return order && order.status !== "cancelled" ? order : null
}

const enforceRequestRules: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const userId = appUserId(req.user)

  if (operation === "create") {
    if (!isStaff(req.user)) {
      if (!userId) fail("Vui lòng đăng nhập để gửi mẫu áo.", 401)
      data.customer = userId
      data.status = "pending"
      data.quotePrice = null
      data.sellerReply = null
    }
    const shopId = relId(data.shop)
    if (!shopId) fail("Vui lòng chọn shop nhận mẫu.")
    if (shopId === relId(data.customer)) fail("Bạn không thể gửi mẫu cho chính shop của mình.")
    const shop = await req.payload
      .findByID({
        collection: "users",
        id: shopId,
        depth: 0,
        overrideAccess: true,
        select: { name: true, sellerStatus: true, seller: { shopName: true, customJersey: true } },
        req,
      })
      .catch(() => null)
    if (!shop) return fail("Shop này hiện không nhận may áo custom.")
    const custom = shop.seller?.customJersey
    if (shop.sellerStatus !== "approved" || !custom?.enabled) fail("Shop này hiện không nhận may áo custom.")
    const minQuantity = Math.max(1, Number(custom?.minQuantity ?? 1))
    if (Number(data.quantity) < minQuantity) {
      fail(`${shop.seller?.shopName || shop.name} nhận đơn từ ${minQuantity} áo trở lên.`)
    }
    // Display snapshot so customers can see the shop without reading private user records.
    data.shopName = shop.seller?.shopName?.trim() || shop.name
    data.code = `CJ${Date.now().toString(36).toUpperCase().slice(-5)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
    return data
  }

  // Updates: staff and system writes may do anything; participants follow the step-by-step workflow.
  if (isStaff(req.user) || !userId || req.context?.customActor === "system" || data.status === undefined) return data
  const from = (originalDoc?.status ?? "pending") as CustomStatus
  const to = data.status as CustomStatus
  const isShop = relId(originalDoc?.shop) === userId
  const isCustomer = relId(originalDoc?.customer) === userId
  if (to === from && from !== "quoted") return data
  if (isShop && SHOP_TRANSITIONS[from]?.includes(to)) {
    const order = await activeOrder(req, relId(originalDoc?.order))
    if (to === "in_production" && !order)
      fail("Khách chưa đặt đơn cho yêu cầu này. Chỉ bắt đầu sản xuất sau khi khách đặt đơn.")
    if (to === "declined" && order) fail("Khách đã đặt đơn. Hãy hủy đơn hàng trước khi từ chối yêu cầu.")
    if (to === "quoted" && !(Number(data.quotePrice ?? originalDoc?.quotePrice) > 0))
      fail("Nhập giá mỗi áo trước khi báo giá.")
    return data
  }
  if (isCustomer && CUSTOMER_TRANSITIONS[from]?.includes(to)) {
    if (to === "cancelled" && from === "accepted" && (await activeOrder(req, relId(originalDoc?.order))))
      fail("Bạn đã đặt đơn cho yêu cầu này. Hãy hủy đơn hàng trong trang Đơn hàng trước.")
    return data
  }
  return fail("Không thể chuyển yêu cầu sang trạng thái này.", 403)
}

const statusOf = (doc: unknown) => (doc as { status?: string } | undefined)?.status

type HistoryRow = { status: CustomStatus; at: string; actor: "customer" | "shop" | "system"; note?: string | null }

/** Server-owned timeline and timestamps for every status or quote change. */
const stampHistory: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const now = new Date().toISOString()
  const history = [...((originalDoc?.history as HistoryRow[] | undefined) ?? [])]
  const userId = appUserId(req.user)
  const actor: HistoryRow["actor"] =
    userId && userId === relId(originalDoc?.shop ?? data.shop)
      ? "shop"
      : userId && userId === relId(originalDoc?.customer ?? data.customer)
        ? "customer"
        : "system"
  if (operation === "create") {
    data.history = [{ status: "pending", at: now, actor: "customer" }]
    return data
  }
  const status = (data.status ?? originalDoc?.status) as CustomStatus
  const statusChanged = status !== originalDoc?.status
  const quoteChanged =
    data.quotePrice !== undefined && Number(data.quotePrice ?? 0) !== Number(originalDoc?.quotePrice ?? 0) && status === "quoted"
  if (!statusChanged && !quoteChanged) return data
  const note =
    status === "quoted"
      ? `${money(data.quotePrice ?? originalDoc?.quotePrice)}/áo`
      : status === "pending" && statusOf(originalDoc) === "quoted"
        ? data.counterOffer
          ? `Đề nghị ${money(data.counterOffer)}/áo`
          : "Khách muốn thương lượng"
        : (req.context?.customNote as string | undefined) ?? null
  history.push({ status, at: now, actor: (req.context?.customActor as HistoryRow["actor"] | undefined) ?? actor, note })
  data.history = history.slice(-40)
  if (status === "quoted") data.quotedAt = now
  if (status === "accepted" && statusChanged) data.acceptedAt = now
  if (status === "in_production" && statusChanged) data.productionStartedAt = now
  if (status === "completed" && statusChanged) data.completedAt = now
  return data
}
const notifyRequestChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  const label = `#${doc.code}`
  const unit = (doc.art as { pants?: { enabled?: boolean } } | null)?.pants?.enabled ? "bộ" : "áo"
  const customerHref = `/custom-ao?yeu-cau=${doc.id}`
  const shopHref = "/kenh-ban-hang/custom-ao"
  if (operation === "create") {
    await notifyUsers(req, [doc.shop], {
      category: "shop",
      kind: "custom-request-new",
      title: `Yêu cầu may áo custom mới ${label}`,
      message: `${doc.contactName} · ${doc.quantity} áo · ${doc.designName}`,
      href: shopHref,
    })
    return doc
  }
  if (context?.skipCustomNotify) return doc
  const statusChanged = previousDoc?.status !== doc.status
  const quoteChanged = previousDoc?.quotePrice !== doc.quotePrice && doc.status === "quoted"
  if (!statusChanged && !quoteChanged) return doc
  const status = CUSTOM_STATUS_LABELS[doc.status as CustomStatus]
  const total = Number(doc.quotePrice ?? 0) * Number(doc.quantity ?? 0)

  // Customer-driven steps go to the shop.
  if (statusChanged && previousDoc?.status === "quoted" && doc.status === "accepted") {
    await notifyUsers(req, [doc.shop], {
      category: "shop",
      kind: "custom-request-accepted",
      title: `Khách đã chấp nhận báo giá ${label}`,
      message: `${doc.contactName} · ${doc.quantity} ${unit} × ${money(doc.quotePrice)} = ${money(total)}. Khách sẽ đặt đơn để shop bắt đầu sản xuất.`,
      href: `${shopHref}?tab=dang-lam`,
    })
    return doc
  }
  if (statusChanged && previousDoc?.status === "quoted" && doc.status === "pending") {
    await notifyUsers(req, [doc.shop], {
      category: "shop",
      kind: "custom-request-negotiate",
      title: `Khách muốn thương lượng báo giá ${label}`,
      message: [doc.counterOffer ? `Đề nghị ${money(doc.counterOffer)}/${unit}` : null, doc.customerNote].filter(Boolean).join(" · ") || doc.designName,
      href: shopHref,
    })
    return doc
  }
  if (statusChanged && doc.status === "cancelled") {
    await notifyUsers(req, [doc.shop], {
      category: "shop",
      kind: "custom-request-cancelled",
      title: `Yêu cầu may áo ${label} đã hủy`,
      message: doc.customerNote || doc.designName,
      href: `${shopHref}?tab=da-xong`,
    })
    if (req.context?.customActor === "system")
      await notifyUsers(req, [doc.customer], {
        category: "shop",
        kind: "custom-request-cancelled",
        title: `Yêu cầu may áo ${label} đã hủy`,
        message: "Đơn hàng liên kết đã bị hủy.",
        href: customerHref,
      })
    return doc
  }

  // Shop-driven steps (quote, production, done, decline) go to the customer.
  const messages: Partial<Record<CustomStatus, string>> = {
    quoted: `Báo giá ${money(doc.quotePrice)}/${unit} · tạm tính ${money(total)} cho ${doc.quantity} ${unit}.${doc.sellerReply ? ` ${doc.sellerReply}` : ""} Mở yêu cầu để chấp nhận hoặc thương lượng.`,
    in_production: "Shop đã bắt đầu sản xuất áo của bạn.",
    completed: "Áo đã may xong và sẵn sàng giao. Theo dõi giao hàng trong trang Đơn hàng.",
    declined: doc.sellerReply || "Shop không nhận được yêu cầu này.",
  }
  await notifyUsers(req, [doc.customer], {
    category: "shop",
    kind: `custom-request-${doc.status}`,
    title: `${doc.shopName}: ${status?.vi ?? doc.status} ${label}`,
    message: messages[doc.status as CustomStatus] ?? (doc.sellerReply || doc.designName),
    // Mở thẳng chi tiết yêu cầu khi khách bấm thông báo.
    href: customerHref,
  })
  return doc
}

export const CustomJerseyRequests: CollectionConfig = {
  slug: "custom-jersey-requests",
  labels: { singular: "Yêu cầu may áo custom", plural: "Yêu cầu may áo custom" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "code",
    defaultColumns: ["code", "shopName", "contactName", "quantity", "status", "createdAt"],
  },
  access: {
    create: ({ req }) => Boolean(appUserId(req.user)) || isStaff(req.user),
    read: participants,
    update: participants,
    delete: ({ req }) => isStaff(req.user),
  },
  hooks: {
    beforeValidate: [enforceRequestRules],
    beforeChange: [stampHistory],
    afterChange: [notifyRequestChanges],
  },
  fields: [
    { name: "code", type: "text", index: true, access: { update: createOnly }, admin: { readOnly: true } },
    { name: "customer", type: "relationship", relationTo: "users", required: true, index: true, access: { update: createOnly } },
    { name: "shop", type: "relationship", relationTo: "users", required: true, index: true, access: { update: createOnly } },
    { name: "shopName", type: "text", access: { update: createOnly } },
    { name: "design", type: "relationship", relationTo: "jersey-designs", access: { update: createOnly } },
    { name: "designName", type: "text", required: true, maxLength: 80, access: { update: createOnly } },
    {
      // Snapshot of the design when sent, so later edits don't change the order.
      name: "art",
      type: "json",
      required: true,
      validate: validArt,
      access: { update: createOnly },
    },
    { name: "shirtColor", type: "text", required: true, validate: hex, access: { update: createOnly } },
    { name: "printColor", type: "text", required: true, validate: hex, access: { update: createOnly } },
    { name: "material", type: "select", required: true, options: ["cotton", "polyester", "woven", "cool"], access: { update: createOnly } },
    { name: "jerseySize", type: "select", required: true, options: ["S", "M", "L", "XL", "XXL"], access: { update: createOnly } },
    { name: "quantity", type: "number", required: true, min: 1, max: MAX_CUSTOM_QUANTITY, access: { update: createOnly } },
    { name: "contactName", type: "text", required: true, maxLength: 80, access: { update: createOnly } },
    { name: "contactPhone", type: "text", required: true, maxLength: 15, access: { update: createOnly } },
    { name: "note", type: "textarea", maxLength: 500, access: { update: createOnly } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      options: CUSTOM_STATUSES.map((value) => ({ label: CUSTOM_STATUS_LABELS[value].vi, value })),
    },
    { name: "quotePrice", label: "Báo giá (₫/áo)", type: "number", min: 0, max: 10000000, access: { create: staffField, update: shopOfDoc } },
    { name: "sellerReply", label: "Phản hồi của shop", type: "textarea", maxLength: 500, access: { create: staffField, update: shopOfDoc } },
    {
      name: "counterOffer",
      label: "Giá khách đề nghị (₫/áo)",
      type: "number",
      min: 0,
      max: 10000000,
      access: { create: staffField, update: customerOfDoc },
    },
    { name: "customerNote", label: "Ghi chú thương lượng / lý do hủy của khách", type: "textarea", maxLength: 500, access: { create: staffField, update: customerOfDoc } },
    {
      // Real order created from the accepted quote (checkout with COD or bank transfer).
      name: "order",
      label: "Đơn hàng liên kết",
      type: "relationship",
      relationTo: "orders",
      access: { create: serverOnly, update: serverOnly },
      admin: { position: "sidebar" },
    },
    { name: "quotedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, position: "sidebar" } },
    { name: "acceptedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, position: "sidebar" } },
    { name: "productionStartedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, position: "sidebar" } },
    { name: "completedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, position: "sidebar" } },
    {
      name: "history",
      label: "Lịch sử trạng thái",
      type: "array",
      maxRows: 40,
      access: { create: serverOnly, update: serverOnly },
      admin: { readOnly: true },
      fields: [
        { name: "status", type: "select", required: true, options: [...CUSTOM_STATUSES] },
        { name: "at", type: "date", required: true },
        { name: "actor", type: "select", required: true, options: ["customer", "shop", "system"] },
        { name: "note", type: "text", maxLength: 200 },
      ],
    },
  ],
}
