import Link from "next/link"
import { AlertTriangle, BadgeCheck, Clock3, ShieldX } from "lucide-react"
import { SiteHeader } from "../../components/SiteHeader"
import { getLang, getTr } from "@/lib/i18n-server"
import { checkAuthenticityCode } from "@/lib/authenticity-server"
import { AUTH_CHECK_WARN_AT } from "@/lib/authenticity"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const tr = await getTr()
  // Result pages are per-code and counted: keep them out of search engines and referrers.
  return { title: tr("Kết quả kiểm tra mã — BOAI", "Code check result — BOAI"), robots: { index: false, follow: false }, referrer: "no-referrer" as const }
}

export default async function VerifyResultPage({ params }: { params: Promise<{ ma: string }> }) {
  const { ma } = await params
  const tr = await getTr()
  const locale = (await getLang()) === "en" ? "en-GB" : "vi-VN"
  const result = await checkAuthenticityCode(decodeURIComponent(ma))
  const box = "mx-auto max-w-xl border bg-[var(--white)] p-6 sm:p-8"
  return (
    <main className="search-page">
      <SiteHeader />
      <section className="page-shell py-12">
        {result.state === "limited" && (
          <div className={`${box} border-[var(--line)]`}>
            <Clock3 size={28} className="text-[var(--muted)]" aria-hidden />
            <h1 className="mb-2 mt-3 text-2xl font-extrabold">{tr("Bạn đã kiểm tra quá nhiều lần", "Too many checks")}</h1>
            <p className="m-0 text-sm text-[var(--muted)]">{tr(`Vui lòng thử lại sau khoảng ${result.retryMinutes} phút.`, `Please try again in about ${result.retryMinutes} minutes.`)}</p>
          </div>
        )}
        {(result.state === "invalid" || result.state === "revoked") && (
          <div className={`${box} border-[var(--sale)]`}>
            <ShieldX size={32} className="text-[var(--sale)]" aria-hidden />
            <p className="m-0 mt-3 font-mono text-xs text-[var(--muted)]">{result.code || "—"}</p>
            <h1 className="mb-2 mt-1 text-3xl font-extrabold text-[var(--sale)]">{tr("Không hợp lệ", "Not valid")}</h1>
            <p className="m-0 text-sm leading-6">
              {result.state === "revoked"
                ? tr(`Mã này đã bị shop ${result.shopName} thu hồi (sản phẩm ${result.productName}). Đừng mua nếu người bán vẫn dùng mã này.`, `This code was revoked by ${result.shopName} (${result.productName}). Don't buy if the seller still uses it.`)
                : tr("Không tìm thấy mã này trong hệ thống BOAI. Hãy kiểm tra lại từng ký tự, hoặc liên hệ BOAI nếu nghi ngờ hàng giả.", "This code isn't in the BOAI system. Check each character again, or contact BOAI if you suspect a counterfeit.")}
            </p>
            <Link href="/xac-thuc" className="boai-button mt-5">{tr("Kiểm tra mã khác", "Check another code")}</Link>
          </div>
        )}
        {result.state === "valid" && (
          <div className={`${box} ${result.checkCount >= AUTH_CHECK_WARN_AT ? "border-amber-500" : "border-[var(--lime-dark)]"}`}>
            <BadgeCheck size={32} className="text-[var(--lime-dark)]" aria-hidden />
            <p className="m-0 mt-3 font-mono text-xs text-[var(--muted)]">{result.code}</p>
            <h1 className="mb-4 mt-1 text-3xl font-extrabold text-[var(--lime-dark)]">{tr("Mã hợp lệ", "Valid code")}</h1>
            {result.checkCount >= AUTH_CHECK_WARN_AT && (
              <p role="alert" className="mb-4 mt-0 flex gap-2 border border-amber-500 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                <AlertTriangle size={18} className="shrink-0" aria-hidden />
                {tr("Mã đã được kiểm tra nhiều lần, hãy cẩn trọng.", "This code has been checked many times, please be careful.")}
              </p>
            )}
            <dl className="m-0 grid gap-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-[var(--muted)]">{tr("Sản phẩm", "Product")}</dt>
                <dd className="m-0 font-bold">{result.productSlug ? <Link href={`/san-pham/${result.productSlug}`}>{result.productName}</Link> : result.productName}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-[var(--muted)]">{tr("Shop bán", "Sold by")}</dt>
                <dd className="m-0 font-bold">{result.shopId ? <Link href={`/cua-hang/${result.shopId}`}>{result.shopName}</Link> : result.shopName}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-[var(--muted)]">{tr("Lần kiểm tra đầu", "First checked")}</dt>
                <dd className="m-0">{new Date(result.firstCheckedAt).toLocaleString(locale, { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "medium", timeStyle: "short" })}</dd>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-[var(--muted)]">{tr("Số lần đã tra", "Times checked")}</dt>
                <dd className="m-0">{result.checkCount}</dd>
              </div>
            </dl>
            <p className="mb-0 mt-4 text-[11px] leading-5 text-[var(--muted)]">
              {tr("Nếu bạn vừa mua hàng và đây không phải lần kiểm tra đầu của bạn, hãy hỏi lại người bán.", "If you just bought this and it isn't your first check, ask the seller.")}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
