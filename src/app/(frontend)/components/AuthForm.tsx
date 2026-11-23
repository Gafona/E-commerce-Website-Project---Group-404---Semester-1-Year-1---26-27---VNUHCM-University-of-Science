"use client"

import Link from "next/link"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import type { AuthState } from "../auth-actions"
import { useShop } from "./ShopProvider"

export function AuthForm({
  action,
  mode,
  next = null,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>
  mode: "login" | "register"
  /** Sanitized same-site path to return to after a successful sign-in. */
  next?: string | null
}) {
  const router = useRouter()
  const { tr } = useShop()
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState(action, { ok: false })
  const [loginState, setLoginState] = useState<AuthState>({ ok: false })
  const [loginPending, setLoginPending] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const visibleState = mode === "login" ? loginState : state
  const visiblePending = mode === "login" ? loginPending : pending

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    if (mode !== "login") {
      const form = new FormData(event.currentTarget)
      if (form.get("password") !== form.get("confirmPassword")) {
        event.preventDefault()
        setConfirmError(
          tr("Mật khẩu xác nhận không khớp.", "Passwords do not match."),
        )
        return
      }
      setConfirmError(null)
      return
    }
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoginPending(true)
    setLoginState({ ok: false })
    try {
      const response = await fetch("/api/app-auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      })
      const result = (await response.json()) as AuthState
      setLoginState(result)
    } catch {
      setLoginState({
        ok: false,
        error: tr(
          "Không thể kết nối để đăng nhập. Vui lòng thử lại.",
          "Could not connect to sign in. Please try again.",
        ),
      })
    } finally {
      setLoginPending(false)
    }
  }

  useEffect(() => {
    if (!visibleState.ok) return
    // A full load switches the cart, SportDNA data and this browser's storage to the new account at once.
    window.location.assign(next ?? "/tai-khoan")
  }, [visibleState.ok, next])
  const keepNext = next ? `?next=${encodeURIComponent(next)}` : ""

  return (
    <form
      action={mode === "register" ? formAction : undefined}
      onSubmit={submitLogin}
      className="auth-form"
    >
      {mode === "register" && (
        <label className="auth-field">
          <span>{tr("Họ và tên", "Full name")}</span>
          <div>
            <UserRound size={18} />
            <input
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              placeholder={tr(
                "Tên bạn muốn BOAI gọi",
                "How should BOAI call you?",
              )}
              required
            />
          </div>
        </label>
      )}
      <label className="auth-field">
        <span>Email</span>
        <div>
          <Mail size={18} />
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </label>
      <label className="auth-field">
        <span>{tr("Mật khẩu", "Password")}</span>
        <div>
          <LockKeyhole size={18} />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            maxLength={128}
            placeholder={
              mode === "register"
                ? tr("Tối thiểu 8 ký tự", "At least 8 characters")
                : "••••••••"
            }
            required
          />
          <button
            className="password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword
                ? tr("Ẩn mật khẩu", "Hide password")
                : tr("Hiện mật khẩu", "Show password")
            }
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      {mode === "login" && (
        <Link
          href="/quen-mat-khau"
          className="-mt-2.5 justify-self-end text-[10px] font-extrabold text-[var(--lime-dark)] hover:underline"
          onClick={(event) => {
            // Carry the typed email over so the reset form is prefilled.
            const typed = (event.currentTarget.closest("form")?.elements.namedItem("email") as HTMLInputElement | null)?.value.trim()
            if (!typed) return
            event.preventDefault()
            router.push(`/quen-mat-khau?email=${encodeURIComponent(typed)}`)
          }}
        >
          {tr("Quên mật khẩu?", "Forgot password?")}
        </Link>
      )}
      {mode === "register" && (
        <label className="auth-field">
          <span>{tr("Xác nhận mật khẩu", "Confirm password")}</span>
          <div>
            <LockKeyhole size={18} />
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              placeholder={tr("Nhập lại mật khẩu", "Re-enter your password")}
              onChange={() => setConfirmError(null)}
              aria-invalid={confirmError ? true : undefined}
              required
            />
          </div>
        </label>
      )}
      {(confirmError ?? visibleState.error) && (
        <p className="form-error" role="alert">
          {confirmError ?? visibleState.error}
        </p>
      )}
      <button className="boai-button primary full" disabled={visiblePending}>
        {visiblePending
          ? tr("Đang xử lý…", "Please wait…")
          : mode === "login"
            ? tr("Đăng nhập", "Sign in")
            : tr("Tạo tài khoản", "Create account")}{" "}
        <ArrowRight size={16} />
      </button>
      <div className="auth-security">
        <ShieldCheck size={15} />
        <span>
          {tr(
            "Phiên đăng nhập được bảo vệ và tách biệt với hệ thống quản trị.",
            "Your session is securely separated from the admin system.",
          )}
        </span>
      </div>
      <p className="auth-switch">
        {mode === "login" ? (
          <>
            {tr("Chưa có tài khoản?", "New to BOAI?")}{" "}
            <Link href={`/dang-ky${keepNext}`}>{tr("Đăng ký", "Create account")}</Link>
          </>
        ) : (
          <>
            {tr("Đã có tài khoản?", "Already a member?")}{" "}
            <Link href={`/dang-nhap${keepNext}`}>{tr("Đăng nhập", "Sign in")}</Link>
          </>
        )}
      </p>
    </form>
  )
}
