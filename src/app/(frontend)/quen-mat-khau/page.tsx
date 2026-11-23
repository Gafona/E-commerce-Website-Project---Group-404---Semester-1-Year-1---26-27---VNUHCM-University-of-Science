import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { emailConfigured } from "@/lib/email-settings"
import { RESET_LINK_MINUTES } from "@/lib/password-policy"
import { AuthVisual } from "../components/AuthVisual"
import { Logo } from "../components/Logo"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export async function generateMetadata() {
  return localizedTitle("Quên mật khẩu — BOAI", "Forgot password — BOAI")
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string | string[] }> }) {
  const tr = await getTr()
  const raw = (await searchParams).email
  const email = typeof raw === "string" && raw.length <= 254 ? raw.trim() : ""
  return (
    <main className="auth-page">
      <AuthVisual page="login" />
      <section className="auth-panel">
        <div className="auth-box">
          <div className="auth-panel-top">
            <Logo />
            <Link href="/dang-nhap">
              <ArrowLeft size={15} /> {tr("Về đăng nhập", "Back to sign in")}
            </Link>
          </div>
          <div className="auth-icon">
            <KeyRound size={20} />
          </div>
          <div className="eyebrow">{tr("KHÔI PHỤC TÀI KHOẢN", "ACCOUNT RECOVERY")}</div>
          <h2>{tr("Quên mật khẩu", "Forgot password")}</h2>
          <p>
            {tr(
              `Nhập email bạn đã dùng để đăng ký. BOAI sẽ gửi liên kết đặt lại mật khẩu, có hiệu lực trong ${RESET_LINK_MINUTES} phút.`,
              `Enter the email you signed up with. BOAI will email you a reset link that works for ${RESET_LINK_MINUTES} minutes.`,
            )}
          </p>
          <ForgotPasswordForm initialEmail={email} emailReady={emailConfigured()} />
        </div>
      </section>
    </main>
  )
}
