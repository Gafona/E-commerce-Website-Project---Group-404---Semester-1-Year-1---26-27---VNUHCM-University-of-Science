import Link from "next/link"
import { confirmTransferAction } from "../actions"
import { db, requireSeller, sellerOrders, STATUS, vnd } from "../seller-lib"
import { getTr } from "@/lib/i18n-server"
import { OrderActions } from "./OrderActions"

const relKey = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")
const PAYOUT: Record<string, [string, string]> = { unpaid: ["BOAI chưa chi", "Not paid out yet"], paid: ["BOAI đã chi", "Paid out"], void: ["Không phát sinh", "Nothing due"] }

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const seller = await requireSeller()
  const tr = await getTr()
  const all = await sellerOrders(seller.id)
  const orders = status && STATUS[status] ? all.filter((o) => o.status === status) : all
  // Custom-made orders ship only after production is marked done on the request.
  const requestIds = [...new Set(all.map((o) => relKey(o.customRequest)).filter(Boolean))]
  const requests = requestIds.length
    ? (await (await db()).find({ collection: "custom-jersey-requests", where: { id: { in: requestIds } }, limit: requestIds.length, depth: 0, overrideAccess: true, select: { status: true, code: true } })).docs
    : []
  const requestOf = (o: (typeof all)[number]) => requests.find((r) => String(r.id) === relKey(o.customRequest)) ?? null
  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Xử lý vận hành", "Operations")}</small>
          <h1>{tr("Đơn hàng", "Orders")}</h1>
        </div>
      </header>
      <p className="mt-0 mb-4 text-xs leading-5 text-[var(--muted)]">
        {tr(
          "Phí ship được tính tự động lúc khách đặt. Đơn chuyển khoản chỉ hiện ở “Chờ xác nhận” sau khi BOAI nhận tiền. Bấm “Xác nhận & giao hàng” khi đã gửi hàng cho đơn vị vận chuyển.",
          "Shipping is priced automatically at checkout. Transfer orders appear under “Awaiting confirmation” once BOAI has the money. Press “Confirm & ship” after handing the parcel to the courier.",
        )}
      </p>
      <div className="sc-tabs">
        <Link href="/kenh-ban-hang/don-hang" className={!status ? "active" : ""}>{tr("Tất cả", "All")} ({all.length})</Link>
        {Object.entries(STATUS).map(([k, l]) => (
          <Link key={k} href={`?status=${k}`} className={status === k ? "active" : ""}>
            {tr(l)} ({all.filter((o) => o.status === k).length})
          </Link>
        ))}
      </div>
      <section className="sc-card">
        {orders.length ? (
          <table className="sc-table">
            <thead>
              <tr>
                <th>{tr("Mã", "Code")}</th>
                <th>{tr("Khách & địa chỉ", "Customer & address")}</th>
                <th>{tr("Sản phẩm", "Products")}</th>
                <th>{tr("Tiền", "Amount")}</th>
                <th>{tr("Thanh toán", "Payment")}</th>
                <th>{tr("Trạng thái", "Status")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const request = requestOf(o)
                const legacyMine = !o.role ? (o.sellerPayments ?? []).find((p) => relKey(p.seller) === String(seller.id)) : undefined
                const anyPaid = (o.sellerPayments ?? []).some((p) => p.status === "paid")
                const cancellable = o.role === "child" ? o.status === "pending" : (o.status === "pending" || o.status === "awaiting_payment") && !anyPaid
                return (
                  <tr key={o.id}>
                    <td>
                      #{o.code}
                      <small className="block text-[10px] text-[var(--muted)]">{new Date(o.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small>
                    </td>
                    <td>
                      {o.fullName}
                      <br />
                      <small>{o.phone}</small>
                      <small className="block max-w-[220px] text-[10px] text-[var(--muted)]">{o.address}</small>
                    </td>
                    <td>
                      {o.items.map((i) => (
                        <div key={i.id}>{i.name} × {i.quantity}{i.size ? ` · Size ${i.size}` : ""}{i.color ? ` · ${i.color}` : ""}{i.stringing ? ` · ${tr("Đan cước", "Strung")}` : ""}</div>
                      ))}
                    </td>
                    <td>
                      <b>{vnd(o.sellerTotal)}</b>
                      {o.role === "child" && (
                        <small className="block text-[10px] text-[var(--muted)]">
                          {tr("Ship", "Shipping")} {vnd(o.shipping ?? 0)} · {o.distanceKm ?? 0} km{o.shippingEstimated ? ` (${tr("ước tính", "est.")})` : ""}
                          {o.discount ? ` · ${tr("Giảm", "Discount")} −${vnd(o.discount)}` : ""}
                        </small>
                      )}
                    </td>
                    <td>
                      {o.role === "child" ? (
                        <div className="grid gap-1">
                          <small>
                            {o.payment === "cod" ? tr(`COD · thu ${vnd(o.total)}`, `COD · collect ${vnd(o.total)}`) : o.status === "awaiting_payment" ? tr("Chờ khách chuyển khoản cho BOAI", "Awaiting transfer to BOAI") : tr("Đã thanh toán qua BOAI", "Paid via BOAI")}
                          </small>
                          {o.payout?.status === "void" || o.status === "cancelled" ? (
                            <small className="text-[10px] text-[var(--muted)]">{tr(...PAYOUT.void)}</small>
                          ) : o.payout?.amount ? (
                            <small className="text-[10px] text-[var(--muted)]">
                              {tr(...(PAYOUT[o.payout.status ?? "unpaid"] ?? PAYOUT.unpaid))} · {vnd(o.payout.amount)}
                            </small>
                          ) : null}
                        </div>
                      ) : o.payment !== "online" ? (
                        <small>{o.payment === "installment" ? tr("Trả góp", "Installment") : tr("COD", "Cash on delivery")}</small>
                      ) : legacyMine ? (
                        <div className="grid gap-1.5">
                          <small>{tr("Chuyển khoản", "Bank transfer")} · <b>{vnd(legacyMine.amount)}</b></small>
                          {legacyMine.status === "paid" ? (
                            <span className="sc-badge delivered">{tr("Đã nhận tiền", "Paid")}</span>
                          ) : o.status === "cancelled" ? (
                            <span className="sc-badge cancelled">{tr("Đơn đã hủy", "Cancelled")}</span>
                          ) : (
                            <form action={confirmTransferAction}>
                              <input type="hidden" name="id" value={o.id} />
                              <button className="boai-button">{tr("Xác nhận đã nhận tiền", "Confirm payment received")}</button>
                            </form>
                          )}
                        </div>
                      ) : (
                        <small>{tr("Chuyển khoản", "Bank transfer")}</small>
                      )}
                    </td>
                    <td>
                      <span className={`sc-badge ${o.status}`}>{tr(STATUS[o.status] ?? o.status)}</span>
                      {o.status === "cancelled" && o.cancellation?.reason && <small className="mt-1 block max-w-[180px] text-[10px] text-[var(--muted)]">{o.cancellation.reason}</small>}
                    </td>
                    <td className="sc-col-actions">
                      {o.status === "pending" && request && request.status !== "completed" ? (
                        <div className="grid gap-2">
                          <Link href="/kenh-ban-hang/custom-ao?tab=dang-lam" className="text-[11px] font-bold text-[var(--lime-dark)]">
                            {tr(`Áo custom #${request.code} chưa may xong · cập nhật tiến độ`, `Custom kit #${request.code} not finished · update production`)}
                          </Link>
                          <OrderActions id={String(o.id)} status="custom-pending" cancellable={cancellable} />
                        </div>
                      ) : o.status === "awaiting_payment" ? (
                        <small className="text-[11px] text-[var(--muted)]">{tr("Chờ thanh toán — chưa cần xử lý", "Awaiting payment — nothing to do yet")}</small>
                      ) : (
                        <OrderActions id={String(o.id)} status={o.status} cancellable={cancellable} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="sc-empty">{status ? tr("Không có đơn nào ở trạng thái này.", "No orders in this status.") : tr("Chưa có đơn nào chứa sản phẩm của bạn.", "No orders contain your products yet.")}</p>
        )}
      </section>
    </>
  )
}
