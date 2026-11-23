import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, Lock } from "lucide-react"
import { getTr } from "@/lib/i18n-server"
import { effectiveEventStatus, formatEventRange, isRegistrationOpen } from "@/lib/event-dates"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT } from "@/lib/event-rules"
import { deriveProductType, isProductType, PRODUCT_TYPES } from "@/lib/product-types"
import { db, requireSeller, sellerProducts } from "../../seller-lib"
import { RegistrationForm, type ExistingItem } from "../RegistrationForm"
import { WithdrawRegistrationButton } from "../WithdrawRegistrationButton"

const REVIEW: Record<string, { vi: string; en: string; tone: string }> = {
  pending: { vi: "Có sản phẩm đang chờ BOAI duyệt", en: "Some products are awaiting BOAI review", tone: "border-amber-300 bg-amber-50 text-amber-900" },
  approved: { vi: "Đã được duyệt — sản phẩm được đề xuất hàng đầu khi sự kiện diễn ra", en: "Approved — your products lead recommendations while the event is live", tone: "border-green-300 bg-green-50 text-green-900" },
  rejected: { vi: "Bị từ chối — bạn có thể chỉnh sửa và gửi lại từng sản phẩm", en: "Rejected — edit and re-send each product", tone: "border-red-300 bg-red-50 text-red-900" },
  withdrawn: { vi: "Shop đã rút khỏi sự kiện", en: "You withdrew from this event", tone: "border-slate-300 bg-slate-50 text-slate-800" },
}

export default async function SellerEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await requireSeller()
  const tr = await getTr()
  const payload = await db()
  const scoped = { user: seller, overrideAccess: false } as const
  const event = await payload.findByID({ collection: "events", id, depth: 1, ...scoped }).catch(() => null)
  if (!event) notFound()
  const [products, { docs }] = await Promise.all([
    sellerProducts(seller.id),
    payload.find({
      collection: "event-registrations",
      ...scoped,
      depth: 0,
      limit: 1,
      where: { and: [{ event: { equals: event.id } }, { seller: { equals: seller.id } }] },
    }),
  ])
  const registration = docs[0] ?? null
  const open = isRegistrationOpen(event)
  const image = event.campaignImage && typeof event.campaignImage === "object" ? event.campaignImage : null
  const review = registration ? REVIEW[registration.reviewStatus ?? "pending"] : null
  const cap = Math.min(MAX_EVENT_DISCOUNT, Number(event.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT))
  const allowed = (event.allowedProductTypes ?? []) as string[]
  const allowedLabel = allowed.length
    ? PRODUCT_TYPES.filter((t) => allowed.includes(t.id)).map((t) => tr(t.vi, t.en)).join(", ")
    : null
  const items: ExistingItem[] = (registration?.items ?? []).map((line) => ({
    id: String(line.id),
    product: String(typeof line.product === "object" && line.product ? line.product.id : line.product),
    discountPercent: Number(line.discountPercent),
    quota: line.quota ?? null,
    sold: Number(line.sold ?? 0),
    status: (line.status ?? "pending") as ExistingItem["status"],
    reviewNote: line.reviewNote ?? null,
  }))
  const counts = {
    approved: items.filter((i) => i.status === "approved").length,
    pending: items.filter((i) => i.status === "pending").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  }
  const live = effectiveEventStatus(event) === "active"

  return (
    <>
      <header className="sc-head">
        <div>
          <small>
            <Link className="flex items-center gap-1" href="/kenh-ban-hang/su-kien">
              <ArrowLeft size={13} /> {tr("Sự kiện", "Events")}
            </Link>
          </small>
          <h1>{event.name}</h1>
        </div>
      </header>

      <section
        className="relative mb-5 grid min-h-56 overflow-hidden"
        style={{ background: event.backgroundColor ?? "#071a33", color: event.textColor ?? "#ffffff" }}
      >
        {image?.url && (
          <>
            <Image src={image.url} alt={image.alt || event.name} fill sizes="(max-width: 1200px) 100vw, 1100px" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
          </>
        )}
        <div className="relative grid content-end gap-2 p-6 sm:p-8">
          <span className="flex items-center gap-2 text-[11px] font-black tracking-[0.16em] uppercase opacity-85">
            <CalendarDays size={14} />
            {formatEventRange(event)} {tr("(giờ Việt Nam)", "(Vietnam time)")}
            {live && <span className="bg-white px-1.5 py-0.5 text-[9px] text-[#071a33]">{tr("Đang diễn ra", "Live")}</span>}
          </span>
          <h2 className="m-0 font-[family-name:var(--display)] text-4xl leading-none font-black uppercase sm:text-5xl">{event.name}</h2>
          {event.slogan && <strong className="text-base">{event.slogan}</strong>}
          <p className="m-0 max-w-2xl text-sm leading-6 opacity-90">{event.description}</p>
        </div>
      </section>

      {registration && review && (
        <div className={`mb-5 flex flex-wrap items-start justify-between gap-3 border px-4 py-3 ${review.tone}`}>
          <div className="min-w-0 text-sm">
            <b className="block">{tr(review.vi, review.en)}</b>
            <span className="text-xs">
              {tr(
                `${counts.approved} đã duyệt · ${counts.pending} chờ duyệt · ${counts.rejected} bị từ chối. Trần giảm của sự kiện: ${cap}%.`,
                `${counts.approved} approved · ${counts.pending} pending · ${counts.rejected} rejected. Event ceiling: ${cap}%.`,
              )}
            </span>
            {registration.reviewStatus === "rejected" && registration.reviewNote && (
              <p className="mt-1 mb-0 text-xs">
                <b>{tr("Lý do:", "Reason:")}</b> {registration.reviewNote}
              </p>
            )}
          </div>
          {open && items.some((item) => item.status === "approved" || item.status === "pending") && <WithdrawRegistrationButton id={String(registration.id)} />}
        </div>
      )}

      {open ? (
        <RegistrationForm
          eventId={String(event.id)}
          cap={cap}
          allowedLabel={allowedLabel}
          items={items}
          products={products.map((product) => {
            const type = isProductType(product.productType) ? product.productType : deriveProductType(product)
            return {
              id: String(product.id),
              name: product.name,
              price: product.price,
              image: typeof product.image === "object" ? (product.image.url ?? undefined) : undefined,
              eligible: !allowed.length || allowed.includes(type),
            }
          })}
        />
      ) : (
        <section className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--white)] p-10 text-center">
          <Lock size={22} className="text-[var(--muted)]" />
          <b>{tr("Sự kiện không còn nhận đăng ký", "Registration is closed")}</b>
          <p className="m-0 max-w-md text-xs leading-5 text-[var(--muted)]">
            {tr(
              "Chỉ đăng ký được khi sự kiện sắp diễn ra hoặc đang diễn ra.",
              "You can only register while an event is upcoming or live.",
            )}
          </p>
          {items.length > 0 && (
            <ul className="m-0 mt-4 grid w-full max-w-2xl list-none gap-1.5 p-0 text-left text-xs">
              {items.map((item) => {
                const product = products.find((p) => String(p.id) === item.product)
                return (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] py-1.5">
                    <span className="min-w-0 truncate font-bold">{product?.name ?? tr("Sản phẩm đã xóa", "Deleted product")}</span>
                    <span className="text-[var(--muted)]">
                      −{item.discountPercent}% · {item.quota ? tr(`đã bán ${item.sold}/${item.quota}`, `${item.sold}/${item.quota} sold`) : tr(`đã bán ${item.sold}`, `${item.sold} sold`)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
