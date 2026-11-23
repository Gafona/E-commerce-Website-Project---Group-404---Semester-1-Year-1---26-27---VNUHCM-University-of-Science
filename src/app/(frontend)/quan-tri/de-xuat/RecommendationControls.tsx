"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { reviewRecommendationAction, saveRecommendationSettingsAction } from "../actions"
import { btn, Dialog, Feedback, inputClass, useAdminAction } from "../AdminControls"

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`

/** Pending request: confirm the fee has arrived, then approve; or reject with a reason the shop sees. */
export function RecommendationReview({ id, code, total, shop }: { id: string; code: string; total: number; shop: string }) {
  const { pending, result, run } = useAdminAction()
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = useState("")
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button type="button" disabled={pending} className={`${btn.base} ${btn.approve}`} onClick={() => setDialog("approve")}>
          <Check size={13} /> Đã thu phí &amp; Duyệt
        </button>
        <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost}`} onClick={() => setDialog("reject")}>
          <X size={13} /> Từ chối
        </button>
      </div>
      <Feedback result={result} />
      {dialog === "approve" && (
        <Dialog title={`Duyệt đề xuất ${code}`} onClose={() => setDialog(null)}>
          <p className="m-0 text-[13px] leading-6">
            Xác nhận BOAI đã nhận đủ <b>{money(total)}</b> từ <b>{shop}</b> (nội dung chuyển khoản <span className="font-mono">{code}</span>). Sản phẩm sẽ hiển thị với nhãn “Đề xuất” trong khoảng ngày đã đặt.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button
              type="button"
              disabled={pending}
              className={`${btn.base} ${btn.approve} ml-auto min-h-10 px-5`}
              onClick={() => run(() => reviewRecommendationAction(id, "approved"), () => setDialog(null))}
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Đã thu phí &amp; Duyệt
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "reject" && (
        <Dialog title={`Từ chối đề xuất ${code}`} onClose={() => setDialog(null)}>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Lý do (shop sẽ thấy)
            <textarea
              rows={4}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
              placeholder="Ví dụ: Chưa nhận được phí sau 3 ngày; ảnh sản phẩm chưa đạt chuẩn…"
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button
              type="button"
              disabled={pending || reason.trim().length < 5}
              className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`}
              onClick={() => run(() => reviewRecommendationAction(id, "rejected", reason), () => setDialog(null))}
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Xác nhận từ chối
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

export function RecommendationSettingsForm({ slots, minPrice, maxSlots }: { slots: number; minPrice: number; maxSlots: number }) {
  const { pending, result, run } = useAdminAction()
  const [value, setValue] = useState({ slots: String(slots), minPrice: String(minPrice) })
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        run(() => saveRecommendationSettingsAction({ slots: Number(value.slots), minPrice: Number(value.minPrice) }))
      }}
    >
      <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Số suất mỗi vị trí (1–{maxSlots})
        <input className={inputClass} type="number" min={1} max={maxSlots} step={1} value={value.slots} onChange={(e) => setValue({ ...value, slots: e.target.value })} required />
      </label>
      <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Giá tối thiểu mỗi ngày (₫)
        <input className={inputClass} type="number" min={1000} step={1000} value={value.minPrice} onChange={(e) => setValue({ ...value, minPrice: e.target.value })} required />
      </label>
      <button type="submit" disabled={pending} className={`${btn.base} ${btn.dark} min-h-9`}>
        {pending && <Loader2 size={13} className="animate-spin" />} Lưu cài đặt
      </button>
      <div className="sm:col-span-3">
        <Feedback result={result} />
      </div>
    </form>
  )
}
