"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import type { CustomJerseyRequest, JerseyDesign } from "@/payload-types"
import { CUSTOMER_CANCELLABLE, MAX_CUSTOM_QUANTITY, MAX_SHOPS_PER_SEND, type CustomStatus } from "@/lib/custom-jersey"
import { postRequestMessage } from "@/lib/shop-chat-server"

export type JerseyDraft = {
  art: JerseyDesign["art"]
  shirtColor: string
  printColor: string
  material: "cotton" | "polyester" | "woven" | "cool"
  jerseySize: "S" | "M" | "L" | "XL" | "XXL"
}

const cleanName = (value: string) => value.trim().replace(/\s+/g, " ").slice(0, 80)
const ownedUser = async () => {
  const user = await appAuth.currentUser()
  if (!user) throw new Error("AUTH_REQUIRED")
  return user
}

export async function listDesignsAction() {
  const user = await appAuth.currentUser()
  if (!user) return { authenticated: false as const, designs: [], profile: { name: "", phone: "", id: "" } }
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, depth: 0, sort: "-updatedAt", limit: 100 })
  return {
    authenticated: true as const,
    profile: { id: String(user.id), name: user.name ?? "", phone: user.phone ?? "" },
    designs: result.docs.map((doc) => ({ id: String(doc.id), name: doc.name, updatedAt: doc.updatedAt })),
  }
}

export async function getDesignAction(id: string) {
  const user = await ownedUser()
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, limit: 1, where: { id: { equals: id } } })
  const doc = result.docs[0]
  if (!doc) return { ok: false as const, error: "NOT_FOUND" }
  return { ok: true as const, design: { id: String(doc.id), name: doc.name, art: doc.art, shirtColor: doc.shirtColor, printColor: doc.printColor, material: doc.material, jerseySize: doc.jerseySize } }
}

export async function saveDesignAction(id: string | null, name: string, draft: JerseyDraft) {
  const user = await ownedUser()
  return persistDesign(user, id, name, draft)
}

async function persistDesign(user: Awaited<ReturnType<typeof ownedUser>>, id: string | null, name: string, draft: JerseyDraft) {
  const finalName = cleanName(name)
  if (!finalName) return { ok: false as const, error: "NAME_REQUIRED" }
  const payload = await getPayloadClient()
  const data = { owner: user.id, name: finalName, ...draft }
  if (id) {
    const existing = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, limit: 1, where: { id: { equals: id } } })
    if (!existing.docs[0]) return { ok: false as const, error: "NOT_FOUND" }
    const doc = await payload.update({ collection: "jersey-designs", id, user, overrideAccess: false, data })
    return { ok: true as const, id: String(doc.id), name: doc.name }
  }
  const doc = await payload.create({ collection: "jersey-designs", user, overrideAccess: false, data })
  return { ok: true as const, id: String(doc.id), name: doc.name }
}

export async function renameDesignAction(id: string, name: string) {
  const user = await ownedUser()
  const finalName = cleanName(name)
  if (!finalName) return { ok: false as const }
  const payload = await getPayloadClient()
  const existing = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, limit: 1, where: { id: { equals: id } } })
  if (!existing.docs[0]) return { ok: false as const }
  await payload.update({ collection: "jersey-designs", id, user, overrideAccess: false, data: { name: finalName } })
  return { ok: true as const }
}

export async function duplicateDesignAction(id: string) {
  const user = await ownedUser()
  const payload = await getPayloadClient()
  const result = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, limit: 1, where: { id: { equals: id } } })
  const source = result.docs[0]
  if (!source) return { ok: false as const }
  const doc = await payload.create({
    collection: "jersey-designs", user, overrideAccess: false,
    data: { owner: user.id, name: `${source.name} — Copy`.slice(0, 80), art: source.art, shirtColor: source.shirtColor, printColor: source.printColor, material: source.material, jerseySize: source.jerseySize },
  })
  return { ok: true as const, id: String(doc.id) }
}

export async function deleteDesignAction(id: string) {
  const user = await ownedUser()
  const payload = await getPayloadClient()
  const existing = await payload.find({ collection: "jersey-designs", user, overrideAccess: false, limit: 1, where: { id: { equals: id } } })
  if (!existing.docs[0]) return { ok: false as const }
  await payload.delete({ collection: "jersey-designs", id, user, overrideAccess: false })
  return { ok: true as const }
}

