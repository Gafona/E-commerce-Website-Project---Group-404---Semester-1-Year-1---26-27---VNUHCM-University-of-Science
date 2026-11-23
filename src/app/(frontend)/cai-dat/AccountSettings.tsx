"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Bell, KeyRound, Trash2 } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { updateNotificationPrefsAction } from "../notification-actions"
import { changePasswordAction, deleteAccountAction } from "./account-actions"
import { leaveAccount } from "@/lib/browser-state"
import type { NotificationPrefs } from "@/lib/notification-view"
import { passwordIssue } from "@/lib/password-policy"

const PREFS: { key: keyof NotificationPrefs; vi: [string, string]; en: [string, string] }[] = [
  { key: "following", vi: ["Theo dõi", "Sản phẩm, bài viết và sự kiện mới của shop, người bạn theo dõi."], en: ["Following", "New products, posts and events from shops and people you follow."] },
  { key: "community", vi: ["Cộng đồng", "Bình luận, trả lời, lượt theo dõi, lời mời kết bạn."], en: ["Community", "Comments, replies, followers, friend requests."] },
  { key: "orders", vi: ["Đơn hàng", "Xác nhận, phí ship, giao hàng, đổi trả, thanh toán."], en: ["Orders", "Confirmation, shipping fee, delivery, returns, payment."] },
  { key: "messages", vi: ["Tin nhắn", "Thông báo nổi và thông báo trình duyệt khi có tin nhắn mới."], en: ["Messages", "Pop-ups and browser alerts for new messages."] },
  { key: "promotions", vi: ["Khuyến mãi", "Sự kiện Sale và khuyến mãi của BOAI."], en: ["Promotions", "BOAI sale events and offers."] },
]

