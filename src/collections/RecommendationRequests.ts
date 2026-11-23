import type { Access, CollectionAfterChangeHook, CollectionBeforeValidateHook, CollectionConfig, Where } from "payload"
import { APIError } from "payload"
import { isStaff, staffAccess, staffField } from "../access/roles"
import { notifyAdmins, notifyUsers, relId, shopNameOf } from "../lib/notifications"
import { checkNewRequest, slotCheck } from "../lib/recommendation-slots"
import {
  MAX_DAYS,
  MIN_DAYS,
  POSITION_LABELS,
  addDays,
  capacityMessage,
  formatDay,
  newRecommendationCode,
  type RecommendationPosition,
} from "../lib/recommendations"

const isApprovedSeller = (user: unknown) =>
  Boolean(
    user &&
      typeof user === "object" &&
      (user as { collection?: string }).collection === "users" &&
      (user as { sellerStatus?: string }).sellerStatus === "approved",
  )

const fail = (message: string): never => {
  throw new APIError(message, 400, null, true)
}
const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`

const ownRequests: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (!isApprovedSeller(req.user)) return false
  return { seller: { equals: req.user!.id } }
}

/** Sellers can only reach their own requests that still wait for review (to cancel them). */
const ownPendingRequests: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (!isApprovedSeller(req.user)) return false
  const where: Where = { and: [{ seller: { equals: req.user!.id } }, { status: { equals: "pending" } }] }
  return where
}

/** What a shop booked; fixed after submitting (a different booking is a new request). */
const bookingOf = (doc: Record<string, unknown>) => ({
  code: doc.code,
  product: relId(doc.product),
  seller: relId(doc.seller),
  position: doc.position,
  startDay: doc.startDay,
  days: doc.days,
  pricePerDay: doc.pricePerDay,
  total: doc.total,
  startsAt: doc.startsAt,
  endsAt: doc.endsAt,
})

const validateRequest: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  const now = new Date()
  const sellerWrite = req.user?.collection === "users" && !isStaff(req.user)

  if (operation === "update" && originalDoc) {
    const before = originalDoc as Record<string, unknown>
    const next = String(data.status ?? before.status)
    // Booking details are fixed once submitted; only the review decision changes.
    // Payload validates the object a hook returns, so it is the incoming data (already filled with
    // stored values) with the booking itself pinned to what was submitted.
    const keep = { ...data, ...bookingOf(before) }
    if (next === before.status) return keep
    if (sellerWrite) {
      if (before.status !== "pending" || next !== "cancelled") fail("Chỉ có thể hủy yêu cầu đang chờ duyệt.")
      return { ...keep, status: "cancelled", cancelledAt: now.toISOString() }
    }
    if (before.status !== "pending") fail("Yêu cầu này đã được xử lý trước đó.")
    if (next === "cancelled") return { ...keep, status: "cancelled", cancelledAt: now.toISOString() }
    if (next === "rejected") {
      const reason = String(data.rejectReason ?? "").trim()
      if (reason.length < 5) fail("Hãy ghi lý do từ chối (ít nhất 5 ký tự).")
      return { ...keep, status: "rejected", rejectReason: reason.slice(0, 500), reviewedAt: now.toISOString() }
    }
    if (next !== "approved") fail("Trạng thái không hợp lệ.")
    if (new Date(String(before.endsAt)).getTime() <= now.getTime()) fail("Yêu cầu đã quá thời gian đề xuất, không thể duyệt.")
    const product = await req.payload
      .findByID({ collection: "products", id: relId(before.product), depth: 0, overrideAccess: true, select: { seller: true, hidden: true }, req })
      .catch(() => null)
    if (!product || relId(product.seller) !== relId(before.seller)) fail("Sản phẩm không còn thuộc cửa hàng này.")
    if (product?.hidden) fail("Sản phẩm đang bị ẩn nên không thể duyệt đề xuất.")
    // Pending requests were counted when submitted; approval guards the hard limit of approved spots.
    const check = await slotCheck(req.payload, {
      position: before.position as RecommendationPosition,
      startDay: String(before.startDay),
      days: Number(before.days),
      statuses: ["approved"],
      excludeId: before.id as string,
      req,
    })
    if (check.full.length) fail(capacityMessage(check.slots, check.nextFree))
    return { ...keep, status: "approved", reviewedAt: now.toISOString(), feeCollected: Number(before.total ?? 0), rejectReason: null }
  }

  if (sellerWrite && !isApprovedSeller(req.user)) fail("Chỉ người bán đã được duyệt mới có thể đăng ký đề xuất.")
  const sellerId = sellerWrite ? String(req.user!.id) : relId(data.seller)
  if (!sellerId) fail("Yêu cầu phải thuộc một cửa hàng.")
  const productId = relId(data.product)
  const check = await checkNewRequest(
    req.payload,
    { sellerId, productId, position: data.position, startDay: data.startDay, days: data.days, pricePerDay: data.pricePerDay },
    "vi",
    req,
  )
  if (!check.ok) return fail(check.error)
  return {
    ...data,
    code: newRecommendationCode(),
    seller: sellerId,
    product: productId,
    ...check.value,
    status: "pending",
    rejectReason: null,
    reviewedAt: null,
    feeCollected: null,
    cancelledAt: null,
  }
}

const notifyRecommendation: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const becameApproved = doc.status === "approved" && previousDoc?.status !== "approved"
  const becameRejected = doc.status === "rejected" && previousDoc?.status !== "rejected"
  if (operation !== "create" && !becameApproved && !becameRejected) return doc
  try {
    const seller = relId(doc.seller)
    const label = POSITION_LABELS[doc.position as RecommendationPosition]?.vi ?? ""
    const product = await req.payload
      .findByID({ collection: "products", id: relId(doc.product), depth: 0, overrideAccess: true, select: { name: true }, req })
      .catch(() => null)
    const name = product?.name ?? "sản phẩm"
    const when = `${formatDay(doc.startDay)} – ${formatDay(addDays(doc.startDay, Number(doc.days) - 1))}`
    if (operation === "create") {
      const shop = await shopNameOf(req, seller)
      await notifyAdmins(req, {
        category: "shop",
        kind: "admin-recommendation",
        title: `${shop} đăng ký đề xuất “${name}”`,
        message: `${label} · ${when} · ${money(Number(doc.total ?? 0))} (mã ${doc.code}). Thu phí rồi duyệt trong mục Đề xuất trả phí.`,
        href: "/quan-tri/de-xuat",
        actorName: shop,
      })
    } else if (becameApproved) {
      await notifyUsers(req, [seller], {
        category: "shop",
        kind: "recommendation-approved",
        title: `Đã duyệt đề xuất “${name}”`,
        message: `Sản phẩm hiển thị ở mục ${label} trên trang chủ, ${when}.`,
        href: "/kenh-ban-hang/quang-ba",
      })
    } else {
      await notifyUsers(req, [seller], {
        category: "shop",
        kind: "recommendation-rejected",
        title: `Yêu cầu đề xuất “${name}” bị từ chối`,
        message: doc.rejectReason || "Xem lý do trong mục Đề xuất trả phí.",
        href: "/kenh-ban-hang/quang-ba",
      })
    }
  } catch (error) {
    console.error("recommendation notification failed", error)
  }
  return doc
}

const locked = { readOnly: true }
const serverOwned = { create: staffField, update: staffField }

/** A shop's paid booking of a homepage spot ("Đề xuất"); BOAI approves after collecting the fee. */
export const RecommendationRequests: CollectionConfig = {
  slug: "recommendation-requests",
  labels: { singular: "Yêu cầu đề xuất", plural: "Đề xuất trả phí" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "code",
    defaultColumns: ["code", "product", "position", "startDay", "days", "total", "status"],
    description: "Shop đặt suất hiển thị trên trang chủ theo ngày. Duyệt và từ chối trong /quan-tri/de-xuat.",
  },
  access: { read: ownRequests, create: ({ req }) => isStaff(req.user) || isApprovedSeller(req.user), update: ownPendingRequests, delete: staffAccess },
  hooks: { beforeValidate: [validateRequest], afterChange: [notifyRecommendation] },
  timestamps: true,
  fields: [
    { name: "code", label: "Mã yêu cầu", type: "text", unique: true, index: true, access: serverOwned, admin: { ...locked, description: "Nội dung chuyển khoản phí." } },
    { name: "product", label: "Sản phẩm", type: "relationship", relationTo: "products", required: true, index: true, admin: locked },
    { name: "seller", label: "Cửa hàng", type: "relationship", relationTo: "users", required: true, index: true, access: serverOwned, admin: locked },
    {
      name: "position",
      label: "Vị trí",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Trang bị sân cỏ (Bóng đá)", value: "football" },
        { label: "Tốc độ trên không (Cầu lông)", value: "badminton" },
      ],
      admin: locked,
    },
    { name: "startDay", label: "Ngày bắt đầu", type: "text", required: true, admin: { ...locked, description: "YYYY-MM-DD, giờ Việt Nam." } },
    { name: "days", label: "Số ngày", type: "number", required: true, min: MIN_DAYS, max: MAX_DAYS, admin: locked },
    { name: "pricePerDay", label: "Giá mỗi ngày (₫)", type: "number", required: true, min: 0, admin: locked },
    { name: "total", label: "Tổng phí (₫)", type: "number", access: serverOwned, admin: locked },
    { name: "startsAt", label: "Bắt đầu", type: "date", index: true, access: serverOwned, admin: { ...locked, date: { pickerAppearance: "dayAndTime" } } },
    { name: "endsAt", label: "Kết thúc", type: "date", index: true, access: serverOwned, admin: { ...locked, date: { pickerAppearance: "dayAndTime" } } },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      options: [
        { label: "Chờ duyệt", value: "pending" },
        { label: "Đã thu phí & duyệt", value: "approved" },
        { label: "Bị từ chối", value: "rejected" },
        { label: "Đã hủy", value: "cancelled" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "rejectReason", label: "Lý do từ chối", type: "textarea", maxLength: 500, access: serverOwned },
    { name: "feeCollected", label: "Phí đã thu (₫)", type: "number", access: serverOwned, admin: { ...locked, position: "sidebar" } },
    { name: "reviewedAt", label: "Xử lý lúc", type: "date", access: serverOwned, admin: { ...locked, position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
    { name: "cancelledAt", label: "Hủy lúc", type: "date", access: serverOwned, admin: { ...locked, position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
  ],
}
