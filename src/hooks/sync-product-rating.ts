import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from "payload"
import { revalidatePath } from "next/cache"
import { summarizeRatings } from "../lib/ratings"
import { relId } from "../lib/notifications"

const safeRevalidate = (...paths: (string | null | undefined)[]) => {
  for (const path of paths) {
    if (!path) continue
    try {
      revalidatePath(path)
    } catch {
      // Outside a Next.js request (CLI, seeds) there is nothing to revalidate.
      return
    }
  }
}

/**
 * Recomputes a product's stored `rating` (mean, 1 decimal) and `reviews`
 * (count) from its real reviews, so cards, the product page and shop pages
 * never show catalogue numbers.
 */
export async function syncProductRating(req: PayloadRequest, productId: string) {
  if (!productId) return
  const product = await req.payload
    .findByID({ collection: "products", id: productId, depth: 0, overrideAccess: true, select: { slug: true, seller: true }, req })
    .catch(() => null)
  if (!product) return
  const { docs } = await req.payload.find({
    collection: "reviews",
    where: { product: { equals: productId } },
    depth: 0,
    pagination: false,
    limit: 5000,
    overrideAccess: true,
    select: { rating: true },
    req,
  })
  const summary = summarizeRatings(docs)
  await req.payload.update({
    collection: "products",
    id: productId,
    data: { rating: summary.average ?? 0, reviews: summary.count },
    depth: 0,
    overrideAccess: true,
    context: { ratingSync: true },
    req,
  })
  const sellerId = relId(product.seller)
  safeRevalidate(product.slug ? `/san-pham/${product.slug}` : null, sellerId ? `/cua-hang/${sellerId}` : null, "/", "/tim-kiem")
}

export const syncRatingAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const current = relId(doc?.product)
  const previous = relId(previousDoc?.product)
  await syncProductRating(req, current)
  if (previous && previous !== current) await syncProductRating(req, previous)
  return doc
}

export const syncRatingAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await syncProductRating(req, relId(doc?.product))
  return doc
}
