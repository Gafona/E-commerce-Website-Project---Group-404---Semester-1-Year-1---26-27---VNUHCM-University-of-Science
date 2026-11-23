/**
 * One filter + sort model for the home catalogue and /tim-kiem: the same
 * predicates produce the results and every facet count, and the state
 * round-trips through the URL so a shared link keeps its filters.
 */
import { PRODUCT_TYPES, deriveProductType, isProductType, type ProductTypeId } from "./product-types"
import { APPAREL_SIZES, SHOE_SIZES, sizeOptionsFor } from "./product-size"
import { hasDiscount } from "./pricing"

export type SortKey = "relevance" | "newest" | "price-asc" | "price-desc" | "rating"
export type SportFilter = "all" | "football" | "badminton"

export const SORT_OPTIONS: { key: SortKey; param: string; vi: string; en: string }[] = [
  { key: "relevance", param: "phu-hop", vi: "Phù hợp nhất", en: "Best match" },
  { key: "newest", param: "moi-nhat", vi: "Mới nhất", en: "Newest" },
  { key: "price-asc", param: "gia-tang", vi: "Giá tăng dần", en: "Price: low to high" },
  { key: "price-desc", param: "gia-giam", vi: "Giá giảm dần", en: "Price: high to low" },
  { key: "rating", param: "danh-gia", vi: "Đánh giá cao", en: "Top rated" },
]

export type CatalogFilters = {
  sport: SportFilter
  type: ProductTypeId | "all"
  brands: string[]
  priceMin: number | null
  priceMax: number | null
  sizes: string[]
  colors: string[]
  inStock: boolean
  onSale: boolean
  sort: SortKey
}

export const EMPTY_FILTERS: CatalogFilters = {
  sport: "all",
  type: "all",
  brands: [],
  priceMin: null,
  priceMax: null,
  sizes: [],
  colors: [],
  inStock: false,
  onSale: false,
  sort: "relevance",
}

export const PRICE_PRESETS: { min: number | null; max: number | null; vi: string; en: string }[] = [
  { min: null, max: 500_000, vi: "Dưới 500K", en: "Under 500K" },
  { min: 500_000, max: 1_500_000, vi: "500K – 1,5 triệu", en: "500K – 1.5M" },
  { min: 1_500_000, max: 3_000_000, vi: "1,5 – 3 triệu", en: "1.5M – 3M" },
  { min: 3_000_000, max: 5_000_000, vi: "3 – 5 triệu", en: "3M – 5M" },
  { min: 5_000_000, max: null, vi: "Trên 5 triệu", en: "Over 5M" },
]

/** The fields the catalogue needs from a product (works for PricedProduct). */
export type CatalogProduct = {
  id: string | number
  name: string
  sport: string
  brand: string
  category: string
  productType?: string | null
  price: number
  oldPrice?: number | null
  stock: number
  rating?: number | null
  reviews?: number | null
  createdAt?: string
  colors?: { name: string; hex: string }[] | null
  specs?: { label: string; value: string }[] | null
  eventDiscount?: number
}

export const productTypeOf = (product: Pick<CatalogProduct, "productType" | "category" | "name">): ProductTypeId =>
  isProductType(product.productType) ? product.productType : deriveProductType(product)

const LETTERS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]

/** Sizes a product is offered in: the seller's "Size" spec when given, else the category's sizes. */
export function productSizes(product: Pick<CatalogProduct, "category" | "specs">): string[] {
  const options = sizeOptionsFor(product.category)
  if (!options.length) return []
  const spec = (product.specs ?? []).find((s) => /size|kích (thước|cỡ)/i.test(s.label))?.value ?? ""
  if (options === SHOE_SIZES) {
    const range = spec.match(/(\d{2})\s*[–-]\s*(\d{2})/)
    if (range) {
      const [lo, hi] = [Number(range[1]), Number(range[2])].sort((a, b) => a - b)
      const inRange = SHOE_SIZES.filter((s) => Number(s) >= lo && Number(s) <= hi)
      if (inRange.length) return inRange
    }
    const listed = [...spec.matchAll(/\b(3[5-9]|4[0-8])\b/g)].map((m) => m[1]).filter((s) => (SHOE_SIZES as readonly string[]).includes(s))
    return listed.length ? [...new Set(listed)] : [...SHOE_SIZES]
  }
  const letters = spec.toUpperCase().match(/\b(XS|S|M|L|XL|XXL|3XL)\b/g)
  const known = (letters ?? []).filter((s) => (APPAREL_SIZES as readonly string[]).includes(s))
  return known.length ? [...new Set(known)].sort((a, b) => LETTERS.indexOf(a) - LETTERS.indexOf(b)) : [...APPAREL_SIZES]
}

