import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload"
import { notifyRegistrationChanges } from "../hooks/commerce-notifications"
import { revalidatePath } from "next/cache"
import { isStaff, staffField } from "../access/roles"
import { effectiveEventStatus, eventWindow, formatEventMoment, isRegistrationOpen, windowsOverlap } from "@/lib/event-dates"
import { APIError } from "payload"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT, salePrice } from "@/lib/event-rules"
import { deriveProductType, isProductType } from "@/lib/product-types"

const idOf = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: string | number }).id)
  }
  return ""
}

const isApprovedSeller = (user: unknown) =>
  Boolean(
    user &&
      typeof user === "object" &&
      (user as { collection?: string }).collection === "users" &&
      (user as { sellerStatus?: string }).sellerStatus === "approved",
  )

const ownRegistrations: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (!isApprovedSeller(req.user)) return false
  return { seller: { equals: req.user!.id } }
}

type ItemInput = {
  id?: string | null
  product?: unknown
  discountPercent?: unknown
  quota?: unknown
  sold?: unknown
  status?: unknown
  reviewNote?: unknown
  /** Transient flag from the seller form: send a rejected/withdrawn product back for review. */
  resubmit?: unknown
}
const ACTIVE_ITEM = new Set(["pending", "approved"])

/** Registration status shown to sellers/admins, derived from its product lines. */
function deriveReviewStatus(items: { status: string }[], requestedDraft: boolean) {
  if (requestedDraft) return "draft"
  if (items.some((i) => i.status === "pending")) return "pending"
  if (items.some((i) => i.status === "approved")) return "approved"
  if (items.length && items.every((i) => i.status === "withdrawn")) return "withdrawn"
  return "rejected"
}

const fail = (message: string): never => {
  throw new APIError(message, 400, null, true)
}

