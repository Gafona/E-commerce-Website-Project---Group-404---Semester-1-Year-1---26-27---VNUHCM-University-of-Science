import "server-only"
import type { Payload } from "payload"
import type { CustomJerseyRequest, User } from "@/payload-types"

const idOf = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : ""

/**
 * The buyer–shop conversation (one per pair), created with system access when
 * needed. Either side may start it: e.g. a shop replying to a custom-jersey
 * request before the customer ever wrote.
 */
export async function ensureShopConversation(payload: Payload, buyerId: string, sellerId: string) {
  const { docs } = await payload.find({
    collection: "shop-conversations",
    where: { and: [{ buyer: { equals: buyerId } }, { seller: { equals: sellerId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs[0]) return docs[0]
  const [buyer, seller] = await Promise.all([
    payload.findByID({ collection: "users", id: buyerId, depth: 0, overrideAccess: true, select: { name: true } }),
    payload.findByID({ collection: "users", id: sellerId, depth: 0, overrideAccess: true, select: { name: true, seller: { shopName: true }, sellerStatus: true } }),
  ])
  try {
    return await payload.create({
      collection: "shop-conversations",
      overrideAccess: true,
      context: { shopChatSystem: true },
      data: {
        buyer: buyerId,
        seller: sellerId,
        buyerName: buyer.name,
        shopName: seller.seller?.shopName?.trim() || seller.name,
        key: `${buyerId}:${sellerId}`,
        lastMessageAt: new Date().toISOString(),
        buyerUnread: 0,
        sellerUnread: 0,
      },
    })
  } catch {
    // Another request created it first (unique key).
    const retry = await payload.find({
      collection: "shop-conversations",
      where: { and: [{ buyer: { equals: buyerId } }, { seller: { equals: sellerId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!retry.docs[0]) throw new Error("Không thể mở cuộc trò chuyện.")
    return retry.docs[0]
  }
}

/**
 * Posts a message about a custom-jersey request into the customer–shop thread,
 * as the real sender (collection hooks still verify membership and bans).
 * Never throws: a chat hiccup must not undo the status change it describes.
 */
export async function postRequestMessage(
  payload: Payload,
  request: Pick<CustomJerseyRequest, "id" | "customer" | "shop">,
  sender: User & { collection: "users" },
  body: string,
) {
  try {
    const conversation = await ensureShopConversation(payload, idOf(request.customer), idOf(request.shop))
    await payload.create({
      collection: "shop-messages",
      overrideAccess: false,
      user: sender,
      data: { conversation: conversation.id, body: body.slice(0, 1000), customRequest: String(request.id) } as never,
    })
  } catch (error) {
    console.error("postRequestMessage failed", error)
  }
}
