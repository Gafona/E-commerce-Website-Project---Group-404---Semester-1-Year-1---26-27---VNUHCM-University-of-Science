"use client"

import { useState } from "react"
import { BadgeCheck, Banknote, Loader2, RotateCcw, Trash2, XCircle } from "lucide-react"
import {
  adminCancelOrderAction,
  confirmOrderPaymentAction,
  createDiscountCodeAction,
  deleteDiscountCodeAction,
  markPayoutPaidAction,
  markRefundedAction,
  savePaymentAccountAction,
  toggleDiscountCodeAction,
} from "./actions"
import { btn, Dialog, Feedback, inputClass, useAdminAction } from "./AdminControls"

const money = new Intl.NumberFormat("vi-VN")

export function ConfirmPaymentButton({ id, code, amount }: { id: string; code: string; amount: number }) {
  const { pending, result, run } = useAdminAction()
  const [open, setOpen] = useState(false)
  return (
    <div className="grid justify-items-end gap-1">
      <button type="button" className={`${btn.base} ${btn.approve}`} disabled={pending} onClick={() => setOpen(true)}>
        <BadgeCheck size={13} /> Đã nhận tiền
      </button>
      {open && (
        <Dialog title="Xác nhận đã nhận tiền" onClose={() => setOpen(false)}>
          <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">
            Chỉ xác nhận khi tài khoản BOAI đã nhận <b className="text-[var(--ink)]">{money.format(amount)}₫</b> với nội dung <b className="text-[var(--ink)]">{code}</b>. Đơn sẽ chuyển cho các shop để giao.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.approve} ml-auto min-h-10 px-5`} onClick={() => run(() => confirmOrderPaymentAction(id), () => setOpen(false))}>
              {pending && <Loader2 size={13} className="animate-spin" />} Xác nhận
            </button>
          </div>
        </Dialog>
      )}
      {!open && <Feedback result={result} />}
    </div>
  )
}

export function AdminCancelButton({ id, label = "Hủy đơn", hint }: { id: string; label?: string; hint: string }) {
  const { pending, result, run } = useAdminAction()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  return (
    <div className="grid justify-items-end gap-1">
      <button type="button" className={`${btn.base} ${btn.ghost}`} disabled={pending} onClick={() => setOpen(true)}>
        <XCircle size={13} /> {label}
      </button>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)}>
          <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">{hint}</p>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Lý do (gửi cho khách và shop)
            <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Ví dụ: Khách yêu cầu hủy qua hotline" />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`} onClick={() => run(() => adminCancelOrderAction(id, reason), () => setOpen(false))}>
              {pending && <Loader2 size={13} className="animate-spin" />} Xác nhận hủy
            </button>
          </div>
        </Dialog>
      )}
      {!open && <Feedback result={result} />}
    </div>
  )
}

export function RefundButton({ id, amount }: { id: string; amount: number }) {
  const { pending, result, run } = useAdminAction()
  return (
    <div className="grid justify-items-end gap-1">
      <button
        type="button"
        className={`${btn.base} ${btn.dark}`}
        disabled={pending}
        onClick={() => window.confirm(`Xác nhận BOAI đã hoàn ${money.format(amount)}₫ cho khách?`) && run(() => markRefundedAction(id))}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Đã hoàn tiền
      </button>
      <Feedback result={result} />
    </div>
  )
}

export function PayoutButton({ id, amount, shop }: { id: string; amount: number; shop: string }) {
  const { pending, result, run } = useAdminAction()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  return (
    <div className="grid justify-items-end gap-1">
      <button type="button" className={`${btn.base} ${btn.approve}`} disabled={pending} onClick={() => setOpen(true)}>
        <Banknote size={13} /> Xác nhận đã chi
      </button>
      {open && (
        <Dialog title="Xác nhận đã chi cho shop" onClose={() => setOpen(false)}>
          <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">
            Ghi nhận BOAI đã chuyển <b className="text-[var(--ink)]">{money.format(amount)}₫</b> cho <b className="text-[var(--ink)]">{shop}</b>. Ngày chi là hôm nay.
          </p>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Ghi chú (mã giao dịch, không bắt buộc)
            <input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="VD: FT26323XXXX" />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.approve} ml-auto min-h-10 px-5`} onClick={() => run(() => markPayoutPaidAction(id, note), () => setOpen(false))}>
              {pending && <Loader2 size={13} className="animate-spin" />} Đã chi
            </button>
          </div>
        </Dialog>
      )}
      {!open && <Feedback result={result} />}
    </div>
  )
}

export function PaymentAccountForm({
  initial,
  banks,
}: {
  initial: { bankCode: string; accountNumber: string; accountName: string }
  banks: { code: string; name: string }[]
}) {
  const { pending, result, run } = useAdminAction()
  const [form, setForm] = useState(initial)
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => savePaymentAccountAction(form))
      }}
    >
      <label className="grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Ngân hàng
        <select className={inputClass} value={form.bankCode} onChange={(e) => setForm({ ...form, bankCode: e.target.value })} required>
          <option value="">— Chọn ngân hàng —</option>
          {banks.map((bank) => (
            <option key={bank.code} value={bank.code}>{bank.name} ({bank.code})</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Số tài khoản
        <input className={inputClass} value={form.accountNumber} inputMode="numeric" maxLength={19} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} required placeholder="6–19 chữ số" />
      </label>
      <label className="grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Chủ tài khoản
        <input className={inputClass} value={form.accountName} maxLength={80} onChange={(e) => setForm({ ...form, accountName: e.target.value.toUpperCase() })} required placeholder="VD: CONG TY TNHH BOAI" />
      </label>
      <button type="submit" disabled={pending} className={`${btn.base} ${btn.dark} min-h-10 px-5`}>
        {pending && <Loader2 size={13} className="animate-spin" />} Lưu tài khoản
      </button>
      <div className="sm:col-span-4">
        <Feedback result={result} />
      </div>
    </form>
  )
}

export function DiscountCodeForm() {
  const { pending, result, run } = useAdminAction()
  const [code, setCode] = useState("")
  const [percent, setPercent] = useState("")
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => createDiscountCodeAction({ code, percent: Number(percent) }), () => {
          setCode("")
          setPercent("")
        })
      }}
    >
      <label className="grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Mã giảm giá
        <input className={inputClass} value={code} maxLength={20} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} required placeholder="VD: BOAI10" />
      </label>
      <label className="grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Giảm (%)
        <input className={inputClass} type="number" min={1} max={100} step={1} value={percent} onChange={(e) => setPercent(e.target.value)} required placeholder="1–100" />
      </label>
      <button type="submit" disabled={pending} className={`${btn.base} ${btn.dark} min-h-10 px-5`}>
        {pending && <Loader2 size={13} className="animate-spin" />} Tạo mã
      </button>
      <div className="sm:col-span-3">
        <Feedback result={result} />
      </div>
    </form>
  )
}

export function DiscountRowControls({ id, code, active }: { id: string; code: string; active: boolean }) {
  const { pending, result, run } = useAdminAction()
  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={active ? `Tắt mã ${code}` : `Bật mã ${code}`}
          disabled={pending}
          onClick={() => run(() => toggleDiscountCodeAction(id, !active))}
          className={`${btn.base} ${active ? btn.ghost : btn.approve}`}
        >
          {active ? "Tắt" : "Bật"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => window.confirm(`Xóa mã ${code}? Đơn đã dùng mã vẫn giữ nguyên số tiền giảm.`) && run(() => deleteDiscountCodeAction(id))}
          className={`${btn.base} ${btn.danger}`}
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>
      <Feedback result={result} />
    </div>
  )
}
