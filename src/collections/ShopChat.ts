import type { Access, CollectionConfig, FieldAccess, Where } from "payload"
import { APIError } from "payload"
import { CHAT_BANNED_MESSAGE, isChatBanned, isStaff } from "../access/roles"

const serverField: FieldAccess = () => false
const member: Access = ({ req }) => req.user?.collection === "users"
const deny = () => false

const idOf = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: string | number }).id)
  return ""
}

/** Buyers and sellers only ever see their own shop conversations. */
const participants: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  const where: Where = {
    or: [{ buyer: { equals: req.user.id } }, { seller: { equals: req.user.id } }],
  }
  return where
}

const fail = (message: string, status = 400) => new APIError(message, status, null, true)

export const ShopConversations: CollectionConfig = {
  slug: "shop-conversations",
  labels: { singular: "Hội thoại mua bán", plural: "Chat với shop" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "shopName",
    defaultColumns: ["shopName", "buyerName", "lastMessage", "lastMessageAt"],
  },
  // Activity fields are maintained by the message hook with overrideAccess.
  access: { create: member, read: participants, update: deny, delete: deny },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== "create" || req.context?.shopChatSystem) return data
        if (!data || req.user?.collection !== "users")
          throw fail("Vui lòng đăng nhập để chat với shop.", 401)
        if (isChatBanned(req.user)) throw fail(CHAT_BANNED_MESSAGE, 403)

        // The shop is resolved from trusted records, never from client names.
        let sellerId = idOf(data.seller)
        const productId = idOf(data.product)
        if (productId) {
          const product = await req.payload
            .findByID({ collection: "products", id: productId, depth: 0, overrideAccess: true, select: { seller: true }, req })
            .catch(() => null)
          if (!product) throw fail("Sản phẩm không tồn tại.")
          const owner = idOf(product.seller)
          if (!owner) throw fail("Sản phẩm này chưa có shop để liên hệ.")
          if (sellerId && sellerId !== owner) throw fail("Sản phẩm không thuộc shop này.")
          sellerId = owner
        }
        if (!sellerId) throw fail("Hãy chọn shop để liên hệ.")
        if (sellerId === String(req.user.id)) throw fail("Bạn không thể tự chat với shop của mình.")
        const seller = await req.payload
          .findByID({ collection: "users", id: sellerId, depth: 0, overrideAccess: true, select: { name: true, seller: { shopName: true }, sellerStatus: true }, req })
          .catch(() => null)
        if (!seller || seller.sellerStatus !== "approved") throw fail("Shop này hiện không nhận tin nhắn.")

        data.buyer = req.user.id
        data.seller = sellerId
        data.product = productId || null
        data.buyerName = req.user.name
        data.shopName = seller.seller?.shopName?.trim() || seller.name
        data.key = `${req.user.id}:${sellerId}`
        data.lastMessageAt = new Date().toISOString()
        data.buyerUnread = 0
        data.sellerUnread = 0
        return data
      },
    ],
  },
  fields: [
    { name: "buyer", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    // Client may name the shop; the hook verifies it is an approved seller.
    { name: "seller", type: "relationship", relationTo: "users", required: true, index: true, access: { update: serverField } },
    { name: "product", label: "Sản phẩm đang hỏi", type: "relationship", relationTo: "products", access: { update: serverField } },
    // Latest custom-jersey request discussed in this thread (drives the "Custom áo" inbox filter).
    { name: "customRequest", label: "Yêu cầu may custom", type: "relationship", relationTo: "custom-jersey-requests", access: { create: serverField, update: serverField } },
    { name: "buyerName", type: "text", required: true, access: { create: serverField, update: serverField } },
    { name: "shopName", type: "text", required: true, access: { create: serverField, update: serverField } },
    { name: "key", type: "text", required: true, unique: true, index: true, access: { create: serverField, update: serverField, read: serverField } },
    { name: "lastMessage", type: "text", access: { create: serverField, update: serverField } },
    { name: "lastSender", type: "select", options: ["buyer", "seller"], access: { create: serverField, update: serverField } },
    { name: "lastMessageAt", type: "date", index: true, access: { create: serverField, update: serverField } },
    { name: "buyerUnread", type: "number", defaultValue: 0, min: 0, access: { create: serverField, update: serverField } },
    { name: "sellerUnread", type: "number", defaultValue: 0, min: 0, access: { create: serverField, update: serverField } },
  ],
}

