import type { Where } from "payload"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { db, requireAdmin } from "../admin-lib"
import { Empty, PageHead, Pager, param, SearchForm, type SearchParams, Tabs } from "../ui"
import { RETURN_HANDLING_BUSINESS_DAYS, returnHandlingDue, type ReturnStatus } from "@/lib/returns"
import { toReturnView } from "@/lib/return-view"
import { ReturnRequestList } from "../../components/ReturnRequestList"

export const metadata = { title: "Đổi trả | Quản trị BOAI" }

const TABS: { key: string; label: string; status: ReturnStatus | null }[] = [
  { key: "cho-xu-ly", label: "Chờ xử lý", status: "requested" },
  { key: "da-chap-nhan", label: "Đã chấp nhận", status: "approved" },
  { key: "da-nhan-hang", label: "Đã nhận hàng", status: "received" },
  { key: "da-hoan-tien", label: "Đã hoàn tiền / đổi", status: "completed" },
  { key: "tu-choi", label: "Từ chối", status: "rejected" },
  { key: "da-huy", label: "Khách hủy", status: "cancelled" },
  { key: "tat-ca", label: "Tất cả", status: null },
]

/** All shops' return requests. App admins may also step a request forward when a shop doesn't respond. */
export default async function AdminReturnsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const active = TABS.find((t) => t.key === param(sp["trang-thai"])) ?? TABS[0]
  const q = param(sp.q).trim().slice(0, 60)
  const page = Math.max(1, Math.min(500, Number(param(sp.page)) || 1))
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const search: Where[] = q ? [{ or: [{ code: { like: q } }, { orderCode: { like: q } }, { shopName: { like: q } }, { customerName: { like: q } }] }] : []
  const where: Where = { and: [...(active.status ? [{ status: { equals: active.status } }] : []), ...search] }
  const qs = (extra: Record<string, string | number>) =>
    "/quan-tri/doi-tra?" +
    new URLSearchParams(
      Object.entries({ "trang-thai": active.key === "cho-xu-ly" ? "" : active.key, q, ...extra })
        .filter(([, v]) => v !== "" && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString()

  const [result, counts, waiting] = await Promise.all([
    payload.find({ collection: "return-requests", where, sort: "-createdAt", limit: 25, page, depth: 1, ...scoped }),
    Promise.all(TABS.map((t) => payload.count({ collection: "return-requests", where: t.status ? { status: { equals: t.status } } : {}, ...scoped }))),
    payload.find({
      collection: "return-requests",
      where: { status: { in: ["requested", "received"] } },
      limit: 500,
      depth: 0,
      select: { status: true, createdAt: true, history: true },
      ...scoped,
    }),
  ])
  const now = Date.now()
  const overdue = waiting.docs.filter((r) => returnHandlingDue(r, now)?.overdue).length

  return (
    <>
      <PageHead eyebrow="Sau bán hàng" title="Đổi trả toàn sàn">
        <SearchForm action="/quan-tri/doi-tra" q={q} placeholder="Mã yêu cầu, mã đơn, shop, khách…" hidden={{ "trang-thai": active.key === "cho-xu-ly" ? "" : active.key }} />
      </PageHead>
      {overdue > 0 && (
        <p role="status" className="mb-3 mt-0 flex items-center gap-2 border border-[var(--sale)] bg-[var(--white)] px-3 py-2 text-xs font-semibold text-[var(--sale)]">
          <AlertTriangle size={15} aria-hidden /> {overdue} yêu cầu quá hạn {RETURN_HANDLING_BUSINESS_DAYS} ngày làm việc. Liên hệ shop hoặc xử lý thay.
        </p>
      )}
      <Tabs
        active={active.key}
        items={TABS.map((t, i) => ({
          key: t.key,
          label: t.label,
          count: counts[i].totalDocs,
          href: t.key === "cho-xu-ly" ? "/quan-tri/doi-tra" : `/quan-tri/doi-tra?trang-thai=${t.key}`,
        }))}
      />
      {result.docs.length ? (
        <>
          <ReturnRequestList requests={result.docs.map((doc) => toReturnView(doc, now))} showShop />
          <Pager page={result.page ?? 1} totalPages={result.totalPages} href={(p) => qs({ page: p })} />
        </>
      ) : (
        <Empty icon={<RotateCcw size={22} />} title="Không có yêu cầu đổi trả" text={q ? "Không tìm thấy yêu cầu khớp từ khóa." : "Yêu cầu đổi trả của khách ở mọi shop sẽ hiện ở đây."} />
      )}
    </>
  )
}