export function NotificationPrefsCard({ initial }: { initial: NotificationPrefs }) {
  const { tr, notify, lang } = useShop()
  const [prefs, setPrefs] = useState(initial)
  const [pending, start] = useTransition()
  const toggle = (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    start(async () => {
      const result = await updateNotificationPrefsAction({ [key]: next[key] })
      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        setPrefs(prefs)
        notify(tr("Không thể lưu tùy chọn.", "Couldn't save the setting."))
        return
      }
      notify(tr("Đã lưu tùy chọn thông báo.", "Notification settings saved."))
    })
  }
  return (
    <section className="form-card settings-card" id="thong-bao">
      <div className="settings-head">
        <span><Bell size={20} /></span>
        <div>
          <h3>{tr("Thông báo", "Notifications")}</h3>
          <p className="hint">{tr("Chọn loại thông báo bạn muốn nhận. Thông báo quan trọng về tài khoản luôn được gửi.", "Choose what you want to hear about. Important account notices are always sent.")}</p>
        </div>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {PREFS.map((p) => {
          const [label, hint] = lang === "en" ? p.en : p.vi
          return (
            <li key={p.key} className="flex items-center justify-between gap-4 border border-[var(--line)] bg-[var(--white)] px-4 py-3">
              <span className="min-w-0">
                <b className="block text-sm">{label}</b>
                <small className="text-[var(--muted)]">{hint}</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[p.key]}
                aria-label={label}
                disabled={pending}
                onClick={() => toggle(p.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[p.key] ? "bg-[var(--lime-dark)]" : "bg-[var(--line)]"}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${prefs[p.key] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ChangePasswordCard({ email }: { email: string }) {
  const { tr, notify } = useShop()
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [pending, start] = useTransition()
  const field = "h-10 w-full border border-[var(--line)] bg-[var(--white)] px-3 text-sm"
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setDone("")
    const issue = passwordIssue(form.next)
    if (issue) return setError(tr(...issue))
    if (form.next !== form.confirm) return setError(tr("Mật khẩu xác nhận không khớp.", "Passwords do not match."))
    start(async () => {
      const result = await changePasswordAction(form)
      if (!result.ok) return setError(result.error)
      notify(result.message)
      setDone(result.message)
      setForm({ current: "", next: "", confirm: "" })
    })
  }
  return (
    <section className="form-card settings-card" id="mat-khau">
      <div className="settings-head">
        <span><KeyRound size={20} /></span>
        <div>
          <h3>{tr("Đổi mật khẩu", "Change password")}</h3>
          <p className="hint">
            {tr(
              "Cần mật khẩu hiện tại. Mật khẩu mới từ 8 ký tự, gồm cả chữ cái và chữ số. Các thiết bị khác sẽ được đăng xuất.",
              "Requires your current password. New password: 8+ characters with letters and numbers. Other devices will be signed out.",
            )}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        {([
          ["current", tr("Mật khẩu hiện tại", "Current password"), "current-password"],
          ["next", tr("Mật khẩu mới", "New password"), "new-password"],
          ["confirm", tr("Nhập lại mật khẩu mới", "Confirm new password"), "new-password"],
        ] as const).map(([key, label, autoComplete]) => (
          <label key={key} className="grid gap-1 text-xs font-bold">
            {label}
            <input
              className={field}
              type="password"
              required
              minLength={key === "current" ? 1 : 8}
              maxLength={128}
              autoComplete={autoComplete}
              value={form[key]}
              onChange={(e) => {
                setForm({ ...form, [key]: e.target.value })
                setError("")
              }}
            />
          </label>
        ))}
        {error && <p role="alert" className="m-0 text-xs font-semibold text-[var(--sale)] sm:col-span-3">{error}</p>}
        {done && !error && <p role="status" className="m-0 text-xs font-semibold text-[#0a8a4a] sm:col-span-3">{done}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-3">
          <button type="submit" className="boai-button primary" disabled={pending}>
            {pending ? tr("Đang lưu…", "Saving…") : tr("Đổi mật khẩu", "Change password")}
          </button>
          <Link
            href={`/quen-mat-khau?email=${encodeURIComponent(email)}`}
            className="text-xs font-bold text-[var(--lime-dark)] hover:underline"
          >
            {tr("Quên mật khẩu hiện tại?", "Forgot your current password?")}
          </Link>
        </div>
      </form>
    </section>
  )
}

export function DeleteAccountCard({ isSeller }: { isSeller: boolean }) {
  const { tr } = useShop()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [understood, setUnderstood] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const field = "h-10 w-full border border-[var(--line)] bg-[var(--white)] px-3 text-sm"
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    start(async () => {
      const result = await deleteAccountAction({ password, confirmText })
      if (!result.ok) return setError(result.error)
      leaveAccount("/")
    })
  }
  return (
    <section className="form-card settings-card border-[var(--sale)]!" id="xoa-tai-khoan">
      <div className="settings-head">
        <span className="text-[var(--sale)]!"><Trash2 size={20} /></span>
        <div>
          <h3>{tr("Xóa tài khoản", "Delete account")}</h3>
          <p className="hint">{tr("Xóa vĩnh viễn, không thể khôi phục.", "Permanent and cannot be undone.")}</p>
        </div>
      </div>
      {step === 0 && (
        <button type="button" className="boai-button" onClick={() => setStep(1)}>
          {tr("Tôi muốn xóa tài khoản", "I want to delete my account")}
        </button>
      )}
      {step >= 1 && (
        <div className="grid gap-3 text-xs leading-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[var(--line)] bg-[var(--white)] p-3">
              <b className="block text-[var(--sale)]">{tr("Sẽ bị xóa", "Will be deleted")}</b>
              <ul className="m-0 mt-1 pl-4">
                <li>{tr("Tài khoản, hồ sơ, ảnh đại diện liên kết và thông báo", "Your account, profile and notifications")}</li>
                <li>{tr("Hồ sơ cộng đồng: bài viết, bình luận, lượt thích, story, tin nhắn bạn bè, theo dõi và kết bạn", "Community profile: posts, comments, likes, stories, friend messages, follows and friendships")}</li>
                <li>{tr("Đánh giá, câu hỏi sản phẩm, mẫu áo đã lưu", "Your reviews, product questions and saved jersey designs")}</li>
                <li>{tr("Kết quả SportDNA", "SportDNA results")}</li>
                {isSeller && <li>{tr("Shop: toàn bộ sản phẩm (cùng đánh giá), đăng ký sự kiện và mã xác thực", "Shop: all products (with their reviews), event registrations and authenticity codes")}</li>}
              </ul>
            </div>
            <div className="border border-[var(--line)] bg-[var(--white)] p-3">
              <b className="block">{tr("Được giữ lại", "Kept")}</b>
              <ul className="m-0 mt-1 pl-4">
                <li>{tr("Đơn hàng đã đặt (chứng từ bán hàng của shop và BOAI), yêu cầu đổi trả và đặt may đã gửi", "Placed orders (sales records for shops and BOAI), submitted return and custom requests")}</li>
                <li>{tr("Tin nhắn với shop về đơn hàng", "Order messages with shops")}</li>
              </ul>
              <p className="m-0 mt-2 text-[var(--muted)]">{tr("Bạn cần hoàn tất hoặc hủy các đơn đang xử lý trước khi xóa.", "Finish or cancel open orders before deleting.")}</p>
            </div>
          </div>
          {step === 1 && (
            <>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-1" />
                <span>{tr("Tôi hiểu dữ liệu trên sẽ bị xóa vĩnh viễn.", "I understand this data will be permanently deleted.")}</span>
              </label>
              <div className="flex gap-2">
                <button type="button" className="boai-button" onClick={() => setStep(0)}>{tr("Hủy", "Cancel")}</button>
                <button type="button" className="boai-button primary" disabled={!understood} onClick={() => setStep(2)}>{tr("Tiếp tục", "Continue")}</button>
              </div>
            </>
          )}
          {step === 2 && (
            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 font-bold">
                {tr("Mật khẩu", "Password")}
                <input className={field} type="password" required maxLength={128} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <label className="grid gap-1 font-bold">
                {tr("Gõ XOA để xác nhận", "Type DELETE to confirm")}
                <input className={field} required value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
              </label>
              {error && <p role="alert" className="m-0 font-semibold text-[var(--sale)] sm:col-span-2">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="button" className="boai-button" onClick={() => { setStep(0); setUnderstood(false) }}>{tr("Hủy", "Cancel")}</button>
                <button type="submit" className="boai-button bg-[var(--sale)]! text-white!" disabled={pending}>
                  {pending ? tr("Đang xóa…", "Deleting…") : tr("Xóa vĩnh viễn tài khoản", "Delete my account permanently")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
