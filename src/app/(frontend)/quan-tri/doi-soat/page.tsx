import { Landmark, Scale } from "lucide-react"
import type { Where } from "payload"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { Badge, Empty, PageHead, Pager, param, type SearchParams, Tabs } from "../ui"
import { PaymentAccountForm, PayoutButton, RefundButton } from "../OrderControls"
import { BANKS } from "@/lib/banks"
import { normalizeStatus, ORDER_STATUS_LABELS } from "@/lib/order-flow"
import { getPaymentAccount, webhookConfigured } from "@/lib/payment-settings"
import { shopPayouts } from "@/lib/shop-payouts"

export const metadata = { title: "Đối soát & chi trả | Quản trị BOAI" }

const money = new Intl.NumberFormat("vi-VN")
const PAGE_SIZE = 40
const child: Where = { role: { equals: "child" } }
const TABS = [
  { key: "cho-chi", label: "Chờ chi", where: { and: [child, { status: { equals: "delivered" } }, { "payout.status": { equals: "unpaid" } }, { "payout.amount": { greater_than: 0 } }] } },
  { key: "sap-den-han", label: "Chưa hoàn tất", where: { and: [child, { status: { in: ["awaiting_payment", "pending", "shipping"] } }] } },
  { key: "da-chi", label: "Đã chi", where: { and: [child, { "payout.status": { equals: "paid" } }] } },
  { key: "hoan-tien", label: "Hoàn tiền cho khách", where: { and: [child, { "refund.due": { equals: true } }] } },
  { key: "tat-ca", label: "Tất cả", where: child },
] as const satisfies readonly { key: string; label: string; where: Where }[]
const TONE: Record<string, string> = { awaiting_payment: "pending", pending: "pending", shipping: "", delivered: "approved", cancelled: "rejected" }
const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")