// ---------- Sending designs to custom-jersey shops ----------

export type SendDesignInput = {
  designId: string | null
  name: string
  draft: JerseyDraft
  shopIds: string[]
  quantity: number
  contactName: string
  contactPhone: string
  note: string
}

export type SendDesignResult =
  | { ok: true; designId: string; sent: number }
  | { ok: false; error: string }

const failure = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : ""
  return /[À-ỹ]/.test(message) && message.length < 200 ? message : fallback
}

export async function sendDesignToShopsAction(input: SendDesignInput): Promise<SendDesignResult> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập để gửi mẫu áo cho shop." }
  const shopIds = [...new Set((Array.isArray(input?.shopIds) ? input.shopIds : []).map(String).filter((id) => /^[\w-]{1,64}$/.test(id)))]
  if (!shopIds.length) return { ok: false, error: "Hãy chọn ít nhất một shop." }
  if (shopIds.length > MAX_SHOPS_PER_SEND) return { ok: false, error: `Mỗi lần gửi tối đa ${MAX_SHOPS_PER_SEND} shop.` }
  if (shopIds.includes(String(user.id))) return { ok: false, error: "Bạn không thể gửi mẫu cho chính shop của mình." }
  const quantity = Math.floor(Number(input?.quantity))
  if (!(quantity >= 1 && quantity <= MAX_CUSTOM_QUANTITY)) return { ok: false, error: `Số lượng áo từ 1 đến ${MAX_CUSTOM_QUANTITY}.` }
  const contactName = String(input?.contactName ?? "").trim().replace(/\s+/g, " ").slice(0, 80)
  const contactPhone = String(input?.contactPhone ?? "").replace(/\s/g, "")
  const note = String(input?.note ?? "").trim().slice(0, 500)
  if (contactName.length < 2) return { ok: false, error: "Vui lòng nhập tên người liên hệ." }
  if (!/^0\d{9}$/.test(contactPhone)) return { ok: false, error: "Số điện thoại cần 10 chữ số, bắt đầu bằng 0." }

  const payload = await getPayloadClient()
  // Check every shop before writing anything, so a send never half-succeeds.
  const { docs: shops } = await payload.find({
    collection: "users",
    where: { id: { in: shopIds } },
    limit: shopIds.length,
    depth: 0,
    overrideAccess: true,
    select: { name: true, sellerStatus: true, seller: { shopName: true, customJersey: true } },
  })
  for (const id of shopIds) {
    const shop = shops.find((doc) => String(doc.id) === id)
    const custom = shop?.seller?.customJersey
    if (!shop || shop.sellerStatus !== "approved" || !custom?.enabled) return { ok: false, error: "Có shop đã ngừng nhận may áo custom. Vui lòng tải lại trang." }
    const min = Math.max(1, Number(custom.minQuantity ?? 1))
    if (quantity < min) return { ok: false, error: `${shop.seller?.shopName || shop.name} nhận đơn từ ${min} áo trở lên.` }
  }

  try {
    const saved = await persistDesign(user, input.designId, input.name, input.draft)
    if (!saved.ok) return { ok: false, error: saved.error === "NAME_REQUIRED" ? "Vui lòng đặt tên cho thiết kế." : "Không tìm thấy thiết kế." }
    for (const shop of shopIds) {
      await payload.create({
        collection: "custom-jersey-requests",
        user,
        overrideAccess: false,
        data: {
          customer: user.id,
          shop,
          design: saved.id,
          designName: saved.name,
          ...input.draft,
          quantity,
          contactName,
          contactPhone,
          note,
          status: "pending",
        },
      })
    }
    return { ok: true, designId: saved.id, sent: shopIds.length }
  } catch (error) {
    return { ok: false, error: failure(error, "Không thể gửi mẫu lúc này. Vui lòng thử lại.") }
  }
}

