"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useShop } from "../../components/ShopProvider"
import { sellerOrderStepAction } from "../actions"

/** Ship / delivered / cancel-with-reason buttons for one shop order. */
export function OrderActions({ id, status, cancellable }: { id: string; status: string; cancellable: boolean }) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const run = (step: "ship" | "deliver" | "cancel") =>
    start(async () => {
      setError("")
      const result = await sellerOrderStepAction(id, step, reason).catch(() => ({ ok: false as const, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please retry.") }))
      if (!result.ok) return setError(result.error)
      notify(result.message)
      setCancelOpen(false)
      setReason("")
      router.refresh()
    })
  return (
    <div className="grid gap-2">
      <div className="sc-actions">
        {status === "pending" && (
          <button type="button" className="boai-button primary" disabled={pending} onClick={() => run("ship")}>
            {pending ? tr("Đang lưu…", "Saving…") : tr("Xác nhận & giao hàng", "Confirm & ship")}
          </button>
        )}
        {status === "shipping" && (
          <button type="button" className="boai-button primary" disabled={pending} onClick={() => run("deliver")}>
            {pending ? tr("Đang lưu…", "Saving…") : tr("Đã giao", "Delivered")}
          </button>
        )}
        {cancellable && !cancelOpen && (
          <button type="button" className="boai-button" disabled={pending} onClick={() => setCancelOpen(true)}>
            {tr("Hủy", "Cancel")}
          </button>
        )}
      </div>
      {cancelOpen && (
        <div className="grid gap-2 border border-[var(--line)] bg-[var(--paper)] p-2.5">
          <label className="grid gap-1 text-[11px] font-bold">
            {tr("Lý do hủy (gửi cho khách)", "Reason (sent to the buyer)")}
            <input
              className="h-9 border border-[var(--line)] bg-[var(--white)] px-2 text-xs font-normal"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr("VD: Hết hàng size 42", "e.g. Size 42 out of stock")}
              autoFocus
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="boai-button dark" disabled={pending} onClick={() => run("cancel")}>
              {pending ? tr("Đang hủy…", "Cancelling…") : tr("Xác nhận hủy", "Confirm cancel")}
            </button>
            <button type="button" className="boai-button" onClick={() => setCancelOpen(false)}>
              {tr("Không hủy", "Keep")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="m-0 text-[11px] font-semibold text-[var(--sale)]" role="alert">{error}</p>}
    </div>
  )
}
