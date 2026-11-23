import Link from "next/link"
import { MessageSquareText, Package, Phone, Shirt, UserRound } from "lucide-react"
import { db, requireSeller } from "../seller-lib"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { CUSTOM_STATUS_LABELS, type CustomStatus } from "@/lib/custom-jersey"
import { JerseySvg, MATERIAL_LABELS, normalizeArt, PantsSvg, PANTS_STACK_CLASS, type Material } from "../../custom-ao/jersey-art"
import { CustomServiceForm } from "./CustomServiceForm"
import { jerseyFontVariables } from "../../custom-ao/jersey-fonts"
import { CustomRequestControls } from "./CustomRequestControls"
import { RequestChat } from "../../components/RequestChat"

export async function generateMetadata() {
  return localizedTitle("Đặt may custom | Kênh người bán BOAI", "Custom orders | BOAI Seller Centre")
}

const TABS = [
  { key: "moi", vi: "Cần báo giá", en: "To quote", statuses: ["pending", "quoted"] },
  { key: "dang-lam", vi: "Đã chốt · sản xuất", en: "Accepted · production", statuses: ["accepted", "in_production"] },
  { key: "da-xong", vi: "Đã đóng", en: "Closed", statuses: ["completed", "declined", "cancelled"] },
] as const

const ORDER_LABEL: Record<string, { vi: string; en: string }> = {
  pending: { vi: "Chờ xác nhận", en: "Awaiting confirmation" },
  // Values from the old quote flow read as "awaiting confirmation".
  awaiting_quote: { vi: "Chờ xác nhận", en: "Awaiting confirmation" },
  awaiting_payment: { vi: "Chờ khách thanh toán", en: "Awaiting buyer payment" },
  confirmed: { vi: "Chờ xác nhận", en: "Awaiting confirmation" },
  shipping: { vi: "Đang giao", en: "Shipping" },
  delivered: { vi: "Hoàn tất", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
}

export default async function SellerCustomRequests({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const seller = await requireSeller()
  const tr = await getTr()
  const { tab = "moi" } = await searchParams
  const payload = await db()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    user: seller,
    overrideAccess: false,
    where: { shop: { equals: seller.id } },
    sort: "-createdAt",
    limit: 200,
    depth: 0,
  })
  // Linked orders (code, delivery and payment state) for accepted requests.
  const orderIds = [...new Set(docs.map((doc) => (typeof doc.order === "object" ? doc.order?.id : doc.order)).filter(Boolean).map(String))]
  const orders = orderIds.length
    ? (await payload.find({ collection: "orders", where: { id: { in: orderIds } }, limit: orderIds.length, depth: 0, overrideAccess: true, select: { code: true, status: true, payment: true, sellerPayments: true } })).docs
    : []
  const orderOf = (doc: (typeof docs)[number]) => {
    const id = typeof doc.order === "object" ? doc.order?.id : doc.order
    return orders.find((o) => String(o.id) === String(id)) ?? null
  }
  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const shown = docs.filter((doc) => (active.statuses as readonly string[]).includes(doc.status))
  const custom = seller.seller?.customJersey

  return (
    <div className={jerseyFontVariables}>
      <header className="sc-head">
        <div><small>{tr("Dịch vụ thêm", "Extra services")}</small><h1>{tr("Đặt may custom", "Custom orders")}</h1></div>
        <Link className="boai-button" href="/custom-ao">{tr("Xem trang Custom áo", "View Custom page")}</Link>
      </header>

      <CustomServiceForm
        values={{
          enabled: !!custom?.enabled,
          intro: String(custom?.intro ?? ""),
          priceFrom: custom?.priceFrom == null ? "" : String(custom.priceFrom),
          minQuantity: custom?.minQuantity && custom.minQuantity > 1 ? String(custom.minQuantity) : "",
          leadDays: custom?.leadDays == null ? "" : String(custom.leadDays),
        }}
      />

      <nav className="sc-tabs" aria-label={tr("Lọc yêu cầu", "Filter requests")}>
        {TABS.map((t) => {
          const count = docs.filter((doc) => (t.statuses as readonly string[]).includes(doc.status)).length
          return (
            <Link key={t.key} href={`/kenh-ban-hang/custom-ao?tab=${t.key}`} className={t.key === active.key ? "active" : ""} aria-current={t.key === active.key ? "page" : undefined}>
              {tr(t.vi, t.en)} <span className="ml-1.5 opacity-60">{count}</span>
            </Link>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-14 text-center">
          <span className="grid size-12 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]"><Shirt size={22} /></span>
          <b className="text-sm">{tr("Chưa có yêu cầu nào", "No requests here")}</b>
          <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">{tr("Khi khách gửi mẫu áo cho shop, yêu cầu sẽ xuất hiện ở đây kèm bản thiết kế hai mặt.", "When customers send designs to your shop, they appear here with both sides.")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {shown.map((doc) => {
            const art = normalizeArt(doc.art)
            const status = CUSTOM_STATUS_LABELS[doc.status as CustomStatus]
            const material = doc.material as Material
            const order = orderOf(doc)
            const liveOrder = order && order.status !== "cancelled" ? order : null
            const paid = !liveOrder || liveOrder.payment !== "online" || (liveOrder.sellerPayments ?? []).every((p) => p.status === "paid")
            return (
              <article key={doc.id} className="sc-card grid gap-5 p-5 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "back"] as const).map((side) => (
                    <figure key={side} className="m-0 bg-[var(--soft-blue)] p-2">
                      <JerseySvg uid={`req-${doc.id}-${side}`} side={side} art={art[side]} kit={art.kit} shirtColor={doc.shirtColor} material={material} background={null} className="relative z-10 block aspect-[7/8] w-full" />
                      {art.pants.enabled && (
                        <PantsSvg uid={`req-p-${doc.id}-${side}`} side={side} art={art.pants[side]} kit={art.kit} pantsColor={art.pants.color} material={material} background={null} className={PANTS_STACK_CLASS} />
                      )}
                      <figcaption className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        {side === "front" ? tr("Mặt trước", "Front") : tr("Mặt sau", "Back")}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`sc-badge ${status.tone}`}>{tr(status.vi, status.en)}</span>
                    <small className="text-[11px] text-[var(--muted)]">#{doc.code} · {new Date(doc.createdAt).toLocaleString(tr("vi-VN", "en-GB"))}</small>
                  </div>
                  <h3 className="mb-3 mt-2 font-[family-name:var(--display)] text-2xl font-extrabold uppercase">{doc.designName}</h3>
                  <dl className="m-0 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="flex items-center gap-2"><UserRound size={14} className="text-[var(--lime-dark)]" /><dt className="sr-only">{tr("Khách", "Customer")}</dt><dd className="m-0 font-semibold">{doc.contactName}</dd></div>
                    <div className="flex items-center gap-2"><Phone size={14} className="text-[var(--lime-dark)]" /><dt className="sr-only">{tr("Điện thoại", "Phone")}</dt><dd className="m-0"><a className="font-semibold" href={`tel:${doc.contactPhone}`}>{doc.contactPhone}</a></dd></div>
                    <div className="flex items-center gap-2"><Package size={14} className="text-[var(--lime-dark)]" /><dt className="sr-only">{tr("Số lượng", "Quantity")}</dt><dd className="m-0">{doc.quantity} {art.pants.enabled ? tr("bộ áo + quần", "kits") : tr("áo", "pcs")} · Size {doc.jerseySize}</dd></div>
                    <div className="flex items-center gap-2"><Shirt size={14} className="text-[var(--lime-dark)]" /><dt className="sr-only">{tr("Chất liệu", "Material")}</dt><dd className="m-0 flex items-center gap-1.5">{tr(MATERIAL_LABELS[material]?.vi ?? material, MATERIAL_LABELS[material]?.en ?? material)}<span className="size-3 border border-[var(--line)]" style={{ background: doc.shirtColor }} /><span className="size-3 border border-[var(--line)]" style={{ background: doc.printColor }} /></dd></div>
                  </dl>
                  {doc.note && (
                    <p className="mb-0 mt-3 flex gap-2 bg-[var(--paper)] p-3 text-xs leading-5">
                      <MessageSquareText size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" /> {doc.note}
                    </p>
                  )}
                  {liveOrder && (
                    <p className="mb-0 mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="sc-badge confirmed">{tr("Đơn", "Order")} #{liveOrder.code}</span>
                      <span className="text-[var(--muted)]">
                        {tr(ORDER_LABEL[liveOrder.status]?.vi ?? liveOrder.status, ORDER_LABEL[liveOrder.status]?.en)} · {liveOrder.payment === "online" ? tr("Chuyển khoản", "Bank transfer") : tr("COD", "Cash on delivery")}
                      </span>
                      <Link href="/kenh-ban-hang/don-hang" className="font-bold text-[var(--lime-dark)]">{tr("Mở đơn hàng", "Open orders")}</Link>
                    </p>
                  )}
                  {doc.status !== "cancelled" && doc.status !== "declined" && (
                    <details className="mt-3 border border-[var(--line)]">
                      <summary className="cursor-pointer px-3 py-2 text-[11px] font-extrabold tracking-wide uppercase">{tr("Trao đổi với khách", "Message the customer")}</summary>
                      <RequestChat requestId={String(doc.id)} height="h-[320px]" />
                    </details>
                  )}
                </div>
                <CustomRequestControls
                  id={String(doc.id)}
                  status={doc.status as CustomStatus}
                  quotePrice={doc.quotePrice ?? null}
                  sellerReply={doc.sellerReply ?? ""}
                  quantity={doc.quantity}
                  counterOffer={doc.counterOffer ?? null}
                  customerNote={doc.customerNote ?? ""}
                  hasOrder={!!liveOrder}
                  orderPaid={paid}
                />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
