import type { Access, CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig } from "payload"
import { notifyOrderChanges } from "../hooks/commerce-notifications"
import { relId } from "../lib/notifications"
import { rollupStatus } from "../lib/order-flow"

/** Delivery date anchors the 30-day return window. */
const stampDelivered: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data.status === "delivered" && originalDoc?.status !== "delivered" && !data.deliveredAt)
    data.deliveredAt = new Date().toISOString()
  return data
}

/**
 * A shop's child order changed status: recompute the parent (all cancelled →
 * cancelled, all delivered → completed, any on its way → shipping).
 */
const rollupParent: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context }) => {
  if (doc.role !== "child" || context?.skipRollup || previousDoc?.status === doc.status) return doc
  const parentId = relId(doc.parentOrder)
  if (!parentId) return doc
  try {
    const [parent, siblings] = await Promise.all([
      req.payload.findByID({ collection: "orders", id: parentId, depth: 0, overrideAccess: true, select: { status: true }, req }),
      req.payload.find({
        collection: "orders",
        where: { parentOrder: { equals: parentId } },
        depth: 0,
        limit: 50,
        pagination: false,
        overrideAccess: true,
        select: { status: true },
        req,
      }),
    ])
    const next = rollupStatus(parent.status, siblings.docs)
    if (next !== parent.status) {
      await req.payload.update({
        collection: "orders",
        id: parentId,
        data: { status: next },
        depth: 0,
        overrideAccess: true,
        req,
        context: { skipRollup: true, rollup: true },
      })
    }
  } catch (error) {
    console.error("rollupParent failed", error)
  }
  return doc
}

/** A cancelled custom order releases its request so the customer can re-order or withdraw. */
const releaseCustomRequest: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const requestId = relId(doc.customRequest)
  if (!requestId || doc.status !== "cancelled" || previousDoc?.status === "cancelled") return doc
  try {
    const request = await req.payload.findByID({
      collection: "custom-jersey-requests",
      id: requestId,
      depth: 0,
      overrideAccess: true,
      select: { status: true, order: true },
      req,
    })
    if (relId(request.order) !== String(doc.id)) return doc
    const stopProduction = request.status === "in_production" || request.status === "completed"
    await req.payload.update({
      collection: "custom-jersey-requests",
      id: requestId,
      overrideAccess: true,
      req,
      context: { customActor: "system", customNote: `Đơn ${doc.code} đã hủy` },
      data: { order: null, ...(stopProduction ? { status: "cancelled" as const } : {}) },
    })
  } catch (error) {
    console.error("releaseCustomRequest failed", error)
  }
  return doc
}

/** A cancelled order gives its event-price units back to the shop's sale quota. */
const releaseSaleQuota: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== "cancelled" || previousDoc?.status === "cancelled") return doc
  const byRegistration = new Map<string, Map<string, number>>()
  for (const line of doc.items ?? []) {
    const registrationId = relId(line.eventRegistration)
    if (!registrationId || !line.eventItemId) continue
    const lines = byRegistration.get(registrationId) ?? new Map<string, number>()
    lines.set(line.eventItemId, (lines.get(line.eventItemId) ?? 0) + Number(line.quantity ?? 0))
    byRegistration.set(registrationId, lines)
  }
  for (const [registrationId, lines] of byRegistration) {
    try {
      const registration = await req.payload.findByID({ collection: "event-registrations", id: registrationId, depth: 0, overrideAccess: true, req })
      const items = (registration.items ?? []).map((item) => {
        const back = item.id ? lines.get(item.id) : undefined
        return back ? { ...item, sold: Math.max(0, Number(item.sold ?? 0) - back) } : item
      })
      await req.payload.update({
        collection: "event-registrations",
        id: registrationId,
        data: { items },
        depth: 0,
        overrideAccess: true,
        context: { saleCounter: true },
        req,
      })
    } catch (error) {
      console.error("releaseSaleQuota failed", error)
    }
  }
  return doc
}

const ownOrders: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.collection === "admins") return true
  return { customer: { equals: req.user.id } }
}
const adminsOnly: Access = ({ req }) => req.user?.collection === "admins"

