/**
 * Size rules shared by the product page, quick-buy buttons and checkout
 * (client and server import this file, so it has no runtime directive).
 * Shoes ("giày") use EU sizes; tops and bottoms ("áo", "quần") use letter sizes.
 */
export const SHOE_SIZES = ["38", "39", "40", "41", "42", "43", "44"] as const
export const APPAREL_SIZES = ["S", "M", "L", "XL"] as const

// Whole-word match so a category such as "Giáo trình" never reads as "áo".
const SHOE = /(^|[^\p{L}\p{M}])giày($|[^\p{L}\p{M}])/iu
const APPAREL = /(^|[^\p{L}\p{M}])(áo|quần)($|[^\p{L}\p{M}])/iu

export function sizeOptionsFor(category: string | null | undefined): readonly string[] {
  const c = String(category ?? "").normalize("NFC")
  if (SHOE.test(c)) return SHOE_SIZES
  if (APPAREL.test(c)) return APPAREL_SIZES
  return []
}

export const needsSize = (category: string | null | undefined) => sizeOptionsFor(category).length > 0

/** True when the size is required for the category and missing or not one of its options. */
export const missingSize = (category: string | null | undefined, size: string | null | undefined) => {
  const options = sizeOptionsFor(category)
  return options.length > 0 && !options.includes(String(size ?? ""))
}
