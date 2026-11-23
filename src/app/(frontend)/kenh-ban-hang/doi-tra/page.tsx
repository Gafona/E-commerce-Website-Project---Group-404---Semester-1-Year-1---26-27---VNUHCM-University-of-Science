import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { db, requireSeller } from "../seller-lib"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { RETURN_HANDLING_BUSINESS_DAYS, RETURN_WINDOW_DAYS, type ReturnStatus } from "@/lib/returns"
import { toReturnView } from "@/lib/return-view"
import { ReturnRequestList } from "../../components/ReturnRequestList"

export async function generateMetadata() {
  return localizedTitle("Đổi trả | Kênh người bán BOAI", "Returns | BOAI Seller Centre")
}

const TABS = [
  { key: "cho-xu-ly", vi: "Chờ xử lý", en: "To handle", statuses: ["requested"] },
  { key: "da-chap-nhan", vi: "Đã chấp nhận", en: "Approved", statuses: ["approved"] },
  { key: "da-nhan-hang", vi: "Đã nhận hàng", en: "Received", statuses: ["received"] },
  { key: "da-hoan-tien", vi: "Đã hoàn tiền / đổi", en: "Refunded / exchanged", statuses: ["completed"] },
  { key: "tu-choi", vi: "Từ chối", en: "Rejected", statuses: ["rejected"] },
  { key: "tat-ca", vi: "Tất cả", en: "All", statuses: null },
] as const satisfies readonly { key: string; vi: string; en: string; statuses: readonly ReturnStatus[] | null }[]

export default async function SellerReturnsPage({ searchParams }: { searchParams: Promise<{ "trang-thai"?: string }> }) {
  const seller = await requireSeller()
  const tr = await getTr()
  const { "trang-thai": tab } = await searchParams
  const payload = await db()
  // Ownership is enforced twice: the query is scoped to this shop and collection access only returns parties' records.
  const { docs } = await payload.find({
    collection: "return-requests",
    where: { seller: { equals: seller.id } },
    sort: "-createdAt",
    limit: 300,
    depth: 1,
    overrideAccess: false,
    user: seller,
  })
  const now = Date.now()
  const all = docs.map((doc) => toReturnView(doc, now))
  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const inTab = (t: (typeof TABS)[number], status: ReturnStatus) => !t.statuses || (t.statuses as readonly ReturnStatus[]).includes(status)
  const shown = all
    .filter((r) => inTab(active, r.status))
    // Waiting steps: overdue first, then the oldest deadline.
    .sort((a, b) => (a.handling && b.handling ? a.handling.due.localeCompare(b.handling.due) : a.handling ? -1 : b.handling ? 1 : 0))
  const overdue = all.filter((r) => r.handling?.overdue).length

  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Sau bán hàng", "After sales")}</small>
          <h1>{tr("Đổi trả", "Returns")}</h1>
        </div>
      </header>

      <p className="mb-3 mt-0 max-w-3xl text-xs leading-5 text-[var(--muted)]">
        {tr(
          `Khách gửi yêu cầu trong ${RETURN_WINDOW_DAYS} ngày sau khi nhận hàng. Shop cần phản hồi yêu cầu mới và hoàn tất sau khi nhận hàng trả trong ${RETURN_HANDLING_BUSINESS_DAYS} ngày làm việc. Mỗi lần đổi trạng thái, khách sẽ nhận thông báo.`,
          `Customers can request a return within ${RETURN_WINDOW_DAYS} days of delivery. Respond to new requests, and finish after receiving the item, within ${RETURN_HANDLING_BUSINESS_DAYS} working days. The customer is notified at every step.`,
        )}
      </p>

      {overdue > 0 && (
        <p role="status" className="mb-3 mt-0 flex items-center gap-2 border border-[var(--sale)] bg-[var(--white)] px-3 py-2 text-xs font-semibold text-[var(--sale)]">
          <AlertTriangle size={15} aria-hidden />
          {tr(`${overdue} yêu cầu đã quá hạn xử lý.`, `${overdue} request${overdue > 1 ? "s are" : " is"} overdue.`)}
        </p>
      )}

      <nav className="sc-tabs" aria-label={tr("Lọc theo trạng thái", "Filter by status")}>
        {TABS.map((t) => {
          const count = all.filter((r) => inTab(t, r.status)).length
          return (
            <Link
              key={t.key}
              href={t.key === "cho-xu-ly" ? "/kenh-ban-hang/doi-tra" : `/kenh-ban-hang/doi-tra?trang-thai=${t.key}`}
              className={t.key === active.key ? "active" : ""}
              aria-current={t.key === active.key ? "page" : undefined}
            >
              {tr(t.vi, t.en)} <span className="ml-1.5 opacity-60">{count}</span>
            </Link>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-14 text-center">
          <span className="grid size-12 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]"><RotateCcw size={22} aria-hidden /></span>
          <b className="text-sm">{tr("Không có yêu cầu nào", "No requests here")}</b>
          <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">
            {tr("Yêu cầu đổi trả của khách cho sản phẩm của shop sẽ xuất hiện ở đây.", "Customer return requests for your products appear here.")}
          </p>
        </div>
      ) : (
        <ReturnRequestList requests={shown} orderHref="/kenh-ban-hang/don-hang" />
      )}
    </>
  )
}