const validateRegistration: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  context,
}) => {
  if (!data) return data
  // Trusted checkout/cancel code only moves the per-product "sold" counters
  // (server-only context; it can't be set through the REST or GraphQL API).
  if (context?.saleCounter) return data
  // Admin review: only per-product decisions (status + note) change.
  if (context?.registrationReview && isStaff(req.user)) {
    const decisions = new Map(
      ((data.items ?? []) as ItemInput[]).map((i) => [String(i.id), i]),
    )
    const items = ((originalDoc?.items ?? []) as ItemInput[]).map((item) => {
      const d = decisions.get(String(item.id))
      const status = d && ["approved", "rejected"].includes(String(d.status)) && item.status !== "withdrawn" ? String(d.status) : String(item.status ?? "pending")
      return { ...item, status, reviewNote: d?.reviewNote !== undefined ? String(d.reviewNote ?? "").slice(0, 300) || null : (item.reviewNote ?? null) }
    })
    data.items = items
    data.reviewStatus = deriveReviewStatus(items as { status: string }[], false)
    return data
  }
  const current = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  const sellerWrite = req.user?.collection === "users" && !isStaff(req.user)
  if (sellerWrite) {
    if (!isApprovedSeller(req.user)) fail("Chỉ người bán đã được duyệt mới có thể đăng ký sự kiện.")
    data.seller = req.user!.id
    current.seller = req.user!.id
  } else if (req.user && !isStaff(req.user)) {
    fail("Bạn không có quyền đăng ký sự kiện.")
  }
  const sellerId = idOf(current.seller)
  const eventId = idOf(current.event)
  if (!sellerId) fail("Đăng ký phải thuộc một người bán.")
  if (!eventId) fail("Hãy chọn sự kiện muốn tham gia.")
  const event = await req.payload
    .findByID({ collection: "events", id: eventId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!event) return fail("Sự kiện không tồn tại.")
  if (sellerWrite && !isRegistrationOpen(event)) fail("Sự kiện này không còn nhận đăng ký.")

  // Product lines (older registrations without lines fall back to products + one discount).
  const incoming: ItemInput[] = Array.isArray(current.items) && (current.items as unknown[]).length
    ? (current.items as ItemInput[])
    : (Array.isArray(current.products) ? current.products : []).map((p) => ({ product: p, discountPercent: current.discountPercent }))
  if (!incoming.length) fail("Hãy chọn ít nhất một sản phẩm tham gia sự kiện.")
  if (incoming.length > 100) fail("Mỗi đăng ký được chọn tối đa 100 sản phẩm.")
  const productIds = incoming.map((i) => idOf(i.product)).filter(Boolean)
  if (new Set(productIds).size !== productIds.length) fail("Mỗi sản phẩm chỉ được đăng ký một lần.")
  const { docs: products } = await req.payload.find({
    collection: "products",
    where: { and: [{ id: { in: productIds } }, { seller: { equals: sellerId } }] },
    limit: productIds.length,
    depth: 0,
    overrideAccess: true,
    select: { name: true, price: true, category: true, productType: true },
    req,
  })
  if (products.length !== productIds.length) fail("Chỉ được đăng ký sản phẩm thuộc cửa hàng của bạn.")
  const cap = Math.min(MAX_EVENT_DISCOUNT, Number(event.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT))
  const allowedTypes = (event.allowedProductTypes ?? []) as string[]
  const previous = new Map(((originalDoc?.items ?? []) as ItemInput[]).map((i) => [String(i.id), i]))

  const items = incoming.map((item) => {
    const product = products.find((p) => String(p.id) === idOf(item.product))!
    const prev = item.id ? previous.get(String(item.id)) : undefined
    const prevStatus = String(prev?.status ?? "")
    const wantsWithdraw = item.status === "withdrawn"
    const discount = Number(item.discountPercent)
    const quota = item.quota === null || item.quota === undefined || item.quota === "" ? null : Number(item.quota)
    let status = "pending"
    let reviewNote = (prev?.reviewNote as string | null | undefined) ?? null
    if (sellerWrite) {
      const changed = !!prev && (Number(prev.discountPercent) !== discount || (prev.quota ?? null) !== quota)
      if (wantsWithdraw) status = "withdrawn"
      else if (!prev) status = "pending"
      else if (prevStatus === "approved") {
        // An approved offer is live for buyers: it can only be withdrawn, not edited.
        if (changed) fail(`“${product.name}” đã được duyệt; chỉ có thể rút khỏi sự kiện.`)
        status = "approved"
      } else if (prevStatus === "rejected" || prevStatus === "withdrawn") {
        // Edited or explicitly re-sent products go back to the BOAI review queue.
        status = changed || item.resubmit === true ? "pending" : prevStatus
      } else status = "pending"
      if (status === "pending" && prevStatus !== "pending") reviewNote = null
    } else {
      status = ["pending", "approved", "rejected", "withdrawn"].includes(String(item.status)) ? String(item.status) : prevStatus || "pending"
    }
    // Withdrawn rows are history only; the offer rules apply to rows that can go live.
    if (status !== "withdrawn") {
      if (!Number.isInteger(discount) || discount < MIN_EVENT_DISCOUNT || discount > cap)
        fail(`Mức giảm của “${product.name}” phải là số nguyên từ ${MIN_EVENT_DISCOUNT}% đến ${cap}% (trần của sự kiện).`)
      if (quota !== null && !(Number.isInteger(quota) && quota >= 1 && quota <= 100000)) fail(`Số suất của “${product.name}” phải từ 1 đến 100.000.`)
      if (salePrice(product.price, discount) <= 0) fail(`Giá sau giảm của “${product.name}” phải lớn hơn 0.`)
      const type = isProductType(product.productType) ? product.productType : deriveProductType(product)
      if (allowedTypes.length && !allowedTypes.includes(type)) fail(`“${product.name}” không thuộc nhóm sản phẩm được phép của sự kiện.`)
    }
    return {
      ...(item.id ? { id: item.id } : {}),
      product: product.id,
      discountPercent: discount,
      quota,
      sold: Number(prev?.sold ?? 0),
      status,
      reviewNote,
    }
  })

  // A product can be in only one event at a time (exact start/end times, any event that can still run).
  const activeProducts = items.filter((i) => ACTIVE_ITEM.has(i.status)).map((i) => String(i.product))
  if (activeProducts.length) {
    const others = await req.payload.find({
      collection: "event-registrations",
      where: { and: [{ "items.product": { in: activeProducts } }, { event: { not_equals: eventId } }] },
      pagination: false,
      depth: 1,
      overrideAccess: true,
      req,
    })
    for (const other of others.docs) {
      const otherEvent = other.event && typeof other.event === "object" ? other.event : null
      if (!otherEvent || ["draft", "ended"].includes(effectiveEventStatus(otherEvent)) || !windowsOverlap(eventWindow(event), eventWindow(otherEvent))) continue
      for (const line of other.items ?? []) {
        const pid = idOf(line.product)
        if (ACTIVE_ITEM.has(String(line.status)) && activeProducts.includes(pid)) {
          const name = products.find((p) => String(p.id) === pid)?.name ?? "Sản phẩm"
          fail(`Sản phẩm “${name}” đã tham gia sự kiện “${otherEvent.name}” (đến ${formatEventMoment(eventWindow(otherEvent).end)}).`)
        }
      }
    }
  }
  data.items = items
  data.products = items.filter((i) => i.status !== "withdrawn").map((i) => i.product)
  data.discountPercent = Math.max(MIN_EVENT_DISCOUNT, ...items.filter((i) => i.status !== "withdrawn").map((i) => i.discountPercent))
  if (sellerWrite) {
    data.reviewStatus = deriveReviewStatus(items, data.reviewStatus === "draft")
    if (data.reviewStatus === "pending") data.reviewNote = null
  }

  const duplicate = await req.payload.count({
    collection: "event-registrations",
    overrideAccess: true,
    req,
    where: {
      and: [
        { event: { equals: eventId } },
        { seller: { equals: sellerId } },
        ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
  })
  if (duplicate.totalDocs) fail("Cửa hàng đã có đăng ký cho sự kiện này.")
  const seller = await req.payload
    .findByID({ collection: "users", id: sellerId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  data.title = `${seller?.seller?.shopName || seller?.name || "Cửa hàng"} · ${event.name}`
  return data
}

const refreshStorefront = ({ context }: { context?: Record<string, unknown> }) => {
  // Sold counters change with every order; pages that show them render per request.
  if (context?.saleCounter) return
  revalidatePath("/")
  revalidatePath("/giam-gia")
  revalidatePath("/tim-kiem")
  revalidatePath("/san-pham/[slug]", "page")
  revalidatePath("/cua-hang/[id]", "page")
}

export const EventRegistrations: CollectionConfig = {
  slug: "event-registrations",
  labels: { singular: "Đăng ký sự kiện", plural: "Đăng ký sự kiện" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "title",
    defaultColumns: ["title", "reviewStatus", "discountPercent", "updatedAt"],
  },
  access: {
    create: ({ req }) => isStaff(req.user) || isApprovedSeller(req.user),
    read: ownRegistrations,
    update: ownRegistrations,
    delete: ownRegistrations,
  },
  hooks: {
    beforeValidate: [validateRegistration],
    afterChange: [refreshStorefront, notifyRegistrationChanges],
    afterDelete: [refreshStorefront],
  },
  fields: [
    {
      name: "title",
      type: "text",
      admin: { readOnly: true, description: "Tự động: tên shop · tên sự kiện." },
    },
    {
      name: "event",
      label: "Sự kiện",
      type: "relationship",
      relationTo: "events",
      required: true,
      index: true,
    },
    {
      name: "seller",
      label: "Người bán",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      access: { create: staffField, update: staffField },
    },
    {
      name: "items",
      label: "Sản phẩm tham gia",
      type: "array",
      maxRows: 100,
      admin: { description: "Mỗi dòng: một sản phẩm với mức giảm và số suất riêng; admin duyệt từng dòng." },
      fields: [
        { name: "product", type: "relationship", relationTo: "products", required: true },
        { name: "discountPercent", label: "% giảm", type: "number", required: true, min: MIN_EVENT_DISCOUNT, max: MAX_EVENT_DISCOUNT },
        { name: "quota", label: "Số suất (để trống: không giới hạn)", type: "number", min: 1, max: 100000 },
        { name: "sold", label: "Đã bán", type: "number", defaultValue: 0, min: 0, admin: { readOnly: true } },
        {
          name: "status",
          type: "select",
          defaultValue: "pending",
          options: [
            { label: "Chờ duyệt", value: "pending" },
            { label: "Đã duyệt", value: "approved" },
            { label: "Từ chối", value: "rejected" },
            { label: "Đã rút", value: "withdrawn" },
          ],
        },
        { name: "reviewNote", label: "Lý do từ chối", type: "text", maxLength: 300 },
      ],
    },
    {
      name: "products",
      label: "Sản phẩm (tự động từ danh sách trên)",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      maxRows: 100,
      admin: { readOnly: true },
    },
    {
      name: "discountPercent",
      label: "Mức giảm cao nhất (%)",
      type: "number",
      min: MIN_EVENT_DISCOUNT,
      max: MAX_EVENT_DISCOUNT,
      admin: { readOnly: true },
    },
    {
      name: "reviewStatus",
      label: "Trạng thái duyệt",
      type: "select",
      defaultValue: "pending",
      index: true,
      options: [
        { label: "Nháp", value: "draft" },
        { label: "Chờ duyệt", value: "pending" },
        { label: "Đã duyệt", value: "approved" },
        { label: "Từ chối", value: "rejected" },
        { label: "Shop đã rút", value: "withdrawn" },
      ],
      admin: {
        position: "sidebar",
        description: "Tự tính từ trạng thái từng sản phẩm. Đang chạy / đã kết thúc theo ngày của sự kiện.",
      },
    },
    {
      name: "reviewNote",
      label: "Ghi chú duyệt",
      type: "textarea",
      maxLength: 500,
      access: { create: staffField, update: staffField },
    },
  ],
}
