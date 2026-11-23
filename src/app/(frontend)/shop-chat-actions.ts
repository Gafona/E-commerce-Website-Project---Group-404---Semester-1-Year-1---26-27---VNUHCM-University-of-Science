"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getPublicShop, relationId } from "@/lib/shops"
import { ensureShopConversation } from "@/lib/shop-chat-server"
import type { ShopConversation, User } from "@/payload-types"

export type ChatProductView = { id: string; name: string; slug: string; image: string | null }
/** A custom-jersey request referenced in the chat (opens the request detail). */
export type ChatCustomView = { id: string; code: string }
export type ChatMessageView = {
  id: string
  body: string
  mine: boolean
  role: "buyer" | "seller"
  senderName: string
  createdAt: string
  product: ChatProductView | null
  custom: ChatCustomView | null
}
export type ChatThreadView = {
  conversationId: string | null
  role: "buyer" | "seller"
  title: string
  avatarUrl: string | null
  shopId: string
  /** The other party for seller threads (the buyer); not exposed for buyers. */
  messages: ChatMessageView[]
}
export type ChatInboxItem = {
  id: string
  title: string
  lastMessage: string
  lastMessageAt: string
  lastFromMe: boolean
  unread: number
  product: ChatProductView | null
  custom: ChatCustomView | null
  avatarUrl: string | null
}

type Fail = { ok: false; error: string }
type AppUser = User & { collection: "users" }

const fail = (error: string): Fail => ({ ok: false, error })
const cleanId = (value: unknown) => {
  const id = String(value ?? "").trim()
  return /^[\w-]{1,64}$/.test(id) ? id : ""
}
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message && !/^\d+$/.test(error.message) ? error.message : fallback

async function viewer() {
  return (await appAuth.currentUser()) as AppUser | null
}

async function productViews(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, ChatProductView>()
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "products",
    where: { id: { in: unique } },
    depth: 1,
    limit: unique.length,
    overrideAccess: false,
    select: { name: true, slug: true, image: true },
  })
  return new Map(
    docs.map((p) => [
      String(p.id),
      {
        id: String(p.id),
        name: p.name,
        slug: p.slug,
        image: typeof p.image === "object" && p.image ? (p.image.url ?? null) : null,
      },
    ]),
  )
}

/** Codes of custom-jersey requests the viewer may read (participants only). */
async function customViews(ids: string[], user: AppUser) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, ChatCustomView>()
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    where: { id: { in: unique } },
    depth: 0,
    limit: unique.length,
    overrideAccess: false,
    user,
    select: { code: true },
  })
  return new Map(docs.map((r) => [String(r.id), { id: String(r.id), code: r.code ?? "" }]))
}

async function loadMessages(conversation: ShopConversation, user: AppUser): Promise<ChatMessageView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "shop-messages",
    where: { conversation: { equals: conversation.id } },
    sort: "-createdAt",
    limit: 80,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const [products, customs] = await Promise.all([
    productViews(docs.map((m) => relationId(m.product))),
    customViews(docs.map((m) => relationId(m.customRequest)), user),
  ])
  return docs
    .map((m) => ({
      id: String(m.id),
      body: m.body,
      mine: relationId(m.sender) === String(user.id),
      role: m.senderRole,
      senderName: m.senderName,
      createdAt: m.createdAt,
      product: products.get(relationId(m.product)) ?? null,
      custom: customs.get(relationId(m.customRequest)) ?? null,
    }))
    .reverse()
}

/** Clears the viewer's unread counter; activity fields are server-owned. */
async function markRead(conversation: ShopConversation, role: "buyer" | "seller") {
  const field = role === "buyer" ? "buyerUnread" : "sellerUnread"
  if (!conversation[field]) return
  const payload = await getPayloadClient()
  await payload.update({
    collection: "shop-conversations",
    id: conversation.id,
    overrideAccess: true,
    context: { shopChatSystem: true },
    data: { [field]: 0 },
  })
}

async function threadFor(conversation: ShopConversation, user: AppUser): Promise<ChatThreadView> {
  const role = relationId(conversation.seller) === String(user.id) ? "seller" : "buyer"
  const shopId = relationId(conversation.seller)
  const shop = role === "buyer" ? await getPublicShop(await getPayloadClient(), shopId) : null
  const messages = await loadMessages(conversation, user)
  await markRead(conversation, role)
  return {
    conversationId: String(conversation.id),
    role,
    title: role === "buyer" ? (shop?.name ?? conversation.shopName) : conversation.buyerName,
    avatarUrl: shop?.avatarUrl ?? null,
    shopId,
    messages,
  }
}

