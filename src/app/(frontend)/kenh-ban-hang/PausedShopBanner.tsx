import Link from "next/link"
import { ArrowRight, PauseCircle } from "lucide-react"
import { getTr } from "@/lib/i18n-server"

/** Shown across the seller center while a company shop lacks basic profile info. */
export async function PausedShopBanner({ missing }: { missing: string[] }) {
  const tr = await getTr()
  return (
    <section role="alert" className="mb-5 border border-[#a42626]/40 border-l-4 border-l-[#a42626] bg-[#fdecec] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <PauseCircle size={22} className="mt-0.5 shrink-0 text-[#a42626]" />
        <div className="min-w-0 flex-1">
          <b className="block text-[14px] text-[#a42626]">{tr("Cửa hàng đang tạm dừng hoạt động", "Your shop is paused")}</b>
          <p className="m-0 mt-1 text-[12px] leading-5 text-[var(--ink)]">
            {tr(
              "Doanh nghiệp chưa khai báo đủ thông tin cơ bản. Sản phẩm đã được ẩn khỏi cửa hàng và mọi chức năng bán hàng tạm khóa cho tới khi bạn bổ sung:",
              "Your company profile is missing basic information. Products are hidden from the store and all selling features are locked until you add:",
            )}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {missing.map((label) => (
              <li key={label} className="bg-[var(--white)] px-2 py-1 text-[11px] font-semibold text-[#a42626]">{label}</li>
            ))}
          </ul>
        </div>
        <Link href="/kenh-ban-hang/cai-dat" className="boai-button dark min-h-9 shrink-0 px-4">
          {tr("Bổ sung thông tin", "Complete profile")} <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  )
}
