import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { SiteHeader } from "../components/SiteHeader"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { normalizeAuthCode } from "@/lib/authenticity"

export async function generateMetadata() {
  return { ...(await localizedTitle("Kiểm tra mã xác thực — BOAI", "Verify authenticity — BOAI")), robots: { index: true, follow: false } }
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ ma?: string }> }) {
  const { ma } = await searchParams
  const code = normalizeAuthCode(ma)
  if (code) redirect(`/xac-thuc/${encodeURIComponent(code)}`)
  const tr = await getTr()
  return (
    <main className="search-page">
      <SiteHeader />
      <section className="page-shell py-12">
        <div className="mx-auto max-w-xl border border-[var(--line)] bg-[var(--white)] p-6 sm:p-8">
          <span className="grid size-12 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]"><ShieldCheck size={24} aria-hidden /></span>
          <h1 className="mb-2 mt-4 font-[family-name:var(--display)] text-4xl font-extrabold uppercase leading-none">{tr("Kiểm tra mã xác thực", "Verify authenticity")}</h1>
          <p className="m-0 text-sm leading-6 text-[var(--muted)]">
            {tr(
              "Nhập mã in trên tem sản phẩm (ví dụ BOAI-7KQ2-M9XD-H3TP) hoặc quét mã QR trên tem bằng camera điện thoại.",
              "Type the code printed on the product tag (e.g. BOAI-7KQ2-M9XD-H3TP) or scan its QR code with your phone camera.",
            )}
          </p>
          <form action="/xac-thuc" method="get" className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="auth-code" className="sr-only">{tr("Mã xác thực", "Authenticity code")}</label>
            <input
              id="auth-code"
              name="ma"
              required
              minLength={6}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="BOAI-XXXX-XXXX-XXXX"
              className="h-12 flex-1 border border-[var(--line)] bg-[var(--white)] px-4 font-mono text-base uppercase tracking-wider"
            />
            <button type="submit" className="boai-button primary h-12">{tr("Kiểm tra", "Verify")}</button>
          </form>
          <p className="mb-0 mt-4 text-[11px] leading-5 text-[var(--muted)]">
            {tr(
              "Để chống dò mã, mỗi thiết bị chỉ được kiểm tra một số lần nhất định trong 10 phút.",
              "To prevent code guessing, each device can only check a limited number of codes every 10 minutes.",
            )}
          </p>
        </div>
      </section>
    </main>
  )
}
