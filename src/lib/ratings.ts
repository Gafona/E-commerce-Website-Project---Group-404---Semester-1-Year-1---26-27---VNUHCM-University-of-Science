/**
 * Star ratings shown on product cards, product pages and shop pages. Every
 * number here is computed from real customer reviews; nothing is seeded.
 */
export type RatingSummary = {
  /** Mean of every review's stars rounded to one decimal, or null without reviews. */
  average: number | null
  count: number
  /** Review count per star, keyed 5 → 1. */
  distribution: { star: 1 | 2 | 3 | 4 | 5; count: number }[]
}

export const roundRating = (value: number) => Math.round(value * 10) / 10

export function summarizeRatings(reviews: { rating?: number | null }[]): RatingSummary {
  const stars = reviews
    .map((review) => Math.round(Number(review.rating)))
    .filter((value) => value >= 1 && value <= 5)
  const count = stars.length
  const average = count ? roundRating(stars.reduce((sum, value) => sum + value, 0) / count) : null
  return {
    average,
    count,
    distribution: ([5, 4, 3, 2, 1] as const).map((star) => ({ star, count: stars.filter((value) => value === star).length })),
  }
}

/** "4.6" with a dot, as on every rating badge. */
export const formatAverage = (average: number) => average.toFixed(1)
