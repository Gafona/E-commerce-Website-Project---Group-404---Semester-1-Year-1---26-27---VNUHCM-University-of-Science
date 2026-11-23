import { ZONE_LABELS } from "@/lib/shipping"
import Link from "next/link"
import { getLang, getTr } from "@/lib/i18n-server"
import { CheckCircle2, Clock3, CreditCard, Factory, PackageSearch, ReceiptText, RotateCcw, Shirt, Store, Wallet } from "lucide-react"
import { getPayloadClient } from "@/lib/payload"
import { appAuth } from "@/lib/app-auth"
import { hasOrderAccess } from "@/lib/order-access"
import { getSiteContent } from "@/lib/site-content"
import { CUSTOM_FLOW, CUSTOM_STATUS_LABELS, type CustomStatus } from "@/lib/custom-jersey"
import { canRequestReturn, returnDeadline, type ReturnReason, type ReturnStatus, type ReturnType as ReturnKind } from "@/lib/returns"
import { loadOrderTree } from "@/lib/orders-server"
import { getPaymentAccount, webhookConfigured } from "@/lib/payment-settings"
import { vietQrUrl } from "@/lib/banks"
import { isCancellable, normalizeStatus, ORDER_STATUS_LABELS } from "@/lib/order-flow"
import type { Order, ReturnRequest } from "@/payload-types"
import { SiteHeader } from "../components/SiteHeader"
import { CancelOrder } from "./CancelOrder"
import { TransferInstructions } from "./TransferInstructions"
import { PaymentPanel } from "./PaymentPanel"
import { LegacyLookup } from "./LegacyLookup"
import { ReturnPanel, type ReturnLine, type ReturnView } from "./ReturnPanel"
import { lookupOrderAction } from "../shop-actions"

export async function generateMetadata() {
  const tr = await getTr()
  return {
    title: tr("Đơn hàng & thanh toán — BOAI", "Orders & payments — BOAI"),
    // Private, per-customer data: never indexed, and no full URL in referrers.
    robots: { index: false, follow: false },
    referrer: "strict-origin-when-cross-origin" as const,
  }
}

export const dynamic = "force-dynamic"

const money = new Intl.NumberFormat("vi-VN")
const kmFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })
const TZ = "Asia/Ho_Chi_Minh"
type Tr = (vi: string, en?: string) => string

const COD_STEPS = ["pending", "shipping", "delivered"] as const
const TRANSFER_STEPS = ["awaiting_payment", "pending", "shipping", "delivered"] as const
// Orders placed before automatic shipping (old statuses read as "awaiting shop").
const LEGACY_STEPS = [["pending", "Shop xác nhận hàng"], ["shipping", "Đang giao"], ["delivered", "Đã giao"]] as const
const PAY: Record<string, [string, string]> = {
  cod: ["Thanh toán khi nhận hàng", "Cash on delivery"],
  online: ["Chuyển khoản VietQR", "VietQR bank transfer"],
  installment: ["Trả góp 0%", "0% installment"],
}
const TONE = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200",
  warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
  info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200",
  muted: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]",
}
const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")
const statusLabel = (status: unknown, tr: Tr) => {
  const label = ORDER_STATUS_LABELS[normalizeStatus(status)]
  return tr(label.vi, label.en)
}

/** Payment state shown to the buyer. */
function paymentState(order: Pick<Order, "status" | "payment" | "sellerPayments" | "role" | "paymentInfo">): { vi: string; en: string; tone: keyof typeof TONE } {
  if (order.status === "cancelled") return { vi: "Đã hủy", en: "Cancelled", tone: "muted" }
  if (order.payment === "online" && order.role === "parent") {
    if (order.paymentInfo?.paidAt) return { vi: "Đã thanh toán", en: "Paid", tone: "ok" }
    if (order.paymentInfo?.claimedAt) return { vi: "Đã báo chuyển khoản", en: "Transfer reported", tone: "info" }
    return { vi: "Chờ chuyển khoản", en: "Awaiting transfer", tone: "warn" }
  }
  if (order.payment === "online") {
    const entries = order.sellerPayments ?? []
    const paid = entries.filter((p) => p.status === "paid").length
    if (entries.length && paid === entries.length) return { vi: "Đã thanh toán", en: "Paid", tone: "ok" }
    if (paid > 0) return { vi: `Đã trả ${paid}/${entries.length} shop`, en: `Paid ${paid}/${entries.length} shops`, tone: "warn" }
    return entries.length ? { vi: "Chờ chuyển khoản", en: "Awaiting transfer", tone: "warn" } : { vi: "Chuyển khoản", en: "Bank transfer", tone: "info" }
  }
  if (order.payment === "installment") return { vi: "Trả góp 0%", en: "0% installment", tone: "info" }
  return order.status === "delivered" ? { vi: "Đã thanh toán (COD)", en: "Paid (COD)", tone: "ok" } : { vi: "Trả khi nhận hàng", en: "Pay on delivery", tone: "info" }
}