type Facet = "sport" | "type" | "brands" | "price" | "sizes" | "colors" | "inStock" | "onSale"

/** Whether a product passes every active filter except the one being counted. */
export function matchesFilters(product: CatalogProduct, filters: CatalogFilters, skip?: Facet) {
  if (skip !== "sport" && filters.sport !== "all" && product.sport !== filters.sport) return false
  if (skip !== "type" && filters.type !== "all" && productTypeOf(product) !== filters.type) return false
  if (skip !== "brands" && filters.brands.length && !filters.brands.includes(product.brand)) return false
  if (skip !== "price") {
    if (filters.priceMin !== null && product.price < filters.priceMin) return false
    if (filters.priceMax !== null && product.price > filters.priceMax) return false
  }
  if (skip !== "sizes" && filters.sizes.length) {
    const sizes = productSizes(product)
    if (!filters.sizes.some((size) => sizes.includes(size))) return false
  }
  if (skip !== "colors" && filters.colors.length && !(product.colors ?? []).some((c) => filters.colors.includes(c.name))) return false
  if (skip !== "inStock" && filters.inStock && product.stock <= 0) return false
  if (skip !== "onSale" && filters.onSale && !hasDiscount(product.price, product.oldPrice)) return false
  return true
}

export type CatalogFacets = {
  sports: Record<SportFilter, number>
  types: { id: ProductTypeId; vi: string; en: string; count: number }[]
  typeTotal: number
  brands: { name: string; count: number }[]
  sizes: { size: string; count: number }[]
  colors: { name: string; hex: string; count: number }[]
}

const SIZE_ORDER = [...SHOE_SIZES, ...LETTERS] as string[]

/** Counts for each option, each computed with all other filters applied (classic faceting). */
export function catalogFacets(products: CatalogProduct[], filters: CatalogFilters): CatalogFacets {
  const without = (facet: Facet) => products.filter((p) => matchesFilters(p, filters, facet))
  const sportPool = without("sport")
  const typePool = without("type")
  const brandPool = without("brands")
  const sizePool = without("sizes")
  const colorPool = without("colors")
  const brandCounts = new Map<string, number>()
  for (const p of brandPool) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1)
  const sizeCounts = new Map<string, number>()
  for (const p of sizePool) for (const size of productSizes(p)) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1)
  const colorCounts = new Map<string, { hex: string; count: number }>()
  for (const p of colorPool)
    for (const color of new Map((p.colors ?? []).map((c) => [c.name, c.hex])))
      colorCounts.set(color[0], { hex: colorCounts.get(color[0])?.hex ?? color[1], count: (colorCounts.get(color[0])?.count ?? 0) + 1 })
  return {
    sports: {
      all: sportPool.length,
      football: sportPool.filter((p) => p.sport === "football").length,
      badminton: sportPool.filter((p) => p.sport === "badminton").length,
    },
    types: PRODUCT_TYPES.map((type) => ({ id: type.id, vi: type.vi, en: type.en, count: typePool.filter((p) => productTypeOf(p) === type.id).length })),
    typeTotal: typePool.length,
    brands: [...brandCounts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    sizes: [...sizeCounts].map(([size, count]) => ({ size, count })).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)),
    colors: [...colorCounts].map(([name, v]) => ({ name, hex: v.hex, count: v.count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi")),
  }
}

/**
 * Sorting. "Phù hợp nhất" orders products that have a SportDNA fit score by
 * that score while every product without one (apparel, accessories,
 * shuttlecocks, bags, missing specs, or no profile) keeps its default slot.
 */
export function sortCatalog<T extends CatalogProduct>(products: T[], sort: SortKey, fit?: Map<string, number> | null): T[] {
  const list = [...products]
  if (sort === "price-asc") return list.sort((a, b) => a.price - b.price)
  if (sort === "price-desc") return list.sort((a, b) => b.price - a.price)
  if (sort === "rating") return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0))
  if (sort === "newest") return list.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
  if (!fit || !fit.size) return list
  const slots = list.map((p, index) => ({ p, index })).filter(({ p }) => fit.has(String(p.id)))
  const ranked = [...slots].sort((a, b) => fit.get(String(b.p.id))! - fit.get(String(a.p.id))! || a.index - b.index)
  slots.forEach((slot, i) => {
    list[slot.index] = ranked[i].p
  })
  return list
}

