"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { ArrowRight, Info, Mail, MailCheck, RotateCw } from "lucide-react"
import { requestPasswordResetAction, type ForgotState } from "../password-actions"
import { useShop } from "../components/ShopProvider"
import { RESET_LINK_MINUTES } from "@/lib/password-policy"

const RESEND_AFTER_SECONDS = 30

export function ForgotPasswordForm({ initialEmail, emailReady }: { initialEmail: string; emailReady: boolean }) {
  const { tr } = useShop()
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(requestPasswordResetAction, { status: "idle" })
  const [email, setEmail] = useState(initialEmail)
  const [editing, setEditing] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // A fresh "sent" result starts the resend countdown (Payload also spaces emails per account).
  useEffect(() => {
    if (state.status !== "sent") return
    setEditing(false)
    setCooldown(RESEND_AFTER_SECONDS)
    const timer = window.setInterval(() => setCooldown((value) => (value <= 1 ? (window.clearInterval(timer), 0) : value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [state.status, state.sentAt])

  if (state.status === "sent" && !editing) {
    return (
      <div className="grid gap-4">
        <div role="status" className="flex gap-3 border border-[var(--line)] bg-[var(--white)] p-4">
          <MailCheck size={22} className="mt-0.5 shrink-0 text-[var(--lime-dark)]" />
          <div className="grid min-w-0 gap-1.5 text-xs leading-5">
            <b className="text-sm">{tr("Kiểm tra hộp thư của bạn", "Check your inbox")}</b>
            <span className="break-words">
              {tr(
                `Nếu ${state.email} đã đăng ký tài khoản BOAI, email chứa liên kết đặt lại mật khẩu sẽ đến trong vài phút. Liên kết có hiệu lực ${RESET_LINK_MINUTES} phút và chỉ dùng được một lần.`,
                `If ${state.email} has a BOAI account, an email with a reset link will arrive within a few minutes. The link works for ${RESET_LINK_MINUTES} minutes and only once.`,
              )}
            </span>
            <span className="text-[var(--muted)]">
              {tr("Không thấy email? Hãy xem cả mục Spam hoặc Quảng cáo.", "Nothing yet? Check your spam or promotions folder.")}
            </span>
          </div>
        </div>
        {!emailReady && (
          <p className="m-0 flex gap-2 border border-[var(--line)] bg-[var(--soft-blue)] p-3 text-[11px] leading-5">
            <Info size={16} className="mt-0.5 shrink-0 text-[var(--lime-dark)]" />
            <span>
              {tr(
                "Lưu ý: máy chủ gửi email của BOAI chưa được cấu hình nên thư có thể không đến. Vui lòng liên hệ BOAI nếu cần hỗ trợ ngay.",
                "Note: BOAI's outgoing email server isn't configured yet, so the message may not arrive. Contact BOAI if you need help now.",
              )}
            </span>
          </p>
        )}
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="email" value={state.email ?? email} />
          <button type="submit" className="boai-button full" disabled={pending || cooldown > 0}>
            <RotateCw size={15} />
            {pending
              ? tr("Đang gửi…", "Sending…")
              : cooldown > 0
                ? tr(`Gửi lại sau ${cooldown}s`, `Resend in ${cooldown}s`)
                : tr("Gửi lại email", "Resend email")}
          </button>
          <button type="button" className="boai-button full" onClick={() => setEditing(true)}>
            {tr("Dùng email khác", "Use another email")}
          </button>
        </form>
        <Link href="/dang-nhap" className="boai-button primary full">
          {tr("Về trang đăng nhập", "Back to sign in")} <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="auth-form">
      <label className="auth-field">
        <span>Email</span>
        <div>
          <Mail size={18} />
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.status === "error" ? true : undefined}
            required
            autoFocus
          />
        </div>
      </label>
      {state.status === "error" && state.message && (
        <p className="form-error m-0!" role="alert">
          {state.message}
        </p>
      )}
      <button className="boai-button primary full" disabled={pending}>
        {pending ? tr("Đang gửi…", "Sending…") : tr("Gửi liên kết đặt lại", "Send reset link")} <ArrowRight size={16} />
      </button>
      <p className="auth-switch">
        {tr("Đã nhớ mật khẩu?", "Remembered it?")} <Link href="/dang-nhap">{tr("Đăng nhập", "Sign in")}</Link>
      </p>
    </form>
  )
}
