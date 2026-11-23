import Link from "next/link"
import { ReceiptText } from "lucide-react"
import type { Where } from "payload"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { Badge, Empty, PageHead, Pager, param, type SearchParams, Tabs } from "../ui"
import { AdminCancelButton, ConfirmPaymentButton } from "../OrderControls"
import { isCancellable, normalizeStatus, ORDER_STATUS_LABELS } from "@/lib/order-flow"
import { getPaymentAccount, webhookConfigured } from "@/lib/payment-settings"
import type { Order } from "@/payload-types"

export const metadata = { title: "Đơn hàng | Quản trị BOAI" }

const money = new Intl.NumberFormat("vi-VN")
const PAGE_SIZE = 25
const TABS = [
  { key: "cho-thanh-toan", label: "Chờ thanh toán", where: { and: [{ role: { equals: "parent" } }, { status: { equals: "awaiting_payment" } }] } },
  { key: "dang-xu-ly", label: "Đang xử lý", where: { and: [{ role: { equals: "parent" } }, { status: { in: ["pending", "shipping"] } }] } },
  { key: "hoan-tat", label: "Hoàn tất", where: { and: [{ role: { equals: "parent" } }, { status: { equals: "delivered" } }] } },
  { key: "da-huy", label: "Đã hủy", where: { and: [{ role: { equals: "parent" } }, { status: { equals: "cancelled" } }] } },
  { key: "don-cu", label: "Đơn trước khi tách shop", where: { role: { exists: false } } },
] as const satisfies readonly { key: string; label: string; where: Where }[]
const TONE: Record<string, string> = { awaiting_payment: "pending", pending: "pending", shipping: "", delivered: "approved", cancelled: "rejected" }
const PAY: Record<string, string> = { cod: "COD", online: "VietQR", installment: "Trả góp" }
const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")
const statusBadge = (status: unknown) => <Badge tone={TONE[normalizeStatus(status)] ?? ""}>{ORDER_STATUS_LABELS[normalizeStatus(status)].vi}</Badge>

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const params = await searchParams
  const tab = TABS.find((t) => t.key === param(params.tab)) ?? TABS[0]
  const page = Math.max(1, Math.floor(Number(param(params.page)) || 1))
  const payload = await db()
  const [counts, result, account] = await Promise.all([
    Promise.all(TABS.map((t) => payload.count({ collection: "orders", where: t.where, overrideAccess: true }))),
    payload.find({ collection: "orders", where: tab.where, sort: "-createdAt", limit: PAGE_SIZE, page, depth: 0, overrideAccess: true }),
    getPaymentAccount(payload),
  ])
  // Reported transfers first: those are the ones to check in the bank app.
  const orders = tab.key === "cho-thanh-toan" ? [...result.docs].sort((a, b) => Number(!!b.paymentInfo?.claimedAt) - Number(!!a.paymentInfo?.claimedAt)) : result.docs
  const parentIds = orders.filter((o) => o.role === "parent").map((o) => o.id)
  const children = parentIds.length
    ? (await payload.find({ collection: "orders", where: { parentOrder: { in: parentIds } }, sort: "code", depth: 0, limit: 500, pagination: false, overrideAccess: true })).docs
    : []
  const childrenOf = (order: Order) => children.filter((c) => relId(c.parentOrder) === String(order.id))

  return (
    <>
      <PageHead eyebrow="Thương mại" title="Đơn hàng">
        <div className="flex flex-wrap gap-3 text-[12px] font-bold">
          <Link href="/quan-tri/doi-soat" className="text-[var(--lime-dark)]">Đối soát & chi trả →</Link>
          <Link href="/quan-tri/van-chuyen" className="text-[var(--lime-dark)]">Biểu phí ship →</Link>
        </div>
      </PageHead>
      {tab.key === "cho-thanh-toan" && (
        <p className="mt-0 mb-4 border border-[var(--line)] bg-[var(--white)] px-4 py-3 text-[12px] leading-5 text-[var(--muted)]">
          {account.ready ? (
            <>Khách chuyển vào <b className="text-[var(--ink)]">{account.bankName} · {account.accountNumber} · {account.accountName}</b> với nội dung là mã đơn. </>
          ) : (
            <>
              <b className="text-[#a42626]">Chưa có tài khoản nhận tiền</b> — khách chưa thể chọn chuyển khoản. <Link href="/quan-tri/doi-soat" className="font-bold text-[var(--lime-dark)]">Thiết lập ngay</Link>.{" "}
            </>
          )}
          {webhookConfigured()
            ? "Webhook ngân hàng đang bật: đơn đủ tiền được xác nhận tự động."
            : "Chưa cấu hình webhook (PAYMENT_WEBHOOK_SECRET): kiểm tra app ngân hàng rồi bấm “Đã nhận tiền”."}
        </p>
      )}
      <Tabs active={tab.key} items={TABS.map((t, i) => ({ key: t.key, href: `/quan-tri/don-hang?tab=${t.key}`, label: t.label, count: counts[i].totalDocs }))} />
      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => {
            if (!order.role) {
              return (
                <article key={order.id} className="sc-card flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <b>#{order.code}</b> <span className="text-[11px] text-[var(--muted)]">{fmtDate(order.createdAt, true)} · {PAY[order.payment] ?? order.payment}</span>
                    <p className="m-0 text-[12px]">{order.fullName} · {order.phone}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    {statusBadge(order.status)}
                    <b>{money.format(order.total)}₫</b>
                  </div>
                </article>
              )
            }
            const kids = childrenOf(order)
            const cancellableKids = kids.filter((c) => isCancellable(c.status))
            return (
              <article key={order.id} className="sc-card grid gap-3">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <b className="text-[15px]">#{order.code}</b>
                    <span className="ml-2 text-[11px] text-[var(--muted)]">{fmtDate(order.createdAt, true)} · {PAY[order.payment] ?? order.payment}</span>
                    <p className="m-0 mt-1 text-[12px]"><b>{order.fullName}</b> · {order.phone}{order.email ? ` · ${order.email}` : ""}</p>
                    <p className="m-0 text-[12px] text-[var(--muted)]">Giao tới: {order.address}</p>
                  </div>
                  <div className="grid justify-items-end gap-1 text-right text-[12px]">
                    {statusBadge(order.status)}
                    <span className="text-[var(--muted)]">
                      Hàng {money.format(order.subtotal)}₫{order.discount ? ` · Mã ${order.voucher} −${money.format(order.discount)}₫` : ""} · Ship {money.format(order.shipping ?? 0)}₫
                    </span>
                    <b className="text-[14px]">Tổng {money.format(order.total)}₫</b>
                    {order.payment === "online" && (
                      <span className="text-[11px]">
                        {order.paymentInfo?.paidAt
                          ? `Đã nhận tiền ${fmtDate(order.paymentInfo.paidAt, true)}${order.paymentInfo.source === "webhook" ? " (webhook)" : ""}`
                          : order.paymentInfo?.claimedAt
                            ? <b className="text-[#b4610e]">Khách báo đã chuyển {fmtDate(order.paymentInfo.claimedAt, true)}</b>
                            : "Chưa thanh toán"}
                      </span>
                    )}
                  </div>
                </header>
                <table className="sc-table">
                  <thead>
                    <tr><th>Đơn shop</th><th>Shop</th><th>Hàng</th><th>Ship</th><th>Giảm</th><th className="text-right">Thu/khách trả</th><th>Trạng thái</th><th></th></tr>
                  </thead>
                  <tbody>
                    {kids.map((child) => (
                      <tr key={child.id}>
                        <td>#{child.code}</td>
                        <td className="font-semibold">{child.shopName}</td>
                        <td>{money.format(child.subtotal)}₫ <small className="text-[var(--muted)]">({child.itemCount ?? child.items?.length ?? 0} sp)</small></td>
                        <td>{money.format(child.shipping ?? 0)}₫ <small className="text-[var(--muted)]">{child.distanceKm ?? 0} km{child.shippingEstimated ? " · ước tính" : ""}</small></td>
                        <td>{child.discount ? `−${money.format(child.discount)}₫` : "—"}</td>
                        <td className="text-right font-semibold">{money.format(child.total)}₫</td>
                        <td>
                          {statusBadge(child.status)}
                          {child.refund?.due && <small className="mt-1 block text-[10px] font-bold text-[#a42626]">{child.refund.refundedAt ? "Đã hoàn tiền" : "Cần hoàn tiền"}</small>}
                          {child.cancellation?.reason && <small className="mt-1 block max-w-[180px] text-[10px] text-[var(--muted)]">{child.cancellation.reason}</small>}
                        </td>
                        <td>
                          {kids.length > 1 && child.status === "pending" && (
                            <AdminCancelButton id={String(child.id)} label="Hủy phần này" hint={`Hủy phần đơn của ${child.shopName}. Shop và khách sẽ nhận thông báo kèm lý do.`} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(order.status === "awaiting_payment" || cancellableKids.length > 0) && (
                  <footer className="flex flex-wrap items-start justify-end gap-3">
                    {cancellableKids.length > 0 && (
                      <AdminCancelButton
                        id={String(order.id)}
                        label={cancellableKids.length === kids.filter((c) => c.status !== "cancelled").length ? "Hủy toàn bộ đơn" : "Hủy các phần chưa giao"}
                        hint={order.paymentInfo?.paidAt ? "Đơn đã thanh toán: các phần bị hủy sẽ được đánh dấu cần hoàn tiền (3–5 ngày làm việc)." : "Các phần chưa giao của đơn sẽ bị hủy và hàng được trả về kho."}
                      />
                    )}
                    {order.status === "awaiting_payment" && order.payment === "online" && <ConfirmPaymentButton id={String(order.id)} code={order.code} amount={order.total} />}
                  </footer>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <Empty icon={<ReceiptText size={22} />} title="Không có đơn" text={tab.key === "cho-thanh-toan" ? "Không có đơn chuyển khoản nào đang chờ thanh toán." : "Chưa có đơn nào trong mục này."} />
      )}
      <Pager page={page} totalPages={result.totalPages} href={(p) => `/quan-tri/don-hang?tab=${tab.key}&page=${p}`} />
    </>
  )
}
