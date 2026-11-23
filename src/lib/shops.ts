import "server-only"
import { isSellerProfileIncomplete, SELLER_PROFILE_SELECT } from "./seller-profile"
import type { Payload } from "payload"
import type { ShopSearchItem } from "./search"
import { detectProvince, resolveProvince } from "./provinces"
import { summarizeRatings, type RatingSummary } from "./ratings"

export type PublicShop = {
  id: string
  name: string
  avatarUrl: string | null
  joinedAt: string
}

/** Public shop numbers, all computed from real reviews and orders. */
export type ShopStats = {
  rating: RatingSummary
  productCount: number
  inStockCount: number
  soldUnits: number
  deliveredOrders: number
  /** Delivered ÷ (delivered + cancelled); null before any order finishes. */
  completionRate: number | null
}

export const relationId = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: string | number }).id)
  return ""
}

const avatarUrlOf = (avatar: unknown) =>
  avatar && typeof avatar === "object" && "url" in avatar
    ? ((avatar as { url?: string | null }).url ?? null)
    : null

type SellerRecord = {
  id: string | number
  name?: string | null
  seller?: { shopName?: string | null } | null
  avatar?: unknown
  sellerStatus?: string | null
  createdAt: string
}

const toPublicShop = (user: SellerRecord): PublicShop => ({
  id: String(user.id),
  name: user.seller?.shopName?.trim() || user.name?.trim() || "Shop BOAI",
  avatarUrl: avatarUrlOf(user.avatar),
  joinedAt: user.createdAt,
})

// User records are private; only these storefront fields are ever exposed.
const PUBLIC_SELLER_SELECT = {
  name: true,
  seller: { shopName: true },
  avatar: true,
  sellerStatus: true,
  createdAt: true,
} as const

export async function getPublicShop(
  payload: Payload,
  id: string,
): Promise<PublicShop | null> {
  if (!id) return null
  const user = (await payload
    .findByID({
      collection: "users",
      id,
      depth: 1,
      overrideAccess: true,
      select: PUBLIC_SELLER_SELECT,
    })
    .catch(() => null)) as SellerRecord | null
  if (!user || user.sellerStatus !== "approved") return null
  return toPublicShop(user)
}

export async function listPublicShops(
  payload: Payload,
  products: { seller?: unknown }[],
): Promise<ShopSearchItem[]> {
  const counts = new Map<string, number>()
  for (const product of products) {
    const id = relationId(product.seller)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const { docs } = await payload.find({
    collection: "users",
    depth: 1,
    limit: 200,
    overrideAccess: true,
    where: { sellerStatus: { equals: "approved" } },
    select: PUBLIC_SELLER_SELECT,
  })
  return (docs as SellerRecord[])
    .map((user) => {
      const shop = toPublicShop(user)
      return {
        id: shop.id,
        name: shop.name,
        avatar: shop.avatarUrl ?? "",
        productCount: counts.get(shop.id) ?? 0,
      }
    })
    .sort((a, b) => b.productCount - a.productCount)
}

export async function getShopStats(
  payload: Payload,
  shop: PublicShop,
): Promise<ShopStats> {
  const { docs: products } = await payload.find({
    collection: "products",
    depth: 0,
    limit: 500,
    pagination: false,
    overrideAccess: false,
    where: { seller: { equals: shop.id } },
    select: { stock: true },
  })
  const productIds = products.map((product) => product.id)

  const [reviewResult, orderResult] = productIds.length
    ? await Promise.all([
        payload.find({
          collection: "reviews",
          depth: 0,
          limit: 5000,
          pagination: false,
          overrideAccess: false,
          where: { product: { in: productIds } },
          select: { rating: true },
        }),
        // Orders are private; only aggregate counts leave this function.
        payload.find({
          collection: "orders",
          depth: 0,
          limit: 1000,
          pagination: false,
          overrideAccess: true,
          where: { "items.product": { in: productIds } },
          select: { status: true, items: true },
        }),
      ])
    : [{ docs: [] }, { docs: [] }]

  // Average of every real review across the shop's products (1 decimal).
  const rating = summarizeRatings(reviewResult.docs)
  const ids = new Set(productIds.map(String))
  let deliveredOrders = 0
  let cancelledOrders = 0
  let soldUnits = 0
  for (const order of orderResult.docs) {
    if (order.status === "delivered") {
      deliveredOrders += 1
      for (const item of order.items ?? []) {
        if (ids.has(relationId(item.product))) soldUnits += item.quantity
      }
    } else if (order.status === "cancelled") cancelledOrders += 1
  }
  const finished = deliveredOrders + cancelledOrders
  return {
    rating,
    productCount: products.length,
    inStockCount: products.filter((p) => (p.stock ?? 0) > 0).length,
    soldUnits,
    deliveredOrders,
    completionRate: finished ? deliveredOrders / finished : null,
  }
}

export type CustomJerseyShop = {
  id: string
  name: string
  avatarUrl: string | null
  intro: string
  priceFrom: number | null
  /** Null when the shop has not set a minimum (a minimum of 1 means none). */
  minQuantity: number | null
  leadDays: number | null
  province: string
}

/** Approved shops that opted in to custom-jersey orders (public fields only). */
export async function listCustomJerseyShops(payload: Payload): Promise<CustomJerseyShop[]> {
  const { docs } = await payload.find({
    collection: "users",
    depth: 1,
    limit: 100,
    overrideAccess: true,
    where: { and: [{ sellerStatus: { equals: "approved" } }, { "seller.customJersey.enabled": { equals: true } }] },
    select: {
      ...SELLER_PROFILE_SELECT,
      avatar: true,
      createdAt: true,
      seller: { ...SELLER_PROFILE_SELECT.seller, customJersey: true },
    },
  })
  return docs
    // Company shops with an incomplete basic profile are paused.
    .filter((user) => !isSellerProfileIncomplete(user))
    .map((user) => {
      const custom = user.seller?.customJersey
      return {
        id: String(user.id),
        name: user.seller?.shopName?.trim() || user.name?.trim() || "Shop BOAI",
        avatarUrl: avatarUrlOf(user.avatar),
        intro: custom?.intro?.trim() ?? "",
        priceFrom: typeof custom?.priceFrom === "number" ? custom.priceFrom : null,
        minQuantity: Number(custom?.minQuantity) > 1 ? Number(custom?.minQuantity) : null,
        leadDays: typeof custom?.leadDays === "number" ? custom.leadDays : null,
        province: (resolveProvince(user.seller?.warehouseProvince) ?? detectProvince(user.seller?.warehouseAddress))?.name ?? "",
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"))
}
