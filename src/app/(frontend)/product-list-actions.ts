"use server"

import type { Where } from "payload"
import { getPayloadClient } from "@/lib/payload"
import { applyActiveEventPricing } from "@/lib/event-pricing"
import { toLite, type ProductLite } from "@/lib/product-lite"

const SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/

/** Exactly the saved products (wishlist / compare), in the order given. */
export async function loadProductsBySlugsAction(slugs: string[]): Promise<ProductLite[]> {
  const wanted = [...new Set((Array.isArray(slugs) ? slugs : []).map(String).filter((s) => SLUG.test(s)))].slice(0, 100)
  if (!wanted.length) return []
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "products",
    where: { slug: { in: wanted } },
    depth: 1,
    limit: wanted.length,
    overrideAccess: false,
  })
  const priced = (await applyActiveEventPricing(payload, docs)).map(toLite)
  return wanted.map((slug) => priced.find((p) => p.slug === slug)).filter((p): p is ProductLite => !!p)
}

/** Compare picker: search one sport's whole catalogue (not just the first page). */
export async function searchCompareProductsAction(input: { sport: string; query?: string; category?: string; exclude?: string[] }): Promise<{ items: ProductLite[]; categories: string[] }> {
  const sport = input?.sport === "badminton" ? "badminton" : "football"
  const query = String(input?.query ?? "").trim().slice(0, 60)
  const category = String(input?.category ?? "").trim().slice(0, 80)
  const exclude = (Array.isArray(input?.exclude) ? input.exclude : []).map(String).slice(0, 2)
  const payload = await getPayloadClient()
  const where: Where = {
    and: [
      { sport: { equals: sport } },
      ...(category ? [{ category: { equals: category } }] : []),
      ...(exclude.length ? [{ slug: { not_in: exclude } }] : []),
      ...(query ? [{ or: [{ name: { like: query } }, { brand: { like: query } }, { category: { like: query } }] }] : []),
    ],
  }
  const [found, all] = await Promise.all([
    payload.find({ collection: "products", where, depth: 1, limit: 6, sort: "-match", overrideAccess: false }),
    payload.find({ collection: "products", where: { sport: { equals: sport } }, depth: 0, pagination: false, select: { category: true }, overrideAccess: false }),
  ])
  const items = (await applyActiveEventPricing(payload, found.docs)).map(toLite)
  const categories = [...new Set(all.docs.map((p) => p.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi"))
  return { items, categories }
}

/**
 * Current selling price (including a live event discount) for the products in
 * a cart, so the cart, checkout and the order all show the same price as the
 * product page even when the seller changed it after the line was added.
 */
export async function cartPricesAction(ids: string[]): Promise<Record<string, number>> {
  const wanted = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter((id) => /^[\w-]{1,64}$/.test(id)))].slice(0, 50)
  if (!wanted.length) return {}
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "products",
    where: { id: { in: wanted } },
    depth: 0,
    limit: wanted.length,
    overrideAccess: false,
  })
  const priced = await applyActiveEventPricing(payload, docs)
  return Object.fromEntries(priced.map((product) => [String(product.id), product.price]))
}