export type MyCustomRequest = {
  id: string
  code: string
  shopId: string
  shopName: string
  designName: string
  quantity: number
  status: CustomStatus
  quotePrice: number | null
  sellerReply: string
  createdAt: string
  shirtColor: string
  /** Order placed from the accepted quote (delivery is tracked there). */
  order: { code: string; status: string } | null
}

const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")

/** Order codes/statuses for linked orders (customers read their own orders). */
async function linkedOrders(orderIds: string[], user: NonNullable<Awaited<ReturnType<typeof appAuth.currentUser>>>) {
  const ids = [...new Set(orderIds.filter(Boolean))]
  if (!ids.length) return new Map<string, { code: string; status: string }>()
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "orders",
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: false,
    user,
    select: { code: true, status: true },
  })
  return new Map(docs.map((o) => [String(o.id), { code: o.code, status: o.status }]))
}

export async function listMyCustomRequestsAction(): Promise<MyCustomRequest[]> {
  const user = await appAuth.currentUser()
  if (!user) return []
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    user,
    overrideAccess: false,
    where: { customer: { equals: user.id } },
    sort: "-createdAt",
    limit: 50,
    depth: 0,
    // Danh sách không cần bản thiết kế (có thể chứa ảnh logo/họa tiết nặng); chi tiết tải riêng.
    select: { code: true, shop: true, shopName: true, designName: true, quantity: true, status: true, quotePrice: true, sellerReply: true, createdAt: true, shirtColor: true, order: true },
  })
  const orders = await linkedOrders(docs.map((doc) => relId(doc.order)), user)
  return docs.map((doc) => ({
    id: String(doc.id),
    code: doc.code ?? "",
    shopId: typeof doc.shop === "object" ? String(doc.shop.id) : String(doc.shop),
    shopName: doc.shopName ?? "Shop",
    designName: doc.designName,
    quantity: doc.quantity,
    status: doc.status as CustomStatus,
    quotePrice: doc.quotePrice ?? null,
    sellerReply: doc.sellerReply ?? "",
    createdAt: doc.createdAt,
    shirtColor: doc.shirtColor,
    order: orders.get(relId(doc.order)) ?? null,
  }))
}

export type MyCustomRequestDetail = MyCustomRequest & {
  art: unknown
  printColor: string
  material: "cotton" | "polyester" | "woven" | "cool"
  jerseySize: "S" | "M" | "L" | "XL" | "XXL"
  contactName: string
  contactPhone: string
  note: string
  updatedAt: string
  counterOffer: number | null
  customerNote: string
  history: { status: CustomStatus; at: string; actor: "customer" | "shop" | "system"; note: string | null }[]
}

/** Chi tiết một yêu cầu của chính khách (mở từ thông báo hoặc danh sách). */
export async function getMyCustomRequestAction(id: string): Promise<{ ok: true; request: MyCustomRequestDetail } | { ok: false; error: string }> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập để xem yêu cầu." }
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    user,
    overrideAccess: false,
    where: { and: [{ id: { equals: id } }, { customer: { equals: user.id } }] },
    limit: 1,
    depth: 0,
  })
  const doc = docs[0]
  if (!doc) return { ok: false, error: "Không tìm thấy yêu cầu này." }
  const orders = await linkedOrders([relId(doc.order)], user)
  return {
    ok: true,
    request: {
      order: orders.get(relId(doc.order)) ?? null,
      counterOffer: doc.counterOffer ?? null,
      customerNote: doc.customerNote ?? "",
      history: (doc.history ?? []).map((row) => ({ status: row.status as CustomStatus, at: row.at, actor: row.actor, note: row.note ?? null })),
      id: String(doc.id),
      code: doc.code ?? "",
      shopId: typeof doc.shop === "object" ? String(doc.shop.id) : String(doc.shop),
      shopName: doc.shopName ?? "Shop",
      designName: doc.designName,
      quantity: doc.quantity,
      status: doc.status as CustomStatus,
      quotePrice: doc.quotePrice ?? null,
      sellerReply: doc.sellerReply ?? "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      shirtColor: doc.shirtColor,
      printColor: doc.printColor,
      material: doc.material,
      jerseySize: doc.jerseySize,
      contactName: doc.contactName,
      contactPhone: doc.contactPhone,
      note: doc.note ?? "",
      art: doc.art,
    },
  }
}

