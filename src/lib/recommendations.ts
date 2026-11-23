/**
 * Paid homepage recommendations ("Đề xuất"). A shop rents a spot in one of the
 * homepage sport sections for whole days (Vietnam time); BOAI collects the fee,
 * approves, and the product is shown with an "Đề xuất" label while it runs.
 * Pure helpers: no Payload or Next imports, so they run in unit tests.
 */

export const RECOMMENDATION_POSITIONS = ["football", "badminton"] as const
export type RecommendationPosition = (typeof RECOMMENDATION_POSITIONS)[number]

/** Positions are the homepage sections; each one only takes products of its sport. */
export const POSITION_LABELS: Record<RecommendationPosition, { vi: string; en: string; sportVi: string; sportEn: string }> = {
  football: { vi: "Trang bị sân cỏ", en: "Pitch gear", sportVi: "Bóng đá", sportEn: "Football" },
  badminton: { vi: "Tốc độ trên không", en: "Speed in the air", sportVi: "Cầu lông", sportEn: "Badminton" },
}

export const isRecommendationPosition = (value: unknown): value is RecommendationPosition =>
  RECOMMENDATION_POSITIONS.includes(value as RecommendationPosition)

export const MIN_DAYS = 1
export const MAX_DAYS = 30
/** How far ahead a spot can be booked. */
export const MAX_LEAD_DAYS = 90
export const DEFAULT_SLOTS = 3
export const MAX_SLOTS = 6
export const DEFAULT_MIN_PRICE_PER_DAY = 20_000
export const MAX_PRICE_PER_DAY = 10_000_000

export const DAY_MS = 86_400_000
const VN_OFFSET_MS = 7 * 3_600_000
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Calendar day (YYYY-MM-DD) in Vietnam for an instant. */
export const vnDay = (value: Date | string | number) => new Date(new Date(value).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)

export const isDay = (value: unknown): value is string =>
  typeof value === "string" && DAY_PATTERN.test(value) && vnDay(dayStart(value)) === value

/** 00:00 Vietnam time on that day. */
export const dayStart = (day: string) => new Date(`${day}T00:00:00+07:00`)

export const addDays = (day: string, count: number) => vnDay(dayStart(day).getTime() + count * DAY_MS)

/** dd/mm/yyyy for messages. */
export const formatDay = (day: string) => day.split("-").reverse().join("/")

export type SlotRange = { startsAt: string; endsAt: string }

/** A booking covers whole days: from 00:00 on the start day until 00:00 after the last day. */
export function slotRange(startDay: string, days: number): SlotRange {
  const start = dayStart(startDay)
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + days * DAY_MS).toISOString() }
}

export const overlaps = (a: SlotRange, b: SlotRange) =>
  new Date(a.startsAt).getTime() < new Date(b.endsAt).getTime() && new Date(b.startsAt).getTime() < new Date(a.endsAt).getTime()

/** Bookings covering one calendar day. */
export const bookedOn = (taken: SlotRange[], day: string) => taken.filter((range) => overlaps(range, slotRange(day, 1))).length

/** Days within the range that already have every slot taken. */
export function fullDays(taken: SlotRange[], startDay: string, days: number, slots: number): string[] {
  const full: string[] = []
  for (let i = 0; i < days; i++) {
    const day = addDays(startDay, i)
    if (bookedOn(taken, day) >= slots) full.push(day)
  }
  return full
}

/** Earliest start day (from `fromDay`) with a free slot on every day of the booking. */
export function firstFreeDay(taken: SlotRange[], fromDay: string, days: number, slots: number, horizon = MAX_LEAD_DAYS): string | null {
  for (let offset = 0; offset <= horizon; offset++) {
    const candidate = addDays(fromDay, offset)
    if (!fullDays(taken, candidate, days, slots).length) return candidate
  }
  return null
}

export const STATUS_VALUES = ["pending", "approved", "rejected", "cancelled"] as const
export type RecommendationStatus = (typeof STATUS_VALUES)[number]

/** What sellers and admins see: approved bookings are scheduled, running or expired by date. */
export type RecommendationPhase = "pending" | "scheduled" | "running" | "expired" | "lapsed" | "rejected" | "cancelled"

export function phaseOf(doc: { status?: string | null; startsAt?: string | null; endsAt?: string | null }, now = Date.now()): RecommendationPhase {
  const start = doc.startsAt ? new Date(doc.startsAt).getTime() : 0
  const end = doc.endsAt ? new Date(doc.endsAt).getTime() : 0
  if (doc.status === "approved") return now < start ? "scheduled" : now < end ? "running" : "expired"
  // A request nobody approved before its last day can no longer run.
  if (doc.status === "pending") return end && now >= end ? "lapsed" : "pending"
  return doc.status === "rejected" ? "rejected" : "cancelled"
}

export const PHASE_LABELS: Record<RecommendationPhase, { vi: string; en: string; tone: string }> = {
  pending: { vi: "Chờ duyệt", en: "Awaiting review", tone: "pending" },
  scheduled: { vi: "Đã duyệt · sắp chạy", en: "Approved · upcoming", tone: "shipping" },
  running: { vi: "Đang chạy", en: "Running", tone: "delivered" },
  expired: { vi: "Hết hạn", en: "Ended", tone: "" },
  lapsed: { vi: "Hết hạn (chưa duyệt)", en: "Lapsed (not approved)", tone: "" },
  rejected: { vi: "Bị từ chối", en: "Rejected", tone: "cancelled" },
  cancelled: { vi: "Đã hủy", en: "Cancelled", tone: "" },
}

/** Running spots are shown by price per day (highest first), then the earliest approval. */
export function rankRecommendations<T extends { pricePerDay?: number | null; reviewedAt?: string | null; createdAt?: string | null }>(list: T[]): T[] {
  const time = (value?: string | null) => (value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER)
  return [...list].sort(
    (a, b) =>
      Number(b.pricePerDay ?? 0) - Number(a.pricePerDay ?? 0) ||
      time(a.reviewedAt) - time(b.reviewedAt) ||
      time(a.createdAt) - time(b.createdAt),
  )
}

/**
 * Fills a homepage section: running recommendations first (already ranked, at most
 * `slots`), then ordinary products in their existing order, without duplicates.
 */
export function fillSection<P extends { id: string | number }>(recommended: P[], others: P[], size: number, slots: number) {
  const picked = recommended.slice(0, slots)
  const ids = new Set(picked.map((p) => String(p.id)))
  return [...picked, ...others.filter((p) => !ids.has(String(p.id)))].slice(0, Math.max(size, picked.length))
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
/** Transfer reference for the fee, e.g. DX7K2Q9P (distinct from order codes BOAI…). */
export function newRecommendationCode(random: () => number = Math.random) {
  let code = "DX"
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return code
}

export const capacityMessage = (slots: number, nextFree: string | null, lang: "vi" | "en" = "vi") =>
  lang === "en"
    ? `This spot already has ${slots} products during these dates.` +
      (nextFree ? ` Nearest free start date: ${formatDay(nextFree)}.` : ` No free dates in the next ${MAX_LEAD_DAYS} days.`)
    : `Vị trí đã đủ ${slots} sản phẩm trong khoảng thời gian này.` +
      (nextFree ? ` Ngày trống gần nhất: ${formatDay(nextFree)}.` : ` Chưa có ngày trống trong ${MAX_LEAD_DAYS} ngày tới.`)
