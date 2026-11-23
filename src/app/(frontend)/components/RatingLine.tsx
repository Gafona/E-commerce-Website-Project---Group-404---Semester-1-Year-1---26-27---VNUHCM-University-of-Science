import { Star } from "lucide-react"
import type { Tr } from "@/lib/i18n"
import { formatAverage } from "@/lib/ratings"

/**
 * "★ 4.6 (23)" from real reviews, or "Chưa có đánh giá" when there are none
 * (never "0" or "—"). `long` spells out "(23 đánh giá)".
 */
export function RatingLine({
  average,
  count,
  tr,
  long = false,
  className = "rating",
}: {
  average: number | null | undefined
  count: number | null | undefined
  tr: Tr
  long?: boolean
  className?: string
}) {
  const total = Math.max(0, Math.round(Number(count) || 0))
  if (!total || !average) {
    return <div className={`${className} no-rating`}>{tr("Chưa có đánh giá", "No reviews yet")}</div>
  }
  return (
    <div className={className}>
      <Star size={13} fill="currentColor" aria-hidden /> {formatAverage(average)}{" "}
      <span>
        ({long ? tr(`${total} đánh giá`, `${total} reviews`) : total})
      </span>
    </div>
  )
}

/** Plain text form, e.g. for links and metadata. */
export const ratingText = (average: number | null | undefined, count: number | null | undefined, tr: Tr) => {
  const total = Math.max(0, Math.round(Number(count) || 0))
  return total && average ? `★ ${formatAverage(average)} (${total})` : tr("Chưa có đánh giá", "No reviews yet")
}
