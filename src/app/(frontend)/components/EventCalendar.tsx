"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import type { CSSProperties } from "react"
import { useShop } from "./ShopProvider"
import { effectiveEventStatus, eventDateKey, formatEventDay, type EventRunStatus } from "@/lib/event-dates"

type CalendarEvent = {
  id: string
  name: string
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  status: string
}

const weekDays = [["T2", "Mon"], ["T3", "Tue"], ["T4", "Wed"], ["T5", "Thu"], ["T6", "Fri"], ["T7", "Sat"], ["CN", "Sun"]] as const
const statusLabel: Record<EventRunStatus, [string, string]> = {
  draft: ["Bản nháp", "Draft"],
  scheduled: ["Đã lên lịch", "Scheduled"],
  active: ["Đang diễn ra", "Live"],
  paused: ["Tạm dừng", "Paused"],
  ended: ["Đã kết thúc", "Ended"],
}
const statusOrder: Record<EventRunStatus, number> = { active: 0, scheduled: 1, paused: 2, draft: 3, ended: 4 }
const ENDED_COLOR = { solid: "#94a3b8", soft: "#f1f5f9", ink: "#64748b" }

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const eventHue = (id: string) =>
  [...id].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 360, 208)

export function EventCalendar({
  events,
  hrefBase,
  eyebrow,
  hint,
}: {
  events: CalendarEvent[]
  /** Event links go to `${hrefBase}/${id}`. */
  hrefBase: string
  eyebrow?: string
  hint?: string
}) {
  const { tr } = useShop()
  const label = (status: EventRunStatus) => tr(statusLabel[status][0], statusLabel[status][1])
  const todayKey = eventDateKey()
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number)
  const today = new Date(todayYear, todayMonth - 1, todayDay)
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [showEnded, setShowEnded] = useState(true)
  // Status follows the calendar, not the value last saved by an admin.
  const runStatus = useMemo(
    () => new Map(events.map((event) => [event.id, effectiveEventStatus(event)] as const)),
    [events],
  )
  const shownEvents = useMemo(
    () =>
      events
        .filter((event) => showEnded || runStatus.get(event.id) !== "ended")
        .sort((a, b) => statusOrder[runStatus.get(a.id)!] - statusOrder[runStatus.get(b.id)!] || a.startDate.localeCompare(b.startDate)),
    [events, runStatus, showEnded],
  )
  const endedCount = events.filter((event) => runStatus.get(event.id) === "ended").length
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [month])
  const eventColors = useMemo(
    () =>
      new Map(
        events.map((event) => {
          const hue = eventHue(event.id)
          if (runStatus.get(event.id) === "ended") return [event.id, ENDED_COLOR] as const
          return [
            event.id,
            {
              solid: `hsl(${hue} 72% 43%)`,
              soft: `hsl(${hue} 78% 94%)`,
              ink: `hsl(${hue} 72% 25%)`,
            },
          ] as const
        }),
      ),
    [events, runStatus],
  )
  const visibleEvents = useMemo(() => {
    if (!days.length) return []
    const firstDay = dayKey(days[0])
    const lastDay = dayKey(days[days.length - 1])
    return shownEvents.filter(
      (event) =>
        event.startDate.slice(0, 10) <= lastDay &&
        event.endDate.slice(0, 10) >= firstDay,
    )
  }, [days, shownEvents])

  const moveMonth = (offset: number) =>
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    )

  return (
    <section className="mb-4 border border-[var(--line)] bg-[var(--white)] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="flex items-center gap-2 text-[10px] font-black tracking-[.13em] text-[var(--lime-dark)] uppercase">
            <CalendarDays size={14} /> {eyebrow ?? tr("Lịch sự kiện", "Event calendar")}
          </span>
          <h2 className="mt-1 mb-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            {tr(`Tháng ${month.getMonth() + 1} / ${month.getFullYear()}`, month.toLocaleDateString("en-GB", { month: "long", year: "numeric" }))}
          </h2>
          <p className="mt-2 mb-0 text-[10px] text-[var(--muted)]">
            {hint ?? tr("Ngày có sự kiện được tô màu; mỗi sự kiện luôn có một màu nhận diện riêng.", "Days with events are highlighted; each event keeps its own colour.")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="grid size-10 place-items-center border border-[var(--line)] hover:border-[#071a33]"
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label={tr("Tháng trước", "Previous month")}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="h-10 border border-[var(--line)] px-3 text-[10px] font-black uppercase hover:border-[#071a33]"
            type="button"
            onClick={() =>
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }
          >
            {tr("Hôm nay", "Today")}
          </button>
          <button
            className="grid size-10 place-items-center border border-[var(--line)] hover:border-[#071a33]"
            type="button"
            onClick={() => moveMonth(1)}
            aria-label={tr("Tháng sau", "Next month")}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {endedCount > 0 && (
        <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-[10px] font-bold text-[var(--muted)]">
          <input type="checkbox" className="size-3.5 accent-[#071a33]" checked={showEnded} onChange={(e) => setShowEnded(e.target.checked)} />
          {tr("Hiện sự kiện đã kết thúc", "Show ended events")} ({endedCount})
        </label>
      )}

      {visibleEvents.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2" aria-label={tr("Chú giải sự kiện", "Event legend")}>
          {visibleEvents.map((event) => {
            const color = eventColors.get(event.id)!
            const status = runStatus.get(event.id)!
            return (
              <a
                key={event.id}
                href={`${hrefBase}/${event.id}`}
                title={`${formatEventDay(event.startDate)} – ${formatEventDay(event.endDate)}`}
                className={`inline-flex items-center gap-2 border px-2.5 py-1.5 text-[9px] font-bold ${status === "ended" ? "border-dashed" : ""}`}
                style={{
                  backgroundColor: color.soft,
                  borderColor: color.solid,
                  color: color.ink,
                }}
              >
                <i
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color.solid }}
                />
                <span className={status === "ended" ? "line-through decoration-1" : ""}>{event.name}</span>
                <small className="opacity-65">
                  {label(status)} · {formatEventDay(event.startDate).slice(0, 5)}–{formatEventDay(event.endDate).slice(0, 5)}
                </small>
              </a>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-7 border-t border-l border-[var(--line)]">
        {weekDays.map(([vi, en]) => (
          <div
            key={vi}
            className="border-r border-b border-[var(--line)] bg-[var(--paper)] py-2 text-center text-[9px] font-black text-[var(--muted)] uppercase"
          >
            {tr(vi, en)}
          </div>
        ))}
        {days.map((date) => {
          const key = dayKey(date)
          const activeEvents = shownEvents.filter(
            (event) =>
              key >= event.startDate.slice(0, 10) &&
              key <= event.endDate.slice(0, 10),
          )
          const isToday = key === todayKey
          const isPast = key < todayKey
          const inMonth = date.getMonth() === month.getMonth()
          const firstEventColor = activeEvents[0]
            ? eventColors.get(activeEvents[0].id)
            : null
          return (
            <div
              key={key}
              className={`relative min-h-24 border-r border-b border-[var(--line)] p-1.5 transition-colors sm:min-h-28 sm:p-2 ${
                inMonth
                  ? activeEvents.length
                    ? ""
                    : "bg-[var(--white)]"
                  : "text-slate-400"
              } ${isPast && inMonth ? "text-slate-400" : ""}`}
              style={
                {
                  backgroundColor: firstEventColor
                    ? firstEventColor.soft
                    : inMonth
                      ? "#ffffff"
                      : "#f8fafc",
                  "--calendar-accent": firstEventColor?.solid ?? "transparent",
                } as CSSProperties
              }
            >
              {activeEvents.length > 0 && (
                <span className="absolute top-0 right-0 left-0 h-1 bg-[var(--calendar-accent)]" />
              )}
              <time
                dateTime={key}
                className={`grid size-6 place-items-center text-[10px] font-bold ${
                  isToday ? "bg-[#071a33] text-white" : isPast ? "opacity-60" : ""
                }`}
              >
                {date.getDate()}
              </time>
              <div className="mt-1 grid gap-1">
                {activeEvents.slice(0, 2).map((event) => {
                  const color = eventColors.get(event.id)!
                  const ended = runStatus.get(event.id) === "ended"
                  return (
                    <a
                      key={event.id}
                      href={`${hrefBase}/${event.id}`}
                      className={`flex min-w-0 items-center gap-1.5 border-l-[3px] bg-white/85 px-1.5 py-1 text-[8px] font-extrabold shadow-sm hover:ring-1 ${ended ? "opacity-70" : ""}`}
                      style={{
                        borderColor: color.solid,
                        color: color.ink,
                      }}
                      title={`${event.name} · ${formatEventDay(event.startDate)} – ${formatEventDay(event.endDate)} · ${label(runStatus.get(event.id)!)}`}
                    >
                      <span className={`truncate ${ended ? "line-through decoration-1" : ""}`}>{event.name}</span>
                    </a>
                  )
                })}
                {activeEvents.length > 2 && (
                  <small className="text-[8px] text-[var(--muted)]">
                    +{activeEvents.length - 2} {tr("sự kiện", "events")}
                  </small>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
