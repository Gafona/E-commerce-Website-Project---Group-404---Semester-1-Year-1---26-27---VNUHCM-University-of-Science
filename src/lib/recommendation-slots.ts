import type { Payload, PayloadRequest, Where } from "payload"
import {
  addDays,
  capacityMessage,
  DAY_MS,
  DEFAULT_MIN_PRICE_PER_DAY,
  DEFAULT_SLOTS,
  MAX_DAYS,
  MAX_LEAD_DAYS,
  MAX_PRICE_PER_DAY,
  MAX_SLOTS,
  MIN_DAYS,
  POSITION_LABELS,
  RECOMMENDATION_POSITIONS,
  firstFreeDay,
  fullDays,
  isDay,
  isRecommendationPosition,
  rankRecommendations,
  slotRange,
  vnDay,
  type RecommendationPosition,
  type SlotRange,
} from "./recommendations"

/** Server helpers for paid recommendations (no Next imports: collection hooks use them too). */

export type RecommendationSettingsValue = { slots: number; minPrice: number }

export async function recommendationSettings(payload: Payload, req?: PayloadRequest): Promise<RecommendationSettingsValue> {
  const doc = (await payload
    .findGlobal({ slug: "recommendation-settings", depth: 0, overrideAccess: true, ...(req ? { req } : {}) })
    .catch(() => null)) as { slotsPerPosition?: number | null; minPricePerDay?: number | null } | null
  const slots = Math.round(Number(doc?.slotsPerPosition) || DEFAULT_SLOTS)
  const minPrice = Math.round(Number(doc?.minPricePerDay) || DEFAULT_MIN_PRICE_PER_DAY)
  return { slots: Math.min(MAX_SLOTS, Math.max(1, slots)), minPrice: Math.max(1000, minPrice) }
}

/**
 * Bookings holding a slot of `position` between `from` and the furthest day a new
 * booking could reach. New requests count pending + approved bookings (first come,
 * first served); approval only counts approved ones.
 */
export async function takenRanges(
  payload: Payload,
  options: { position: RecommendationPosition; from: string; statuses: ("pending" | "approved")[]; excludeId?: string | number; req?: PayloadRequest },
): Promise<SlotRange[]> {
  const until = new Date(new Date(options.from).getTime() + (MAX_LEAD_DAYS + MAX_DAYS + 1) * DAY_MS).toISOString()
  const where: Where = {
    and: [
      { position: { equals: options.position } },
      { status: { in: options.statuses } },
      { endsAt: { greater_than: options.from } },
      { startsAt: { less_than: until } },
      ...(options.excludeId !== undefined ? [{ id: { not_equals: options.excludeId } }] : []),
    ],
  }
  const { docs } = await payload.find({
    collection: "recommendation-requests",
    where,
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    select: { startsAt: true, endsAt: true },
    ...(options.req ? { req: options.req } : {}),
  })
  return docs.flatMap((doc) => (doc.startsAt && doc.endsAt ? [{ startsAt: doc.startsAt, endsAt: doc.endsAt }] : []))
}

/** Whether every day of a booking still has a free slot, and the nearest start day that does. */
export async function slotCheck(
  payload: Payload,
  options: { position: RecommendationPosition; startDay: string; days: number; statuses: ("pending" | "approved")[]; excludeId?: string | number; req?: PayloadRequest },
) {
  const { slots } = await recommendationSettings(payload, options.req)
  const range = slotRange(options.startDay, options.days)
  const taken = await takenRanges(payload, { ...options, from: range.startsAt })
  const full = fullDays(taken, options.startDay, options.days, slots)
  return { slots, full, nextFree: full.length ? firstFreeDay(taken, options.startDay, options.days, slots) : options.startDay }
}

export type NewRequestValue = { position: RecommendationPosition; startDay: string; days: number; pricePerDay: number; total: number } & SlotRange
export type NewRequestCheck = { ok: true; value: NewRequestValue } | { ok: false; error: string; suggestDay?: string | null }

/**
 * Every rule for a new booking, in the visitor's language. The server action shows the
 * result; the collection hook runs it again so a race or a direct API call cannot skip it.
 */