export const ShopMessages: CollectionConfig = {
  slug: "shop-messages",
  labels: { singular: "Tin nhắn với shop", plural: "Tin nhắn với shop" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "senderName",
    defaultColumns: ["senderName", "senderRole", "body", "createdAt"],
  },
  access: { create: member, read: participants, update: deny, delete: deny },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== "create") return data
        if (!data || req.user?.collection !== "users")
          throw fail("Vui lòng đăng nhập để nhắn tin.", 401)
        if (isChatBanned(req.user)) throw fail(CHAT_BANNED_MESSAGE, 403)
        const conversation = await req.payload
          .findByID({ collection: "shop-conversations", id: idOf(data.conversation), depth: 0, overrideAccess: true, req })
          .catch(() => null)
        if (!conversation) throw fail("Cuộc trò chuyện không tồn tại.")
        const buyer = idOf(conversation.buyer)
        const seller = idOf(conversation.seller)
        const me = String(req.user.id)
        if (me !== buyer && me !== seller) throw fail("Bạn không thuộc cuộc trò chuyện này.", 403)

        const body = typeof data.body === "string" ? data.body.replace(/\r\n/g, "\n").trim() : ""
        if (!body) throw fail("Tin nhắn không được để trống.")
        if (body.length > 1000) throw fail("Tin nhắn tối đa 1000 ký tự.")

        const productId = idOf(data.product)
        if (productId) {
          const product = await req.payload
            .findByID({ collection: "products", id: productId, depth: 0, overrideAccess: true, select: { seller: true }, req })
            .catch(() => null)
          if (!product || idOf(product.seller) !== seller) throw fail("Sản phẩm không thuộc shop này.")
        }

        // A custom-jersey request may be attached only by its own customer or shop.
        const requestId = idOf(data.customRequest)
        if (requestId) {
          const request = await req.payload
            .findByID({ collection: "custom-jersey-requests", id: requestId, depth: 0, overrideAccess: true, select: { customer: true, shop: true }, req })
            .catch(() => null)
          if (!request || idOf(request.customer) !== buyer || idOf(request.shop) !== seller)
            throw fail("Yêu cầu may áo không thuộc cuộc trò chuyện này.")
        }
        data.customRequest = requestId || null

        data.buyer = buyer
        data.seller = seller
        data.sender = me
        data.senderRole = me === seller ? "seller" : "buyer"
        data.senderName = me === seller ? conversation.shopName : req.user.name
        data.body = body
        data.product = productId || null
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== "create") return doc
        const conversationId = idOf(doc.conversation)
        const conversation = await req.payload
          .findByID({ collection: "shop-conversations", id: conversationId, depth: 0, overrideAccess: true, req })
          .catch(() => null)
        if (!conversation) return doc
        const fromSeller = doc.senderRole === "seller"
        await req.payload.update({
          collection: "shop-conversations",
          id: conversationId,
          overrideAccess: true,
          context: { shopChatSystem: true },
          req,
          data: {
            lastMessage: String(doc.body).slice(0, 140),
            lastSender: fromSeller ? "seller" : "buyer",
            lastMessageAt: doc.createdAt,
            ...(doc.product ? { product: idOf(doc.product) } : {}),
            ...(doc.customRequest ? { customRequest: idOf(doc.customRequest) } : {}),
            buyerUnread: fromSeller ? (conversation.buyerUnread ?? 0) + 1 : 0,
            sellerUnread: fromSeller ? 0 : (conversation.sellerUnread ?? 0) + 1,
          },
        })
        return doc
      },
    ],
  },
  fields: [
    { name: "conversation", type: "relationship", relationTo: "shop-conversations", required: true, index: true, access: { update: serverField } },
    { name: "buyer", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "seller", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "sender", type: "relationship", relationTo: "users", required: true, access: { create: serverField, update: serverField } },
    { name: "senderRole", type: "select", required: true, options: ["buyer", "seller"], access: { create: serverField, update: serverField } },
    { name: "senderName", type: "text", required: true, access: { create: serverField, update: serverField } },
    { name: "body", type: "textarea", required: true, maxLength: 1000 },
    { name: "product", label: "Sản phẩm đính kèm", type: "relationship", relationTo: "products", access: { update: serverField } },
    { name: "customRequest", label: "Yêu cầu may custom đính kèm", type: "relationship", relationTo: "custom-jersey-requests", access: { update: serverField } },
  ],
}
