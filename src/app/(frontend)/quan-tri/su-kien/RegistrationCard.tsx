import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Store, Tag } from "lucide-react"
import type { EventRegistration } from "@/payload-types"
import { getTr } from "@/lib/i18n-server"
import { formatEventRange } from "@/lib/event-dates"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, salePrice } from "@/lib/event-rules"
import { fmtDate } from "../admin-lib"
import { ReviewControls, SaleBulkReview, SaleItemReview } from "../AdminControls"
import { Badge } from "../ui"

const money = new Intl.NumberFormat("vi-VN")
const TONE: Record<string, string> = { pending: "pending", approved: "delivered", rejected: "cancelled", withdrawn: "", draft: "" }

/** One shop's request to join a platform event: every product with its own discount, units and decision. */
export async function RegistrationCard({
  registration,
  showEvent = true,
}: {
  registration: EventRegistration
  showEvent?: boolean
}) {
  const tr = await getTr()
  const seller = typeof registration.seller === "object" ? registration.seller : null
  const event = typeof registration.event === "object" ? registration.event : null
  const status = registration.reviewStatus ?? "pending"
  const shopName = seller?.seller?.shopName || seller?.name || tr("Người bán đã xóa", "Deleted seller")
  const cap = Math.min(MAX_EVENT_DISCOUNT, Number(event?.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT))
  const items = registration.items ?? []
  const label = (value: string) =>
    ({
      pending: tr("Chờ duyệt", "Pending"),
      approved: tr("Đã duyệt", "Approved"),
      rejected: tr("Từ chối", "Rejected"),
      withdrawn: tr("Shop đã rút", "Withdrawn"),
      draft: tr("Nháp", "Draft"),
    })[value] ?? value
  const pendingCount = items.filter((item) => item.status === "pending").length
  const liveCount = items.filter((item) => item.status === "approved").length
  // Registrations saved before per-product rows: decided as a whole.
  const legacyProducts = items.length ? [] : (registration.products ?? []).filter((product) => typeof product === "object")

  return (
    <article className="sc-card grid gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={TONE[status]}>{label(status)}</Badge>
            {showEvent && event && <Badge>{event.name}</Badge>}
          </div>
          <h2 className="m-0 flex items-center gap-2 text-lg font-black">
            <Store size={16} className="shrink-0 text-[var(--lime-dark)]" />
            {seller ? (
              <Link href={`/cua-hang/${seller.id}`} className="truncate text-inherit">
                {shopName}
              </Link>
            ) : (
              <span className="truncate">{shopName}</span>
            )}
          </h2>
          {seller?.email && <small className="text-[11px] text-[var(--muted)]">{seller.email}</small>}
        </div>
        <span className="grid min-w-14 shrink-0 place-items-center bg-[#071a33] px-2 py-2 text-center font-[family-name:var(--display)] text-xl leading-none font-black text-white">
          <small className="text-[9px] font-bold tracking-wider opacity-70">{tr("ĐẾN", "UP TO")}</small>−{registration.discountPercent ?? 0}%
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-y border-[var(--line)] py-2.5 text-[11px]">
        {event && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} /> {formatEventRange(event)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Tag size={13} /> {tr(`${items.length || legacyProducts.length} sản phẩm · trần ${cap}%`, `${items.length || legacyProducts.length} products · ceiling ${cap}%`)}
        </span>
      </div>
      {items.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0">
          {items.map((item) => {
            const product = item.product && typeof item.product === "object" ? item.product : null
            const image = product && typeof product.image === "object" ? product.image : null
            const name = product?.name ?? tr("Sản phẩm đã xóa", "Deleted product")
            const overCap = item.discountPercent > cap
            return (
              <li key={item.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-[var(--line)] pb-2 last:border-0">
                <span className="relative size-10 shrink-0 overflow-hidden bg-[var(--paper)]">
                  {image?.url && <Image src={image.url} alt={image.alt || name} fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-[12px]">{name}</b>
                  <small className="text-[11px] text-[var(--muted)]">
                    {product ? (
                      <>
                        <del>{money.format(product.price)}₫</del> → <b className="text-[var(--ink)]">{money.format(salePrice(product.price, Math.min(cap, item.discountPercent)))}₫</b>
                      </>
                    ) : null}{" "}
                    · −{item.discountPercent}%{overCap && ` (${tr(`áp dụng ${cap}% theo trần`, `capped at ${cap}%`)})`} ·{" "}
                    {item.quota ? tr(`${item.sold ?? 0}/${item.quota} suất`, `${item.sold ?? 0}/${item.quota} units`) : tr("không giới hạn suất", "unlimited units")}
                  </small>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={TONE[item.status ?? "pending"]}>{label(item.status ?? "pending")}</Badge>
                    {item.reviewNote && <small className="text-[10px] text-[#7d1d1d]">{item.reviewNote}</small>}
                  </span>
                </span>
                <SaleItemReview registrationId={String(registration.id)} itemId={String(item.id)} status={item.status ?? "pending"} productName={name} />
              </li>
            )
          })}
        </ul>
      )}
      {legacyProducts.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {legacyProducts.map((product) =>
            typeof product === "object" ? (
              <li key={product.id} className="min-w-0 truncate text-[12px]">
                <b>{product.name}</b> · −{registration.discountPercent}%
              </li>
            ) : null,
          )}
        </ul>
      )}
      {registration.reviewNote && (
        <p className="m-0 border-l-2 border-[#a42626] bg-[#fdf1f1] px-3 py-2 text-[11px] text-[#7d1d1d]">{registration.reviewNote}</p>
      )}
      <div className="flex items-end justify-between gap-3">
        <small className="text-[11px] text-[var(--muted)]">
          {tr("Cập nhật lúc", "Updated")} {fmtDate(registration.updatedAt, true)}
        </small>
        {items.length ? (
          <SaleBulkReview registrationId={String(registration.id)} pendingCount={pendingCount} liveCount={liveCount} />
        ) : (
          <ReviewControls kind="registration" id={String(registration.id)} status={status} />
        )}
      </div>
    </article>
  )
}
