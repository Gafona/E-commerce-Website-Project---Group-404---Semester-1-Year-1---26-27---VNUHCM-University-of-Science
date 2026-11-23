"use client"

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  Ban,
  Check,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareOff,
  LockOpen,
  Power,
  ShieldAlert,
  ShieldX,
  Trash2,
  UserCog,
  X,
} from "lucide-react"
import {
  deleteAnnouncementAction,
  deleteCommentAction,
  deleteProductCommentAdminAction,
  deleteReviewAdminAction,
  deleteMemberAction,
  deletePostAction,
  reviewRegistrationAction,
  reinstateSellerAction,
  rejectAppealAction,
  reviewSellerAction,
  setPostVisibilityAction,
  suspendSellerAction,
  toggleAnnouncementAction,
  updateModerationAction,
  type AdminResult,
} from "./actions"
import { useShop } from "../components/ShopProvider"

export const btn = {
  base: "inline-flex min-h-8 items-center justify-center gap-1.5 px-3 text-[11px] font-bold transition disabled:cursor-wait disabled:opacity-60",
  approve: "bg-[#1d7a38] text-white hover:bg-[#15602b]",
  danger: "bg-[#a42626] text-white hover:bg-[#861d1d]",
  ghost: "border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#071a33]",
  dark: "bg-[#071a33] text-white hover:bg-black",
}

/** Runs a server action, shows its result, then refreshes server data on success. */
export function useAdminAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<AdminResult | null>(null)
  const run = (action: () => Promise<AdminResult>, onSuccess?: () => void) =>
    start(async () => {
      const res = await action().catch(() => ({ ok: false, error: "Mất kết nối. Vui lòng thử lại." }))
      setResult(res)
      if (res.ok) {
        onSuccess?.()
        router.refresh()
      }
    })
  return { pending, result, run, clear: () => setResult(null) }
}

