"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2, PackageX, RotateCcw, X } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { cancelReturnRequestAction, createReturnRequestAction } from "../return-actions"
import {
  RETURN_REASONS,
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_TYPE_LABELS,
  RETURN_TYPES,
  type ReturnReason,
  type ReturnStatus,
  type ReturnType,
} from "@/lib/returns"

export type ReturnLine = { lineId: string; name: string; size: string | null; color: string | null; quantity: number; available: number }
export type ReturnView = {
  id: string
  code: string
  status: ReturnStatus
  type: ReturnType
  reason: ReturnReason
  shopName: string
  sellerNote: string | null
  createdAt: string
  items: { name: string; quantity: number; size: string | null }[]
  photos: string[]
}

const TONE: Record<string, string> = {
  pending: "border-amber-300 text-amber-800 dark:text-amber-200",
  confirmed: "border-[var(--lime)] text-[var(--lime-dark)]",
  shipping: "border-violet-300 text-violet-700 dark:text-violet-200",
  delivered: "border-emerald-300 text-emerald-700 dark:text-emerald-200",
  cancelled: "border-[var(--line)] text-[var(--muted)]",
}

/**
 * Returns and exchanges for one delivered order: existing requests with their
 * status, and (within 30 days) a form to choose items, reason and photos.
 */
