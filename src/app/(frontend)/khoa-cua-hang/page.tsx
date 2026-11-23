import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, CircleAlert, Clock3, EyeOff, PackageX, ShieldAlert, XCircle } from "lucide-react"
import { appAuth } from "@/lib/app-auth"
import { MAX_APPEALS } from "@/lib/shop-ban"
import { Logo } from "../components/Logo"
import { AppealForm } from "./AppealForm"
import { getLang, getTr, localizedTitle } from "@/lib/i18n-server"

export async function generateMetadata() {
  return localizedTitle("Cửa hàng đang bị khóa — BOAI", "Shop suspended — BOAI")
}

const fmtIn = (locale: string) => (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
    : "—"

export default async function ShopSuspendedPage() {
  const user = await appAuth.currentUser()
  if (!user) redirect("/dang-nhap?next=%2Fkhoa-cua-hang")
  const tr = await getTr()
  const fmt = fmtIn((await getLang()) === "en" ? "en-GB" : "vi-VN")
  if (user.sellerStatus === "approved") redirect("/kenh-ban-hang")
  if (user.sellerStatus !== "suspended") redirect("/dang-ky-ban-hang")

  const ban = user.shopBan ?? {}
  const shop = user.seller?.shopName || user.name
  const used = Number(ban.appealCount ?? 0)
  const remaining = Math.max(0, MAX_APPEALS - used)
  const status = ban.appealStatus ?? "none"

  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-8">
        <Logo />
        <Link href="/" className="inline-flex items-center gap-2 text-[12px] font-bold text-[var(--muted)] transition hover:text-[var(--ink)]">
          <ArrowLeft size={15} /> {tr("Về trang chủ BOAI", "Back to BOAI home")}
        </Link>
      </header>

      <div className="mx-auto grid max-w-[880px] gap-6 px-5 py-10 sm:py-14">
        <section className="border border-[#f1c7c7] bg-[var(--white)]">
          <div className="flex items-center gap-2 bg-[#a42626] px-5 py-2.5 text-[11px] font-extrabold tracking-[0.16em] text-white uppercase">
            <ShieldAlert size={15} /> {tr("Cửa hàng đang bị khóa", "Shop suspended")}
          </div>
          <div className="grid gap-6 p-6 sm:p-8">
            <div>
              <p className="m-0 text-[12px] font-bold text-[var(--muted)]">{tr("Kênh người bán", "Seller centre")} · {user.email}</p>
              <h1 className="m-0 mt-2 font-[family-name:var(--display)] text-[clamp(40px,7vw,64px)] leading-[0.92] font-black uppercase">{shop}</h1>
              <p className="m-0 mt-3 text-[14px] leading-6 text-[var(--muted)]">
                {tr("Quản trị viên BOAI đã tạm khóa cửa hàng của bạn lúc", "BOAI admins suspended your shop on")} <b className="text-[var(--ink)]">{fmt(ban.bannedAt)}</b>. {tr("Trong thời gian này bạn không thể truy cập Kênh người bán.", "You can't access the seller centre while it is suspended.")}
              </p>
            </div>

            <div className="border-l-4 border-[#a42626] bg-[#fdf3f3] p-5">
              <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] text-[#a42626] uppercase">{tr("Lý do khóa", "Reason")}</p>
              <p className="m-0 mt-2 text-[15px] leading-7 whitespace-pre-line text-[#3b1111]">{ban.reason || tr("Vi phạm chính sách bán hàng của BOAI.", "Violation of BOAI selling policies.")}</p>
            </div>

            <ul className="m-0 grid list-none gap-3 p-0 text-[13px] sm:grid-cols-3">
              {[
                [EyeOff, tr("Sản phẩm đã bị ẩn", "Products hidden"), tr("Khách hàng không còn thấy sản phẩm của shop.", "Customers can no longer see your products.")],
                [PackageX, tr("Tạm dừng bán hàng", "Selling paused"), tr("Không thể đăng sản phẩm hay nhận đơn mới.", "You can't list products or take new orders.")],
                [Clock3, tr("Dữ liệu được giữ nguyên", "Your data is kept"), tr("Mở khóa sẽ khôi phục toàn bộ cửa hàng.", "Reinstatement restores your whole shop.")],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof EyeOff
                return (
                  <li key={title as string} className="border border-[var(--line)] p-4">
                    <I size={18} className="text-[#a42626]" />
                    <b className="mt-2 block">{title as string}</b>
                    <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">{text as string}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section className="border border-[var(--line)] bg-[var(--white)] p-6 sm:p-8">
          <p className="m-0 text-[11px] font-extrabold tracking-[0.16em] text-[var(--muted)] uppercase">{tr("Kháng cáo với quản trị viên", "Appeal to the admins")}</p>
          <h2 className="m-0 mt-2 font-[family-name:var(--display)] text-[34px] leading-none font-black uppercase">
            {status === "pending" ? tr("Đang chờ xem xét", "Under review") : status === "rejected" ? tr("Kháng cáo chưa được chấp nhận", "Appeal not accepted") : tr("Bạn cho rằng đây là nhầm lẫn?", "Think this is a mistake?")}
          </h2>

          {status === "pending" ? (
            <div className="mt-5 grid gap-4">
              <p className="m-0 flex items-start gap-3 bg-[var(--soft-blue)] p-4 text-[14px] leading-6">
                <Clock3 size={18} className="mt-0.5 shrink-0 text-[#0b5ed7]" />
                <span>{tr("Đã gửi lúc", "Sent on")} <b>{fmt(ban.appealSubmittedAt)}</b>. {tr("BOAI sẽ phản hồi qua chuông thông báo của bạn.", "BOAI will reply through your notifications.")}</span>
              </p>
              <blockquote className="m-0 border-l-2 border-[var(--line)] pl-4 text-[14px] leading-6 whitespace-pre-line text-[var(--muted)]">{ban.appealMessage}</blockquote>
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {status === "rejected" && (
                <div className="flex items-start gap-3 border border-[#f1c7c7] p-4 text-[14px] leading-6">
                  <XCircle size={18} className="mt-0.5 shrink-0 text-[#a42626]" />
                  <span>
                    <b className="block">{tr("Phản hồi từ BOAI", "BOAI's response")}</b>
                    <span className="whitespace-pre-line text-[var(--muted)]">{ban.appealResponse || tr("Cửa hàng vẫn tiếp tục bị khóa.", "The shop remains suspended.")}</span>
                  </span>
                </div>
              )}
              {remaining > 0 ? (
                <>
                  <p className="m-0 text-[14px] leading-6 text-[var(--muted)]">
                    {tr(
                      `Gửi kháng cáo để quản trị viên xem xét lại. Mỗi lần khóa bạn có tối đa ${MAX_APPEALS} lần kháng cáo, và chỉ một kháng cáo được xử lý tại một thời điểm.`,
                      `Send an appeal for the admins to review. You have up to ${MAX_APPEALS} appeals per suspension, handled one at a time.`,
                    )}
                  </p>
                  <AppealForm remaining={remaining} />
                </>
              ) : (
                <p className="m-0 flex items-start gap-3 bg-[#fdf3f3] p-4 text-[14px] leading-6 text-[#3b1111]">
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-[#a42626]" />
                  {tr(
                    `Bạn đã sử dụng hết ${MAX_APPEALS} lần kháng cáo cho lần khóa này. Quyết định của BOAI là quyết định cuối cùng.`,
                    `You've used all ${MAX_APPEALS} appeals for this suspension. BOAI's decision is final.`,
                  )}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
