import type { Product } from "@/payload-types"
import { dnaText, toDnaProduct, type EquipmentProfile } from "./sportdna"

export type ProductLite = {
  id: string
  slug: string
  name: string
  brand: string
  sport: string
  category: string
  price: number
  oldPrice?: number | null
  rating: number
  reviews: number
  match: number
  stock: number
  image: string
  /** First listed colour; quick-add uses it like the product page's default. */
  defaultColor?: string
  specs: ProductSpec[]
  text: string
  equipment: EquipmentProfile
}
type ProductSpec = {
  label: string
  value: string
}

export const toLite = (p: Product): ProductLite => ({
  id: String(p.id),
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  sport: p.sport,
  category: p.category,
  price: p.price,
  oldPrice: p.oldPrice,
  rating: p.rating,
  reviews: p.reviews,
  match: p.match,
  stock: p.stock,
  image: typeof p.image === "object" ? (p.image.url ?? "") : "",
  defaultColor: p.colors?.[0]?.name ?? undefined,
  specs: (p.specs ?? []).map((s) => ({ label: s.label, value: s.value })),
  text: dnaText(p),
  equipment: toDnaProduct(p).equipment,
})
