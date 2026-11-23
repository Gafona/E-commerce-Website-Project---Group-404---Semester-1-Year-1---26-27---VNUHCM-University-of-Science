export const EVENT_TIME_ZONE = "Asia/Ho_Chi_Minh"

export function eventDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${value("year")}-${value("month")}-${value("day")}`
}

// Event dates are calendar-day values. Query the complete stored day so an
// event switches at midnight in Vietnam instead of waiting for UTC midnight.
export function currentEventDayBounds(date = new Date()) {
  const key = eventDateKey(date)
  return {
    start: `${key}T00:00:00.000Z`,
    end: `${key}T23:59:59.999Z`,
  }
}

/** Vietnam has no daylight saving time, so its clock is always UTC+7. */
const VIETNAM_OFFSET = "+07:00"
export const DEFAULT_EVENT_START_TIME = "00:00"
export const DEFAULT_EVENT_END_TIME = "23:59"
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/
export const isEventClock = (value: unknown): value is string => typeof value === "string" && CLOCK.test(value)

export type EventTiming = {
  status?: string | null
  startDate: string
  endDate: string
  /** Vietnam clock time (HH:mm) on the start day; missing = 00:00. */
  startTime?: string | null
  /** Vietnam clock time (HH:mm) on the end day; missing = 23:59. */
  endTime?: string | null
}

/**
 * Exact live window in epoch milliseconds. The stored dates are Vietnam
 * calendar days and the times are Vietnam clock times, so an event set to
 * 20:00–22:00 switches on and off at those minutes without anyone saving it.
 */
export function eventWindow(event: Pick<EventTiming, "startDate" | "endDate" | "startTime" | "endTime">) {
  const startTime = isEventClock(event.startTime) ? event.startTime : DEFAULT_EVENT_START_TIME
  const endTime = isEventClock(event.endTime) ? event.endTime : DEFAULT_EVENT_END_TIME
  return {
    start: Date.parse(`${event.startDate.slice(0, 10)}T${startTime}:00.000${VIETNAM_OFFSET}`),
    end: Date.parse(`${event.endDate.slice(0, 10)}T${endTime}:59.999${VIETNAM_OFFSET}`),
  }
}

/** Sellers may register while an event is scheduled or running and not yet over. */
export function isRegistrationOpen(
  event: Pick<EventTiming, "status" | "startDate" | "endDate" | "startTime" | "endTime">,
  date = new Date(),
) {
  return (
    (event.status === "scheduled" || event.status === "active") &&
    date.getTime() <= eventWindow(event).end
  )
}

export type EventRunStatus = "draft" | "scheduled" | "active" | "paused" | "ended"

/**
 * The status shown to people, derived from the exact start/end time in Vietnam.
 * A stored "scheduled"/"active"/"paused" value never outlives the end time,
 * and a scheduled or active event goes live by itself at its start time.
 */
export function effectiveEventStatus(
  event: EventTiming,
  date = new Date(),
): EventRunStatus {
  const status = (event.status ?? "draft") as EventRunStatus
  if (status === "draft" || status === "ended") return status
  const now = date.getTime()
  const { start, end } = eventWindow(event)
  if (now > end) return "ended"
  if (status === "paused") return status
  return now < start ? "scheduled" : "active"
}

/** dd/mm/yyyy from a stored calendar-day value, independent of the runtime time zone. */
export function formatEventDay(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-")
  return `${day}/${month}/${year}`
}

/** "20/11/2026 20:00 – 22/11/2026 22:00"; whole-day events show only the days. */
export function formatEventRange(event: Pick<EventTiming, "startDate" | "endDate" | "startTime" | "endTime">) {
  const startTime = isEventClock(event.startTime) ? event.startTime : DEFAULT_EVENT_START_TIME
  const endTime = isEventClock(event.endTime) ? event.endTime : DEFAULT_EVENT_END_TIME
  const wholeDays = startTime === DEFAULT_EVENT_START_TIME && endTime === DEFAULT_EVENT_END_TIME
  if (wholeDays) return `${formatEventDay(event.startDate)} – ${formatEventDay(event.endDate)}`
  return `${formatEventDay(event.startDate)} ${startTime} – ${formatEventDay(event.endDate)} ${endTime}`
}

/** "30/11 23:59" in Vietnam time; plain arithmetic so server and browser render the same text. */
export function formatEventMoment(ms: number) {
  const d = new Date(ms + 7 * 3_600_000)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`
}

/** Exact live windows (start/end times included) share at least one moment. */
export const windowsOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start <= b.end && b.start <= a.end

/**
 * Events that can still run (not draft or ended) paired with every other such
 * event whose live window overlaps theirs; products may join only one of them.
 */
export function eventOverlaps<E extends EventTiming & { id: string | number; name: string }>(events: E[], date = new Date()) {
  const open = events.filter((event) => !["draft", "ended"].includes(effectiveEventStatus(event, date)))
  const result = new Map<string, E[]>()
  for (const event of open) {
    const others = open.filter((other) => other.id !== event.id && windowsOverlap(eventWindow(event), eventWindow(other)))
    if (others.length) result.set(String(event.id), others)
  }
  return result
}