/** Fields only meaningful on orders placed before the parent/child flow. */
const legacyOnly = (data: Record<string, unknown> | undefined) => !data?.role

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "code",
    defaultColumns: ["code", "role", "shopName", "fullName", "total", "payment", "status", "createdAt"],
    description:
      "Mỗi lần thanh toán tạo 1 đơn tổng (khách, tổng tiền, thanh toán) và 1 đơn con cho từng shop (mã CODE-1, CODE-2…). Đơn cũ không có vai trò.",
  },
  // Orders are created only through the checkout server actions, which price
  // items, shipping and discounts on the server.
  access: { create: adminsOnly, read: ownOrders, update: adminsOnly, delete: adminsOnly },
  hooks: {
    beforeChange: [stampDelivered],
    afterChange: [notifyOrderChanges, releaseCustomRequest, releaseSaleQuota, rollupParent],
  },
  fields: [
    { name: "code", type: "text", required: true, unique: true, index: true },
    {
      name: "role",
      label: "Loại đơn",
      type: "select",
      index: true,
      options: [
        { label: "Đơn tổng (khách)", value: "parent" },
        { label: "Đơn của shop", value: "child" },
      ],
      admin: { position: "sidebar", readOnly: true, description: "Để trống với đơn đặt trước khi tách đơn theo shop." },
    },
    {
      name: "parentOrder",
      label: "Đơn tổng",
      type: "relationship",
      relationTo: "orders",
      index: true,
      admin: { position: "sidebar", readOnly: true, condition: (data) => data?.role === "child" },
    },
    {
      name: "seller",
      label: "Shop",
      type: "relationship",
      relationTo: "users",
      index: true,
      admin: { position: "sidebar", readOnly: true, condition: (data) => data?.role === "child" },
    },
    { name: "shopName", label: "Tên shop", type: "text", admin: { position: "sidebar", readOnly: true, condition: (data) => data?.role === "child" } },
    { name: "customer", type: "relationship", relationTo: "users" },
    { name: "fullName", type: "text", required: true },
    { name: "phone", type: "text", required: true, index: true },
    { name: "email", type: "email" },
    { name: "address", type: "textarea", required: true },
    {
      type: "row",
      fields: [
        { name: "deliveryLat", label: "Vĩ độ giao hàng", type: "number", admin: { readOnly: true } },
        { name: "deliveryLng", label: "Kinh độ giao hàng", type: "number", admin: { readOnly: true } },
      ],
    },
    { name: "note", type: "textarea" },
    {
      name: "items",
      type: "array",
      // Parent orders keep no lines: each shop's child order holds its own items.
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) =>
        siblingData?.role === "parent" || (Array.isArray(value) && value.length > 0) || "Đơn hàng cần ít nhất 1 sản phẩm.",
      fields: [
        { name: "product", type: "relationship", relationTo: "products" },
        // Selling shop, stored per line so custom-made items (no product) still route to their shop.
        { name: "seller", type: "relationship", relationTo: "users", index: true },
        { name: "name", type: "text", required: true },
        { name: "color", type: "text" },
        { name: "size", type: "text" },
        { name: "price", type: "number", required: true },
        // Price snapshot at checkout: later price or event changes never alter this order.
        { name: "originalPrice", label: "Giá gốc lúc mua", type: "number", admin: { readOnly: true } },
        { name: "eventDiscount", label: "% giảm sự kiện", type: "number", admin: { readOnly: true } },
        { name: "eventName", label: "Sự kiện", type: "text", admin: { readOnly: true } },
        { name: "eventRegistration", type: "relationship", relationTo: "event-registrations", admin: { readOnly: true } },
        // Row id inside that registration, so cancelling the order returns the unit to its quota.
        { name: "eventItemId", type: "text", admin: { readOnly: true } },
        { name: "quantity", type: "number", required: true, min: 1 },
        { name: "stringing", type: "checkbox", label: "Đan cước" },
      ],
    },
    { name: "itemCount", label: "Số sản phẩm", type: "number", min: 0, admin: { readOnly: true } },
    { name: "subtotal", type: "number", required: true },
    { name: "discount", label: "Giảm giá (₫)", type: "number", defaultValue: 0 },
    { name: "discountPercent", label: "Mã giảm (%)", type: "number", min: 0, max: 100, admin: { readOnly: true } },
    { name: "shipping", label: "Phí vận chuyển (₫)", type: "number", defaultValue: 0 },
    {
      type: "row",
      fields: [
        { name: "distanceKm", label: "Khoảng cách tính phí (km)", type: "number", min: 0, admin: { readOnly: true } },
        {
          name: "shippingEstimated",
          label: "Phí ước tính (theo tỉnh)",
          type: "checkbox",
          admin: { readOnly: true, description: "Chưa có tọa độ chính xác của kho hoặc địa chỉ nhận." },
        },
      ],
    },
    { name: "shippingProvince", label: "Tỉnh / thành giao hàng", type: "text" },
    {
      // Orders placed before automatic pricing: one line per shop, quoted by an admin.
      name: "shippingBreakdown",
      label: "Phí vận chuyển theo shop",
      type: "array",
      admin: { condition: legacyOnly },
      fields: [
        { name: "seller", type: "relationship", relationTo: "users", index: true },
        { name: "shopName", type: "text", required: true },
        { name: "originProvince", label: "Kho", type: "text" },
        { name: "warehouseAddress", label: "Địa chỉ kho", type: "text" },
        { name: "stockConfirmedAt", label: "Shop xác nhận có hàng lúc", type: "date" },
        { name: "estimatedKm", label: "Khoảng cách ước tính (km)", type: "number", min: 0 },
        { name: "distanceKm", label: "Khoảng cách admin xác nhận (km)", type: "number", min: 0 },
        { name: "baseFee", label: "Phí theo km trước điều chỉnh (₫)", type: "number", min: 0 },
        {
          name: "zone",
          type: "select",
          required: true,
          options: [
            { label: "Nội tỉnh", value: "sameProvince" },
            { label: "Nội miền", value: "sameRegion" },
            { label: "Liên miền", value: "crossRegion" },
          ],
        },
        { name: "fee", type: "number", required: true, min: 0 },
      ],
    },
    {
      name: "shippingPercent",
      label: "% điều chỉnh đã áp dụng",
      type: "number",
      admin: { condition: legacyOnly, description: "Mức % dùng khi chốt phí (đơn cũ)." },
    },
    {
      name: "shippingPercentOverride",
      label: "% điều chỉnh riêng cho đơn",
      type: "number",
      admin: { condition: legacyOnly, description: "Chỉ dùng cho đơn cũ." },
    },
    { name: "shippingQuotedAt", label: "Chốt phí vận chuyển lúc", type: "date", admin: { condition: legacyOnly } },
    { name: "total", type: "number", required: true },
    { name: "voucher", label: "Mã giảm giá", type: "text" },
    {
      name: "payment",
      type: "select",
      required: true,
      options: [
        { label: "Thanh toán khi nhận hàng (COD)", value: "cod" },
        { label: "Chuyển khoản VietQR", value: "online" },
        { label: "Trả góp 0%", value: "installment" },
      ],
    },
    {
      name: "paymentInfo",
      label: "Thanh toán chuyển khoản",
      type: "group",
      admin: { condition: (data) => data?.payment === "online" && data?.role === "parent" },
      fields: [
        { name: "claimedAt", label: "Khách báo đã chuyển lúc", type: "date", admin: { readOnly: true } },
        { name: "paidAt", label: "Xác nhận đã nhận tiền lúc", type: "date", admin: { readOnly: true } },
        { name: "paidAmount", label: "Số tiền đã nhận (₫)", type: "number", admin: { readOnly: true } },
        {
          name: "source",
          label: "Nguồn xác nhận",
          type: "select",
          options: [
            { label: "Quản trị viên xác nhận", value: "manual" },
            { label: "Webhook ngân hàng", value: "webhook" },
          ],
          admin: { readOnly: true },
        },
        { name: "transactionId", label: "Mã giao dịch", type: "text", index: true, admin: { readOnly: true } },
      ],
    },
    { name: "preorder", type: "checkbox", label: "Đặt trước" },
    {
      // Set when the order is created from an accepted custom-jersey quote.
      name: "customRequest",
      label: "Yêu cầu may áo custom",
      type: "relationship",
      relationTo: "custom-jersey-requests",
      index: true,
      admin: { position: "sidebar" },
    },
    { name: "deliveredAt", label: "Giao thành công lúc", type: "date", admin: { position: "sidebar", readOnly: true } },
    {
      name: "cancellation",
      label: "Hủy đơn",
      type: "group",
      admin: { condition: (data) => data?.status === "cancelled" },
      fields: [
        {
          name: "by",
          label: "Người hủy",
          type: "select",
          options: [
            { label: "Khách hàng", value: "customer" },
            { label: "Shop", value: "shop" },
            { label: "BOAI", value: "admin" },
          ],
        },
        { name: "reason", label: "Lý do", type: "textarea", maxLength: 300 },
        { name: "at", label: "Lúc", type: "date" },
      ],
    },
    {
      // Child order cancelled after BOAI received the money: BOAI refunds the buyer.
      name: "refund",
      label: "Hoàn tiền cho khách",
      type: "group",
      admin: { condition: (data) => Boolean(data?.refund?.due || data?.refund?.refundedAt) },
      fields: [
        { name: "due", label: "Cần hoàn tiền", type: "checkbox", defaultValue: false, index: true },
        { name: "amount", label: "Số tiền hoàn (₫)", type: "number", min: 0 },
        { name: "refundedAt", label: "Đã hoàn lúc", type: "date" },
      ],
    },
    {
      // What BOAI owes the shop for this child order (see lib/order-flow payoutFor).
      name: "payout",
      label: "Chi trả cho shop",
      type: "group",
      admin: { condition: (data) => data?.role === "child" },
      fields: [
        { name: "amount", label: "Số tiền chi cho shop (₫)", type: "number", min: 0 },
        {
          name: "status",
          label: "Trạng thái chi",
          type: "select",
          defaultValue: "unpaid",
          index: true,
          options: [
            { label: "Chưa chi", value: "unpaid" },
            { label: "Đã chi", value: "paid" },
            { label: "Không phát sinh / hủy", value: "void" },
          ],
        },
        { name: "paidAt", label: "Ngày chi", type: "date" },
        { name: "note", label: "Ghi chú", type: "text", maxLength: 200 },
      ],
    },
    {
      // Orders placed before VietQR: buyers transferred straight to each shop.
      name: "sellerPayments",
      label: "Chuyển khoản cho shop",
      type: "array",
      admin: {
        condition: (data) => data?.payment === "online" && !data?.role,
      },
      fields: [
        { name: "seller", type: "relationship", relationTo: "users", required: true, index: true },
        { name: "shopName", type: "text", required: true },
        { name: "amount", type: "number", required: true, min: 0 },
        { name: "bankCode", type: "text", required: true },
        { name: "bankName", type: "text", required: true },
        { name: "accountNumber", type: "text", required: true },
        { name: "accountHolder", type: "text", required: true },
        { name: "transferNote", type: "text", required: true },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "awaiting",
          options: [
            { label: "Chờ chuyển khoản", value: "awaiting" },
            { label: "Shop đã nhận tiền", value: "paid" },
          ],
        },
        { name: "paidAt", type: "date" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      admin: {
        description:
          "Chuyển khoản: Chờ thanh toán → Chờ shop xác nhận → Đang giao → Hoàn tất. COD bắt đầu ở Chờ shop xác nhận. Hủy được khi Chờ thanh toán hoặc Chờ shop xác nhận.",
      },
      options: [
        { label: "Chờ thanh toán", value: "awaiting_payment" },
        { label: "Chờ shop xác nhận", value: "pending" },
        { label: "Đang giao", value: "shipping" },
        { label: "Hoàn tất", value: "delivered" },
        { label: "Đã hủy", value: "cancelled" },
      ],
    },
  ],
}
