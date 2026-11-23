import Link from "next/link"
import { ArrowRight, BadgePercent, CalendarDays, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react"
import { getTr } from "@/lib/i18n-server"
import { effectiveEventStatus, formatEventRange, isRegistrationOpen } from "@/lib/event-dates"
import { salePrice } from "@/lib/event-rules"
import { MIN_EVENT_DISCOUNT } from "@/lib/event-rules"
import { EventCalendar } from "../../components/EventCalendar"
import { requireSeller, sellerEventCalendar, sellerProducts, sellerRegistrations } from "../seller-lib"

const STATUS: Record<string, { vi: string; en: string; tone: string }> = {
  scheduled: { vi: "Sắp diễn ra", en: "Upcoming", tone: "bg-blue-50 text-blue-700" },
  active: { vi: "Đang diễn ra", en: "Live", tone: "bg-green-50 text-green-700" },
  paused: { vi: "Tạm dừng", en: "Paused", tone: "bg-amber-50 text-amber-700" },
  ended: { vi: "Đã kết thúc", en: "Ended", tone: "bg-slate-100 text-slate-600" },
}

const REVIEW: Record<string, { vi: string; en: string; tone: string }> = {
  pending: { vi: "Chờ BOAI duyệt", en: "Awaiting review", tone: "bg-amber-50 text-amber-800 ring-1 ring-amber-200" },
  approved: { vi: "Đã được duyệt", en: "Approved", tone: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  rejected: { vi: "Bị từ chối", en: "Rejected", tone: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  withdrawn: { vi: "Đã rút", en: "Withdrawn", tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
}
const money = new Intl.NumberFormat("vi-VN")

export default async function SellerEventsPage() {
  const seller = await requireSeller()
  const tr = await getTr()
  const [events, registrations, products] = await Promise.all([
    sellerEventCalendar(seller),
    sellerRegistrations(seller),
    sellerProducts(seller.id),
  ])
  const byEvent = new Map(
    registrations.map((item) => [String(typeof item.event === "object" ? item.event.id : item.event), item]),
  )
  const open = events.filter((event) => isRegistrationOpen(event))
  const lines = registrations.flatMap((registration) => registration.items ?? [])
  const approved = lines.filter((line) => line.status === "approved").length
  const pending = lines.filter((line) => line.status === "pending").length
  // Shop sale overview: every approved or waiting product in live and upcoming events.
  const eventById = new Map(events.map((event) => [String(event.id), event]))
  const productById = new Map(products.map((product) => [String(product.id), product]))
  const saleRows = registrations.flatMap((registration) => {
    const event = eventById.get(String(typeof registration.event === "object" ? registration.event.id : registration.event))
    if (!event) return []
    const run = effectiveEventStatus(event)
    if (run === "ended" || run === "draft") return []
    return (registration.items ?? [])
      .filter((line) => line.status === "approved" || line.status === "pending")
      .map((line) => ({ line, event, run, product: productById.get(String(typeof line.product === "object" && line.product ? line.product.id : line.product)) }))
  })
  // Live and upcoming events first; finished ones (by date, not stored status) go last, newest first.
  const ended = events.filter((event) => effectiveEventStatus(event) === "ended").reverse()
  const current = events.filter((event) => effectiveEventStatus(event) !== "ended")
  const ordered = [...current.filter((event) => isRegistrationOpen(event)), ...current.filter((event) => !isRegistrationOpen(event))]

  const renderCard = (event: (typeof events)[number]) => {
            const status = STATUS[effectiveEventStatus(event)] ?? STATUS.scheduled
            const registration = byEvent.get(String(event.id))
            const review = registration ? REVIEW[registration.reviewStatus ?? "pending"] : null
            const canRegister = isRegistrationOpen(event)
            return (
              <article
                key={event.id}
                className="group grid border border-[var(--line)] bg-[var(--white)] transition hover:-translate-y-0.5 hover:border-[#071a33] hover:shadow-lg"
              >
                <div
                  className="flex items-end justify-between gap-3 px-5 pt-5 pb-4"
                  style={{
                    background: event.backgroundColor ?? "#071a33",
                    color: event.textColor ?? "#ffffff",
                  }}
                >
                  <div className="min-w-0">
                    <span className={`mb-2 inline-block px-2 py-1 text-[9px] font-black tracking-wider uppercase ${status.tone}`}>
                      {tr(status.vi, status.en)}
                    </span>
                    <h2 className="m-0 truncate font-[family-name:var(--display)] text-2xl font-black uppercase">{event.name}</h2>
                    {event.slogan && <p className="mt-1 mb-0 truncate text-xs font-bold opacity-80">{event.slogan}</p>}
                  </div>
                </div>
                <div className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={14} />
                      {formatEventRange(event)}
                    </span>
                    {review ? (
                      <span className={`px-2 py-1 text-[9px] font-black tracking-wider uppercase ${review.tone}`}>
                        {tr(review.vi, review.en)} · {tr("đến", "up to")} −{registration!.discountPercent ?? 0}%
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">{tr("Chưa đăng ký", "Not registered")}</span>
                    )}
                  </div>
                  <p className="m-0 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{event.description}</p>
                  {registration?.reviewStatus === "rejected" && registration.reviewNote && (
                    <p className="m-0 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-800">
                      <b>{tr("Lý do từ chối:", "Rejection reason:")}</b> {registration.reviewNote}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Link
                      className={canRegister && !registration ? "boai-button primary min-h-10" : "flex items-center gap-1 text-xs font-bold text-blue-700"}
                      href={`/kenh-ban-hang/su-kien/${event.id}`}
                    >
                      {canRegister
                        ? registration
                          ? tr("Xem / sửa đăng ký", "View / edit registration")
                          : tr("Đăng ký tham gia", "Register")
                        : tr("Xem chi tiết", "View details")}
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            )
          }

  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Chiến dịch toàn sàn BOAI", "BOAI platform campaigns")}</small>
          <h1>{tr("Sự kiện", "Events")}</h1>
        </div>
      </header>

      <section className="mb-4 grid gap-3 border border-[var(--line)] bg-[#071a33] p-5 text-white sm:grid-cols-3 sm:p-6">
        {[
          [CalendarDays, tr("Chọn sự kiện", "Pick an event"), tr("BOAI lên lịch các sự kiện toàn website.", "BOAI schedules site-wide events.")],
          [BadgePercent, tr(`Giảm từ ${MIN_EVENT_DISCOUNT}%`, `${MIN_EVENT_DISCOUNT}%+ off`), tr("Chọn sản phẩm và tự đặt mức giảm riêng của shop.", "Choose products and set your own discount.")],
          [ShieldCheck, tr("BOAI duyệt", "BOAI approves"), tr("Được duyệt, sản phẩm lên đầu đề xuất kèm thương hiệu shop.", "Once approved, products lead recommendations with your shop identity.")],
        ].map(([Icon, title, text], index) => {
          const I = Icon as typeof CalendarDays
          return (
            <div key={index} className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center bg-white/10 text-[var(--lime)]">
                <I size={19} />
              </span>
              <div>
                <b className="block text-sm">{title as string}</b>
                <small className="text-[11px] leading-5 text-white/70">{text as string}</small>
              </div>
            </div>
          )
        })}
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          [Sparkles, tr("Đang nhận đăng ký", "Open for registration"), open.length, "bg-blue-50 text-blue-700"],
          [CheckCircle2, tr("Sản phẩm đã duyệt", "Approved products"), approved, "bg-green-50 text-green-700"],
          [Clock3, tr("Sản phẩm chờ duyệt", "Products awaiting review"), pending, "bg-amber-50 text-amber-700"],
        ].map(([Icon, label, value, tone]) => {
          const I = Icon as typeof Sparkles
          return (
            <div key={label as string} className="sc-card flex items-center gap-4">
              <span className={`grid size-11 place-items-center ${tone}`}>
                <I size={20} />
              </span>
              <div>
                <small>{label as string}</small>
                <b className="block font-[family-name:var(--display)] text-3xl">{value as number}</b>
              </div>
            </div>
          )
        })}
      </section>

      <section className="sc-card mb-4 p-0" id="sale-cua-shop">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--line)] px-5 py-4">
          <div>
            <small className="text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">{tr("Quản lý Sale của shop", "Your shop's sale")}</small>
            <h2 className="m-0 font-[family-name:var(--display)] text-2xl font-black uppercase">{tr("Sản phẩm đang và sắp giảm giá", "Products on sale now and soon")}</h2>
          </div>
          <small className="text-[11px] text-[var(--muted)]">{tr("Giá sự kiện tự bật/tắt theo giờ của sự kiện và dừng khi hết suất.", "Event prices switch on and off with the event's hours and stop when units run out.")}</small>
        </div>
        {saleRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[10px] tracking-wider text-[var(--muted)] uppercase">
                <tr>
                  <th className="px-5 py-2">{tr("Sản phẩm", "Product")}</th>
                  <th className="py-2">{tr("Sự kiện", "Event")}</th>
                  <th className="py-2">{tr("Giảm", "Off")}</th>
                  <th className="py-2">{tr("Giá sự kiện", "Event price")}</th>
                  <th className="py-2">{tr("Đã bán / suất", "Sold / units")}</th>
                  <th className="py-2 pr-5">{tr("Trạng thái", "Status")}</th>
                </tr>
              </thead>
              <tbody>
                {saleRows.map(({ line, event, run, product }) => (
                  <tr key={`${event.id}-${line.id}`} className="border-t border-[var(--line)]">
                    <td className="max-w-56 truncate px-5 py-2.5 font-bold">{product?.name ?? tr("Sản phẩm đã xóa", "Deleted product")}</td>
                    <td className="py-2.5">
                      <Link href={`/kenh-ban-hang/su-kien/${event.id}`} className="font-bold text-blue-700">{event.name}</Link>
                      <small className="block text-[10px] text-[var(--muted)]">{formatEventRange(event)}</small>
                    </td>
                    <td className="py-2.5 font-black">−{line.discountPercent}%</td>
                    <td className="py-2.5">{product ? `${money.format(salePrice(product.price, Number(line.discountPercent)))}₫` : "—"}</td>
                    <td className="py-2.5">{line.quota ? `${line.sold ?? 0}/${line.quota}` : `${line.sold ?? 0} · ${tr("không giới hạn", "unlimited")}`}</td>
                    <td className="py-2.5 pr-5">
                      {line.status === "pending" ? (
                        <span className="bg-amber-50 px-2 py-1 text-[9px] font-black tracking-wider text-amber-800 uppercase">{tr("Chờ duyệt", "In review")}</span>
                      ) : line.quota && Number(line.sold ?? 0) >= line.quota ? (
                        <span className="bg-slate-100 px-2 py-1 text-[9px] font-black tracking-wider text-slate-600 uppercase">{tr("Hết suất", "Sold out")}</span>
                      ) : run === "active" ? (
                        <span className="bg-green-50 px-2 py-1 text-[9px] font-black tracking-wider text-green-700 uppercase">{tr("Đang giảm", "On sale")}</span>
                      ) : (
                        <span className="bg-blue-50 px-2 py-1 text-[9px] font-black tracking-wider text-blue-700 uppercase">{run === "paused" ? tr("Tạm dừng", "Paused") : tr("Sắp diễn ra", "Upcoming")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 px-5 py-6 text-center text-sm text-[var(--muted)]">
            {tr("Chưa có sản phẩm nào trong sự kiện đang hoặc sắp diễn ra. Chọn một sự kiện bên dưới để đăng ký.", "No products in live or upcoming events yet. Pick an event below to register.")}
          </p>
        )}
      </section>

      <EventCalendar
        hrefBase="/kenh-ban-hang/su-kien"
        eyebrow={tr("Lịch sự kiện BOAI", "BOAI event calendar")}
        hint={tr("Bấm vào một sự kiện để xem chi tiết và đăng ký tham gia.", "Click an event to view details and register.")}
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

      {ordered.length || ended.length ? (
        <>
          {ordered.length > 0 ? (
            <section className="grid gap-3 xl:grid-cols-2">{ordered.map(renderCard)}</section>
          ) : (
            <p className="m-0 border border-dashed border-[var(--line)] bg-[var(--white)] p-6 text-center text-sm text-[var(--muted)]">
              {tr("Hiện chưa có sự kiện đang hoặc sắp diễn ra.", "No live or upcoming events right now.")}
            </p>
          )}
          {ended.length > 0 && (
            <details className="group mt-6">
              <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-xs font-black tracking-wider text-[var(--muted)] uppercase">
                <span className="transition group-open:rotate-90">›</span>
                {tr("Sự kiện đã kết thúc", "Finished events")} ({ended.length})
              </summary>
              <section className="grid gap-3 opacity-80 xl:grid-cols-2">{ended.map(renderCard)}</section>
            </details>
          )}
        </>
      ) : (
        <section className="grid min-h-72 place-items-center border border-dashed border-[var(--line)] bg-[var(--white)] p-8 text-center">
          <div>
            <span className="mx-auto mb-4 grid size-14 place-items-center bg-lime-50 text-[var(--lime-dark)]">
              <CalendarDays size={25} />
            </span>
            <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
              {tr("Chưa có sự kiện", "No events yet")}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              {tr(
                "BOAI sẽ công bố lịch sự kiện tại đây. Bạn có thể đăng ký sản phẩm ngay khi sự kiện mở.",
                "BOAI will publish upcoming events here. You can register products as soon as one opens.",
              )}
            </p>
          </div>
        </section>
      )}
    </>
  )
}
