import Link from "next/link"
import { Banknote, CircleCheck, Clock3, Hourglass } from "lucide-react"
import { db, requireSeller, vnd } from "../seller-lib"
import { getTr } from "@/lib/i18n-server"
import { bankByCode } from "@/lib/banks"
import { normalizeStatus, ORDER_STATUS_LABELS } from "@/lib/order-flow"

export const metadata = { title: "Tiền chờ nhận — Kênh người bán BOAI" }

/**
 * What BOAI owes this shop, one row per child order: goods + shipping for
 * transfer orders (BOAI collected the money), the discount share for COD
 * orders (the shop collected cash, BOAI bore the discount).
 */
export default async function SellerPayoutsPage() {
  const seller = await requireSeller()
  const tr = await getTr()
  const payload = await db()
  const { docs } = await payload.find({
    collection: "orders",
    where: { and: [{ role: { equals: "child" } }, { seller: { equals: seller.id } }] },
    sort: "-createdAt",
    limit: 300,
    depth: 0,
    overrideAccess: true,
    select: { code: true, status: true, payment: true, subtotal: true, shipping: true, discount: true, total: true, payout: true, createdAt: true, deliveredAt: true },
  })
  const rows = docs.filter((o) => (o.payout?.amount ?? 0) > 0 || o.status !== "cancelled")
  const amountOf = (o: (typeof docs)[number]) => o.payout?.amount ?? 0
  const waiting = rows.filter((o) => o.status === "delivered" && o.payout?.status === "unpaid" && amountOf(o) > 0)
  const upcoming = rows.filter((o) => ["pending", "shipping", "awaiting_payment"].includes(o.status) && o.payout?.status === "unpaid" && amountOf(o) > 0)
  const received = rows.filter((o) => o.payout?.status === "paid")
  const sum = (list: typeof rows) => list.reduce((total, o) => total + amountOf(o), 0)
  const bank = bankByCode(seller.seller?.bankCode)
  const hasBank = !!bank && !!seller.seller?.bankAccountNumber && !!seller.seller?.bankAccountHolder
  const cards = [
    { icon: Clock3, label: tr("Chờ BOAI chi", "Awaiting payout"), value: sum(waiting), hint: tr(`${waiting.length} đơn đã hoàn tất`, `${waiting.length} completed orders`) },
    { icon: Hourglass, label: tr("Sắp có", "Upcoming"), value: sum(upcoming), hint: tr(`${upcoming.length} đơn đang xử lý`, `${upcoming.length} orders in progress`) },
    { icon: CircleCheck, label: tr("Đã nhận", "Received"), value: sum(received), hint: tr(`${received.length} lần chi`, `${received.length} payouts`) },
  ]
  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Tài chính", "Finance")}</small>
          <h1>{tr("Tiền chờ nhận", "Pending payouts")}</h1>
        </div>
      </header>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="sc-card m-0!">
            <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              <Icon size={14} /> {label}
            </span>
            <b className="mt-2 block text-2xl tabular-nums">{vnd(value)}</b>
            <small className="text-[11px] text-[var(--muted)]">{hint}</small>
          </div>
        ))}
      </div>
      <section className="sc-card mb-4 flex flex-wrap items-start gap-3 text-xs leading-5">
        <Banknote size={20} className="shrink-0 text-[var(--lime-dark)]" />
        <div className="min-w-0 flex-1">
          <b className="block">{tr("BOAI chi trả vào tài khoản của shop sau khi đơn hoàn tất", "BOAI pays into your account once an order is completed")}</b>
          <span className="text-[var(--muted)]">
            {tr(
              "Đơn chuyển khoản: BOAI chi tiền hàng + phí ship. Đơn COD: shop đã thu tiền mặt, BOAI chỉ chi phần giảm giá do mã của BOAI. Chi trả hiện làm thủ công; chi tự động cần cổng thanh toán hỗ trợ chi hộ/ký quỹ (escrow).",
              "Transfer orders: BOAI pays goods + shipping. COD orders: you collected cash, so BOAI only pays the discount its code took off. Payouts are manual for now; automatic payouts need a payout/escrow gateway.",
            )}
          </span>
          <span className="mt-1 block">
            {hasBank
              ? tr(`Tài khoản nhận: ${bank!.name} · ${seller.seller?.bankAccountNumber} · ${seller.seller?.bankAccountHolder}`, `Payout account: ${bank!.name} · ${seller.seller?.bankAccountNumber} · ${seller.seller?.bankAccountHolder}`)
              : tr("Bạn chưa có tài khoản nhận tiền.", "You haven't added a payout account.")}{" "}
            <Link href="/kenh-ban-hang/cai-dat" className="font-bold text-[var(--lime-dark)]">{hasBank ? tr("Đổi", "Change") : tr("Thêm ngay", "Add now")}</Link>
          </span>
        </div>
      </section>
      <section className="sc-card">
        {rows.length ? (
          <table className="sc-table">
            <thead>
              <tr>
                <th>{tr("Đơn", "Order")}</th>
                <th>{tr("Trạng thái", "Status")}</th>
                <th>{tr("Tiền hàng", "Goods")}</th>
                <th>{tr("Phí ship", "Shipping")}</th>
                <th>{tr("Giảm giá BOAI chịu", "Discount (BOAI)")}</th>
                <th>{tr("BOAI chi cho shop", "BOAI pays you")}</th>
                <th>{tr("Chi trả", "Payout")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const label = ORDER_STATUS_LABELS[normalizeStatus(o.status)]
                return (
                  <tr key={o.id}>
                    <td>
                      #{o.code}
                      <small className="block text-[10px] text-[var(--muted)]">{o.payment === "cod" ? "COD" : tr("Chuyển khoản", "Transfer")} · {new Date(o.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small>
                    </td>
                    <td><span className={`sc-badge ${o.status}`}>{tr(label.vi, label.en)}</span></td>
                    <td>{vnd(o.subtotal)}</td>
                    <td>{vnd(o.shipping ?? 0)}</td>
                    <td>{o.discount ? vnd(o.discount) : "—"}</td>
                    <td><b>{amountOf(o) ? vnd(amountOf(o)) : tr("Không phát sinh", "Nothing due")}</b></td>
                    <td>
                      {o.payout?.status === "paid" ? (
                        <span className="sc-badge delivered">{tr("Đã chi", "Paid")}{o.payout.paidAt ? ` · ${new Date(o.payout.paidAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : ""}</span>
                      ) : o.status === "cancelled" || o.payout?.status === "void" ? (
                        <span className="sc-badge cancelled">{tr("Không chi", "None")}</span>
                      ) : o.status === "delivered" ? (
                        <span className="sc-badge pending">{tr("Chờ BOAI chi", "Awaiting payout")}</span>
                      ) : (
                        <span className="sc-badge">{tr("Chi sau khi hoàn tất", "After completion")}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="sc-empty">{tr("Chưa có khoản nào. Khoản chi xuất hiện khi khách đặt đơn của shop.", "Nothing yet. Payouts appear when buyers order from your shop.")}</p>
        )}
      </section>
    </>
  )
}