export function ReturnPanel({
  orderId,
  lines,
  requests,
  deadline,
  canRequest,
  signedIn,
}: {
  orderId: string
  lines: ReturnLine[]
  requests: ReturnView[]
  /** ISO date the return window closes. */
  deadline: string | null
  canRequest: boolean
  signedIn: boolean
}) {
  const { tr, lang, notify } = useShop()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [type, setType] = useState<ReturnType>("return")
  const [reason, setReason] = useState<ReturnReason | "">("")
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const locale = lang === "en" ? "en-GB" : "vi-VN"
  const selectable = lines.filter((l) => l.available > 0)

  const submit = () => {
    setError("")
    const items = Object.entries(picked).filter(([, q]) => q > 0).map(([lineId, quantity]) => ({ lineId, quantity }))
    if (!items.length) return setError(tr("Hãy chọn sản phẩm cần đổi trả.", "Choose the items to return."))
    if (!reason) return setError(tr("Hãy chọn lý do.", "Choose a reason."))
    if (description.trim().length < 10) return setError(tr("Mô tả tình trạng cần ít nhất 10 ký tự.", "Describe the issue in at least 10 characters."))
    const form = new FormData()
    form.set("order", orderId)
    form.set("items", JSON.stringify(items))
    form.set("type", type)
    form.set("reason", reason)
    form.set("description", description)
    for (const file of photos) form.append("photos", file)
    start(async () => {
      const result = await createReturnRequestAction(form).catch(() => ({ ok: false as const, error: tr("Mất kết nối.", "Connection lost.") }))
      if (!result.ok) return setError(result.error)
      notify(result.message)
      setOpen(false)
      setPicked({})
      setReason("")
      setDescription("")
      setPhotos([])
      router.refresh()
    })
  }

  const cancel = (id: string) =>
    start(async () => {
      const result = await cancelReturnRequestAction(id).catch(() => ({ ok: false as const, error: tr("Mất kết nối.", "Connection lost.") }))
      notify(result.ok ? result.message : result.error)
      if (result.ok) router.refresh()
    })

  return (
    <section className="mt-5 border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b className="flex items-center gap-2 text-sm"><RotateCcw size={15} className="text-[var(--lime-dark)]" /> {tr("Đổi trả", "Returns")}</b>
          {deadline && (
            <small className="text-[11px] text-[var(--muted)]">
              {canRequest
                ? tr(`Hạn gửi yêu cầu: ${new Date(deadline).toLocaleDateString(locale, { timeZone: "Asia/Ho_Chi_Minh" })}`, `Request by ${new Date(deadline).toLocaleDateString(locale, { timeZone: "Asia/Ho_Chi_Minh" })}`)
                : tr("Đã quá hạn 30 ngày đổi trả.", "The 30-day return window has closed.")}
            </small>
          )}
        </div>
        {canRequest && selectable.length > 0 && !open && (
          signedIn ? (
            <button type="button" className="boai-button" onClick={() => setOpen(true)}>
              <RotateCcw size={15} /> {tr("Yêu cầu đổi trả", "Request a return")}
            </button>
          ) : (
            <a className="boai-button" href="/dang-nhap?next=%2Fdon-hang">{tr("Đăng nhập để yêu cầu đổi trả", "Sign in to request a return")}</a>
          )
        )}
      </div>

      {requests.length > 0 && (
        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {requests.map((r) => {
            const status = RETURN_STATUS_LABELS[r.status]
            return (
              <li key={r.id} className="border border-[var(--line)] bg-[var(--white)] p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <b>#{r.code}</b>
                  <span className={`border px-2 py-0.5 text-[10px] font-bold ${TONE[status.tone] ?? ""}`}>{tr(status.vi, status.en)}</span>
                  <span className="text-[var(--muted)]">
                    {r.shopName} · {tr(RETURN_TYPE_LABELS[r.type].vi, RETURN_TYPE_LABELS[r.type].en)} · {new Date(r.createdAt).toLocaleDateString(locale)}
                  </span>
                  {r.status === "requested" && (
                    <button type="button" className="ml-auto text-[11px] font-bold text-[var(--muted)] hover:text-[var(--sale)]" disabled={pending} onClick={() => cancel(r.id)}>
                      {tr("Hủy yêu cầu", "Cancel")}
                    </button>
                  )}
                </div>
                <p className="m-0 mt-1.5">
                  {r.items.map((i) => `${i.quantity} × ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ")} · {tr(RETURN_REASON_LABELS[r.reason].vi, RETURN_REASON_LABELS[r.reason].en)}
                </p>
                {r.sellerNote &&
                  (r.status === "rejected" ? (
                    <p className="m-0 mt-1.5 border-l-2 border-[var(--sale)] pl-2">
                      <b>{tr("Lý do shop từ chối", "Shop's reason for rejecting")}:</b> {r.sellerNote}
                    </p>
                  ) : (
                    <p className="m-0 mt-1 text-[var(--muted)]">{tr("Shop phản hồi", "Shop reply")}: {r.sellerNote}</p>
                  ))}
                {r.status === "approved" && (
                  <p className="m-0 mt-1 font-semibold text-[var(--lime-dark)]">
                    {tr("Đóng gói sản phẩm còn nguyên tem mác và gửi về shop. Nhắn tin với shop nếu cần địa chỉ nhận.", "Pack the item with its tags and send it back. Message the shop if you need the return address.")}
                  </p>
                )}
                {r.photos.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {r.photos.map((url) => (
                      <span key={url} className="relative block size-12 overflow-hidden border border-[var(--line)]">
                        <Image src={url} alt={tr("Ảnh minh chứng", "Evidence photo")} fill sizes="48px" className="object-cover" />
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <div className="mt-3 grid gap-3 border border-[var(--line)] bg-[var(--paper)] p-4">
          <div className="flex items-center justify-between">
            <b className="text-sm">{tr("Chọn sản phẩm cần đổi trả", "Choose items to return")}</b>
            <button type="button" onClick={() => setOpen(false)} aria-label={tr("Đóng", "Close")} className="p-1 text-[var(--muted)]"><X size={16} /></button>
          </div>
          <ul className="m-0 grid list-none gap-2 p-0">
            {selectable.map((line) => (
              <li key={line.lineId} className="flex flex-wrap items-center gap-3 bg-[var(--white)] p-2.5 text-xs">
                <label className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--lime)]"
                    checked={(picked[line.lineId] ?? 0) > 0}
                    onChange={(e) => setPicked((p) => ({ ...p, [line.lineId]: e.target.checked ? 1 : 0 }))}
                  />
                  <span className="min-w-0">
                    <b className="block truncate">{line.name}</b>
                    <small className="text-[var(--muted)]">{[line.color, line.size && `Size ${line.size}`].filter(Boolean).join(" · ")}</small>
                  </span>
                </label>
                {(picked[line.lineId] ?? 0) > 0 && line.available > 1 && (
                  <label className="flex items-center gap-1.5">
                    {tr("SL", "Qty")}
                    <select
                      value={picked[line.lineId]}
                      onChange={(e) => setPicked((p) => ({ ...p, [line.lineId]: Number(e.target.value) }))}
                      className="border border-[var(--line)] bg-[var(--white)] px-1.5 py-1"
                    >
                      {Array.from({ length: line.available }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                )}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] font-bold">
              {tr("Hình thức", "Type")}
              <select value={type} onChange={(e) => setType(e.target.value as ReturnType)} className="border border-[var(--line)] bg-[var(--white)] px-2.5 py-2 text-xs">
                {RETURN_TYPES.map((t) => <option key={t} value={t}>{tr(RETURN_TYPE_LABELS[t].vi, RETURN_TYPE_LABELS[t].en)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-bold">
              {tr("Lý do", "Reason")}
              <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} className="border border-[var(--line)] bg-[var(--white)] px-2.5 py-2 text-xs">
                <option value="">{tr("— Chọn lý do —", "— Choose —")}</option>
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{tr(RETURN_REASON_LABELS[r].vi, RETURN_REASON_LABELS[r].en)}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-[11px] font-bold">
            {tr("Mô tả tình trạng", "Describe the issue")}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              className="min-h-20 resize-y border border-[var(--line)] bg-[var(--white)] px-2.5 py-2 text-xs font-normal leading-5"
              placeholder={tr("VD: Giày size 41 bị chật, muốn đổi sang size 42.", "e.g. Size 41 is too tight, I'd like a 42.")}
            />
          </label>
          <div className="grid gap-1.5 text-[11px] font-bold">
            {tr("Ảnh minh chứng (tối đa 5 ảnh)", "Evidence photos (up to 5)")}
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((file, i) => (
                <span key={`${file.name}-${i}`} className="inline-flex items-center gap-1 border border-[var(--line)] bg-[var(--white)] px-2 py-1 text-[10px] font-normal">
                  {file.name.slice(0, 24)}
                  <button type="button" aria-label={tr("Bỏ ảnh", "Remove photo")} onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}><X size={11} /></button>
                </span>
              ))}
              {photos.length < 5 && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-[var(--line)] bg-[var(--white)] px-3 py-1.5 font-normal">
                  <ImagePlus size={14} /> {tr("Thêm ảnh", "Add photo")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = [...(e.target.files ?? [])].filter((f) => f.size <= 5 * 1024 * 1024)
                      setPhotos((list) => [...list, ...files].slice(0, 5))
                      e.target.value = ""
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          {error && <p className="form-error m-0 text-xs">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="boai-button primary" disabled={pending} onClick={submit}>
              {pending ? <Loader2 size={15} className="animate-spin" /> : <PackageX size={15} />} {tr("Gửi yêu cầu", "Send request")}
            </button>
            <button type="button" className="boai-button" onClick={() => setOpen(false)}>{tr("Hủy", "Cancel")}</button>
          </div>
        </div>
      )}
    </section>
  )
}
