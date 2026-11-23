"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cancelOrderAction } from "../shop-actions"
import { useShop } from "../components/ShopProvider"

/**
 * Cancels the whole order, or one shop's part (`childCode`). Access is
 * re-checked on the server (account owner or the browser's stored order proof).
 */
export function CancelOrder({ code, childCode, label, paid = false }: { code: string; childCode?: string; label?: string; paid?: boolean }) {
  const router = useRouter()
  const { tr } = useShop()
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  if (!confirm)
    return (
      <button type="button" className="text-link danger" onClick={() => setConfirm(true)}>
        {label ?? tr("Hủy đơn hàng", "Cancel order")}
      </button>
    )
  return (
    <div className="confirm-box">
      <span>
        {childCode
          ? tr(`Hủy phần đơn ${childCode}? Các shop khác vẫn giao bình thường.`, `Cancel part ${childCode}? Other shops still deliver.`)
          : tr(`Bạn chắc chắn muốn hủy đơn ${code}?`, `Are you sure you want to cancel order ${code}?`)}
        {paid && <> {tr("BOAI sẽ hoàn tiền trong 3–5 ngày làm việc.", "BOAI will refund you within 3–5 working days.")}</>}
      </span>
      <div>
        <button
          type="button"
          className="boai-button dark"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelOrderAction(code, undefined, childCode).catch(() => ({ ok: false, error: tr("Mất kết nối.", "Connection lost.") }))
              if (!res.ok) setError(res.error ?? tr("Không thể hủy đơn.", "Could not cancel the order."))
              else router.refresh()
            })
          }
        >
          {pending ? tr("Đang hủy...", "Cancelling...") : tr("Xác nhận hủy", "Confirm cancellation")}
        </button>
        <button type="button" className="boai-button" onClick={() => setConfirm(false)}>
          {tr("Giữ đơn", "Keep order")}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
