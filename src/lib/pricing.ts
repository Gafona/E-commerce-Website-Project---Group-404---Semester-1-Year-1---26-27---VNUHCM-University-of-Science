/**
 * One price rule for every view (cards, product page, cart, checkout, orders):
 * the struck-through price and the "−x%" label only appear when the old price
 * is really higher than the selling price.
 */
export const MIN_PRODUCT_PRICE = 10_000

export const hasDiscount = (price: number, oldPrice?: number | null): oldPrice is number =>
  typeof oldPrice === "number" && Number.isFinite(oldPrice) && oldPrice > price && price > 0

/** Whole-percent discount, never rounded up to a misleading 100%. */
export const discountPercent = (price: number, oldPrice?: number | null) =>
  hasDiscount(price, oldPrice) ? Math.min(99, Math.max(1, Math.round((1 - price / oldPrice) * 100))) : 0

/** Largest real discount among products that are on sale (0 when none). */
export const maxDiscountOf = (products: { price: number; oldPrice?: number | null }[]) =>
  products.reduce((max, product) => Math.max(max, discountPercent(product.price, product.oldPrice)), 0)

/** Seller price validation shared by the form and the server. Returns a Vietnamese error or null. */
export function priceError(price: number, oldPrice: number | null | undefined, tr: (vi: string, en?: string) => string = (vi) => vi) {
  if (!Number.isFinite(price) || price < MIN_PRODUCT_PRICE)
    return tr("Giá bán tối thiểu là 10.000₫.", "The selling price must be at least 10,000₫.")
  if (oldPrice !== null && oldPrice !== undefined && Number.isFinite(oldPrice) && oldPrice > 0 && oldPrice <= price)
    return tr("Giá gốc phải cao hơn giá bán. Bỏ trống nếu sản phẩm không giảm giá.", "The original price must be higher than the selling price. Leave it empty when there is no discount.")
  return null
}

/** Catalogue tags such as "-10%" would duplicate (or contradict) the computed discount label. */
export const displayTag = (tag?: string | null) => {
  const value = tag?.trim()
  return value && !/^[-−]\s?\d+\s?%$/.test(value) ? value : null
}
