import { getLang, getTr } from "@/lib/i18n-server"
import { getSiteContent } from "@/lib/site-content"
import { pickText } from "@/lib/site-content-schema"
import { AuthVisual } from "../components/AuthVisual"
import { redirect } from "next/navigation"
import { appAuth } from "@/lib/app-auth"
import { AuthForm } from "../components/AuthForm"
import { loginAction } from "../auth-actions"
import { Logo } from "../components/Logo"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, ShoppingBag, Sparkles } from "lucide-react"
import { nextFromReferer, safeNextPath } from "@/lib/safe-next"
import { headers } from "next/headers"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; matKhau?: string | string[] }>
}) {
  const head = await headers()
  const query = await searchParams
  const next =
    safeNextPath(query.next) ??
    nextFromReferer(head.get("referer"), head.get("x-forwarded-host") ?? head.get("host"))
  const passwordReset = query.matKhau === "da-doi"
  const [tr, lang, content] = await Promise.all([getTr(), getLang(), getSiteContent()])
  const t = (field: "heading" | "subheading") => pickText(content[`login.${field}`], lang)
  if (await appAuth.currentUser()) redirect(next ?? "/")
  return (
    <main className="auth-page">
      <AuthVisual page="login" />
      <section className="auth-panel">
        <div className="auth-box">
          <div className="auth-panel-top">
            <Logo />
            <Link href="/">
              <ArrowLeft size={15} /> {tr("Về cửa hàng", "Back to store")}
            </Link>
          </div>
          <div className="auth-icon">
            <Sparkles size={20} />
          </div>
          <div className="eyebrow">
            {tr("TÀI KHOẢN THÀNH VIÊN", "MEMBER ACCOUNT")}
          </div>
          <h2>{t("heading")}</h2>
          {t("subheading") && <p>{t("subheading")}</p>}
          {passwordReset && (
            <p role="status" className="mb-5 flex items-start gap-2.5 border border-[var(--line)] bg-[var(--soft-blue)] p-3 text-xs leading-5">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#0a8a4a]" />
              <span>
                <b className="block">{tr("Đã đặt lại mật khẩu", "Password updated")}</b>
                {tr("Hãy đăng nhập bằng mật khẩu mới.", "Sign in with your new password.")}
              </span>
            </p>
          )}
          <AuthForm mode="login" action={loginAction} next={next} />
          <div className="guest-checkout-link">
            <ShoppingBag size={17} />
            <div>
              <b>{tr("Bạn chỉ muốn mua hàng?", "Just here to shop?")}</b>
              <span>
                {tr(
                  "Không cần đăng nhập — tiếp tục thanh toán với thông tin giao hàng.",
                  "No account needed — check out with your shipping details.",
                )}
              </span>
            </div>
            <Link href="/thanh-toan">
              {tr("Mua không cần tài khoản", "Continue as guest")}{" "}
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
