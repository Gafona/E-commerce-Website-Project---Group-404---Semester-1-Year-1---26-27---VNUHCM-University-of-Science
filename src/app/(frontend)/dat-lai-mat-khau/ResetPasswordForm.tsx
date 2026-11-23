"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"
import { ArrowRight, Check, Circle, Eye, EyeOff, LockKeyhole, TimerOff } from "lucide-react"
import { resetPasswordAction } from "../password-actions"
import { useShop } from "../components/ShopProvider"
import { PASSWORD_MIN, passwordIssue, RESET_LINK_MINUTES } from "@/lib/password-policy"

export function ExpiredResetLink({ missing = false }: { missing?: boolean }) {
  const { tr } = useShop()
  return (
    <div className="auth-unavailable" role="alert">
      <span>
        <TimerOff size={24} />
      </span>
      <h3>{missing ? tr("Thiếu liên kết đặt lại", "Reset link missing") : tr("Liên kết đã hết hạn", "This link has expired")}</h3>
      <p>
        {missing
          ? tr(
              "Hãy mở liên kết trong email đặt lại mật khẩu, hoặc yêu cầu một liên kết mới.",
              "Open the link from your reset email, or request a new one.",
            )
          : tr(
              `Liên kết đặt lại mật khẩu chỉ có hiệu lực ${RESET_LINK_MINUTES} phút và dùng được một lần. Hãy gửi lại liên kết mới để tiếp tục.`,
              `Reset links work for ${RESET_LINK_MINUTES} minutes and only once. Request a new link to continue.`,
            )}
      </p>
      <Link href="/quen-mat-khau" className="boai-button primary">
        {tr("Gửi lại liên kết", "Send a new link")} <ArrowRight size={16} />
      </Link>
    </div>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { tr } = useShop()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState("")
  const [expired, setExpired] = useState(false)
  const [pending, start] = useTransition()

  if (expired) return <ExpiredResetLink />

  const rules = [
    { ok: password.length >= PASSWORD_MIN, label: tr(`Ít nhất ${PASSWORD_MIN} ký tự`, `At least ${PASSWORD_MIN} characters`) },
    { ok: /\p{L}/u.test(password), label: tr("Có chữ cái", "Contains a letter") },
    { ok: /\d/.test(password), label: tr("Có chữ số", "Contains a number") },
  ]

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issue = passwordIssue(password)
    if (issue) return setError(tr(...issue))
    if (password !== confirm) return setError(tr("Mật khẩu xác nhận không khớp.", "Passwords do not match."))
    setError("")
    start(async () => {
      const result = await resetPasswordAction({ token, password, confirm })
      if (result.ok) {
        router.replace("/dang-nhap?matKhau=da-doi")
        return
      }
      if (result.expired) setExpired(true)
      setError(result.error)
    })
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <label className="auth-field">
        <span>{tr("Mật khẩu mới", "New password")}</span>
        <div>
          <LockKeyhole size={18} />
          <input
            type={show ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            maxLength={128}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError("")
            }}
            placeholder={tr("Tối thiểu 8 ký tự, có chữ và số", "8+ characters, letters and numbers")}
            aria-describedby="password-rules"
            autoFocus
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? tr("Ẩn mật khẩu", "Hide password") : tr("Hiện mật khẩu", "Show password")}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      <ul id="password-rules" className="-mt-2 m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[10px] font-semibold">
        {rules.map((rule) => (
          <li key={rule.label} className={`flex items-center gap-1 ${rule.ok ? "text-[#0a8a4a]" : "text-[var(--muted)]"}`}>
            {rule.ok ? <Check size={12} strokeWidth={3} /> : <Circle size={10} />}
            {rule.label}
          </li>
        ))}
      </ul>
      <label className="auth-field">
        <span>{tr("Nhập lại mật khẩu mới", "Confirm new password")}</span>
        <div>
          <LockKeyhole size={18} />
          <input
            type={show ? "text" : "password"}
            name="confirm"
            autoComplete="new-password"
            maxLength={128}
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setError("")
            }}
            placeholder={tr("Nhập lại mật khẩu", "Re-enter the password")}
            aria-invalid={confirm && confirm !== password ? true : undefined}
            required
          />
        </div>
      </label>
      {error && (
        <p className="form-error m-0!" role="alert">
          {error}
        </p>
      )}
      <button className="boai-button primary full" disabled={pending}>
        {pending ? tr("Đang lưu…", "Saving…") : tr("Đặt mật khẩu mới", "Set new password")} <ArrowRight size={16} />
      </button>
    </form>
  )
}