export async function checkNewRequest(
  payload: Payload,
  input: { sellerId: string; productId: string; position: unknown; startDay: unknown; days: unknown; pricePerDay: unknown },
  lang: "vi" | "en" = "vi",
  req?: PayloadRequest,
): Promise<NewRequestCheck> {
  const t = (vi: string, en: string) => (lang === "en" ? en : vi)
  const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`
  const { position, startDay } = input
  const days = Number(input.days)
  const price = Number(input.pricePerDay)
  if (!input.productId) return { ok: false, error: t("Hãy chọn sản phẩm muốn đề xuất.", "Choose the product to promote.") }
  if (!isRecommendationPosition(position)) return { ok: false, error: t("Hãy chọn vị trí đề xuất.", "Choose a spot.") }
  if (!isDay(startDay)) return { ok: false, error: t("Ngày bắt đầu không hợp lệ.", "Invalid start date.") }
  const today = vnDay(Date.now())
  if (startDay < today) return { ok: false, error: t("Ngày bắt đầu không được ở trong quá khứ.", "The start date can't be in the past.") }
  if (startDay > addDays(today, MAX_LEAD_DAYS))
    return { ok: false, error: t(`Chỉ đặt trước tối đa ${MAX_LEAD_DAYS} ngày.`, `Book at most ${MAX_LEAD_DAYS} days ahead.`) }
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS)
    return { ok: false, error: t(`Số ngày đề xuất phải từ ${MIN_DAYS} đến ${MAX_DAYS}.`, `Choose ${MIN_DAYS}–${MAX_DAYS} days.`) }
  const { minPrice } = await recommendationSettings(payload, req)
  if (!Number.isInteger(price) || price < minPrice || price > MAX_PRICE_PER_DAY)
    return {
      ok: false,
      error: t(`Giá mỗi ngày phải từ ${money(minPrice)} đến ${money(MAX_PRICE_PER_DAY)}.`, `Price per day must be ${money(minPrice)}–${money(MAX_PRICE_PER_DAY)}.`),
    }
  const product = await payload
    .findByID({ collection: "products", id: input.productId, depth: 0, overrideAccess: true, select: { seller: true, sport: true, hidden: true }, ...(req ? { req } : {}) })
    .catch(() => null)
  const owner = product && (typeof product.seller === "object" && product.seller ? String(product.seller.id) : String(product.seller ?? ""))
  if (!product || owner !== input.sellerId)
    return { ok: false, error: t("Chỉ được đề xuất sản phẩm thuộc cửa hàng của bạn.", "You can only promote your own products.") }
  if (product.hidden) return { ok: false, error: t("Sản phẩm đang bị ẩn nên không thể đề xuất.", "This product is hidden and can't be promoted.") }
  const label = POSITION_LABELS[position]
  if (product.sport !== position)
    return {
      ok: false,
      error: t(`Vị trí “${label.vi}” chỉ nhận sản phẩm ${label.sportVi.toLowerCase()}.`, `“${label.en}” only takes ${label.sportEn.toLowerCase()} products.`),
    }
  const range = slotRange(startDay, days)
  const sameProduct = await payload.count({
    collection: "recommendation-requests",
    where: {
      and: [
        { product: { equals: input.productId } },
        { status: { in: ["pending", "approved"] } },
        { startsAt: { less_than: range.endsAt } },
        { endsAt: { greater_than: range.startsAt } },
      ],
    },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  if (sameProduct.totalDocs)
    return { ok: false, error: t("Sản phẩm này đã có yêu cầu đề xuất trùng khoảng thời gian này.", "This product already has a booking during these dates.") }
  const check = await slotCheck(payload, { position, startDay, days, statuses: ["pending", "approved"], req })
  if (check.full.length) return { ok: false, error: capacityMessage(check.slots, check.nextFree, lang), suggestDay: check.nextFree }
  return { ok: true, value: { position, startDay, days, pricePerDay: price, total: price * days, ...range } }
}

export type RunningRecommendation = { id: string; productId: string; pricePerDay: number; reviewedAt: string | null; endsAt: string }

/** Approved bookings running right now, ranked per homepage section. */
export async function runningRecommendations(payload: Payload, now = new Date()): Promise<Record<RecommendationPosition, RunningRecommendation[]>> {
  const at = now.toISOString()
  const { docs } = await payload.find({
    collection: "recommendation-requests",
    where: { and: [{ status: { equals: "approved" } }, { startsAt: { less_than_equal: at } }, { endsAt: { greater_than: at } }] },
    depth: 0,
    limit: 200,
    pagination: false,
    overrideAccess: true,
    select: { product: true, position: true, pricePerDay: true, reviewedAt: true, createdAt: true, endsAt: true },
  })
  const result = Object.fromEntries(RECOMMENDATION_POSITIONS.map((position) => [position, [] as RunningRecommendation[]])) as Record<
    RecommendationPosition,
    RunningRecommendation[]
  >
  for (const doc of rankRecommendations(docs)) {
    const position = doc.position as RecommendationPosition
    const productId = typeof doc.product === "object" && doc.product ? String(doc.product.id) : String(doc.product ?? "")
    if (!result[position] || !productId) continue
    result[position].push({ id: String(doc.id), productId, pricePerDay: Number(doc.pricePerDay ?? 0), reviewedAt: doc.reviewedAt ?? null, endsAt: String(doc.endsAt) })
  }
  return result
}
