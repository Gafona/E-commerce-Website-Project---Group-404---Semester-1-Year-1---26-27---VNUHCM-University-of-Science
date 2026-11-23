import Image from "next/image"
import Link from "next/link"
import { CalendarDays, CalendarPlus, ClipboardCheck, Pencil, Store } from "lucide-react"
import { EventCalendar } from "../../components/EventCalendar"
import { EventTimeline } from "./EventTimeline"
import { db, requireAdmin } from "../admin-lib"
import { Badge, Empty, PageHead } from "../ui"
import { DeleteEventButton } from "./DeleteEventButton"
import { EventTabs } from "./EventTabs"
import { effectiveEventStatus, formatEventRange } from "@/lib/event-dates"

export const metadata = { title: "Quản lý sự kiện | Quản trị BOAI" }

const RUN_STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "" },
  scheduled: { label: "Đã lên lịch", tone: "pending" },
  active: { label: "Đang diễn ra", tone: "delivered" },
  paused: { label: "Tạm dừng", tone: "pending" },
  ended: { label: "Đã kết thúc", tone: "cancelled" },
}

export default async function AdminEventsPage() {
  const admin = await requireAdmin()
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const [{ docs: events }, { docs: registrations }] = await Promise.all([
    payload.find({ collection: "events", sort: "-startDate", limit: 200, depth: 1, ...scoped }),
    payload.find({
      collection: "event-registrations",
      limit: 1000,
      pagination: false,
      depth: 0,
      select: { event: true, reviewStatus: true },
      ...scoped,
    }),
  ])
  const stats = new Map<string, { approved: number; pending: number }>()
  for (const item of registrations) {
    const key = String(typeof item.event === "object" ? item.event.id : item.event)
    const current = stats.get(key) ?? { approved: 0, pending: 0 }
    if (item.reviewStatus === "approved") current.approved++
    if (item.reviewStatus === "pending") current.pending++
    stats.set(key, current)
  }
  const pendingTotal = registrations.filter((item) => item.reviewStatus === "pending").length
  // Finished events (by date) sink below live, upcoming and draft ones.
  const ordered = [
    ...events.filter((event) => effectiveEventStatus(event) !== "ended"),
    ...events.filter((event) => effectiveEventStatus(event) === "ended"),
  ]

  return (
    <>
      <PageHead eyebrow="Chiến dịch toàn website" title="Quản lý sự kiện">
        <div className="flex flex-wrap gap-2">
          <Link className="boai-button dark min-h-10 px-4" href="/quan-tri/su-kien/dang-ky">
            <ClipboardCheck size={16} /> Duyệt đăng ký{pendingTotal ? ` (${pendingTotal})` : ""}
          </Link>
          <Link className="boai-button primary min-h-10 px-4" href="/quan-tri/su-kien/moi">
            <CalendarPlus size={16} /> Tạo sự kiện
          </Link>
        </div>
      </PageHead>
      <EventTabs active="events" pending={pendingTotal} />

      <EventTimeline
        events={events.map((event) => ({
          id: String(event.id),
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          status: event.status,
          color: event.backgroundColor,
        }))}
      />

      <EventCalendar
        hrefBase="/quan-tri/su-kien"
        eyebrow="Lịch sự kiện toàn website"
        events={events.map((event) => ({
          id: String(event.id),
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          status: event.status,
        }))}
      />

      {events.length ? (
        <div className="grid gap-3.5 xl:grid-cols-2">
          {ordered.map((event) => {
            const image = event.campaignImage && typeof event.campaignImage === "object" ? event.campaignImage : null
            const stat = stats.get(String(event.id)) ?? { approved: 0, pending: 0 }
            const runStatus = effectiveEventStatus(event)
            const status = RUN_STATUS[runStatus] ?? RUN_STATUS.draft
            return (
              <article key={event.id} className="sc-card grid gap-0 p-0 sm:grid-cols-[170px_1fr]">
                <div
                  className="relative min-h-[150px]"
                  style={{ background: event.backgroundColor ?? "#071a33" }}
                >
                  {image?.url ? (
                    <Image src={image.url} alt={image.alt || event.name} fill sizes="170px" className="object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-white/70">
                      <CalendarDays size={30} />
                    </span>
                  )}
                </div>
                <div className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <Badge>{event.category === "sport" ? "Sport event" : "Seasonal event"}</Badge>
                    {runStatus === "ended" && event.status !== "ended" && (
                      <span className="text-[10px] text-[var(--muted)]">Tự kết thúc theo ngày</span>
                    )}
                  </div>
                  <div>
                    <h2 className="m-0 font-[family-name:var(--display)] text-2xl leading-tight font-black uppercase">{event.name}</h2>
                    {event.slogan && <p className="m-0 mt-0.5 text-[12px] font-bold text-[var(--lime-dark)]">{event.slogan}</p>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-y border-[var(--line)] py-2.5 text-[11px]">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatEventRange(event)}</span>
                    <span className="inline-flex items-center gap-1.5"><Store size={13} /> {stat.approved} shop đã duyệt</span>
                    {stat.pending > 0 && (
                      <Link href="/quan-tri/su-kien/dang-ky" className="font-bold text-amber-700">
                        {stat.pending} chờ duyệt
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <Link className="flex items-center gap-1 text-xs font-bold text-blue-700" href={`/quan-tri/su-kien/${event.id}`}>
                      <Pencil size={14} /> Chỉnh sửa
                    </Link>
                    <DeleteEventButton id={String(event.id)} name={event.name} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty icon={<CalendarDays size={22} />} title="Chưa có sự kiện" text="Tạo sự kiện đầu tiên để người bán có thể đăng ký sản phẩm tham gia." />
      )}
    </>
  )
}