async function findBuyerConversation(user: AppUser, shopId: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "shop-conversations",
    where: { and: [{ buyer: { equals: user.id } }, { seller: { equals: shopId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  return docs[0] ?? null
}

async function participantConversation(user: AppUser, conversationId: string) {
  const payload = await getPayloadClient()
  return payload
    .findByID({ collection: "shop-conversations", id: conversationId, depth: 0, overrideAccess: false, user })
    .catch(() => null)
}

/** The custom request, if the viewer is its customer or shop. */
async function participantRequest(user: AppUser, requestId: string) {
  if (!requestId) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    where: { id: { equals: requestId } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
    select: { customer: true, shop: true, shopName: true, contactName: true, code: true },
  })
  return docs[0] ?? null
}

export type OpenShopChatResult =
  | { ok: true; viewer: "guest"; shopName: string }
  | { ok: true; viewer: "owner"; shopName: string }
  | { ok: true; viewer: "buyer"; thread: ChatThreadView }
  | Fail

/** Opens the buyer's thread with a shop (from a product or shop page). */
export async function openShopChatAction(input: { shopId: string }): Promise<OpenShopChatResult> {
  const shopId = cleanId(input?.shopId)
  const payload = await getPayloadClient()
  const shop = shopId ? await getPublicShop(payload, shopId) : null
  if (!shop) return fail("Shop này hiện không nhận tin nhắn.")
  const user = await viewer()
  if (!user) return { ok: true, viewer: "guest", shopName: shop.name }
  if (String(user.id) === shop.id) return { ok: true, viewer: "owner", shopName: shop.name }
  try {
    const conversation = await findBuyerConversation(user, shop.id)
    if (conversation) return { ok: true, viewer: "buyer", thread: await threadFor(conversation, user) }
    return {
      ok: true,
      viewer: "buyer",
      thread: { conversationId: null, role: "buyer", title: shop.name, avatarUrl: shop.avatarUrl, shopId: shop.id, messages: [] },
    }
  } catch {
    return fail("Không thể mở khung chat. Hãy thử lại.")
  }
}

export type ThreadResult = { ok: true; thread: ChatThreadView } | Fail

export async function loadShopThreadAction(conversationId: string): Promise<ThreadResult> {
  const user = await viewer()
  if (!user) return fail("Vui lòng đăng nhập.")
  const conversation = await participantConversation(user, cleanId(conversationId))
  if (!conversation) return fail("Không tìm thấy cuộc trò chuyện.")
  try {
    return { ok: true, thread: await threadFor(conversation, user) }
  } catch {
    return fail("Không thể tải tin nhắn.")
  }
}

/**
 * Thread between a custom request's customer and shop, opened from the request
 * itself (either side). Returns an empty thread until the first message.
 */
export async function openRequestChatAction(requestId: string): Promise<ThreadResult> {
  const user = await viewer()
  if (!user) return fail("Vui lòng đăng nhập.")
  const request = await participantRequest(user, cleanId(requestId))
  if (!request) return fail("Không tìm thấy yêu cầu.")
  const buyerId = relationId(request.customer)
  const sellerId = relationId(request.shop)
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "shop-conversations",
    where: { and: [{ buyer: { equals: buyerId } }, { seller: { equals: sellerId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  if (docs[0]) return { ok: true, thread: await threadFor(docs[0], user) }
  const role = String(user.id) === sellerId ? "seller" : "buyer"
  const shop = role === "buyer" ? await getPublicShop(payload, sellerId) : null
  return {
    ok: true,
    thread: {
      conversationId: null,
      role,
      title: role === "buyer" ? (shop?.name ?? request.shopName ?? "Shop") : request.contactName,
      avatarUrl: shop?.avatarUrl ?? null,
      shopId: sellerId,
      messages: [],
    },
  }
}

export async function sendShopMessageAction(input: {
  body: string
  conversationId?: string | null
  shopId?: string
  productId?: string | null
  /** Attach a custom-jersey request; also lets either side start the thread from the request. */
  customRequestId?: string | null
}): Promise<ThreadResult> {
  const user = await viewer()
  if (!user) return fail("Vui lòng đăng nhập để nhắn tin với shop.")
  const body = String(input?.body ?? "").trim()
  if (!body) return fail("Tin nhắn không được để trống.")
  if (body.length > 1000) return fail("Tin nhắn tối đa 1000 ký tự.")
  const productId = cleanId(input?.productId) || null
  const customRequestId = cleanId(input?.customRequestId) || null
  const payload = await getPayloadClient()

  try {
    const recent = await payload.count({
      collection: "shop-messages",
      where: { and: [{ sender: { equals: user.id } }, { createdAt: { greater_than: new Date(Date.now() - 60_000).toISOString() } }] },
      overrideAccess: false,
      user,
    })
    if (recent.totalDocs >= 20) return fail("Bạn gửi quá nhanh, vui lòng chờ một chút.")

    let conversation: ShopConversation | null = null
    const conversationId = cleanId(input?.conversationId)
    if (conversationId) {
      conversation = await participantConversation(user, conversationId)
      if (!conversation) return fail("Không tìm thấy cuộc trò chuyện.")
    } else if (customRequestId) {
      const request = await participantRequest(user, customRequestId)
      if (!request) return fail("Không tìm thấy yêu cầu.")
      conversation = await ensureShopConversation(payload, relationId(request.customer), relationId(request.shop))
    } else {
      const shopId = cleanId(input?.shopId)
      if (!shopId) return fail("Hãy chọn shop để liên hệ.")
      conversation =
        (await findBuyerConversation(user, shopId)) ??
        (await payload.create({
          collection: "shop-conversations",
          data: { seller: shopId, product: productId } as never,
          overrideAccess: false,
          user,
        }))
    }

    await payload.create({
      collection: "shop-messages",
      data: { conversation: conversation.id, body, product: productId, customRequest: customRequestId } as never,
      overrideAccess: false,
      user,
    })
    const fresh = await participantConversation(user, String(conversation.id))
    return { ok: true, thread: await threadFor(fresh ?? conversation, user) }
  } catch (error) {
    return fail(errorText(error, "Không thể gửi tin nhắn. Hãy thử lại."))
  }
}

export type InboxResult = { ok: true; items: ChatInboxItem[] } | Fail

/** Shop conversations where the viewer is the buyer or (for approved sellers) the shop. */
export async function loadShopInboxAction(role: "buyer" | "seller"): Promise<InboxResult> {
  const user = await viewer()
  if (!user) return fail("Vui lòng đăng nhập.")
  if (role === "seller" && user.sellerStatus !== "approved") return fail("Bạn chưa là người bán.")
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "shop-conversations",
    where: { [role]: { equals: user.id } },
    sort: "-lastMessageAt",
    limit: 100,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const [products, customs] = await Promise.all([
    productViews(docs.map((c) => relationId(c.product))),
    customViews(docs.map((c) => relationId(c.customRequest)), user),
  ])
  // Conversations snapshot the shop name; show the current one (and avatar) after a rename.
  const shops = new Map<string, { name: string; avatarUrl: string | null }>()
  if (role === "buyer") {
    const sellerIds = [...new Set(docs.map((c) => relationId(c.seller)))]
    const found = await Promise.all(sellerIds.map((id) => getPublicShop(payload, id)))
    for (const shop of found) if (shop) shops.set(shop.id, { name: shop.name, avatarUrl: shop.avatarUrl })
  }
  return {
    ok: true,
    items: docs
      .filter((c) => c.lastMessage)
      .map((c) => ({
        id: String(c.id),
        title: role === "seller" ? c.buyerName : (shops.get(relationId(c.seller))?.name ?? c.shopName),
        lastMessage: c.lastMessage ?? "",
        lastMessageAt: c.lastMessageAt ?? c.updatedAt,
        lastFromMe: c.lastSender === role,
        unread: (role === "seller" ? c.sellerUnread : c.buyerUnread) ?? 0,
        product: products.get(relationId(c.product)) ?? null,
        custom: customs.get(relationId(c.customRequest)) ?? null,
        avatarUrl: role === "buyer" ? (shops.get(relationId(c.seller))?.avatarUrl ?? null) : null,
      })),
  }
}