export function Feedback({ result }: { result: AdminResult | null }) {
  if (!result) return null
  return (
    <p role="status" className={`m-0 text-[11px] font-semibold ${result.ok ? "text-[#1d7a38]" : "text-[#a42626]"}`}>
      {result.ok ? result.message : result.error}
    </p>
  )
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Callers pass inline onClose handlers, so keep the latest one in a ref and
  // run focus/Escape setup only on mount; otherwise every keystroke re-focuses.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const root = ref.current
    ;(root?.querySelector<HTMLElement>("textarea, input, select") ?? root?.querySelector<HTMLElement>("button"))?.focus()
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onCloseRef.current()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])
  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[#030b17]/60 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-[460px] border border-[var(--line)] bg-[var(--white)] p-6 text-left shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="m-0 font-[family-name:var(--display)] text-2xl leading-none font-black uppercase">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-8 place-items-center text-[var(--muted)] hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputClass = "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-[12px] text-[var(--ink)] outline-none focus:border-[#1677ff]"

// ---------- Seller & event review ----------

export function ReviewControls({ kind, id, status }: { kind: "seller" | "registration"; id: string; status: string }) {
  const { pending, result, run } = useAdminAction()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")
  const action = kind === "seller" ? reviewSellerAction : reviewRegistrationAction
  const rejectLabel = status === "approved" ? "Thu hồi" : "Từ chối"
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {status !== "approved" && (
          <button type="button" disabled={pending} className={`${btn.base} ${btn.approve}`} onClick={() => run(() => action(id, "approved", ""))}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Duyệt
          </button>
        )}
        {status !== "rejected" && (
          <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost}`} onClick={() => setRejecting(true)}>
            <X size={13} /> {rejectLabel}
          </button>
        )}
      </div>
      <Feedback result={result} />
      {rejecting && (
        <Dialog title={kind === "seller" ? `${rejectLabel} người bán` : `${rejectLabel} đăng ký sự kiện`} onClose={() => setRejecting(false)}>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Lý do (người đăng ký sẽ thấy)
            <textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder={kind === "seller" ? "Ví dụ: Thiếu giấy phép kinh doanh…" : "Ví dụ: Sản phẩm chưa phù hợp chủ đề sự kiện…"} />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button
              type="button"
              disabled={pending}
              className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`}
              onClick={() => run(() => action(id, "rejected", note), () => setRejecting(false))}
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Xác nhận {rejectLabel.toLowerCase()}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

/** Approve or reject one product of a shop's event offer (rejection needs a reason the shop will see). */
export function SaleItemReview({ registrationId, itemId, status, productName }: { registrationId: string; itemId: string; status: string; productName: string }) {
  const { tr } = useShop()
  const { pending, result, run } = useAdminAction()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")
  if (status === "withdrawn") return null
  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        {status !== "approved" && (
          <button type="button" disabled={pending} className={`${btn.base} ${btn.approve} min-h-7 px-2`} onClick={() => run(() => reviewRegistrationAction(registrationId, "approved", "", itemId))}>
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {tr("Duyệt", "Approve")}
          </button>
        )}
        {status !== "rejected" && (
          <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost} min-h-7 px-2`} onClick={() => setRejecting(true)}>
            <X size={12} /> {status === "approved" ? tr("Thu hồi", "Revoke") : tr("Từ chối", "Reject")}
          </button>
        )}
      </div>
      <Feedback result={result} />
      {rejecting && (
        <Dialog title={tr(`Từ chối: ${productName}`, `Reject: ${productName}`)} onClose={() => setRejecting(false)}>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {tr("Lý do (shop sẽ thấy)", "Reason (the shop will see it)")}
            <textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder={tr("Ví dụ: Mức giảm chưa hợp lý so với giá thị trường…", "E.g. The discount doesn't look right against the market price…")} />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`} onClick={() => run(() => reviewRegistrationAction(registrationId, "rejected", note, itemId), () => setRejecting(false))}>
              {pending && <Loader2 size={13} className="animate-spin" />} {tr("Xác nhận từ chối", "Confirm rejection")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

/** Decide every waiting product of a registration at once. */
export function SaleBulkReview({ registrationId, pendingCount, liveCount }: { registrationId: string; pendingCount: number; liveCount: number }) {
  const { tr } = useShop()
  const { pending, result, run } = useAdminAction()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState("")
  if (!pendingCount && !liveCount) return null
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {pendingCount > 0 && (
          <button type="button" disabled={pending} className={`${btn.base} ${btn.approve}`} onClick={() => run(() => reviewRegistrationAction(registrationId, "approved", ""))}>
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {tr(`Duyệt ${pendingCount} sản phẩm chờ`, `Approve ${pendingCount} waiting`)}
          </button>
        )}
        <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost}`} onClick={() => setRejecting(true)}>
          <X size={13} /> {tr("Từ chối tất cả", "Reject all")}
        </button>
      </div>
      <Feedback result={result} />
      {rejecting && (
        <Dialog title={tr("Từ chối toàn bộ đăng ký", "Reject the whole registration")} onClose={() => setRejecting(false)}>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {tr("Lý do (shop sẽ thấy)", "Reason (the shop will see it)")}
            <textarea rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder={tr("Ví dụ: Sản phẩm chưa phù hợp chủ đề sự kiện…", "E.g. These products don't fit the event theme…")} />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`} onClick={() => run(() => reviewRegistrationAction(registrationId, "rejected", note), () => setRejecting(false))}>
              {pending && <Loader2 size={13} className="animate-spin" />} {tr("Xác nhận từ chối", "Confirm rejection")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ---------- Shop bans ----------

/** Lock an active shop, or resolve a suspended shop's appeal. */
export function ShopBanControls({ id, shop, status, appealPending }: { id: string; shop: string; status: string; appealPending: boolean }) {
  const { pending, result, run, clear } = useAdminAction()
  const [mode, setMode] = useState<"suspend" | "reject" | null>(null)
  const [note, setNote] = useState("")
  const open = (next: "suspend" | "reject") => {
    clear()
    setNote("")
    setMode(next)
  }
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "approved" && (
          <button type="button" className={`${btn.base} ${btn.danger}`} onClick={() => open("suspend")}>
            <ShieldX size={13} /> Khóa cửa hàng
          </button>
        )}
        {status === "suspended" && (
          <>
            <button
              type="button"
              disabled={pending}
              className={`${btn.base} ${btn.approve}`}
              onClick={() => window.confirm(`Mở khóa cửa hàng “${shop}”? Sản phẩm sẽ hiển thị lại ngay.`) && run(() => reinstateSellerAction(id))}
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <LockOpen size={13} />} Mở khóa
            </button>
            {appealPending && (
              <button type="button" className={`${btn.base} ${btn.ghost}`} onClick={() => open("reject")}>
                <X size={13} /> Từ chối kháng cáo
              </button>
            )}
          </>
        )}
      </div>
      {!mode && <Feedback result={result} />}
      {mode && (
        <Dialog title={mode === "suspend" ? `Khóa ${shop}` : "Từ chối kháng cáo"} onClose={() => setMode(null)}>
          {mode === "suspend" && (
            <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">
              Toàn bộ sản phẩm của shop sẽ bị ẩn và người bán chỉ còn thấy lý do khóa cùng biểu mẫu kháng cáo. Người bán nhận thông báo ngay.
            </p>
          )}
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {mode === "suspend" ? "Lý do khóa (người bán sẽ thấy)" : "Phản hồi cho người bán"}
            <textarea
              rows={4}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder={mode === "suspend" ? "Ví dụ: Bán hàng giả mạo thương hiệu, nhiều khiếu nại chưa xử lý…" : "Ví dụ: Bằng chứng chưa đủ để chứng minh nguồn gốc sản phẩm…"}
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button
              type="button"
              disabled={pending}
              className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`}
              onClick={() => run(() => (mode === "suspend" ? suspendSellerAction(id, note) : rejectAppealAction(id, note)), () => setMode(null))}
            >
              {pending && <Loader2 size={13} className="animate-spin" />} {mode === "suspend" ? "Xác nhận khóa" : "Gửi phản hồi"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ---------- Community ----------

/** Moderation with an optional reason that is sent to the author. */
function ReasonDialog({ title, hint, confirm, pending, result, onClose, onConfirm }: { title: string; hint: string; confirm: string; pending: boolean; result: AdminResult | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("")
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">{hint}</p>
      <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        Lý do gửi tới tác giả (không bắt buộc)
        <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Ví dụ: Spam liên kết bán hàng" />
      </label>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Feedback result={result} />
        <button type="button" disabled={pending} className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5`} onClick={() => onConfirm(reason)}>
          {pending && <Loader2 size={13} className="animate-spin" />} {confirm}
        </button>
      </div>
    </Dialog>
  )
}

export function PostControls({ id, visibility }: { id: string; visibility: string }) {
  const { pending, result, run, clear } = useAdminAction()
  const [mode, setMode] = useState<"hide" | "delete" | null>(null)
  const hidden = visibility === "hidden"
  const open = (next: "hide" | "delete") => {
    clear()
    setMode(next)
  }
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {visibility !== "removed" &&
          (hidden ? (
            <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost}`} onClick={() => run(() => setPostVisibilityAction(id, "visible"))}>
              <Eye size={13} /> Hiện lại
            </button>
          ) : (
            <button type="button" disabled={pending} className={`${btn.base} ${btn.ghost}`} onClick={() => open("hide")}>
              <EyeOff size={13} /> Ẩn bài
            </button>
          ))}
        <button type="button" disabled={pending} className={`${btn.base} ${btn.danger}`} onClick={() => open("delete")}>
          <Trash2 size={13} /> Xóa
        </button>
      </div>
      {!mode && <Feedback result={result} />}
      {mode && (
        <ReasonDialog
          title={mode === "hide" ? "Ẩn bài viết" : "Xóa bài viết"}
          hint={mode === "hide" ? "Bài viết sẽ không còn công khai. Tác giả nhận được thông báo kèm lý do." : "Xóa vĩnh viễn bài viết cùng toàn bộ bình luận và lượt thích. Tác giả nhận được thông báo kèm lý do."}
          confirm={mode === "hide" ? "Ẩn bài" : "Xóa vĩnh viễn"}
          pending={pending}
          result={result}
          onClose={() => setMode(null)}
          onConfirm={(reason) => run(() => (mode === "hide" ? setPostVisibilityAction(id, "hidden", reason) : deletePostAction(id, reason)), () => setMode(null))}
        />
      )}
    </div>
  )
}

export function CommentControls({ id }: { id: string }) {
  const { pending, result, run, clear } = useAdminAction()
  const [open, setOpen] = useState(false)
  return (
    <div className="grid justify-items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        className={`${btn.base} ${btn.danger}`}
        onClick={() => {
          clear()
          setOpen(true)
        }}
      >
        <Trash2 size={13} /> Xóa
      </button>
      {!open && <Feedback result={result} />}
      {open && (
        <ReasonDialog
          title="Xóa bình luận"
          hint="Bình luận và các trả lời của nó sẽ bị xóa. Tác giả nhận được thông báo kèm lý do."
          confirm="Xóa bình luận"
          pending={pending}
          result={result}
          onClose={() => setOpen(false)}
          onConfirm={(reason) => run(() => deleteCommentAction(id, reason), () => setOpen(false))}
        />
      )}
    </div>
  )
}

// ---------- Members ----------

type Moderation = { postingBanned: boolean; chatBanned: boolean; suspended: boolean; reason: string }

export function MemberControls({ id, name, email, moderation, locked }: { id: string; name: string; email: string; moderation: Moderation; locked: boolean }) {
  const { pending, result, run, clear } = useAdminAction()
  const [mode, setMode] = useState<"moderate" | "delete" | null>(null)
  const [draft, setDraft] = useState<Moderation>(moderation)
  const [confirmEmail, setConfirmEmail] = useState("")
  const open = (next: "moderate" | "delete") => {
    clear()
    setDraft(moderation)
    setConfirmEmail("")
    setMode(next)
  }
  if (locked) return <span className="text-[11px] text-[var(--muted)]">Được bảo vệ</span>

  const toggles: { key: keyof Omit<Moderation, "reason">; label: string; hint: string; Icon: typeof Ban }[] = [
    { key: "postingBanned", label: "Cấm đăng bài & bình luận", hint: "Không thể đăng bài, story hoặc bình luận trong cộng đồng.", Icon: Ban },
    { key: "chatBanned", label: "Cấm nhắn tin", hint: "Không thể bắt đầu cuộc trò chuyện hay gửi tin nhắn.", Icon: MessageSquareOff },
    { key: "suspended", label: "Khóa tài khoản", hint: "Đăng xuất ngay lập tức và không thể đăng nhập lại.", Icon: ShieldAlert },
  ]

  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button type="button" className={`${btn.base} ${btn.ghost}`} onClick={() => open("moderate")}>
          <UserCog size={13} /> Hạn chế
        </button>
        <button type="button" className={`${btn.base} ${btn.danger}`} onClick={() => open("delete")}>
          <Trash2 size={13} /> Xóa
        </button>
      </div>
      {!mode && <Feedback result={result} />}

      {mode === "moderate" && (
        <Dialog title={`Hạn chế ${name}`} onClose={() => setMode(null)}>
          <div className="grid gap-2">
            {toggles.map(({ key, label, hint, Icon }) => (
              <label key={key} className={`flex cursor-pointer items-start gap-3 border p-3 transition ${draft[key] ? "border-[#a42626] bg-[#fdf1f1]" : "border-[var(--line)]"}`}>
                <input type="checkbox" className="mt-0.5 size-4 accent-[#a42626]" checked={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
                <Icon size={16} className={draft[key] ? "text-[#a42626]" : "text-[var(--muted)]"} />
                <span className="grid gap-0.5">
                  <b className="text-[12px]">{label}</b>
                  <small className="text-[11px] text-[var(--muted)]">{hint}</small>
                </span>
              </label>
            ))}
            <label className="mt-2 grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
              Lý do
              <textarea rows={3} maxLength={500} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} className={inputClass} placeholder="Ví dụ: Spam liên kết bán hàng nhiều lần" />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button type="button" disabled={pending} className={`${btn.base} ${btn.dark} ml-auto min-h-10 px-5`} onClick={() => run(() => updateModerationAction(id, draft), () => setMode(null))}>
              {pending && <Loader2 size={13} className="animate-spin" />} Lưu thay đổi
            </button>
          </div>
        </Dialog>
      )}

      {mode === "delete" && (
        <Dialog title="Xóa tài khoản" onClose={() => setMode(null)}>
          <p className="mt-0 text-[12px] leading-5 text-[var(--muted)]">
            Thao tác này <b className="text-[#a42626]">không thể hoàn tác</b>. Hồ sơ cộng đồng, bài viết, bình luận, tin nhắn, story, sản phẩm và sự kiện của <b className="text-[var(--ink)]">{name}</b> sẽ bị xóa. Đơn hàng cũ vẫn được giữ lại.
          </p>
          <label className="grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Nhập <span className="normal-case text-[var(--ink)]">{email}</span> để xác nhận
            <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className={inputClass} autoComplete="off" />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Feedback result={result} />
            <button
              type="button"
              disabled={pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
              className={`${btn.base} ${btn.danger} ml-auto min-h-10 px-5 disabled:cursor-not-allowed`}
              onClick={() => run(() => deleteMemberAction(id, confirmEmail), () => setMode(null))}
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Xóa vĩnh viễn
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ---------- Announcements ----------

export function AnnouncementRowControls({ id, active, title }: { id: string; active: boolean; title: string }) {
  const { pending, result, run } = useAdminAction()
  return (
    <div className="grid justify-items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button type="button" disabled={pending} className={`${btn.base} ${active ? btn.ghost : btn.approve}`} onClick={() => run(() => toggleAnnouncementAction(id, !active))}>
          <Power size={13} /> {active ? "Tắt" : "Bật"}
        </button>
        <button
          type="button"
          disabled={pending}
          className={`${btn.base} ${btn.danger}`}
          onClick={() => window.confirm(`Xóa thông báo “${title}”?`) && run(() => deleteAnnouncementAction(id))}
        >
          <Trash2 size={13} /> Xóa
        </button>
      </div>
      <Feedback result={result} />
    </div>
  )
}

// ---------- Reviews & product comments ----------

export function ProductFeedbackControls({ kind, id }: { kind: "review" | "comment"; id: string }) {
  const { pending, result, run } = useAdminAction()
  const ask = kind === "review" ? "Xóa đánh giá này? Điểm trung bình của sản phẩm sẽ được tính lại." : "Xóa bình luận này cùng các trả lời của nó?"
  return (
    <div className="grid justify-items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        className={`${btn.base} ${btn.danger}`}
        onClick={() =>
          window.confirm(ask) &&
          run(() => (kind === "review" ? deleteReviewAdminAction(id) : deleteProductCommentAdminAction(id)))
        }
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Xóa
      </button>
      <Feedback result={result} />
    </div>
  )
}
