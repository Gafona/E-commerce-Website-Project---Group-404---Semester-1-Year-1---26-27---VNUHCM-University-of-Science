import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getTr } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { looksLikeResetToken } from "@/lib/password-policy"
import { AuthVisual } from "../components/AuthVisual"
import { Logo } from "../components/Logo"
import { ExpiredResetLink, ResetPasswordForm } from "./ResetPasswordForm"

export async function generateMetadata(): Promise<Metadata> {
  const tr = await getTr()
  return {
    title: tr("Đặt lại mật khẩu — BOAI", "Reset password — BOAI"),
    // The token sits in the URL: never leak it through Referer or search indexes.
    referrer: "no-referrer",
    robots: { index: false, follow: false },
  }
}

/** True while the emailed token exists and has not expired (Payload expires it after one use). */
async function tokenIsValid(token: string) {
  if (!looksLikeResetToken(token)) return false
  const payload = await getPayloadClient()
  // Visitors cannot read accounts; this trusted lookup only answers whether the link still works.
  const { totalDocs } = await payload.count({
    collection: "users",
    overrideAccess: true,
    where: {
      and: [
        { resetPasswordToken: { equals: token } },
        { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
      ],
    },
  })
  return totalDocs > 0
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const tr = await getTr()
  const raw = (await searchParams).token
  const token = typeof raw === "string" ? raw.trim() : ""
  const valid = await tokenIsValid(token).catch(() => false)
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
          {valid ? (
            <>
              <div className="auth-icon">
                <ShieldCheck size={20} />
              </div>
              <div className="eyebrow">{tr("BẢO MẬT TÀI KHOẢN", "ACCOUNT SECURITY")}</div>
              <h2>{tr("Đặt mật khẩu mới", "Set a new password")}</h2>
              <p>
                {tr(
                  "Chọn mật khẩu bạn chưa dùng ở nơi khác. Sau khi đổi, các thiết bị đang đăng nhập sẽ được đăng xuất.",
                  "Pick a password you don't use elsewhere. Devices that are signed in will be signed out.",
                )}
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <ExpiredResetLink missing={!token} />
          )}
        </div>
      </section>
    </main>
  )
}
