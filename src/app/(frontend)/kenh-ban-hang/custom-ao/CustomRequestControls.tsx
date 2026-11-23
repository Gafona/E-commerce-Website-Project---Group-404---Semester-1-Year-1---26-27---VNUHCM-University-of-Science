"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Ban, CheckCircle2, Factory, Loader2, Send } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { updateCustomRequestAction, type CustomRequestStep } from "../actions"
import type { CustomStatus } from "@/lib/custom-jersey"

const money = new Intl.NumberFormat("vi-VN")

/**
 * Shop controls for one custom request, one step at a time:
 * quote (or re-quote) → wait for the customer to accept and order → start
 * production → mark done. No skipping; each step notifies the customer.
 */
export function CustomRequestControls({
  id,
  status,
  quotePrice,
  sellerReply,
  quantity,
  counterOffer,
  customerNote,
  hasOrder,
  orderPaid,
}: {
  id: string
  status: CustomStatus
  quotePrice: number | null
  sellerReply: string
  quantity: number
  counterOffer: number | null
  customerNote: string
  /** Customer placed the linked order (not cancelled). */
  hasOrder: boolean
  /** Bank-transfer order fully paid (always true for COD). */
  orderPaid: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [price, setPrice] = useState(quotePrice ? String(quotePrice) : counterOffer ? String(counterOffer) : "")
  const [reply, setReply] = useState(sellerReply)
  const [declining, setDeclining] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string; message?: string } | null>(null)
  const [pending, start] = useTransition()
  const priceNumber = Number(price.replace(/\D/g, "")) || 0

  const run = (step: CustomRequestStep) => {
    setResult(null)
    start(async () => {
      const res = await updateCustomRequestAction(id, { step, quotePrice: price, sellerReply: reply }).catch(() => ({ ok: false, error: tr("Mất kết nối.", "Connection lost.") }))
      setResult(res)
      if (res.ok) {
        setDeclining(false)
        router.refresh()
      }
    })
  }

  const closed = status === "completed" || status === "declined" || status === "cancelled"
  if (closed) {
    return (
      <div className="bg-[var(--paper)] p-4 text-xs leading-5 text-[var(--muted)]">
        {quotePrice ? <p className="m-0">{tr("Báo giá", "Quote")}: <b className="text-[var(--ink)]">{money.format(quotePrice)}₫/{tr("áo", "pc")}</b></p> : null}
        {sellerReply ? <p className="m-0 mt-1">{sellerReply}</p> : null}
        {status === "completed" && <p className="m-0 mt-1 font-semibold text-[var(--lime-dark)]">{tr("Đã may xong · giao hàng trong mục Đơn hàng.", "Production done · ship it from Orders.")}</p>}
        {customerNote && status === "cancelled" && <p className="m-0 mt-1">{tr("Lý do của khách", "Customer's reason")}: {customerNote}</p>}
        {!quotePrice && !sellerReply && status !== "completed" && tr("Yêu cầu đã đóng.", "This request is closed.")}
      </div>
    )
  }

  const label = "grid gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"
  const input = "border border-[var(--line)] bg-[var(--white)] px-2.5 py-2 text-xs normal-case text-[var(--ink)]"

  return (
    <div className="grid content-start gap-2.5 bg-[var(--paper)] p-4">
      {status === "pending" && counterOffer ? (
        <p className="m-0 border-l-2 border-[var(--orange)] bg-[var(--white)] px-3 py-2 text-xs leading-5">
          {tr("Khách đề nghị", "Customer offers")} <b>{money.format(counterOffer)}₫/{tr("áo", "pc")}</b>
          {customerNote ? <span className="block text-[var(--muted)]">“{customerNote}”</span> : null}
        </p>
      ) : status === "pending" && customerNote ? (
        <p className="m-0 border-l-2 border-[var(--orange)] bg-[var(--white)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">“{customerNote}”</p>
      ) : null}

      {(status === "pending" || status === "quoted") && !declining && (
        <>
          <label className={label}>
            {tr("Báo giá (₫/áo)", "Quote (₫/pc)")}
            <input className={input} inputMode="numeric" value={price ? money.format(priceNumber) : ""} placeholder="150.000" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
            {priceNumber > 0 && <span className="font-normal tracking-normal normal-case">{tr("Tổng", "Total")} ~{money.format(priceNumber * quantity)}₫</span>}
          </label>
          <label className={label}>
            {tr("Lời nhắn kèm báo giá", "Note with the quote")}
            <textarea className={`${input} min-h-16 resize-y leading-5`} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={tr("Thời gian làm, phí in tên số…", "Lead time, name/number printing…")} />
          </label>
          <button type="button" className="boai-button primary min-h-10" disabled={pending || !priceNumber} onClick={() => run("quote")}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {status === "quoted" ? tr("Gửi báo giá mới", "Send new quote") : tr("Gửi báo giá", "Send quote")}
          </button>
          {status === "quoted" && <p className="m-0 text-[11px] leading-5 text-[var(--muted)]">{tr("Đang chờ khách chấp nhận hoặc thương lượng.", "Waiting for the customer to accept or negotiate.")}</p>}
        </>
      )}

      {status === "accepted" && (
        <>
          <p className="m-0 text-xs leading-5">
            <b className="text-[var(--lime-dark)]">{tr("Khách đã chấp nhận", "Customer accepted")}</b> {quotePrice ? `${money.format(quotePrice)}₫/${tr("áo", "pc")}` : ""}.{" "}
            {hasOrder
              ? orderPaid
                ? tr("Khách đã đặt đơn. Bạn có thể bắt đầu sản xuất.", "The order is placed. You can start production.")
                : tr("Khách đã đặt đơn chuyển khoản, đang chờ thanh toán. Bạn có thể bắt đầu khi sẵn sàng.", "Bank-transfer order placed and awaiting payment. Start when you're ready.")
              : tr("Đang chờ khách đặt đơn.", "Waiting for the customer to place the order.")}
          </p>
          <button type="button" className="boai-button primary min-h-10" disabled={pending || !hasOrder} onClick={() => run("start")}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Factory size={15} />} {tr("Bắt đầu sản xuất", "Start production")}
          </button>
        </>
      )}

      {status === "in_production" && (
        <>
          <p className="m-0 text-xs leading-5 text-[var(--muted)]">{tr("Đang sản xuất. Đánh dấu may xong để giao hàng theo đơn.", "In production. Mark it done to ship the order.")}</p>
          <button type="button" className="boai-button primary min-h-10" disabled={pending} onClick={() => run("complete")}>
            {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {tr("Đã may xong", "Production done")}
          </button>
        </>
      )}

      {(status === "pending" || status === "quoted" || (status === "accepted" && !hasOrder)) &&
        (declining ? (
          <div className="grid gap-2 border-t border-[var(--line)] pt-2.5">
            <label className={label}>
              {tr("Lý do từ chối (gửi cho khách)", "Reason (sent to the customer)")}
              <textarea className={`${input} min-h-14 resize-y leading-5`} maxLength={500} value={reply} onChange={(e) => setReply(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button type="button" className="boai-button dark flex-1" disabled={pending} onClick={() => run("decline")}>{tr("Xác nhận từ chối", "Confirm decline")}</button>
              <button type="button" className="boai-button" onClick={() => setDeclining(false)}>{tr("Hủy", "Cancel")}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="inline-flex items-center gap-1.5 justify-self-start text-[11px] font-bold text-[var(--muted)] hover:text-[var(--sale)]" onClick={() => setDeclining(true)}>
            <Ban size={13} /> {tr("Từ chối yêu cầu", "Decline request")}
          </button>
        ))}

      {result?.error && <p className="form-error m-0 text-xs">{result.error}</p>}
      {result?.ok && <p className="sc-ok m-0 text-xs">{result.message}</p>}
    </div>
  )
}
