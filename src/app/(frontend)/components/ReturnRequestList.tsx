"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useId, useState, useTransition } from "react"
import { AlertTriangle, ChevronDown, Clock3, ImageIcon, RotateCcw } from "lucide-react"
import { useShop } from "./ShopProvider"
import { updateReturnRequestAction } from "../return-actions"
import {
  RETURN_HANDLING_BUSINESS_DAYS,
  RETURN_REASON_LABELS,
  RETURN_SELLER_TRANSITIONS,
  RETURN_STATUS_LABELS,
  RETURN_TYPE_LABELS,
  type ReturnStatus,
} from "@/lib/returns"
import type { ReturnView } from "@/lib/return-view"

const STEP_LABEL: Partial<Record<ReturnStatus, { vi: string; en: string; hint: { vi: string; en: string } }>> = {
  approved: {
    vi: "Chấp nhận yêu cầu",
    en: "Approve request",
    hint: { vi: "Khách sẽ được báo gửi sản phẩm về shop.", en: "The customer is told to send the item back." },
  },
  rejected: {
    vi: "Từ chối",
    en: "Reject",
    hint: { vi: "Bắt buộc nêu lý do. Khách sẽ thấy lý do này trong đơn hàng.", en: "A reason is required. The customer sees it on the order." },
  },
  received: {
    vi: "Đã nhận hàng trả về",
    en: "Item received",
    hint: { vi: "Xác nhận shop đã nhận lại sản phẩm và kiểm tra tình trạng.", en: "Confirm the item arrived and was inspected." },
  },
}

const completeLabel = (type: ReturnView["type"]) =>
  type === "exchange"
    ? { vi: "Đã gửi sản phẩm đổi", en: "Exchange item sent", hint: { vi: "Xác nhận đã gửi sản phẩm thay thế cho khách.", en: "Confirm the replacement was sent." } }
    : { vi: "Đã hoàn tiền", en: "Refund issued", hint: { vi: "Xác nhận đã hoàn tiền cho khách.", en: "Confirm the customer has been refunded." } }

const TONE: Record<string, string> = {
  pending: "pending",
  confirmed: "confirmed",
  shipping: "shipping",
  delivered: "delivered",
  cancelled: "cancelled",
}

const vnd = (value: number) => `${value.toLocaleString("vi-VN")}₫`

export function ReturnRequestList({ requests, showShop = false, orderHref }: { requests: ReturnView[]; showShop?: boolean; orderHref?: string }) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {requests.map((request) => (
        <ReturnRow key={request.id} request={request} showShop={showShop} orderHref={orderHref} />
      ))}
    </ul>
  )
}

