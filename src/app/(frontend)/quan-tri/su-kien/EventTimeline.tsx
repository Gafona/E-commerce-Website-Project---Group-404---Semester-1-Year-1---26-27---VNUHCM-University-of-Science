import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { effectiveEventStatus, eventDateKey, eventOverlaps, eventWindow, formatEventMoment, type EventTiming } from "@/lib/event-dates"

type TimelineEvent = EventTiming & { id: string; name: string; color?: string | null }

const DAY = 86_400_000
const STATUS: Record<string, string> = { scheduled: "Sắp diễn ra", active: "Đang diễn ra", paused: "Tạm dừng" }

/** Weeks around today with every event that can still run; overlapping events are flagged. */
export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  const now = new Date()
  const today = Date.parse(`${eventDateKey(now)}T00:00:00+07:00`)
  const from = today - 2 * DAY
  const to = today + 40 * DAY
  const span = to - from
  const open = events.filter((event) => !["draft", "ended"].includes(effectiveEventStatus(event, now)))
  const overlaps = eventOverlaps(open, now)
  const rows = open
    .map((event) => ({ event, window: eventWindow(event) }))
    .filter(({ window }) => window.end >= from && window.start <= to)
    .sort((a, b) => a.window.start - b.window.start)
  const pct = (ms: number) => `${(Math.min(Math.max(ms - from, 0), span) / span) * 100}%`
  const ticks = Array.from({ length: 7 }, (_, i) => today + i * 7 * DAY)

  return (
    <section className="sc-card mb-4 grid gap-3" aria-labelledby="dong-thoi-gian">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <b id="dong-thoi-gian" className="text-[14px]">Dòng thời gian sự kiện</b>
          <p className="m-0 mt-1 text-[12px] leading-5 text-[var(--muted)]">
            Nhiều sự kiện có thể chạy cùng lúc. Trong khoảng trùng, mỗi sản phẩm chỉ được tham gia một sự kiện; hệ thống tự chặn khi shop đăng ký.
          </p>
        </div>
        {overlaps.size > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-[#fff4d6] px-2.5 py-1 text-[11px] font-bold text-[#8a5a00]">
            <AlertTriangle size={13} /> {overlaps.size} sự kiện chạy trùng thời gian
          </span>
        )}
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <div className="relative min-w-[640px]">
            <div className="relative ml-[200px] h-6 border-b border-[var(--line)] text-[10px] text-[var(--muted)]">
              {ticks.map((tick) => (
                <span key={tick} className="absolute -translate-x-1/2" style={{ left: pct(tick) }}>
                  {formatEventMoment(tick).slice(0, 5)}
                </span>
              ))}
            </div>
            <ul className="m-0 grid list-none gap-2 p-0 pt-2">
              {rows.map(({ event, window }) => {
                const clash = overlaps.get(String(event.id)) ?? []
                const status = effectiveEventStatus(event, now)
                return (
                  <li key={event.id} className="grid grid-cols-[200px_minmax(0,1fr)] items-center gap-0">
                    <div className="min-w-0 pr-3">
                      <Link href={`/quan-tri/su-kien/${event.id}`} className="block truncate text-[12px] font-bold text-inherit">
                        {event.name}
                      </Link>
                      <span className="block text-[10px] text-[var(--muted)]">
                        {STATUS[status] ?? status} · đến {formatEventMoment(window.end)}
                      </span>
                      {clash.length > 0 && (
                        <span className="mt-0.5 flex items-start gap-1 text-[10px] font-semibold text-[#8a5a00]">
                          <AlertTriangle size={11} className="mt-px shrink-0" /> Trùng với: {clash.map((other) => other.name).join(", ")}
                        </span>
                      )}
                    </div>
                    <div className="relative h-7 bg-[var(--paper)]">
                      <span className="absolute inset-y-0 w-px bg-[#a42626]" style={{ left: pct(now.getTime()) }} aria-hidden />
                      <span
                        className={`absolute inset-y-1 block min-w-1 ${clash.length ? "outline-2 outline-offset-1 outline-[#d29200]" : ""}`}
                        style={{ left: pct(window.start), width: `calc(${pct(window.end)} - ${pct(window.start)})`, background: event.color || "var(--lime)" }}
                        title={`${event.name}: ${formatEventMoment(window.start)} – ${formatEventMoment(window.end)}`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="m-0 mt-2 ml-[200px] flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
              <span className="inline-block h-3 w-px bg-[#a42626]" aria-hidden /> Hôm nay
            </p>
          </div>
        </div>
      ) : (
        <p className="m-0 text-[12px] text-[var(--muted)]">Không có sự kiện nào đang hoặc sắp chạy trong 6 tuần tới.</p>
      )}
    </section>
  )
}
