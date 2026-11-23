import Link from "next/link"
import type { Metadata } from "next"
import { AdminNav } from "./AdminNav"
import { db, requireAdmin } from "./admin-lib"

export const metadata: Metadata = {
  title: "Quản trị BOAI",
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  const payload = await db()
  const [sellers, events, payments, refunds, returns, recommendations] = await Promise.all([
    payload.count({ collection: "users", where: { sellerStatus: { equals: "pending" } }, overrideAccess: false, user: admin }),
    payload.count({ collection: "event-registrations", where: { reviewStatus: { equals: "pending" } }, overrideAccess: false, user: admin }),
    // Transfers buyers reported as sent, waiting for BOAI to check its account.
    payload.count({ collection: "orders", where: { and: [{ role: { equals: "parent" } }, { status: { equals: "awaiting_payment" } }, { "paymentInfo.claimedAt": { exists: true } }] }, overrideAccess: true }),
    payload.count({ collection: "orders", where: { and: [{ "refund.due": { equals: true } }, { "refund.refundedAt": { exists: false } }] }, overrideAccess: true }),
    payload.count({ collection: "return-requests", where: { status: { equals: "requested" } }, overrideAccess: false, user: admin }),
    // Paid homepage spots waiting for the fee check; lapsed ones no longer need action.
    payload.count({ collection: "recommendation-requests", where: { and: [{ status: { equals: "pending" } }, { endsAt: { greater_than: new Date().toISOString() } }] }, overrideAccess: false, user: admin }),
  ])
  return (
    <div className="sc">
      <aside className="sc-side">
        <Link href="/quan-tri" className="sc-brand transition-opacity hover:opacity-85">
          <span>B</span>
          <div>
            <b>BOAI Admin</b>
            <small>Kiểm duyệt & vận hành</small>
          </div>
        </Link>
        <AdminNav badges={{ sellers: sellers.totalDocs, events: events.totalDocs, payments: payments.totalDocs, refunds: refunds.totalDocs, returns: returns.totalDocs, recommendations: recommendations.totalDocs }} />
        <Link href="/tai-khoan" className="sc-shop transition-opacity hover:opacity-85">
          <span className="shrink-0">{admin.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <b className="truncate">{admin.name}</b>
            <small className="truncate">Quản trị viên · {admin.email}</small>
          </div>
        </Link>
      </aside>
      <main className="sc-main">{children}</main>
    </div>
  )
}
