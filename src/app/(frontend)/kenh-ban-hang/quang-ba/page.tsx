import Image from "next/image"
import Link from "next/link"
import { BadgePercent, Megaphone, QrCode } from "lucide-react"
import { getLang, getTr } from "@/lib/i18n-server"
import { vietQrUrl } from "@/lib/banks"
import { getPaymentAccount } from "@/lib/payment-settings"
import { recommendationSettings, takenRanges } from "@/lib/recommendation-slots"
import {
  PHASE_LABELS,
  POSITION_LABELS,
  addDays,
  formatDay,
  phaseOf,
  slotRange,
  vnDay,
  type RecommendationPhase,
  type RecommendationPosition,
} from "@/lib/recommendations"
import { db, requireSeller, sellerProducts, vnd } from "../seller-lib"
import { CancelRecommendation } from "./CancelRecommendation"
import { RecommendationForm } from "./RecommendationForm"

export const metadata = { title: "Đề xuất trả phí | Kênh bán hàng BOAI" }

const TABS: { key: string; vi: string; en: string; phases: RecommendationPhase[] | null }[] = [
  { key: "tat-ca", vi: "Tất cả", en: "All", phases: null },
  { key: "cho-duyet", vi: "Chờ duyệt", en: "Awaiting review", phases: ["pending"] },
  { key: "dang-chay", vi: "Đang chạy", en: "Running", phases: ["running", "scheduled"] },
  { key: "het-han", vi: "Hết hạn", en: "Ended", phases: ["expired", "lapsed"] },
  { key: "tu-choi", vi: "Bị từ chối", en: "Rejected", phases: ["rejected"] },
]