const list = (value: string | null | undefined) =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 30)
const money = (value: string | null | undefined) => {
  if (!value) return null
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 0 ? n : null
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>
const read = (source: ParamSource, key: string) => {
  if (source instanceof URLSearchParams) return source.get(key)
  const value = source[key]
  return Array.isArray(value) ? value[0] : (value ?? null)
}

/** URL → filters. Old links (`danhMuc`, `thuongHieu`) still work. */
export function filtersFromParams(source: ParamSource): CatalogFilters {
  const sport = read(source, "mon")
  const rawType = read(source, "loai")
  const legacyCategory = read(source, "danhMuc")
  const typeFromCategory = legacyCategory ? PRODUCT_TYPES.find((t) => t.vi.toLowerCase() === legacyCategory.toLowerCase())?.id ?? deriveProductType({ category: legacyCategory }) : null
  const sortParam = read(source, "sap-xep")
  const brands = list(read(source, "hang"))
  const legacyBrand = read(source, "thuongHieu")
  return {
    sport: sport === "football" || sport === "badminton" ? sport : "all",
    type: isProductType(rawType) ? rawType : (typeFromCategory ?? "all"),
    brands: legacyBrand && !brands.includes(legacyBrand) ? [...brands, legacyBrand] : brands,
    priceMin: money(read(source, "gia-tu")),
    priceMax: money(read(source, "gia-den")),
    sizes: list(read(source, "size")),
    colors: list(read(source, "mau")),
    inStock: read(source, "con-hang") === "1",
    onSale: read(source, "giam-gia") === "1",
    sort: SORT_OPTIONS.find((option) => option.param === sortParam)?.key ?? "relevance",
  }
}

/** Filters → URL params; keeps unrelated params such as the search query. */
export function filtersToParams(filters: CatalogFilters, keep?: URLSearchParams) {
  const params = new URLSearchParams()
  const q = keep?.get("q")
  if (q) params.set("q", q)
  if (filters.sport !== "all") params.set("mon", filters.sport)
  if (filters.type !== "all") params.set("loai", filters.type)
  if (filters.brands.length) params.set("hang", filters.brands.join(","))
  if (filters.priceMin !== null) params.set("gia-tu", String(filters.priceMin))
  if (filters.priceMax !== null) params.set("gia-den", String(filters.priceMax))
  if (filters.sizes.length) params.set("size", filters.sizes.join(","))
  if (filters.colors.length) params.set("mau", filters.colors.join(","))
  if (filters.inStock) params.set("con-hang", "1")
  if (filters.onSale) params.set("giam-gia", "1")
  if (filters.sort !== "relevance") params.set("sap-xep", SORT_OPTIONS.find((o) => o.key === filters.sort)!.param)
  return params
}

/** Number of filters (not counting sport tabs or sort) currently applied. */
export const activeFilterCount = (filters: CatalogFilters) =>
  (filters.type !== "all" ? 1 : 0) +
  filters.brands.length +
  (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0) +
  filters.sizes.length +
  filters.colors.length +
  (filters.inStock ? 1 : 0) +
  (filters.onSale ? 1 : 0)