function ReturnRow({ request: r, showShop, orderHref }: { request: ReturnView; showShop: boolean; orderHref?: string }) {
  const { tr, lang } = useShop()
  const locale = lang === "en" ? "en-GB" : "vi-VN"
  const [open, setOpen] = useState(r.status === "requested" || !!r.handling?.overdue)
  const detailId = useId()
  const status = RETURN_STATUS_LABELS[r.status]
  const reason = RETURN_REASON_LABELS[r.reason]
  const type = RETURN_TYPE_LABELS[r.type]
  const date = (value: string, time = false) =>
    new Date(value).toLocaleString(locale, {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
    })
  const overdue = !!r.handling?.overdue

  return (
    <li className={`sc-card overflow-hidden p-0 ${overdue ? "border-l-4 border-l-[var(--sale)]" : ""}`}>
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm">#{r.code}</b>
            <span className={`sc-badge ${TONE[status.tone] ?? ""} whitespace-nowrap`}>{tr(status.vi, status.en)}</span>
          </div>
          <p className="m-0 mt-1 text-[11px] text-[var(--muted)]">
            {tr("Đơn", "Order")}{" "}
            {orderHref ? (
              <Link href={orderHref} className="font-bold text-inherit">#{r.orderCode}</Link>
            ) : (
              <b>#{r.orderCode}</b>
            )}{" "}
            · {r.customerName}
            {showShop && <> · {tr("Shop", "Shop")} <b>{r.shopName}</b></>}
          </p>
          <p className="m-0 mt-1 text-[11px] text-[var(--muted)]">{tr("Gửi lúc", "Sent")} {date(r.createdAt, true)}</p>
        </div>
        <div className="min-w-0 text-xs">
          <p className="m-0 font-semibold">
            {r.items.map((i) => `${i.quantity} × ${i.name}${i.size ? ` · ${i.size}` : ""}${i.color ? ` · ${i.color}` : ""}`).join(", ")}
          </p>
          <p className="m-0 mt-1 text-[var(--muted)]">
            {tr(type.vi, type.en)} · {tr(reason.vi, reason.en)}
          </p>
          {r.photos.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.photos.map((photo, i) => (
                <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="relative block size-12 overflow-hidden border border-[var(--line)] bg-[var(--paper)]" aria-label={tr(`Mở ảnh minh chứng ${i + 1}`, `Open evidence photo ${i + 1}`)}>
                  <Image src={photo.url} alt={photo.alt} fill sizes="48px" className="object-cover" />
                </a>
              ))}
            </div>
          ) : (
            <p className="m-0 mt-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <ImageIcon size={12} aria-hidden /> {tr("Không có ảnh minh chứng", "No evidence photos")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
          {r.handling && (
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap border px-2 py-1 text-[10px] font-bold ${
                overdue ? "border-[var(--sale)] bg-[var(--sale)] text-white" : "border-[var(--line)] text-[var(--muted)]"
              }`}
              title={tr(`Xử lý trong ${RETURN_HANDLING_BUSINESS_DAYS} ngày làm việc`, `Handle within ${RETURN_HANDLING_BUSINESS_DAYS} working days`)}
            >
              {overdue ? <AlertTriangle size={12} aria-hidden /> : <Clock3 size={12} aria-hidden />}
              {overdue ? tr("Quá hạn", "Overdue") : tr("Hạn", "Due")} {date(r.handling.due)}
            </span>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--lime-dark)]"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? tr("Thu gọn", "Collapse") : tr("Chi tiết & xử lý", "Details & actions")}
            <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden />
          </button>
        </div>
      </div>

      {open && (
        <div id={detailId} className="grid gap-4 border-t border-[var(--line)] bg-[var(--paper)] p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-3 text-xs">
            <div>
              <h4 className="m-0 mb-1 text-[10px] font-extrabold tracking-wider text-[var(--muted)] uppercase">{tr("Khách mô tả", "Customer's description")}</h4>
              <p className="m-0 whitespace-pre-line leading-5">{r.description}</p>
            </div>
            <table className="sc-table">
              <tbody>
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}{(i.size || i.color) && <small className="block text-[var(--muted)]">{[i.size && `Size ${i.size}`, i.color].filter(Boolean).join(" · ")}</small>}</td>
                    <td className="whitespace-nowrap">× {i.quantity}</td>
                    <td className="whitespace-nowrap text-right">{vnd(i.price * i.quantity)}</td>
                  </tr>
                ))}
                {r.type === "return" && (
                  <tr>
                    <td colSpan={2}><b>{tr("Giá trị hoàn (theo giá sản phẩm)", "Refund value (item price)")}</b></td>
                    <td className="whitespace-nowrap text-right"><b>{vnd(r.refund)}</b></td>
                  </tr>
                )}
              </tbody>
            </table>
            {r.sellerNote && (
              <p className={`m-0 border-l-2 pl-2 ${r.status === "rejected" ? "border-[var(--sale)]" : "border-[var(--line)]"}`}>
                <b>{r.status === "rejected" ? tr("Lý do từ chối", "Rejection reason") : tr("Ghi chú của shop", "Shop note")}:</b> {r.sellerNote}
              </p>
            )}
            <div>
              <h4 className="m-0 mb-1 text-[10px] font-extrabold tracking-wider text-[var(--muted)] uppercase">{tr("Lịch sử", "History")}</h4>
              <ol className="m-0 grid list-none gap-1 p-0">
                {r.history.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-[120px] shrink-0 text-[var(--muted)]">{date(h.at, true)}</span>
                    <span>{tr(RETURN_STATUS_LABELS[h.status]?.vi ?? h.status, RETURN_STATUS_LABELS[h.status]?.en)}{h.note ? ` · ${h.note}` : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <ReturnControls request={r} />
        </div>
      )}
    </li>
  )
}

function ReturnControls({ request: r }: { request: ReturnView }) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const [step, setStep] = useState<ReturnStatus | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const noteId = useId()
  const steps = RETURN_SELLER_TRANSITIONS[r.status] ?? []
  const label = (s: ReturnStatus) => (s === "completed" ? completeLabel(r.type) : STEP_LABEL[s]!)

  if (!steps.length) {
    return (
      <aside className="grid content-start gap-2 border border-[var(--line)] bg-[var(--white)] p-3 text-xs">
        <b>{tr("Không còn bước cần xử lý", "Nothing left to do")}</b>
        <p className="m-0 text-[var(--muted)]">
          {r.status === "cancelled" ? tr("Khách đã hủy yêu cầu này.", "The customer withdrew this request.") : tr("Yêu cầu đã đóng.", "This request is closed.")}
        </p>
      </aside>
    )
  }

  const submit = () => {
    if (!step) return
    const trimmed = note.trim()
    if (step === "rejected" && trimmed.length < 5) {
      setError(tr("Nhập lý do từ chối (ít nhất 5 ký tự).", "Enter a rejection reason (at least 5 characters)."))
      return
    }
    setError("")
    start(async () => {
      const result = await updateReturnRequestAction(r.id, { status: step, sellerNote: trimmed || undefined })
      if (!result.ok) {
        setError(result.error)
        return
      }
      notify(result.message)
      setStep(null)
      setNote("")
      router.refresh()
    })
  }

  return (
    <aside className="grid content-start gap-2 border border-[var(--line)] bg-[var(--white)] p-3 text-xs" aria-label={tr("Xử lý yêu cầu", "Handle request")}>
      <b className="flex items-center gap-1.5"><RotateCcw size={14} aria-hidden /> {tr("Bước tiếp theo", "Next step")}</b>
      {r.status === "approved" && (
        <p className="m-0 text-[var(--muted)]">{tr("Đang chờ khách gửi hàng về. Bấm khi shop đã nhận được sản phẩm.", "Waiting for the customer to send the item. Confirm once it arrives.")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            aria-pressed={step === s}
            className={`boai-button ${s === "rejected" ? "" : "primary"} ${step === s ? "ring-2 ring-[var(--lime-dark)] ring-offset-1" : ""}`}
            onClick={() => {
              setStep(s)
              setError("")
            }}
          >
            {tr(label(s).vi, label(s).en)}
          </button>
        ))}
      </div>
      {step && (
        <div className="grid gap-2">
          <p className="m-0 text-[var(--muted)]">{tr(label(step).hint.vi, label(step).hint.en)}</p>
          <label htmlFor={noteId} className="font-bold">
            {step === "rejected" ? tr("Lý do từ chối *", "Rejection reason *") : tr("Ghi chú cho khách (không bắt buộc)", "Note for the customer (optional)")}
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={500}
            rows={3}
            required={step === "rejected"}
            aria-invalid={!!error || undefined}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              step === "rejected"
                ? tr("Ví dụ: Sản phẩm đã qua sử dụng, không còn tem mác.", "E.g. The item has been used and the tags are removed.")
                : step === "approved"
                  ? tr("Ví dụ: địa chỉ nhận hàng trả, đơn vị vận chuyển nên dùng…", "E.g. return address, preferred carrier…")
                  : ""
            }
            className="w-full border border-[var(--line)] bg-[var(--white)] p-2 text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <small className="text-[var(--muted)]">{note.length}/500</small>
            <div className="flex gap-2">
              <button type="button" className="boai-button" disabled={pending} onClick={() => setStep(null)}>{tr("Hủy", "Cancel")}</button>
              <button type="button" className="boai-button primary" disabled={pending} onClick={submit}>
                {pending ? tr("Đang lưu…", "Saving…") : tr("Xác nhận", "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p role="alert" className="m-0 font-semibold text-[var(--sale)]">{error}</p>}
    </aside>
  )
}