export default async function LedgerPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const params = await searchParams
  const tab = TABS.find((t) => t.key === param(params.tab)) ?? TABS[0]
  const page = Math.max(1, Math.floor(Number(param(params.page)) || 1))
  const payload = await db()
  const [account, counts, result, owed, refunds] = await Promise.all([
    getPaymentAccount(payload),
    Promise.all(TABS.map((t) => payload.count({ collection: "orders", where: t.where, overrideAccess: true }))),
    payload.find({ collection: "orders", where: tab.where, sort: "-createdAt", limit: PAGE_SIZE, page, depth: 0, overrideAccess: true }),
    payload.find({ collection: "orders", where: TABS[0].where, depth: 0, limit: 1000, pagination: false, overrideAccess: true, select: { payout: true } }),
    payload.find({ collection: "orders", where: { and: [child, { "refund.due": { equals: true } }, { "refund.refundedAt": { exists: false } }] }, depth: 0, limit: 1000, pagination: false, overrideAccess: true, select: { refund: true } }),
  ])
  const payouts = await shopPayouts(payload, result.docs.map((o) => relId(o.seller)).filter(Boolean))
  const owedTotal = owed.docs.reduce((sum, o) => sum + (o.payout?.amount ?? 0), 0)
  const refundTotal = refunds.docs.reduce((sum, o) => sum + (o.refund?.amount ?? 0), 0)
  const refundTab = tab.key === "hoan-tien"

  return (
    <>
      <PageHead eyebrow="Tài chính" title="Đối soát & chi trả" />
      <section className="sc-card mb-4 grid gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]"><Landmark size={18} /></span>
          <div className="min-w-0">
            <b className="text-[14px]">Tài khoản nhận tiền của BOAI</b>
            <p className="m-0 text-[12px] leading-5 text-[var(--muted)]">
              Mọi đơn chuyển khoản tạo mã VietQR vào tài khoản này với nội dung là mã đơn.{" "}
              {account.ready ? <span className="font-semibold text-[#1d7a38]">Đang nhận chuyển khoản.</span> : <span className="font-semibold text-[#a42626]">Chưa thiết lập — khách chỉ chọn được COD.</span>}
            </p>
          </div>
        </div>
        <PaymentAccountForm initial={{ bankCode: account.bankCode, accountNumber: account.accountNumber, accountName: account.accountName }} banks={BANKS.map((bank) => ({ code: bank.code, name: bank.name }))} />
        <p className="m-0 border-t border-[var(--line)] pt-3 text-[11px] leading-5 text-[var(--muted)]">
          {webhookConfigured() ? (
            <><b className="text-[#1d7a38]">Webhook đang bật.</b> Ngân hàng/cổng (SePay, Casso, PayOS) gửi giao dịch tới <code>/api/payments/webhook</code>; đơn đủ tiền được xác nhận tự động.</>
          ) : (
            <><b className="text-[var(--ink)]">Chưa cấu hình webhook.</b> Đặt biến môi trường <code>PAYMENT_WEBHOOK_SECRET</code> (Make → Settings → Environment variables) và khai báo URL <code>/api/payments/webhook</code> của trang đã publish trong SePay/Casso/PayOS để xác nhận tự động. Hiện xác nhận thủ công ở mục Đơn hàng.</>
          )}
        </p>
      </section>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="sc-card m-0!">
          <small className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Cần chi cho shop (đơn đã hoàn tất)</small>
          <b className="mt-1 block text-2xl tabular-nums">{money.format(owedTotal)}₫</b>
          <small className="text-[11px] text-[var(--muted)]">{owed.docs.length} khoản</small>
        </div>
        <div className="sc-card m-0!">
          <small className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Cần hoàn cho khách</small>
          <b className="mt-1 block text-2xl tabular-nums">{money.format(refundTotal)}₫</b>
          <small className="text-[11px] text-[var(--muted)]">{refunds.docs.length} khoản · hạn 3–5 ngày làm việc</small>
        </div>
      </div>
      <p className="mt-0 mb-3 text-[11px] leading-5 text-[var(--muted)]">
        Mỗi dòng là một đơn của shop. Đơn chuyển khoản: BOAI giữ tiền và chi cho shop tiền hàng + phí ship (BOAI chịu phần giảm giá). Đơn COD: shop tự thu tiền mặt, BOAI chỉ chi phần giảm giá (0₫ thì “Không phát sinh”). Chi tự động cần cổng thanh toán hỗ trợ chi hộ/escrow; hiện BOAI chuyển thủ công rồi xác nhận tại đây.
      </p>
      <Tabs active={tab.key} items={TABS.map((t, i) => ({ key: t.key, href: `/quan-tri/doi-soat?tab=${t.key}`, label: t.label, count: counts[i].totalDocs }))} />
      {result.docs.length ? (
        <section className="sc-card overflow-x-auto">
          <table className="sc-table">
            <thead>
              {refundTab ? (
                <tr><th>Đơn shop</th><th>Khách</th><th>Shop</th><th>Lý do hủy</th><th className="text-right">Số tiền hoàn</th><th>Trạng thái</th></tr>
              ) : (
                <tr><th>Shop</th><th>Đơn shop</th><th>Hình thức</th><th>Tiền hàng</th><th>Phí ship</th><th>Giảm giá BOAI chịu</th><th className="text-right">Chi cho shop</th><th>Trạng thái đơn</th><th>Chi trả</th></tr>
              )}
            </thead>
            <tbody>
              {result.docs.map((o) => {
                const status = normalizeStatus(o.status)
                if (refundTab) {
                  return (
                    <tr key={o.id}>
                      <td>#{o.code}<small className="block text-[10px] text-[var(--muted)]">{fmtDate(o.cancellation?.at ?? o.updatedAt, true)}</small></td>
                      <td>{o.fullName}<small className="block text-[10px] text-[var(--muted)]">{o.phone}</small></td>
                      <td>{o.shopName}</td>
                      <td className="max-w-[220px] text-[11px] text-[var(--muted)]">{o.cancellation?.reason ?? "—"}</td>
                      <td className="text-right font-semibold">{money.format(o.refund?.amount ?? 0)}₫</td>
                      <td>{o.refund?.refundedAt ? <Badge tone="approved">Đã hoàn {fmtDate(o.refund.refundedAt)}</Badge> : <RefundButton id={String(o.id)} amount={o.refund?.amount ?? 0} />}</td>
                    </tr>
                  )
                }
                const payout = payouts.get(relId(o.seller))
                const amount = o.payout?.amount ?? 0
                return (
                  <tr key={o.id}>
                    <td>
                      <b>{o.shopName}</b>
                      <small className="block text-[10px] text-[var(--muted)]">{payout?.ready ? `${payout.bankName} · ${payout.accountNumber} · ${payout.accountHolder}` : "Shop chưa có tài khoản nhận tiền"}</small>
                    </td>
                    <td>#{o.code}<small className="block text-[10px] text-[var(--muted)]">{fmtDate(o.createdAt)}</small></td>
                    <td>{o.payment === "cod" ? "COD" : "Chuyển khoản"}</td>
                    <td>{money.format(o.subtotal)}₫</td>
                    <td>{money.format(o.shipping ?? 0)}₫</td>
                    <td>{o.discount ? `${money.format(o.discount)}₫` : "—"}</td>
                    <td className="text-right font-semibold">{amount ? `${money.format(amount)}₫` : <span className="font-normal text-[var(--muted)]">Không phát sinh</span>}</td>
                    <td><Badge tone={TONE[status] ?? ""}>{ORDER_STATUS_LABELS[status].vi}</Badge></td>
                    <td>
                      {o.payout?.status === "paid" ? (
                        <Badge tone="approved">Đã chi {fmtDate(o.payout.paidAt)}</Badge>
                      ) : o.status === "cancelled" || o.payout?.status === "void" || !amount ? (
                        <span className="text-[11px] text-[var(--muted)]">Không chi</span>
                      ) : o.status === "delivered" ? (
                        <PayoutButton id={String(o.id)} amount={amount} shop={o.shopName ?? "shop"} />
                      ) : (
                        <span className="text-[11px] text-[var(--muted)]">Chưa chi · chờ hoàn tất</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty icon={<Scale size={22} />} title="Không có khoản nào" text={refundTab ? "Không có đơn nào cần hoàn tiền." : "Chưa có khoản đối soát trong mục này."} />
      )}
      <Pager page={page} totalPages={result.totalPages} href={(p) => `/quan-tri/doi-soat?tab=${tab.key}&page=${p}`} />
    </>
  )
}