/** The request when the signed-in user is its customer. */
async function ownRequest(id: string) {
  const user = await appAuth.currentUser()
  if (!user) return { error: "Vui lòng đăng nhập." } as const
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { error: "Yêu cầu không hợp lệ." } as const
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    user,
    overrideAccess: false,
    where: { and: [{ id: { equals: id } }, { customer: { equals: user.id } }] },
    limit: 1,
    depth: 0,
  })
  const request = docs[0] as CustomJerseyRequest | undefined
  if (!request) return { error: "Không tìm thấy yêu cầu." } as const
  return { user, payload, request }
}

const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}₫`

/** Customer accepts the shop's current quote; the shop is notified and production waits for the order. */
export async function acceptCustomQuoteAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const found = await ownRequest(id)
  if ("error" in found) return { ok: false, error: found.error }
  const { user, payload, request } = found
  if (request.status !== "quoted" || !request.quotePrice) return { ok: false, error: "Yêu cầu chưa có báo giá để chấp nhận." }
  try {
    await payload.update({ collection: "custom-jersey-requests", id, user, overrideAccess: false, data: { status: "accepted", counterOffer: null } })
    await postRequestMessage(
      payload,
      request,
      user,
      `Mình đồng ý báo giá ${vnd(request.quotePrice)}/áo cho yêu cầu #${request.code} (${request.quantity} áo, tạm tính ${vnd(request.quotePrice * request.quantity)}). Mình sẽ đặt đơn ngay.`,
    )
    return { ok: true }
  } catch (error) {
    return { ok: false, error: failure(error, "Không thể chấp nhận báo giá.") }
  }
}

/** Customer declines the price but keeps talking: the request goes back to the shop for a new quote. */
export async function negotiateCustomQuoteAction(id: string, input: { counterOffer?: number | null; note: string }): Promise<{ ok: boolean; error?: string }> {
  const found = await ownRequest(id)
  if ("error" in found) return { ok: false, error: found.error }
  const { user, payload, request } = found
  if (request.status !== "quoted") return { ok: false, error: "Chỉ thương lượng được khi shop đã báo giá." }
  const note = String(input?.note ?? "").trim().replace(/\s+/g, " ").slice(0, 500)
  const offer = input?.counterOffer == null ? null : Math.floor(Number(input.counterOffer))
  if (offer !== null && !(offer > 0 && offer <= 10_000_000)) return { ok: false, error: "Giá đề nghị không hợp lệ." }
  if (!offer && note.length < 5) return { ok: false, error: "Hãy nhập giá mong muốn hoặc lời nhắn cho shop (ít nhất 5 ký tự)." }
  try {
    await payload.update({ collection: "custom-jersey-requests", id, user, overrideAccess: false, data: { status: "pending", counterOffer: offer, customerNote: note || null } })
    await postRequestMessage(
      payload,
      request,
      user,
      [`Về báo giá yêu cầu #${request.code}:`, offer ? `mình đề nghị ${vnd(offer)}/áo.` : null, note || null].filter(Boolean).join(" "),
    )
    return { ok: true }
  } catch (error) {
    return { ok: false, error: failure(error, "Không thể gửi đề nghị.") }
  }
}

export async function cancelCustomRequestAction(id: string, reason = ""): Promise<{ ok: boolean; error?: string }> {
  const found = await ownRequest(id)
  if ("error" in found) return { ok: false, error: found.error }
  const { user, payload, request } = found
  if (!CUSTOMER_CANCELLABLE.includes(request.status as CustomStatus)) return { ok: false, error: "Shop đã bắt đầu thực hiện, hãy nhắn tin với shop để hủy." }
  const note = String(reason ?? "").trim().replace(/\s+/g, " ").slice(0, 500)
  try {
    await payload.update({ collection: "custom-jersey-requests", id, user, overrideAccess: false, data: { status: "cancelled", ...(note ? { customerNote: note } : {}) } })
    if (note) await postRequestMessage(payload, request, user, `Mình hủy yêu cầu #${request.code}: ${note}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: failure(error, "Không thể hủy yêu cầu.") }
  }
}
