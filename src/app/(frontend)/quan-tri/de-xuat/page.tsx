import { Sparkles } from "lucide-react"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { Badge, Empty, PageHead, Tabs, param, type SearchParams } from "../ui"
import { recommendationSettings } from "@/lib/recommendation-slots"
import {
  MAX_SLOTS,
  PHASE_LABELS,
  POSITION_LABELS,
  RECOMMENDATION_POSITIONS,
  addDays,
  formatDay,
  phaseOf,
  rankRecommendations,
  type RecommendationPhase,
  type RecommendationPosition,
} from "@/lib/recommendations"
import { RecommendationReview, RecommendationSettingsForm } from "./RecommendationControls"

export const metadata = { title: "Đề xuất trả phí | Quản trị BOAI" }

const TABS: { key: string; label: string; phases: RecommendationPhase[] }[] = [
  { key: "cho-duyet", label: "Chờ duyệt", phases: ["pending"] },
  { key: "da-duyet", label: "Đang chạy & sắp chạy", phases: ["running", "scheduled"] },
  { key: "lich-su", label: "Hết hạn · từ chối · đã hủy", phases: ["expired", "lapsed", "rejected", "cancelled"] },
]

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`

/** Paid homepage spots: collect the fee, approve or reject, and see what is running. */
export default async function AdminRecommendationsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const payload = await db()
  const query = await searchParams
  const tabKey = TABS.some((t) => t.key === param(query.tab)) ? param(query.tab) : "cho-duyet"
  const tab = TABS.find((t) => t.key === tabKey)!
  const [{ docs }, settings] = await Promise.all([
    payload.find({ collection: "recommendation-requests", depth: 1, limit: 500, sort: "-createdAt", overrideAccess: false, user: admin }),
    recommendationSettings(payload),
  ])
  const now = Date.now()
  const rows = docs.map((doc) => ({ doc, phase: phaseOf(doc, now) }))
  const inTab = rows.filter((row) => tab.phases.includes(row.phase))
  // Running spots are listed in the order the homepage shows them.
  const visible = tabKey === "da-duyet" ? rankRecommendations(inTab.map((row) => row.doc)).map((doc) => ({ doc, phase: phaseOf(doc, now) })) : inTab
  const collected = docs.filter((doc) => doc.status === "approved").reduce((sum, doc) => sum + Number(doc.feeCollected ?? 0), 0)
  const awaiting = rows.filter((row) => row.phase === "pending")
  const runningIn = (position: RecommendationPosition) => rows.filter((row) => row.phase === "running" && row.doc.position === position).length

  return (
    <>
      <PageHead eyebrow="Thương mại" title="Đề xuất trả phí" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <section className="sc-card grid gap-1">
          <small className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Phí đã thu</small>
          <b className="text-xl">{money(collected)}</b>
          <span className="text-[11px] text-[var(--muted)]">{docs.filter((doc) => doc.status === "approved").length} đề xuất đã duyệt</span>
        </section>
        <section className="sc-card grid gap-1">
          <small className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Phí chờ thu</small>
          <b className="text-xl">{money(awaiting.reduce((sum, row) => sum + Number(row.doc.total ?? 0), 0))}</b>
          <span className="text-[11px] text-[var(--muted)]">{awaiting.length} yêu cầu chờ duyệt</span>
        </section>
        {RECOMMENDATION_POSITIONS.map((position) => (
          <section key={position} className="sc-card grid gap-1">
            <small className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">{POSITION_LABELS[position].vi}</small>
            <b className="text-xl">
              {runningIn(position)}/{settings.slots} <span className="text-[12px] font-semibold text-[var(--muted)]">suất đang chạy</span>
            </b>
            <span className="text-[11px] text-[var(--muted)]">{POSITION_LABELS[position].sportVi} · trang chủ</span>
          </section>
        ))}
      </div>

      <section className="sc-card mb-4 grid gap-3">
        <div>
          <b className="text-[14px]">Cài đặt</b>
          <p className="m-0 mt-1 text-[12px] leading-5 text-[var(--muted)]">
            Shop đặt suất theo ngày (1–30 ngày, giờ Việt Nam) và tự chọn giá mỗi ngày từ mức tối thiểu. Yêu cầu chờ duyệt cũng giữ chỗ để không bán quá số suất. Khi nhiều đề xuất cùng chạy, trang chủ xếp giá/ngày cao trước, bằng giá thì ai được duyệt sớm hơn đứng trước.
          </p>
        </div>
        <RecommendationSettingsForm slots={settings.slots} minPrice={settings.minPrice} maxSlots={MAX_SLOTS} />
      </section>

      <Tabs
        active={tabKey}
        items={TABS.map((t) => ({ key: t.key, label: t.label, href: `/quan-tri/de-xuat?tab=${t.key}`, count: rows.filter((row) => t.phases.includes(row.phase)).length }))}
      />

      {visible.length ? (
        <section className="sc-card overflow-x-auto">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Shop · sản phẩm</th>
                <th>Vị trí</th>
                <th>Thời gian</th>
                <th>Giá/ngày</th>
                <th>Tổng phí</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ doc, phase }) => {
                const product = typeof doc.product === "object" && doc.product ? doc.product : null
                const seller = typeof doc.seller === "object" && doc.seller ? doc.seller : null
                const shop = seller?.seller?.shopName?.trim() || seller?.name || "Cửa hàng"
                const status = PHASE_LABELS[phase]
                return (
                  <tr key={doc.id}>
                    <td className="font-mono text-[12px] font-bold">{doc.code}</td>
                    <td>
                      <b className="block text-[12px]">{shop}</b>
                      <span className="text-[11px] text-[var(--muted)]">{product?.name ?? "Sản phẩm đã xóa"}</span>
                    </td>
                    <td className="text-[12px]">{POSITION_LABELS[doc.position as RecommendationPosition]?.vi ?? doc.position}</td>
                    <td className="text-[12px] whitespace-nowrap">
                      {formatDay(doc.startDay)} – {formatDay(addDays(doc.startDay, doc.days - 1))}
                      <span className="block text-[11px] text-[var(--muted)]">{doc.days} ngày · gửi {fmtDate(doc.createdAt)}</span>
                    </td>
                    <td className="text-[12px] whitespace-nowrap">{money(doc.pricePerDay)}</td>
                    <td className="text-[12px] font-bold whitespace-nowrap">
                      {money(Number(doc.total ?? 0))}
                      {doc.feeCollected ? <span className="block text-[11px] font-normal text-[var(--muted)]">đã thu {fmtDate(doc.reviewedAt)}</span> : null}
                    </td>
                    <td>
                      <Badge tone={status.tone}>{status.vi}</Badge>
                      {doc.rejectReason && <span className="mt-1 block max-w-[220px] text-[11px] text-[var(--muted)]">{doc.rejectReason}</span>}
                    </td>
                    <td>{phase === "pending" && <RecommendationReview id={String(doc.id)} code={doc.code ?? ""} total={Number(doc.total ?? 0)} shop={shop} />}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty
          icon={<Sparkles size={22} />}
          title={tabKey === "cho-duyet" ? "Không có yêu cầu chờ duyệt" : "Chưa có đề xuất nào ở mục này"}
          text="Shop gửi yêu cầu trong Kênh bán hàng → Đề xuất trả phí. Yêu cầu mới sẽ hiện ở tab Chờ duyệt kèm mã chuyển khoản để đối chiếu phí."
        />
      )}
    </>
  )
}