const LOOKUP_ERRORS: Record<string, [string, string]> = {
  "khong-thay": ["Không tìm thấy đơn hàng. Kiểm tra lại mã đơn và số điện thoại.", "Order not found. Please check the order code and phone number."],
  cho: ["Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 15 phút.", "Too many lookups. Please try again in 15 minutes."],
  thieu: ["Nhập mã đơn và số điện thoại đặt hàng.", "Enter the order code and the phone number used."],
}

function Timeline({ steps, status, tr }: { steps: readonly string[]; status: string; tr: Tr }) {
  const index = steps.indexOf(normalizeStatus(status))
  return (
    <ol className="timeline" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
      {steps.map((step, i) => (
        <li key={step} className={i <= index ? "done" : ""}>
          <i />
          {statusLabel(step, tr)}
        </li>
      ))}
    </ol>
  )
}

type CustomInfo = { status: string; code?: string | null } | null

function CustomProgress({ request, requestId, tr }: { request: NonNullable<CustomInfo>; requestId: string; tr: Tr }) {
  const current = CUSTOM_FLOW.indexOf(request.status as CustomStatus)
  return (
    <div className="mb-3 border border-[var(--line)] bg-[var(--soft-blue)] p-3">
      <p className="m-0 flex flex-wrap items-center gap-2 text-xs font-bold">
        <Shirt size={15} className="text-[var(--lime-dark)]" />
        {tr(`Sản xuất áo custom #${request.code}`, `Custom kit production #${request.code}`)}
        <span className="text-[var(--muted)]">· {tr(CUSTOM_STATUS_LABELS[request.status as CustomStatus]?.vi ?? request.status, CUSTOM_STATUS_LABELS[request.status as CustomStatus]?.en)}</span>
        <Link href={`/custom-ao?yeu-cau=${requestId}`} className="ml-auto text-[11px] text-[var(--lime-dark)]">{tr("Xem yêu cầu & trao đổi", "View request & chat")}</Link>
      </p>
      <ol className="m-0 mt-2.5 grid list-none grid-cols-5 gap-1 p-0">
        {CUSTOM_FLOW.map((step, i) => (
          <li key={step} className="min-w-0">
            <span className={`block h-1.5 ${current >= 0 && i <= current ? "bg-[var(--lime)]" : "bg-[var(--line)]"}`} />
            <span className={`mt-1 flex items-center gap-1 text-[10px] leading-tight font-bold ${i === current ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
              {step === "in_production" && <Factory size={10} className="shrink-0" />}
              <span className="line-clamp-2">{tr(CUSTOM_STATUS_LABELS[step].vi, CUSTOM_STATUS_LABELS[step].en)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function returnProps(order: Order, returns: ReturnRequest[]) {
  const mine = returns.filter((r) => relId(r.order) === String(order.id))
  const claimed = new Map<string, number>()
  for (const r of mine) if (r.status !== "rejected" && r.status !== "cancelled") for (const row of r.items ?? []) claimed.set(row.lineId, (claimed.get(row.lineId) ?? 0) + row.quantity)
  const lines: ReturnLine[] = (order.items ?? []).map((item) => ({
    lineId: item.id ?? "",
    name: item.name,
    size: item.size ?? null,
    color: item.color ?? null,
    quantity: item.quantity,
    available: Math.max(0, item.quantity - (claimed.get(item.id ?? "") ?? 0)),
  }))
  const views: ReturnView[] = mine.map((r) => ({
    id: String(r.id),
    code: r.code ?? "",
    status: r.status as ReturnStatus,
    type: r.type as ReturnKind,
    reason: r.reason as ReturnReason,
    shopName: r.shopName ?? "Shop",
    sellerNote: r.sellerNote ?? null,
    createdAt: r.createdAt,
    items: (r.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity, size: i.size ?? null })),
    photos: (r.photos ?? []).flatMap((p) => (p && typeof p === "object" && p.url ? [p.url] : [])),
  }))
  const deadline = returnDeadline(order)
  return { lines, views, deadline: deadline ? deadline.toISOString() : null }
}

export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ ma?: string; sdt?: string; moi?: string; "tra-cuu"?: string }>
}) {
  const [tr, lang, content] = await Promise.all([getTr(), getLang(), getSiteContent()])
  const locale = lang === "en" ? "en-GB" : "vi-VN"
  const { ma = "", sdt = "", moi, "tra-cuu": lookupError } = await searchParams
  const code = ma.trim().toUpperCase().slice(0, 44)
  const hotline = content["contact.hotline"]?.vi ?? ""
  const payload = await getPayloadClient()
  const user = await appAuth.currentUser()
  // The buyer's list shows whole orders: new parent orders and orders placed before shop splitting.
  const listWhere = { role: { not_equals: "child" } } as const
  const [myOrders, myOrderCount] = user
    ? await Promise.all([
        payload.find({ collection: "orders", user, overrideAccess: false, where: listWhere, depth: 0, sort: "-createdAt", limit: 50 }).then((r) => r.docs),
        payload.count({ collection: "orders", user, overrideAccess: false, where: listWhere }).then((r) => r.totalDocs),
      ])
    : [[], 0]
  const parentIds = myOrders.filter((o) => o.role === "parent").map((o) => o.id)
  const myChildren = parentIds.length
    ? (await payload.find({ collection: "orders", where: { parentOrder: { in: parentIds } }, depth: 0, limit: 300, pagination: false, overrideAccess: true, select: { status: true, total: true, parentOrder: true } })).docs
    : []
  // Spending counts delivered shop orders (and delivered orders placed before shop splitting).
  const spent =
    myChildren.filter((c) => c.status === "delivered").reduce((s, c) => s + c.total, 0) +
    myOrders.filter((o) => !o.role && o.status === "delivered").reduce((s, o) => s + o.total, 0)
  const tier = spent >= 10000000 ? ["Kim cương", "Diamond"] : spent >= 3000000 ? ["Vàng", "Gold"] : spent > 0 ? ["Bạc", "Silver"] : ["Thành viên mới", "New member"]
  const unpaidCount = myOrders.filter((o) => paymentState(o).tone === "warn").length

  // An order is shown to its account owner, or to a browser that proved code + phone (POST lookup).
  let tree: Awaited<ReturnType<typeof loadOrderTree>> = null
  if (code && !sdt) {
    const found = await loadOrderTree(payload, code)
    if (found && ((user && relId(found.order.customer) === String(user.id)) || (await hasOrderAccess(found.order)))) tree = found
  }
  const order = tree?.order ?? null
  const children = tree?.children ?? []
  const isParent = order?.role === "parent"
  const shopOrders = isParent ? children : order ? [order] : []
  const requestIds = [...new Set(shopOrders.map((o) => relId(o.customRequest)).filter(Boolean))]
  const requests = requestIds.length
    ? (await payload.find({ collection: "custom-jersey-requests", where: { id: { in: requestIds } }, depth: 0, limit: requestIds.length, overrideAccess: true, select: { status: true, code: true } })).docs
    : []
  const requestOf = (o: Order): CustomInfo => requests.find((r) => String(r.id) === relId(o.customRequest)) ?? null
  const deliveredIds = shopOrders.filter((o) => o.status === "delivered").map((o) => o.id)
  const returns = deliveredIds.length
    ? (await payload.find({ collection: "return-requests", where: { order: { in: deliveredIds } }, sort: "-createdAt", depth: 1, limit: 50, overrideAccess: true })).docs
    : []
  const awaitingPayment = isParent && order?.status === "awaiting_payment" && order.payment === "online"
  const account = awaitingPayment ? await getPaymentAccount(payload) : null
  const qrUrl =
    account?.ready && order
      ? vietQrUrl({ bankCode: account.bankCode, accountNumber: account.accountNumber, accountHolder: account.accountName, amount: order.total, note: order.code })
      : null
  const isOwner = !!(order && user && relId(order.customer) === String(user.id))
  const lookupMessage = lookupError ? LOOKUP_ERRORS[lookupError] : code && !sdt && !order ? LOOKUP_ERRORS["khong-thay"] : null
  const paidOnline = isParent && order?.payment === "online" && !!order.paymentInfo?.paidAt
  const liveChildren = children.filter((c) => c.status !== "cancelled")
  // Cancelled shop parts no longer count towards what the buyer pays (paid parts are refunded).
  const cancelledTotal = children.filter((c) => c.status === "cancelled").reduce((sum, c) => sum + c.total, 0)
  const productionStarted = (list: Order[]) => list.some((o) => ["in_production", "completed"].includes(requestOf(o)?.status ?? ""))
  const canCancelWhole =
    isParent &&
    !!order &&
    (order.status === "awaiting_payment" || order.status === "pending") &&
    liveChildren.length > 0 &&
    liveChildren.every((c) => isCancellable(c.status)) &&
    !(order.status === "awaiting_payment" && order.paymentInfo?.claimedAt) &&
    !productionStarted(liveChildren)

  return (
    <main className="search-page">
      <SiteHeader />
      {sdt && code && <LegacyLookup code={code} phone={sdt} />}
      <section className="page-shell flow-page narrow">
        {order && moi && order.status !== "cancelled" && (
          <div className="success-banner">
            <CheckCircle2 size={22} />
            <div>
              <b>{tr("Đặt hàng thành công!", "Order placed!")}</b>
              <span>
                {awaitingPayment
                  ? tr("Quét mã QR bên dưới để thanh toán và hoàn tất đơn. ", "Scan the QR below to pay and complete your order. ")
                  : tr("Các shop sẽ xác nhận và giao hàng cho bạn. ", "The shops will confirm and ship your order. ")}
                {tr("Lưu lại mã", "Save code")} <strong>{order.code}</strong> {tr("để tra cứu đơn hàng.", "to track your order.")}
              </span>
            </div>
          </div>
        )}
        {order && awaitingPayment && (
          account?.ready ? (
            <PaymentPanel
              code={order.code}
              amount={order.total}
              qrUrl={qrUrl}
              bankName={account.bankName}
              accountNumber={account.accountNumber}
              accountName={account.accountName}
              claimedAt={order.paymentInfo?.claimedAt ?? null}
              automatic={webhookConfigured()}
            />
          ) : (
            <div className={`mb-5 flex items-start gap-3 border px-4 py-3 ${TONE.warn}`} role="status">
              <Clock3 size={22} className="mt-0.5 shrink-0" />
              <span className="text-sm">
                {tr("BOAI đang cập nhật tài khoản nhận tiền. Vui lòng liên hệ hotline để được hướng dẫn thanh toán đơn", "BOAI is updating its receiving account. Please call the hotline for payment instructions for order")} <b>{order.code}</b>.
              </span>
            </div>
          )
        )}
        <div className="eyebrow">{tr("THEO DÕI ĐƠN HÀNG", "ORDER TRACKING")}</div>
        <h1 className="flow-title">{tr("Tra cứu đơn hàng", "Track your order")}</h1>
        {/* POST: the phone number never appears in the URL, history or analytics. */}
        <form className="lookup-form" action={lookupOrderAction}>
          <input name="ma" defaultValue={code} placeholder={tr("Mã đơn (VD: BOAI1A2B3C4D)", "Order code (e.g. BOAI1A2B3C4D)")} required maxLength={44} autoComplete="off" />
          <input name="sdt" type="tel" inputMode="tel" placeholder={tr("Số điện thoại đặt hàng", "Phone number used for the order")} required maxLength={15} autoComplete="tel" />
          <button className="boai-button primary"><PackageSearch size={17} /> {tr("Tra cứu", "Track")}</button>
        </form>
        {lookupMessage && !sdt && (
          <div className="empty-state">
            <h3>{tr("Chưa thể hiển thị đơn hàng", "Can't show this order")}</h3>
            <p>{tr(lookupMessage[0], lookupMessage[1])}</p>
          </div>
        )}
        {order && isParent && (
          <div className="form-card order-card">
            <div className="order-head">
              <div><small>{tr("MÃ ĐƠN", "ORDER CODE")}</small><b>{order.code}</b></div>
              <span className={`status-pill ${order.status}`}>{statusLabel(order.status, tr)}</span>
            </div>
            {(() => {
              const pay = paymentState(order)
              return (
                <p className="m-0 mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-[var(--muted)]">{tr("Thanh toán", "Payment")}:</span>
                  <span className="font-semibold">{tr(...PAY[order.payment] ?? ["", ""])}</span>
                  <span className={`border px-2 py-1 text-[10px] font-bold ${TONE[pay.tone]}`}>{tr(pay.vi, pay.en)}</span>
                </p>
              )
            })()}
            <p className="hint">
              {tr("Đặt lúc", "Placed")} {new Date(order.createdAt).toLocaleString(locale, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {children.length > 1 ? tr(`${children.length} shop giao riêng`, `${children.length} shops ship separately`) : tr("1 shop", "1 shop")}
            </p>
            <div className="mini-lines totals">
              <div><span>{tr("Tiền hàng", "Goods")}</span><b>{money.format(order.subtotal)}₫</b></div>
              {!!order.discount && (
                <div className="discount">
                  <span>{tr(`Mã ${order.voucher ?? ""} (−${order.discountPercent ?? 0}%)`, `Code ${order.voucher ?? ""} (−${order.discountPercent ?? 0}%)`)}</span>
                  <b>−{money.format(order.discount)}₫</b>
                </div>
              )}
              <div><span>{tr("Vận chuyển", "Shipping")}{order.shippingProvince ? ` → ${order.shippingProvince}` : ""}</span><b>{money.format(order.shipping ?? 0)}₫</b></div>
              {cancelledTotal > 0 && order.status !== "cancelled" ? (
                <>
                  <div><span>{tr("Tổng ban đầu", "Original total")}</span><b>{money.format(order.total)}₫</b></div>
                  <div className="text-[var(--muted)]"><span>{tr("Phần đã hủy", "Cancelled parts")}</span><b>−{money.format(cancelledTotal)}₫</b></div>
                  <div className="summary-total">
                    <span>{order.payment === "cod" ? tr("Còn phải trả khi nhận hàng", "Left to pay on delivery") : tr("Giá trị đơn còn lại", "Remaining order value")}</span>
                    <b>{money.format(order.total - cancelledTotal)}₫</b>
                  </div>
                </>
              ) : (
                <div className="summary-total"><span>{tr("Tổng thanh toán", "Total")}</span><b>{money.format(order.total)}₫</b></div>
              )}
            </div>
            <p className="hint">{tr("Giao đến:", "Ship to:")} {order.fullName} · {order.address}</p>
            <div className="mt-4 grid gap-4">
              {children.map((child) => {
                const request = requestOf(child)
                const ret = child.status === "delivered" ? returnProps(child, returns) : null
                const steps = child.payment === "online" ? TRANSFER_STEPS : COD_STEPS
                const canCancelPart =
                  liveChildren.length > 1 && child.status === "pending" && order.status !== "awaiting_payment" && !productionStarted([child])
                return (
                  <article key={child.id} className="border border-[var(--line)] bg-[var(--white)] p-4">
                    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Store size={16} className="shrink-0 text-[var(--lime-dark)]" />
                        <b className="truncate text-sm">{child.shopName ?? "Shop"}</b>
                        <small className="text-[11px] text-[var(--muted)]">#{child.code}</small>
                      </span>
                      <span className={`status-pill ${child.status}`}>{statusLabel(child.status, tr)}</span>
                    </header>
                    {child.status !== "cancelled" && <Timeline steps={steps} status={child.status} tr={tr} />}
                    {request && <CustomProgress request={request} requestId={relId(child.customRequest)} tr={tr} />}
                    <div className="mini-lines">
                      {child.items?.map((it) => (
                        <div key={it.id}>
                          <span>{it.quantity} × {it.name}{it.size ? ` · Size ${it.size}` : ""}{it.color ? ` · ${tr(it.color)}` : ""}{it.stringing ? ` · ${tr("Đan cước", "Strung")}` : ""}</span>
                          <b>{money.format(it.price * it.quantity)}₫</b>
                        </div>
                      ))}
                    </div>
                    <div className="mini-lines totals">
                      <div>
                        <span>
                          {tr("Phí ship", "Shipping")} · {kmFormat.format(child.distanceKm ?? 0)} km
                          {child.shippingEstimated && (
                            <span className="ml-1.5 inline-block border border-amber-300 bg-amber-50 px-1 text-[9px] font-bold text-amber-800 uppercase dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">{tr("Phí ước tính", "Estimated")}</span>
                          )}
                        </span>
                        <b>{money.format(child.shipping ?? 0)}₫</b>
                      </div>
                      {!!child.discount && <div className="discount"><span>{tr("Phần giảm giá", "Discount share")}</span><b>−{money.format(child.discount)}₫</b></div>}
                      <div>
                        <span>{child.payment === "cod" ? tr("Thu khi nhận hàng", "Collect on delivery") : tr("Phần của shop", "This shop's part")}</span>
                        <b>{money.format(child.total)}₫</b>
                      </div>
                    </div>
                    {child.status === "cancelled" && (
                      <p className="m-0 mt-2 text-xs text-[var(--muted)]">
                        {child.cancellation?.by === "shop" ? tr("Shop đã hủy phần đơn này.", "The shop cancelled this part.") : child.cancellation?.by === "admin" ? tr("BOAI đã hủy phần đơn này.", "BOAI cancelled this part.") : tr("Bạn đã hủy phần đơn này.", "You cancelled this part.")}
                        {child.cancellation?.reason ? ` ${tr("Lý do", "Reason")}: ${child.cancellation.reason}` : ""}
                      </p>
                    )}
                    {child.refund?.due && (
                      <p className={`m-0 mt-2 flex items-start gap-2 border px-3 py-2 text-xs ${child.refund.refundedAt ? TONE.ok : TONE.info}`}>
                        <RotateCcw size={14} className="mt-0.5 shrink-0" />
                        {child.refund.refundedAt
                          ? tr(`BOAI đã hoàn ${money.format(child.refund.amount ?? 0)}₫ ngày ${new Date(child.refund.refundedAt).toLocaleDateString(locale, { timeZone: TZ })}.`, `BOAI refunded ${money.format(child.refund.amount ?? 0)}₫ on ${new Date(child.refund.refundedAt).toLocaleDateString(locale, { timeZone: TZ })}.`)
                          : tr(`BOAI sẽ hoàn ${money.format(child.refund.amount ?? 0)}₫ trong 3–5 ngày làm việc.`, `BOAI will refund ${money.format(child.refund.amount ?? 0)}₫ within 3–5 working days.`)}
                      </p>
                    )}
                    {child.status === "delivered" && child.deliveredAt && (
                      <p className="hint">{tr("Đã giao ngày", "Delivered on")} <b>{new Date(child.deliveredAt).toLocaleDateString(locale, { timeZone: TZ })}</b></p>
                    )}
                    {canCancelPart && <CancelOrder code={order.code} childCode={child.code} paid={paidOnline} label={tr("Hủy phần của shop này", "Cancel this shop's part")} />}
                    {/* Guests see a sign-in prompt; another signed-in account only gets the hint below. */}
                    {ret && (isOwner || !user) && (
                      <ReturnPanel
                        orderId={String(child.id)}
                        lines={ret.lines}
                        requests={ret.views}
                        deadline={ret.deadline}
                        canRequest={canRequestReturn(child)}
                        signedIn={isOwner}
                      />
                    )}
                    {child.status === "delivered" && !isOwner && canRequestReturn(child) && (
                      <p className="hint">{tr("Đổi trả cần đăng nhập bằng tài khoản đã đặt đơn. Đơn đặt không cần tài khoản: gọi hotline để được hỗ trợ.", "Returns need the account that placed the order. Guest orders: call the hotline for help.")}</p>
                    )}
                  </article>
                )
              })}
            </div>
            {canCancelWhole && (
              <div className="mt-4">
                <CancelOrder code={order.code} paid={paidOnline} label={children.length > 1 ? tr("Hủy toàn bộ đơn", "Cancel the whole order") : tr("Hủy đơn hàng", "Cancel order")} />
              </div>
            )}
            {awaitingPayment && order.paymentInfo?.claimedAt && (
              <p className="hint">{tr("Đã báo chuyển khoản: muốn hủy đơn, vui lòng gọi hotline để BOAI kiểm tra và hoàn tiền.", "Transfer reported: to cancel, call the hotline so BOAI can check and refund.")}</p>
            )}
          </div>
        )}
        {order && !isParent && <LegacyOrder order={order} request={requestOf(order)} returns={returns} isOwner={isOwner} signedIn={!!user} tr={tr} locale={locale} />}
        {user && (
          <section className="mt-8 grid gap-4" id="don-cua-toi" aria-label={tr("Đơn hàng của tôi", "My orders")}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="eyebrow">{tr("TÀI KHOẢN CỦA BẠN", "YOUR ACCOUNT")}</div>
                <h2 className="m-0 text-2xl font-black">{tr("Đơn hàng của tôi", "My orders")}</h2>
              </div>
              <Link href="/tim-kiem" className="text-xs font-bold text-[var(--lime-dark)]">{tr("Tiếp tục mua sắm", "Keep shopping")}</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-[var(--line)] bg-[var(--white)] p-4">
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"><ReceiptText size={14} /> {tr("Tổng đơn", "Orders")}</span>
                <b className="mt-2 block text-2xl tabular-nums">{myOrderCount}</b>
              </div>
              <div className="border border-[var(--line)] bg-[var(--white)] p-4">
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"><Wallet size={14} /> {tr("Đã chi tiêu (đơn đã giao)", "Spent (delivered)")}</span>
                <b className="mt-2 block text-2xl tabular-nums">{money.format(spent)}₫</b>
                <small className="text-[11px] font-bold text-[var(--lime-dark)]">{tr("Hạng", "Tier")}: {tr(tier[0], tier[1])}</small>
              </div>
              <div className="border border-[var(--line)] bg-[var(--white)] p-4">
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"><CreditCard size={14} /> {tr("Chờ thanh toán", "Awaiting payment")}</span>
                <b className={`mt-2 block text-2xl tabular-nums ${unpaidCount ? "text-amber-700 dark:text-amber-300" : ""}`}>{unpaidCount}</b>
              </div>
            </div>
            {myOrders.length ? (
              <ul className="m-0 grid list-none gap-2 p-0">
                {myOrders.map((o) => {
                  const pay = paymentState(o)
                  const active = order?.id === o.id
                  const shops = o.role === "parent" ? myChildren.filter((c) => relId(c.parentOrder) === String(o.id)).length : 0
                  const count = o.role === "parent" ? (o.itemCount ?? 0) : (o.items?.length ?? 0)
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/don-hang?ma=${encodeURIComponent(o.code)}`}
                        aria-current={active ? "true" : undefined}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border bg-[var(--white)] px-4 py-3 transition hover:border-[var(--lime)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] ${active ? "border-[var(--lime)]" : "border-[var(--line)]"}`}
                      >
                        <span className="min-w-0">
                          <b className="block text-sm">{o.code}{o.customRequest ? <Shirt size={13} className="ml-1.5 inline text-[var(--lime-dark)]" aria-label={tr("Áo custom", "Custom kit")} /> : null}</b>
                          <small className="text-[11px] text-[var(--muted)]">
                            {new Date(o.createdAt).toLocaleDateString(locale, { timeZone: TZ })} · {count} {tr("sản phẩm", "items")}
                            {shops > 1 ? ` · ${shops} shop` : ""} · {tr(...PAY[o.payment] ?? ["", ""])}
                          </small>
                        </span>
                        <strong className="text-right text-sm tabular-nums sm:order-last">{money.format(o.total)}₫</strong>
                        <span className={`status-pill ${o.status} justify-self-start`}>{statusLabel(o.status, tr)}</span>
                        <span className={`justify-self-start border px-2 py-1 text-[10px] font-bold ${TONE[pay.tone]}`}>{tr(pay.vi, pay.en)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="empty-state">
                <h3>{tr("Bạn chưa có đơn hàng nào", "You have no orders yet")}</h3>
                <p><Link href="/tim-kiem">{tr("Mua sắm ngay", "Shop now")}</Link></p>
              </div>
            )}
            {myOrderCount > myOrders.length && (
              <p className="hint m-0">{tr(`Đang hiển thị ${myOrders.length} đơn gần nhất trên tổng ${myOrderCount} đơn.`, `Showing your latest ${myOrders.length} of ${myOrderCount} orders.`)}</p>
            )}
          </section>
        )}
        <p className="hint">
          {hotline ? (
            <>
              {tr("Cần hỗ trợ? Hotline", "Need help? Hotline")} <a href={`tel:${hotline.replace(/[^\d+]/g, "")}`} className="font-bold">{hotline}</a> ·{" "}
            </>
          ) : null}
          <Link href="/">{tr("Về trang chủ", "Back to home")}</Link>
        </p>
      </section>
    </main>
  )
}

/** Orders placed before shop splitting and automatic shipping, shown as they were. */
function LegacyOrder({ order, request, returns, isOwner, signedIn, tr, locale }: { order: Order; request: CustomInfo; returns: ReturnRequest[]; isOwner: boolean; signedIn: boolean; tr: Tr; locale: string }) {
  const status = normalizeStatus(order.status)
  const stepIndex = LEGACY_STEPS.findIndex(([v]) => v === status)
  const ret = order.status === "delivered" ? returnProps(order, returns) : null
  const pay = paymentState(order)
  const cancellable = (order.status === "pending" || order.status === "awaiting_payment") && !(order.sellerPayments ?? []).some((p) => p.status === "paid") && !["in_production", "completed"].includes(request?.status ?? "")
  return (
    <div className="form-card order-card">
      <div className="order-head">
        <div><small>{tr("MÃ ĐƠN", "ORDER CODE")}</small><b>{order.code}</b></div>
        <span className={`status-pill ${order.status}`}>{statusLabel(order.status, tr)}</span>
      </div>
      {order.status !== "cancelled" && (
        <ol className="timeline" style={{ gridTemplateColumns: `repeat(${LEGACY_STEPS.length}, 1fr)` }}>
          {LEGACY_STEPS.map(([v, label], i) => <li key={v} className={i <= stepIndex ? "done" : ""}><i />{tr(label)}</li>)}
        </ol>
      )}
      {request && <CustomProgress request={request} requestId={relId(order.customRequest)} tr={tr} />}
      <p className="m-0 mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--muted)]">{tr("Trạng thái thanh toán", "Payment status")}:</span>
        <span className={`border px-2 py-1 text-[10px] font-bold ${TONE[pay.tone]}`}>{tr(pay.vi, pay.en)}</span>
      </p>
      <p className="hint">
        {tr(...PAY[order.payment] ?? ["", ""])}
        {order.preorder ? ` · ${tr("Đặt trước", "Pre-order")}` : ""}
        {" · "}
        {tr("Đặt lúc", "Placed")} {new Date(order.createdAt).toLocaleString(locale, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="mini-lines">
        {order.items?.map((it) => (
          <div key={it.id}>
            <span>{it.quantity} × {it.name}{it.size ? ` · Size ${it.size}` : ""}{it.color ? ` · ${tr(it.color)}` : ""}{it.stringing ? ` · ${tr("Đan cước", "Strung")}` : ""}</span>
            <b>{money.format(it.price * it.quantity)}₫</b>
          </div>
        ))}
      </div>
      <div className="mini-lines totals">
        <div>
          <span>{tr("Vận chuyển", "Shipping")}{order.shippingProvince ? ` → ${order.shippingProvince}` : ""}</span>
          <b>{order.shipping ? `${money.format(order.shipping)}₫` : order.shippingQuotedAt ? tr("Miễn phí", "Free") : "—"}</b>
        </div>
        {(order.shippingBreakdown?.length ?? 0) > 1 && order.shippingBreakdown!.map((line) => (
          <div key={line.id ?? line.shopName} className="text-[11px] text-[var(--muted)]">
            <span>{line.shopName} · {line.distanceKm ? `${line.distanceKm} km` : tr(ZONE_LABELS[line.zone].vi, ZONE_LABELS[line.zone].en)}</span>
            <span>{money.format(line.fee)}₫</span>
          </div>
        ))}
        {!!order.discount && <div><span>{tr("Giảm giá", "Discount")} {order.voucher}</span><b>−{money.format(order.discount)}₫</b></div>}
        <div className="summary-total"><span>{tr("Tổng", "Total")}</span><b>{money.format(order.total)}₫</b></div>
      </div>
      <p className="hint">{tr("Giao đến:", "Ship to:")} {order.fullName} · {order.address}</p>
      {order.payment === "online" && order.status !== "cancelled" && (order.sellerPayments?.length ?? 0) > 0 && (
        <TransferInstructions
          entries={(order.sellerPayments ?? []).map((entry, index) => ({
            id: entry.id ?? String(index),
            shopName: entry.shopName,
            amount: entry.amount,
            bankCode: entry.bankCode,
            bankName: entry.bankName,
            accountNumber: entry.accountNumber,
            accountHolder: entry.accountHolder,
            transferNote: entry.transferNote,
            status: entry.status,
          }))}
        />
      )}
      {cancellable && <CancelOrder code={order.code} />}
      {ret && (isOwner || !signedIn) && (
        <ReturnPanel orderId={String(order.id)} lines={ret.lines} requests={ret.views} deadline={ret.deadline} canRequest={canRequestReturn(order)} signedIn={isOwner} />
      )}
    </div>
  )
}
