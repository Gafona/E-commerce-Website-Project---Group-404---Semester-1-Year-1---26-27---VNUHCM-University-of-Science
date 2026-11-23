import Link from "next/link"
import { ArrowRight, BadgeCheck, Store } from "lucide-react"
import type { Tr } from "@/lib/i18n"
import type { PublicShop, ShopStats } from "@/lib/shops"
import { ShopAvatar } from "./ShopAvatar"
import { OpenShopChatButton } from "./ShopChatLauncher"
import { RatingLine } from "./RatingLine"

export function ShopSellerCard({
  shop,
  stats,
  tr,
  canChat = true,
}: {
  shop: PublicShop
  stats: ShopStats
  tr: Tr
  canChat?: boolean
}) {
  const href = `/cua-hang/${shop.id}`
  return (
    <section
      className="page-shell my-10"
      aria-label={tr("Thông tin người bán", "Seller information")}
    >
      <div className="grid gap-5 border border-[var(--line)] bg-[var(--white)] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(180px,auto)] lg:items-center lg:gap-8">
        <Link
          href={href}
          className="group flex min-w-0 items-center gap-4"
          title={tr("Xem trang shop", "Visit shop")}
        >
          <ShopAvatar
            name={shop.name}
            url={shop.avatarUrl}
            size={64}
            className="ring-4 ring-[var(--paper)] transition group-hover:ring-[var(--soft-blue)]"
          />
          <span className="min-w-0">
            <small className="block text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
              {tr("Người bán", "Sold by")}
            </small>
            <span className="mt-1 flex items-center gap-1.5">
              <b className="truncate font-[family-name:var(--display)] text-2xl uppercase group-hover:text-[var(--lime-dark)]">
                {shop.name}
              </b>
              <BadgeCheck
                size={18}
                className="shrink-0 text-[var(--lime-dark)]"
                aria-label={tr("Đã xác minh", "Verified")}
              />
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {tr("Tham gia", "Joined")}{" "}
              {new Date(shop.joinedAt).toLocaleDateString(
                tr("vi-VN", "en-GB"),
                { month: "2-digit", year: "numeric" },
              )}
            </span>
          </span>
        </Link>
        <dl className="m-0 grid grid-cols-2 divide-x divide-[var(--line)] border border-[var(--line)] bg-[var(--paper)]">
          <div className="min-w-28 px-4 py-3">
            <dt className="text-[10px] font-semibold text-[var(--muted)]">
              {tr("Đánh giá của khách", "Customer rating")}
            </dt>
            <dd className="m-0 mt-1 text-base font-black text-[var(--ink)]">
              <RatingLine
                average={stats.rating.average}
                count={stats.rating.count}
                tr={tr}
                className="flex items-center gap-1 [&_svg]:text-[var(--lime-dark)] [&_span]:text-xs [&_span]:font-semibold [&_span]:text-[var(--muted)] [&.no-rating]:text-xs [&.no-rating]:font-semibold [&.no-rating]:text-[var(--muted)]"
              />
            </dd>
          </div>
          <div className="min-w-24 px-4 py-3">
            <dt className="text-[10px] font-semibold text-[var(--muted)]">
              {tr("Sản phẩm", "Products")}
            </dt>
            <dd className="m-0 mt-1 flex items-center gap-1.5 text-base font-black text-[var(--ink)]">
              <Store size={15} className="text-[var(--lime-dark)]" />
              {stats.productCount}
            </dd>
          </div>
        </dl>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {canChat && (
            <OpenShopChatButton className="boai-button primary justify-center" />
          )}
          <Link
            href={href}
            className={`boai-button justify-center ${canChat ? "" : "primary"}`}
          >
            {tr("Xem shop", "Visit shop")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
