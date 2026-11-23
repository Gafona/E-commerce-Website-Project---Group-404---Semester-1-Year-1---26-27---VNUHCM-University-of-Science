/** Lowest discount a shop may offer to join a platform event. */
export const MIN_EVENT_DISCOUNT = 5
/** Hard ceiling for any event; each event also has its own admin-set cap. */
export const MAX_EVENT_DISCOUNT = 90
export const DEFAULT_EVENT_MAX_DISCOUNT = 70

export const SALE_ITEM_STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const
export type SaleItemStatus = (typeof SALE_ITEM_STATUSES)[number]

/**
 * Sale price rule: original × (1 − discount), rounded to the nearest 1,000₫,
 * never below 1,000₫ for items that cost at least that, never negative.
 */
export function salePrice(price: number, discountPercent: number) {
  const raw = Math.max(0, price * (1 - discountPercent / 100))
  const rounded = Math.round(raw / 1000) * 1000
  return price >= 1000 ? Math.max(1000, rounded) : Math.max(0, Math.round(raw))
}

/** Calendar-day ranges [start, end] (YYYY-MM-DD) overlap. */
export const rangesOverlap = (a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }) =>
  a.startDate.slice(0, 10) <= b.endDate.slice(0, 10) && b.startDate.slice(0, 10) <= a.endDate.slice(0, 10)
