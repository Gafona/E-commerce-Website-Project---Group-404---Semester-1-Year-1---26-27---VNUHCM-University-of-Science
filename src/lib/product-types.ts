/**
 * The standard catalogue categories. A product's category ("Danh mục") is one
 * of these names and its product type is the matching id, so the seller form,
 * the "Loại" filter chips and every count use the same list.
 */
export const PRODUCT_TYPES = [
  { id: "shoes", vi: "Giày", en: "Shoes" },
  { id: "rackets", vi: "Vợt", en: "Rackets" },
  { id: "shuttlecocks", vi: "Quả cầu", en: "Shuttlecocks" },
  { id: "balls", vi: "Bóng", en: "Balls" },
  { id: "apparel", vi: "Quần áo", en: "Apparel" },
  { id: "bags", vi: "Túi & balo", en: "Bags" },
  { id: "accessories", vi: "Phụ kiện", en: "Accessories" },
] as const

export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"]
export const PRODUCT_TYPE_IDS = PRODUCT_TYPES.map((t) => t.id) as ProductTypeId[]

export const isProductType = (value: unknown): value is ProductTypeId =>
  typeof value === "string" && (PRODUCT_TYPE_IDS as string[]).includes(value)

export const productTypeLabel = (id: unknown) =>
  PRODUCT_TYPES.find((t) => t.id === id) ?? null

const fold = (value: unknown) =>
  (typeof value === "string" ? value : "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

const RULES: [ProductTypeId, RegExp][] = [
  ["bags", /\b(tui|balo|ba lo|bag|backpack)\b/],
  ["shoes", /\b(giay|shoe|shoes|boot|boots|sneaker|sneakers)\b/],
  ["rackets", /\b(vot|racket|racquet)\b/],
  ["shuttlecocks", /\b(qua cau|ong cau|shuttle|shuttlecock|shuttlecocks)\b|^cau\b/],
  ["balls", /\b(qua bong|bong|ball)\b/],
  ["apparel", /\b(ao|jersey|shirt|shorts|vay|hoodie|khoac)\b|\bquan\b(?! can)/],
  ["accessories", /\b(gang tay|bao ho|bao ve|ong dong|bang goi|bang co tay|nep|guard|glove|gloves)\b/],
  ["accessories", /\b(cuoc|quan can|grip|tat|vo|bang|phu kien|string|binh nuoc|khan|accessories)\b/],
]

/**
 * Vietnamese product names put the head noun first ("Túi vợt" is a bag,
 * "Vợt … kèm túi" a racket), so the earliest matching keyword wins.
 */
function classify(text: string): ProductTypeId | null {
  let best: ProductTypeId | null = null
  let bestIndex = Infinity
  for (const [type, rule] of RULES) {
    const match = rule.exec(text)
    if (match && match.index < bestIndex) {
      best = type
      bestIndex = match.index
    }
  }
  return best
}

/** Categories that only name a sport or a catch-all say little about the item. */
const GENERIC_CATEGORY = /^(cau long|bong da|the thao|khac|other|phu kien|do the thao)$/

/** Best-effort type from a product's category and name. */
export function deriveProductType(input: { category?: unknown; name?: unknown }): ProductTypeId {
  const category = fold(input.category)
  const name = fold(input.name)
  const sources = !category || GENERIC_CATEGORY.test(category) ? [name, category] : [category, name]
  for (const source of sources) {
    const type = source ? classify(source) : null
    if (type) return type
  }
  return "accessories"
}

/** Standard category names offered in the seller form ("Danh mục"). */
export const STANDARD_CATEGORIES = PRODUCT_TYPES.map((type) => type.vi)
export type StandardCategory = (typeof PRODUCT_TYPES)[number]["vi"]

export const isStandardCategory = (value: unknown): value is StandardCategory =>
  typeof value === "string" && (STANDARD_CATEGORIES as string[]).includes(value)

/** "Vợt" → "rackets". */
export const typeForCategory = (category: StandardCategory): ProductTypeId =>
  PRODUCT_TYPES.find((type) => type.vi === category)!.id

/** "rackets" → "Vợt". */
export const categoryForType = (type: ProductTypeId): StandardCategory =>
  PRODUCT_TYPES.find((item) => item.id === type)!.vi

/**
 * Maps any legacy free-text category ("Giày bóng đá", "Vợt cầu lông",
 * "Áo thi đấu", "Cầu", "Bóng thi đấu"…) to the standard name.
 */
export function normalizeCategory(input: { category?: unknown; name?: unknown; productType?: unknown }): StandardCategory {
  if (isStandardCategory(input.category)) return input.category
  const type = isProductType(input.productType) ? input.productType : deriveProductType(input)
  return categoryForType(type)
}
