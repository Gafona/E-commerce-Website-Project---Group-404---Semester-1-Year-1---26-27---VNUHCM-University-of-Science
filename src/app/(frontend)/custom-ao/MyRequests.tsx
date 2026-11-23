"use client"

import Link from "next/link"
import { useCallback, useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Handshake,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Package,
  PackageCheck,
  Ruler,
  Shirt,
  Store,
  Truck,
  X,
} from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { RequestChat } from "../components/RequestChat"
import {
  acceptCustomQuoteAction,
  cancelCustomRequestAction,
  getMyCustomRequestAction,
  negotiateCustomQuoteAction,
  type MyCustomRequest,
  type MyCustomRequestDetail,
} from "../design-actions"
import { CUSTOM_FLOW, CUSTOM_STATUS_LABELS, CUSTOMER_CANCELLABLE, type CustomStatus } from "@/lib/custom-jersey"
import { JerseySvg, MATERIAL_LABELS, normalizeArt, PantsSvg, PANTS_STACK_CLASS, type Side } from "./jersey-art"

const money = new Intl.NumberFormat("vi-VN")
const TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  confirmed: "bg-[var(--soft-blue)] text-[var(--lime-dark)]",
  shipping: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300",
}
const ORDER_STATUS: Record<string, { vi: string; en: string }> = {
  pending: { vi: "Chờ shop xác nhận", en: "Awaiting shop" },
  // Values from the old quote flow read as "awaiting shop".
  awaiting_quote: { vi: "Chờ shop xác nhận", en: "Awaiting shop" },
  awaiting_payment: { vi: "Chờ thanh toán", en: "Awaiting payment" },
  confirmed: { vi: "Chờ shop xác nhận", en: "Awaiting shop" },
  shipping: { vi: "Đang giao", en: "Shipping" },
  delivered: { vi: "Hoàn tất", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
}

/** Đọc ?yeu-cau=<id> (link trong thông báo) và báo cho danh sách mở chi tiết. Bọc trong Suspense ở nơi dùng. */
export function RequestLinkWatcher({ onOpen }: { onOpen: (id: string) => void }) {
  const params = useSearchParams()
  const id = params.get("yeu-cau")
  useEffect(() => {
    if (id) onOpen(id)
  }, [id, onOpen])
  return null
}

/** Production steps plus the delivery state of the linked order, on one line. */
function StatusFlow({ status, order }: { status: CustomStatus; order: MyCustomRequest["order"] }) {
  const { tr } = useShop()
  if (status === "declined" || status === "cancelled") {
    const label = CUSTOM_STATUS_LABELS[status]
    return <p className="m-0 bg-[var(--paper)] px-3 py-2 text-xs font-bold text-[var(--muted)]">{tr(label.vi, label.en)}</p>
  }
  const delivered = order?.status === "delivered"
  const shipping = order?.status === "shipping"
  const steps = [
    ...CUSTOM_FLOW.map((step) => ({ key: step, label: CUSTOM_STATUS_LABELS[step] })),
    { key: "delivery", label: { vi: delivered ? "Đã giao" : "Giao hàng", en: delivered ? "Delivered" : "Delivery" } },
  ]
  const current = delivered || shipping ? steps.length - 1 : CUSTOM_FLOW.indexOf(status)
  return (
    <ol className="m-0 grid list-none grid-cols-6 gap-1 p-0" aria-label={tr("Tiến độ", "Progress")}>
      {steps.map((step, i) => {
        const done = i < current || (i === current && (i < steps.length - 1 || delivered))
        const now = i === current
        return (
          <li key={step.key} className="min-w-0">
            <span className={`block h-1.5 ${done || now ? "bg-[var(--lime)]" : "bg-[var(--line)]"}`} />
            <span className={`mt-1.5 flex items-center gap-1 text-[10px] leading-tight font-bold ${now ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
              {done && <Check size={11} className="shrink-0 text-[var(--lime-dark)]" />}
              <span className="line-clamp-2">{tr(step.label.vi, step.label.en)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function RequestDialog({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { tr, notify, lang } = useShop()
  const [detail, setDetail] = useState<MyCustomRequestDetail | null>(null)
  const [error, setError] = useState("")
  const [side, setSide] = useState<Side>("front")
  const [panel, setPanel] = useState<"none" | "negotiate" | "cancel">("none")
  const [offer, setOffer] = useState("")
  const [note, setNote] = useState("")
  const [formError, setFormError] = useState("")
  const [pending, start] = useTransition()
  const locale = lang === "en" ? "en-GB" : "vi-VN"

  const load = useCallback(() => {
    let active = true
    getMyCustomRequestAction(id)
      .then((result) => {
        if (!active) return
        if (result.ok) setDetail(result.request)
        else setError(result.error)
      })
      .catch(() => active && setError(tr("Không tải được yêu cầu. Vui lòng thử lại.", "Could not load the request.")))
    return () => {
      active = false
    }
  }, [id, tr])

  useEffect(() => {
    setDetail(null)
    setError("")
    const stop = load()
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => {
      stop()
      document.removeEventListener("keydown", onKey)
    }
  }, [id, load, onClose])

  const after = (result: { ok: boolean; error?: string }, message: string) => {
    if (!result.ok) {
      setFormError(result.error ?? tr("Không thể cập nhật.", "Could not update."))
      return
    }
    notify(message)
    setPanel("none")
    setOffer("")
    setNote("")
    setFormError("")
    load()
    onChanged()
  }

  const accept = () =>
    start(async () => after(await acceptCustomQuoteAction(id).catch(() => ({ ok: false })), tr("Đã chấp nhận báo giá. Hãy đặt đơn để shop bắt đầu may.", "Quote accepted. Place the order so the shop can start.")))
  const negotiate = () =>
    start(async () =>
      after(
        await negotiateCustomQuoteAction(id, { counterOffer: offer ? Number(offer) : null, note }).catch(() => ({ ok: false })),
        tr("Đã gửi đề nghị cho shop.", "Your counter-offer was sent."),
      ),
    )
  const cancel = () =>
    start(async () => after(await cancelCustomRequestAction(id, note).catch(() => ({ ok: false })), tr("Đã hủy yêu cầu.", "Request cancelled.")))

  const art = detail ? normalizeArt(detail.art) : null
  const status = detail ? CUSTOM_STATUS_LABELS[detail.status] : null
  const unit = art?.pants.enabled ? tr("bộ", "set") : tr("áo", "pc")
  const orderActive = !!detail?.order && detail.order.status !== "cancelled"
  const canCancel = !!detail && CUSTOMER_CANCELLABLE.includes(detail.status) && !orderActive
  const field = "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--lime)]"

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#07111f]/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr("Chi tiết yêu cầu may custom", "Custom request details")}
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto bg-[var(--white)] text-[var(--ink)] shadow-[0_30px_80px_rgba(7,17,31,.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--white)] px-5 py-3">
          <span className="text-[10px] font-extrabold tracking-[.16em] text-[var(--muted)] uppercase">
            {tr("Yêu cầu may custom", "Custom request")} {detail ? `#${detail.code}` : ""}
          </span>
          <button type="button" className="grid size-9 place-items-center border border-[var(--line)] hover:border-[var(--ink)]" aria-label={tr("Đóng", "Close")} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {!detail ? (
          <div className="grid min-h-64 place-items-center p-8 text-sm text-[var(--muted)]">
            {error ? (
              <div className="grid justify-items-center gap-3 text-center">
                <p className="m-0">{error}</p>
                {/đăng nhập/i.test(error) && <a className="boai-button primary" href="/dang-nhap">{tr("Đăng nhập", "Sign in")}</a>}
              </div>
            ) : (
              <Loader2 size={22} className="animate-spin" />
            )}
          </div>
        ) : (
          <div className="grid gap-6 p-5 md:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <div className="flex gap-1 bg-[var(--soft-blue)] p-1" role="tablist" aria-label={tr("Mặt", "Side")}>
                {(["front", "back"] as const).map((s) => (
                  <button key={s} type="button" role="tab" aria-selected={side === s} onClick={() => setSide(s)}
                    className={`flex-1 py-1.5 text-[11px] font-extrabold tracking-wide uppercase ${side === s ? "bg-[var(--dark)] !text-white" : ""}`}>
                    {s === "front" ? tr("Mặt trước", "Front") : tr("Mặt sau", "Back")}
                  </button>
                ))}
              </div>
              <div className="mt-2 bg-[radial-gradient(ellipse_at_50%_30%,var(--white),var(--soft-blue))] p-3">
                <JerseySvg uid={`detail-${detail.id}-${side}`} side={side} art={art![side]} kit={art!.kit} shirtColor={detail.shirtColor} material={detail.material} background={null} className="relative z-10 block aspect-[7/8] w-full" />
                {art!.pants.enabled && (
                  <PantsSvg uid={`detail-p-${detail.id}-${side}`} side={side} art={art!.pants[side]} kit={art!.kit} pantsColor={art!.pants.color} material={detail.material} background={null} className={PANTS_STACK_CLASS} />
                )}
              </div>
              <dl className="m-0 mt-4 grid gap-2.5 text-xs">
                <div className="flex items-center gap-2"><Package size={14} className="text-[var(--lime-dark)]" /><dt className="text-[var(--muted)]">{tr("Số lượng", "Quantity")}</dt><dd className="m-0 ml-auto font-bold">{detail.quantity} {unit}</dd></div>
                <div className="flex items-center gap-2"><Ruler size={14} className="text-[var(--lime-dark)]" /><dt className="text-[var(--muted)]">Size</dt><dd className="m-0 ml-auto font-bold">{detail.jerseySize}</dd></div>
                <div className="flex items-center gap-2"><Shirt size={14} className="text-[var(--lime-dark)]" /><dt className="text-[var(--muted)]">{tr("Chất liệu", "Material")}</dt><dd className="m-0 ml-auto font-bold">{tr(MATERIAL_LABELS[detail.material].vi, MATERIAL_LABELS[detail.material].en)}</dd></div>
                <div className="flex items-center gap-2"><dt className="text-[var(--muted)]">{tr("Màu áo / in", "Colors")}</dt>
                  <dd className="m-0 ml-auto flex items-center gap-1">
                    <span className="size-3.5 border border-[var(--line)]" style={{ background: detail.shirtColor }} />
                    <span className="size-3.5 border border-[var(--line)]" style={{ background: detail.printColor }} />
                    {art!.pants.enabled && <span className="size-3.5 border border-[var(--line)]" style={{ background: art!.pants.color }} title={tr("Màu quần", "Shorts color")} />}
                  </dd>
                </div>
                <div className="flex items-center gap-2"><dt className="text-[var(--muted)]">{tr("Liên hệ", "Contact")}</dt><dd className="m-0 ml-auto text-right font-bold">{detail.contactName} · {detail.contactPhone}</dd></div>
                {detail.note && <div><dt className="text-[var(--muted)]">{tr("Ghi chú của bạn", "Your note")}</dt><dd className="m-0 mt-1 bg-[var(--paper)] p-2 leading-5">{detail.note}</dd></div>}
              </dl>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 text-[10px] font-bold ${TONES[status!.tone] ?? ""}`}>{tr(status!.vi, status!.en)}</span>
                <small className="text-[11px] text-[var(--muted)]">
                  {tr("Gửi", "Sent")} {new Date(detail.createdAt).toLocaleString(locale)} · {tr("cập nhật", "updated")} {new Date(detail.updatedAt).toLocaleString(locale)}
                </small>
              </div>
              <h3 className="m-0 mt-2 font-[family-name:var(--display)] text-3xl leading-[1.1] font-extrabold uppercase">{detail.designName}</h3>
              <Link href={`/cua-hang/${detail.shopId}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--lime-dark)]">
                <Store size={13} /> {detail.shopName} <ChevronRight size={13} />
              </Link>

              <div className="mt-4"><StatusFlow status={detail.status} order={detail.order} /></div>

              <section className="mt-5 border-l-4 border-[var(--lime)] bg-[var(--soft-blue)] p-4">
                <p className="m-0 text-[10px] font-extrabold tracking-[.16em] text-[var(--lime-dark)] uppercase">{tr("Báo giá của shop", "Shop quote")}</p>
                {detail.quotePrice ? (
                  <p className="m-0 mt-2 text-sm">
                    {tr("Báo giá", "Quote")}: <b className="text-xl">{money.format(detail.quotePrice)}₫</b>/{unit}
                    <span className="block text-xs text-[var(--muted)]">
                      {tr("Tạm tính", "Estimated")} {detail.quantity} {unit}: <b className="text-[var(--ink)]">{money.format(detail.quotePrice * detail.quantity)}₫</b> · {tr("chưa gồm phí ship", "excl. shipping")}
                    </span>
                  </p>
                ) : null}
                {detail.sellerReply ? (
                  <p className="m-0 mt-2 flex gap-2 text-sm leading-6"><MessageSquareText size={15} className="mt-1 shrink-0 text-[var(--muted)]" /> {detail.sellerReply}</p>
                ) : null}
                {detail.status === "pending" && detail.counterOffer ? (
                  <p className="m-0 mt-2 text-xs text-[var(--muted)]">
                    {tr(`Bạn đã đề nghị ${money.format(detail.counterOffer)}₫/${unit}. Shop sẽ báo giá lại.`, `You offered ${money.format(detail.counterOffer)}₫/${unit}. The shop will re-quote.`)}
                  </p>
                ) : null}
                {!detail.quotePrice && !detail.sellerReply && (
                  <p className="m-0 mt-2 text-sm text-[var(--muted)]">{tr("Shop chưa báo giá. Bạn sẽ nhận thông báo ngay khi có báo giá.", "No quote yet. You'll be notified as soon as the shop quotes.")}</p>
                )}

                {detail.status === "quoted" && panel === "none" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="boai-button primary" disabled={pending} onClick={accept}>
                      {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {tr("Chấp nhận báo giá", "Accept quote")}
                    </button>
                    <button type="button" className="boai-button" disabled={pending} onClick={() => { setPanel("negotiate"); setFormError("") }}>
                      <Handshake size={15} /> {tr("Từ chối / thương lượng", "Decline / negotiate")}
                    </button>
                  </div>
                )}
                {panel === "negotiate" && (
                  <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4">
                    <label className="grid gap-1 text-[11px] font-bold">
                      {tr(`Giá bạn mong muốn (₫/${unit}, không bắt buộc)`, `Price you'd accept (₫/${unit}, optional)`)}
                      <input className={field} inputMode="numeric" value={offer ? money.format(Number(offer)) : ""} placeholder="120.000" onChange={(e) => setOffer(e.target.value.replace(/\D/g, ""))} />
                    </label>
                    <label className="grid gap-1 text-[11px] font-bold">
                      {tr("Lời nhắn cho shop", "Message to the shop")}
                      <textarea className={`${field} min-h-16 resize-y`} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("VD: Đặt 20 áo, shop giảm còn 120.000₫ được không?", "e.g. For 20 shirts, could you do 120,000₫?")} />
                    </label>
                    {formError && <p className="form-error m-0 text-xs">{formError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="boai-button primary" disabled={pending} onClick={negotiate}>{tr("Gửi đề nghị", "Send counter-offer")}</button>
                      <button type="button" className="boai-button" disabled={pending} onClick={() => setPanel("cancel")}>{tr("Từ chối hẳn báo giá", "Decline the quote")}</button>
                      <button type="button" className="text-link" onClick={() => setPanel("none")}>{tr("Quay lại", "Back")}</button>
                    </div>
                  </div>
                )}
                {panel === "cancel" && (
                  <div className="mt-4 grid gap-2 border-t border-[var(--line)] pt-4">
                    <label className="grid gap-1 text-[11px] font-bold">
                      {tr("Lý do hủy (shop sẽ nhận được)", "Reason (shared with the shop)")}
                      <textarea className={`${field} min-h-16 resize-y`} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("VD: Giá vượt ngân sách của đội", "e.g. Over our team's budget")} />
                    </label>
                    {formError && <p className="form-error m-0 text-xs">{formError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="boai-button dark" disabled={pending} onClick={cancel}>{tr("Xác nhận hủy yêu cầu", "Confirm cancellation")}</button>
                      <button type="button" className="text-link" onClick={() => setPanel("none")}>{tr("Giữ yêu cầu", "Keep request")}</button>
                    </div>
                  </div>
                )}
              </section>

              {(detail.status === "accepted" || detail.status === "in_production" || detail.status === "completed") && (
                <section className="mt-4 border border-[var(--line)] p-4">
                  {orderActive ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid size-10 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">
                        {detail.order!.status === "delivered" ? <PackageCheck size={18} /> : <Truck size={18} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="block text-sm">{tr("Đơn hàng", "Order")} {detail.order!.code}</b>
                        <small className="text-xs text-[var(--muted)]">
                          {tr("Giao hàng", "Delivery")}: {tr(ORDER_STATUS[detail.order!.status]?.vi ?? detail.order!.status, ORDER_STATUS[detail.order!.status]?.en)}
                        </small>
                      </div>
                      <Link href={`/don-hang?ma=${encodeURIComponent(detail.order!.code)}`} className="boai-button primary">
                        {tr("Theo dõi đơn", "Track order")} <ArrowRight size={15} />
                      </Link>
                    </div>
                  ) : detail.status === "accepted" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="m-0 min-w-0 flex-1 text-sm leading-6">
                        {tr("Bạn đã chốt báo giá. Đặt đơn (COD hoặc chuyển khoản cho shop) để shop bắt đầu sản xuất.", "You accepted the quote. Place the order (cash on delivery or bank transfer to the shop) so the shop can start production.")}
                      </p>
                      <Link href={`/thanh-toan?yeu-cau=${detail.id}`} className="boai-button primary">
                        {tr("Đặt đơn ngay", "Place order")} <ArrowRight size={15} />
                      </Link>
                    </div>
                  ) : null}
                </section>
              )}

              {detail.history.length > 0 && (
                <details className="mt-4 border border-[var(--line)]">
                  <summary className="cursor-pointer px-4 py-2.5 text-[11px] font-extrabold tracking-[.12em] uppercase">{tr("Lịch sử yêu cầu", "Request history")}</summary>
                  <ol className="m-0 grid list-none gap-2 px-4 pb-4">
                    {[...detail.history].reverse().map((row, i) => (
                      <li key={`${row.at}-${i}`} className="flex items-start gap-2 text-xs">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--lime)]" />
                        <span className="min-w-0 flex-1">
                          <b>{tr(CUSTOM_STATUS_LABELS[row.status]?.vi ?? row.status, CUSTOM_STATUS_LABELS[row.status]?.en)}</b>
                          <span className="text-[var(--muted)]"> · {row.actor === "shop" ? tr("Shop", "Shop") : row.actor === "customer" ? tr("Bạn", "You") : "BOAI"}</span>
                          {row.note && <span className="block text-[var(--muted)]">{row.note}</span>}
                        </span>
                        <time className="shrink-0 text-[10px] text-[var(--muted)]">{new Date(row.at).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <section className="mt-4 overflow-hidden border border-[var(--line)]">
                <p className="m-0 flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5 text-[11px] font-extrabold tracking-[.12em] uppercase">
                  <MessageCircle size={14} className="text-[var(--lime-dark)]" /> {tr("Trao đổi với shop", "Talk with the shop")}
                  <small className="ml-auto text-[10px] font-semibold tracking-normal text-[var(--muted)] normal-case">{tr("Cũng hiện trong Tin nhắn", "Also in Messages")}</small>
                </p>
                {detail.status !== "cancelled" && detail.status !== "declined" ? (
                  <RequestChat requestId={detail.id} />
                ) : (
                  <p className="m-0 p-4 text-xs text-[var(--muted)]">
                    {tr("Yêu cầu đã đóng. Bạn vẫn có thể xem lại trao đổi trong", "This request is closed. You can still read the conversation in")}{" "}
                    <Link href="/tin-nhan?tab=custom" className="font-bold text-[var(--lime-dark)]">{tr("Tin nhắn", "Messages")}</Link>.
                  </p>
                )}
              </section>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/cua-hang/${detail.shopId}`} className="boai-button"><Store size={15} /> {tr("Xem shop", "View shop")}</Link>
                {canCancel && panel === "none" && (
                  <button type="button" className="boai-button border border-[var(--line)] bg-[var(--white)]" disabled={pending} onClick={() => { setPanel("cancel"); setFormError("") }}>
                    {tr("Hủy yêu cầu", "Cancel request")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function MyRequests({
  requests,
  onChanged,
  openId,
  onOpen,
}: {
  requests: MyCustomRequest[]
  onChanged: () => void
  openId: string | null
  onOpen: (id: string | null) => void
}) {
  const { tr, lang } = useShop()

  // Link cũ trong thông báo (#yeu-cau): cuộn tới danh sách khi đã tải xong.
  useEffect(() => {
    if (requests.length && window.location.hash === "#yeu-cau")
      document.getElementById("yeu-cau")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [requests.length])

  const close = () => {
    onOpen(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has("yeu-cau")) {
      url.searchParams.delete("yeu-cau")
      window.history.replaceState(null, "", url.pathname + url.search + url.hash)
    }
  }

  return (
    <>
      {openId && <RequestDialog id={openId} onClose={close} onChanged={onChanged} />}
      {requests.length > 0 && (
        <section id="yeu-cau" className="scroll-mt-24 pt-16">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold tracking-[.16em] text-[var(--lime-dark)] uppercase">
              <span className="grid size-5 place-items-center rounded-full bg-[var(--lime)] text-[10px] !text-white">3</span>
              {tr("Bước 3 · Nhận báo giá, chốt đơn", "Step 3 · Get quotes and order")}
            </div>
            <h2 className="m-0 font-[family-name:var(--display)] text-4xl leading-[1.1] font-black tracking-tight uppercase">
              {tr("Yêu cầu đã gửi", "Sent requests")}
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => {
              const status = CUSTOM_STATUS_LABELS[request.status]
              const replied = !!(request.quotePrice || request.sellerReply)
              const action =
                request.status === "quoted"
                  ? tr("Xem báo giá & chốt", "Review quote")
                  : request.status === "accepted" && !request.order
                    ? tr("Đặt đơn ngay", "Place order")
                    : request.order && request.order.status !== "cancelled"
                      ? tr(`Đơn ${request.order.code}`, `Order ${request.order.code}`)
                      : tr("Xem chi tiết", "View details")
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onOpen(request.id)}
                  className="group flex flex-col border border-[var(--line)] bg-[var(--white)] text-left transition hover:-translate-y-0.5 hover:border-[var(--lime)] hover:shadow-[0_14px_30px_rgba(15,23,42,.08)]"
                >
                  <div className="flex w-full items-start gap-3 p-4">
                    <span className="mt-0.5 size-10 shrink-0 border border-[var(--line)]" style={{ background: request.shirtColor }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <b className="truncate text-sm">{request.designName}</b>
                        <span className={`shrink-0 px-2 py-1 text-[10px] font-bold ${TONES[status.tone] ?? ""}`}>{tr(status.vi, status.en)}</span>
                      </div>
                      <small className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink)]"><Store size={12} /> {request.shopName}</span>
                        <span className="inline-flex items-center gap-1"><Package size={12} /> {request.quantity}</span>
                        <span>#{request.code} · {new Date(request.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN")}</span>
                      </small>
                    </div>
                  </div>
                  {replied && (
                    <div className="mx-4 mb-3 w-[calc(100%-2rem)] bg-[var(--soft-blue)] p-3 text-xs leading-5">
                      {request.quotePrice ? (
                        <p className="m-0">{tr("Báo giá", "Quote")}: <b>{money.format(request.quotePrice)}₫</b></p>
                      ) : null}
                      {request.sellerReply && <p className="m-0 mt-1 line-clamp-2 text-[var(--muted)]">{request.sellerReply}</p>}
                    </div>
                  )}
                  <span
                    className={`mt-auto flex w-full items-center justify-between border-t border-[var(--line)] px-4 py-2.5 text-[11px] font-bold ${
                      request.status === "quoted" || (request.status === "accepted" && !request.order) ? "text-[var(--lime-dark)]" : "text-[var(--muted)] group-hover:text-[var(--lime-dark)]"
                    }`}
                  >
                    {action} <ChevronRight size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
