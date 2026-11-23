import Link from "next/link"
import Image from "next/image"
import { db, requireSeller, sellerOrders } from "./seller-lib"
import { SellerNav } from "./SellerNav"
import { getTr } from "@/lib/i18n-server"
import { missingSellerProfile } from "@/lib/seller-profile"
import { PausedShopBanner } from "./PausedShopBanner"

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller({ allowIncomplete: true })
  const tr = await getTr()
  const missing = missingSellerProfile(seller)
  const [orders, profile, unreadChats, unreadNotices, newCustom, newReturns] = await Promise.all([
    sellerOrders(seller.id),
    db().then((payload) =>
      payload.findByID({
        collection: "users",
        id: seller.id,
        user: seller,
        overrideAccess: false,
        depth: 1,
        select: { avatar: true },
      }),
    ),
    db().then((payload) =>
      payload.count({
        collection: "shop-conversations",
        where: { and: [{ seller: { equals: seller.id } }, { sellerUnread: { greater_than: 0 } }] },
        user: seller,
        overrideAccess: false,
      }),
    ),
    db().then((payload) =>
      payload.count({
        collection: "notifications",
        where: { and: [{ recipient: { equals: seller.id } }, { readAt: { exists: false } }] },
        user: seller,
        overrideAccess: false,
      }),
    ),
    db().then((payload) =>
      payload.count({
        collection: "custom-jersey-requests",
        where: { and: [{ shop: { equals: seller.id } }, { status: { in: ["pending", "accepted"] } }] },
        user: seller,
        overrideAccess: false,
      }),
    ),
    db().then((payload) =>
      payload.count({
        collection: "return-requests",
        where: { and: [{ seller: { equals: seller.id } }, { status: { equals: "requested" } }] },
        user: seller,
        overrideAccess: false,
      }),
    ),
  ])
  const pending = orders.filter((o) => o.status === "pending").length
  const avatarUrl =
    profile.avatar && typeof profile.avatar === "object" ? profile.avatar.url : null
  const shop = seller.seller?.shopName || seller.name
  return (
    <div className="sc">
      <aside className="sc-side">
        <Link
          href="/"
          className="sc-brand transition-opacity hover:opacity-85"
          aria-label={tr("Về trang chủ BOAI", "Go to BOAI home page")}
          title={tr("Về trang chủ", "Go to home page")}
        >
          <span>B</span><div><b>BOAI Seller</b><small>{tr("Kênh người bán", "Seller center")}</small></div>
        </Link>
        <SellerNav badge={pending} chatBadge={unreadChats.totalDocs} noticeBadge={unreadNotices.totalDocs} customBadge={newCustom.totalDocs} returnBadge={newReturns.totalDocs} paused={missing.length > 0} />
        <Link
          href="/tai-khoan"
          className="sc-shop transition-opacity hover:opacity-85"
          title={tr("Tài khoản của tôi", "My account")}
        >
          <span className="relative shrink-0 overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="36px" className="object-cover" />
            ) : (
              shop.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="min-w-0"><b className="truncate">{shop}</b><small className="truncate">{seller.email}</small></div>
        </Link>
      </aside>
      <main className="sc-main">
        {missing.length > 0 && <PausedShopBanner missing={missing.map((field) => tr(field.label, field.labelEn))} />}
        {children}
      </main>
    </div>
  )
}