export default async function SellerRecommendationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const seller = await requireSeller()
  const [tr, lang, payload, query] = await Promise.all([getTr(), getLang(), db(), searchParams])
  const today = vnDay(Date.now())
  const from = slotRange(today, 1).startsAt
  const [products, requests, settings, account, football, badminton] = await Promise.all([
    sellerProducts(seller.id),
    payload.find({ collection: "recommendation-requests", depth: 1, limit: 200, sort: "-createdAt", overrideAccess: false, user: seller }),
    recommendationSettings(payload),
    getPaymentAccount(payload),
    takenRanges(payload, { position: "football", from, statuses: ["pending", "approved"] }),
    takenRanges(payload, { position: "badminton", from, statuses: ["pending", "approved"] }),
  ])
  const now = Date.now()
  const rows = requests.docs.map((doc) => ({ doc, phase: phaseOf(doc, now) }))
  const tabKey = typeof query.tab === "string" && TABS.some((t) => t.key === query.tab) ? query.tab : "tat-ca"
  const tab = TABS.find((t) => t.key === tabKey)!
  const visible = tab.phases ? rows.filter((row) => tab.phases!.includes(row.phase)) : rows
  const running = rows.filter((row) => row.phase === "running").length
  const label = (position: string) => {
    const item = POSITION_LABELS[position as RecommendationPosition]
    return item ? (lang === "en" ? `${item.en} · ${item.sportEn}` : `${item.vi} · ${item.sportVi}`) : position
  }

  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Tăng khả năng tiếp cận", "Grow your reach")}</small>
          <h1>{tr("Đề xuất trả phí", "Paid recommendations")}</h1>
        </div>
        <Link className="boai-button dark" href="/kenh-ban-hang/su-kien">
          <BadgePercent size={17} />
          {tr("Tạo sự kiện giảm giá", "Create sale event")}
        </Link>
      </header>
      <section className="promotion-summary">
        <span>
          <Megaphone size={22} />
        </span>
        <div>
          <b>{tr(`${running} sản phẩm đang được đề xuất trên trang chủ`, `${running} products recommended on the homepage now`)}</b>
          <p>
            {tr(
              "Thuê suất hiển thị ở khối “Trang bị sân cỏ” (bóng đá) hoặc “Tốc độ trên không” (cầu lông) theo ngày. Chỉ đề xuất đã thu phí và được duyệt mới hiển thị.",
              "Rent a daily spot in the “Pitch gear” (football) or “Speed in the air” (badminton) homepage section. Only paid, approved bookings are shown.",
            )}
          </p>
        </div>
      </section>

      <div className="mb-6">
        <RecommendationForm
          products={products.filter((p) => !p.hidden).map((p) => ({ id: String(p.id), name: p.name, sport: p.sport }))}
          taken={{ football, badminton }}
          slots={settings.slots}
          minPrice={settings.minPrice}
          today={today}
        />
      </div>

      <h2 className="mb-3 text-base font-extrabold">{tr("Yêu cầu của shop", "Your requests")}</h2>
      <nav className="sc-tabs" aria-label={tr("Lọc theo trạng thái", "Filter by status")}>
        {TABS.map((t) => {
          const count = t.phases ? rows.filter((row) => t.phases!.includes(row.phase)).length : rows.length
          return (
            <Link key={t.key} href={t.key === "tat-ca" ? "/kenh-ban-hang/quang-ba" : `/kenh-ban-hang/quang-ba?tab=${t.key}`} className={t.key === tabKey ? "active" : ""} aria-current={t.key === tabKey ? "page" : undefined}>
              {lang === "en" ? t.en : t.vi} <span className="ml-1 opacity-60">{count}</span>
            </Link>
          )
        })}
      </nav>

      {visible.length ? (
        <div className="grid gap-3">
          {visible.map(({ doc, phase }) => {
            const product = typeof doc.product === "object" && doc.product ? doc.product : null
            const status = PHASE_LABELS[phase]
            const total = Number(doc.total ?? 0)
            const qr =
              phase === "pending" && account.ready
                ? vietQrUrl({ bankCode: account.bankCode, accountNumber: account.accountNumber, accountHolder: account.accountName, amount: total, note: `${doc.code} DE XUAT` })
                : null
            return (
              <article key={doc.id} className="sc-card grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <small className="font-mono text-[11px] text-[var(--muted)]">{doc.code}</small>
                    <h3 className="m-0 text-sm font-extrabold">{product?.name ?? tr("Sản phẩm đã xóa", "Deleted product")}</h3>
                    <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                      {label(doc.position)} · {formatDay(doc.startDay)} – {formatDay(addDays(doc.startDay, doc.days - 1))} · {tr(`${doc.days} ngày`, `${doc.days} days`)}
                    </p>
                  </div>
                  <span className={`sc-badge ${status.tone}`}>{lang === "en" ? status.en : status.vi}</span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3 text-xs">
                  <span className="text-[var(--muted)]">
                    {vnd(doc.pricePerDay)}/{tr("ngày", "day")} × {doc.days} = <b className="text-sm text-[var(--ink)]">{vnd(total)}</b>
                  </span>
                  {phase === "pending" && <CancelRecommendation id={String(doc.id)} code={doc.code ?? ""} />}
                </div>
                {phase === "rejected" && doc.rejectReason && (
                  <p className="m-0 border-l-2 border-[#a42626] pl-3 text-xs text-[#a42626]">
                    {tr("Lý do từ chối", "Reason")}: {doc.rejectReason}
                  </p>
                )}
                {phase === "pending" && (
                  <div className="grid gap-3 border border-dashed border-[var(--line)] p-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                    {qr ? (
                      <Image src={qr} alt={tr(`Mã VietQR nộp phí ${doc.code}`, `VietQR code for fee ${doc.code}`)} width={120} height={120} className="h-auto w-[120px] border border-[var(--line)] bg-white" unoptimized />
                    ) : (
                      <span className="grid size-[120px] place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">
                        <QrCode size={32} />
                      </span>
                    )}
                    <div className="grid content-start gap-1 text-xs leading-5">
                      <b>{tr("Nộp phí để được duyệt", "Pay the fee to get approved")}</b>
                      {account.ready ? (
                        <>
                          <span>{account.bankName} · <b className="font-mono">{account.accountNumber}</b> · {account.accountName}</span>
                          <span>
                            {tr("Số tiền", "Amount")}: <b>{vnd(total)}</b> · {tr("Nội dung", "Reference")}: <b className="font-mono">{doc.code} DE XUAT</b>
                          </span>
                          <span className="text-[var(--muted)]">{tr("BOAI duyệt sau khi nhận đủ phí. Có thể hủy trước khi được duyệt.", "BOAI approves once the fee arrives. You can cancel until then.")}</span>
                        </>
                      ) : (
                        <span className="text-[var(--muted)]">
                          {tr("BOAI sẽ liên hệ để hướng dẫn nộp phí cho yêu cầu này.", "BOAI will contact you about paying the fee for this request.")}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <section className="sc-card sc-empty">
          {rows.length
            ? tr("Không có yêu cầu nào ở trạng thái này.", "No requests with this status.")
            : tr("Shop chưa có yêu cầu đề xuất nào. Đặt suất đầu tiên ở form phía trên.", "No recommendation requests yet. Book your first spot above.")}
        </section>
      )}
    </>
  )
}
