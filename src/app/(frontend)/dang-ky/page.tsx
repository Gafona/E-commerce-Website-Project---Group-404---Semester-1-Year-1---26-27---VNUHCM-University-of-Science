import { getLang, getTr } from "@/lib/i18n-server"
import { getSiteContent } from "@/lib/site-content"
import { pickText } from "@/lib/site-content-schema"
import { AuthVisual } from "../components/AuthVisual"
import { redirect } from "next/navigation"
import { appAuth } from "@/lib/app-auth"
import { AuthForm } from "../components/AuthForm"
import { registerAction } from "../auth-actions"
import { Logo } from "../components/Logo"
import Link from "next/link"
import { ArrowLeft, ShoppingBag, Sparkles } from "lucide-react"
import { nextFromReferer, safeNextPath } from "@/lib/safe-next"
import { headers } from "next/headers"

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const head = await headers()
  const next =
    safeNextPath((await searchParams).next) ??
    nextFromReferer(head.get("referer"), head.get("x-forwarded-host") ?? head.get("host"))
  const [tr, lang, content] = await Promise.all([getTr(), getLang(), getSiteContent()])
  const t = (field: "heading" | "subheading") => pickText(content[`register.${field}`], lang)
  if (await appAuth.currentUser()) redirect(next ?? "/")
  return (
    <main className="auth-page">
      <AuthVisual page="register" />
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
          <div className="eyebrow">{tr("THÀNH VIÊN BOAI", "BOAI MEMBER")}</div>
          <h2>{t("heading")}</h2>
          {t("subheading") && <p>{t("subheading")}</p>}
          <AuthForm mode="register" action={registerAction} next={next} />
          <div className="guest-checkout-link">
            <ShoppingBag size={17} />
            <div>
              <b>{tr("Chưa muốn đăng ký?", "Not ready to join?")}</b>
              <span>
                {tr(
                  "Bạn vẫn có thể đặt hàng và tra cứu bằng mã đơn.",
                  "You can still order and track it with your order code.",
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
