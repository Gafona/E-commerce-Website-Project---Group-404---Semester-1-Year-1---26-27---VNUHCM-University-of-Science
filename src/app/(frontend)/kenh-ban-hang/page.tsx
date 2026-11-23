import Link from "next/link"
import { AlertTriangle, ChevronRight, Package, RotateCcw, ShoppingBag, Wallet } from "lucide-react"
import { db, requireSeller, sellerOrders, sellerProducts, STATUS, vnd } from "./seller-lib"
import { RETURN_HANDLING_BUSINESS_DAYS, returnHandlingDue } from "@/lib/returns"
import { getTr } from "@/lib/i18n-server"


export default async function SellerDashboard() {
  const seller = await requireSeller()
  const tr = await getTr()
  const [products, orders, waitingReturns] = await Promise.all([
    sellerProducts(seller.id),
    sellerOrders(seller.id),
    db().then((payload) =>
      payload.find({
        collection: "return-requests",
        where: { and: [{ seller: { equals: seller.id } }, { status: { in: ["requested", "received"] } }] },
        limit: 200,
        depth: 0,
        select: { status: true, createdAt: true, history: true },
        overrideAccess: false,
        user: seller,
      }),
    ),
  ])
  const newReturns = waitingReturns.docs.filter((r) => r.status === "requested").length
  const overdueReturns = waitingReturns.docs.filter((r) => returnHandlingDue(r)?.overdue).length
  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.sellerTotal, 0)
  const low = products.filter((p) => p.stock <= 5)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i); return d })
  const daily = days.map((d) => orders.filter((o) => o.status !== "cancelled" && o.status !== "awaiting_payment" && new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.sellerTotal, 0))
  const peak = Math.max(...daily, 1)
  const stats = [
    [Wallet, tr("Doanh thu (đã giao)", "Revenue (delivered)"), vnd(revenue)],
    [ShoppingBag, tr("Tổng đơn", "Total orders"), orders.length],
    [Package, tr("Sản phẩm đang bán", "Active products"), products.length],
    [AlertTriangle, tr("Sắp hết hàng", "Low stock"), low.length],
  ] as const
  return (
    <>
      <header className="sc-head"><div><small>{tr("Xin chào", "Hello")}, {seller.name}</small><h1>{tr("Tổng quan", "Overview")}</h1></div><Link className="boai-button primary" href="/kenh-ban-hang/san-pham">+ {tr("Thêm sản phẩm", "Add product")}</Link></header>
      {(newReturns > 0 || overdueReturns > 0) && (
        <Link
          href="/kenh-ban-hang/doi-tra"
          className={`mb-4 flex items-center gap-3 border bg-[var(--white)] px-4 py-3 text-xs text-inherit no-underline ${overdueReturns ? "border-[var(--sale)]" : "border-[var(--line)]"}`}
        >
          <RotateCcw size={18} className={overdueReturns ? "text-[var(--sale)]" : "text-[var(--lime-dark)]"} aria-hidden />
          <span className="min-w-0 flex-1">
            <b className="block text-sm">{tr(`${newReturns} yêu cầu đổi trả chờ xử lý`, `${newReturns} return request${newReturns === 1 ? "" : "s"} to handle`)}</b>
            <span className={overdueReturns ? "font-semibold text-[var(--sale)]" : "text-[var(--muted)]"}>
              {overdueReturns
                ? tr(`${overdueReturns} yêu cầu đã quá hạn ${RETURN_HANDLING_BUSINESS_DAYS} ngày làm việc`, `${overdueReturns} past the ${RETURN_HANDLING_BUSINESS_DAYS}-working-day deadline`)
                : tr(`Phản hồi trong ${RETURN_HANDLING_BUSINESS_DAYS} ngày làm việc`, `Respond within ${RETURN_HANDLING_BUSINESS_DAYS} working days`)}
            </span>
          </span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      )}
      <div className="sc-stats">{stats.map(([Icon, l, v]) => <div key={l} className="sc-card"><Icon size={20} /><small>{l}</small><b>{v}</b></div>)}</div>
      <section className="sc-card sc-chart-card"><h3>{tr("Doanh số 7 ngày qua", "Sales over the last 7 days")}</h3>
        <div className="sc-chart">{daily.map((v, i) => <div key={i} title={vnd(v)}><i style={{ height: `${(v / peak) * 100}%` }} /><small>{days[i].getDate()}/{days[i].getMonth() + 1}</small></div>)}</div>
      </section>
      <div className="sc-grid2">
        <section className="sc-card"><h3>{tr("Đơn hàng gần đây", "Recent orders")}</h3>
          {orders.length ? <table className="sc-table"><tbody>{orders.slice(0, 6).map((o) => <tr key={o.id}><td>#{o.code}</td><td>{o.fullName}</td><td>{vnd(o.sellerTotal)}</td><td><span className={`sc-badge ${o.status}`}>{tr(STATUS[o.status])}</span></td></tr>)}</tbody></table> : <p className="sc-empty">{tr("Chưa có đơn hàng.", "No orders yet.")}</p>}
        </section>
        <section className="sc-card"><h3>{tr("Cảnh báo tồn kho", "Stock alerts")}</h3>
          {low.length ? <table className="sc-table"><tbody>{low.slice(0, 6).map((p) => <tr key={p.id}><td>{p.name}</td><td><span className="sc-badge cancelled">{tr(`còn ${p.stock}`, `${p.stock} left`)}</span></td></tr>)}</tbody></table> : <p className="sc-empty">{tr("Tồn kho ổn định.", "Stock levels are healthy.")}</p>}
        </section>
      </div>
    </>
  )
}
