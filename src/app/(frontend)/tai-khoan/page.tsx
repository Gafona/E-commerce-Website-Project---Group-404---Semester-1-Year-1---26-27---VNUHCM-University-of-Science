import Link from "next/link"
import Image from "next/image"
import { getTr } from "@/lib/i18n-server"
import { redirect } from "next/navigation"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { readCommunityFeed } from "@/lib/community"
import { SiteHeader } from "../components/SiteHeader"
import { AccountSportDna } from "./AccountSportDna"
import { SportProfile } from "./SportProfile"
import { AvatarUploader } from "./AvatarUploader"
import { ProfileBanner } from "./ProfileBanner"
import { ProfileTimeline } from "./ProfileTimeline"
import { CommunityIdBadge } from "../cong-dong/CommunityIdBadge"
import { communitySession } from "../cong-dong/actions"
import { FollowRequests } from "./FollowRequests"
import { communityFollowCounts } from "@/lib/community-directory"
import { readFollowRequests } from "@/lib/community-profile-view"
import { communityProfileHref } from "@/lib/community-identity"
import {
  ArrowRight,
  Globe2,
  Lock,
  Mail,
  PackageOpen,
  PackageSearch,
  Settings,
  Shirt,
  Store,
  UserPen,
} from "lucide-react"

import { localizedTitle } from "@/lib/i18n-server"
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return localizedTitle("Trang cá nhân — BOAI", "Profile — BOAI")
}

const money = new Intl.NumberFormat("vi-VN")

export default async function AccountPage() {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) redirect("/dang-nhap?next=%2Ftai-khoan")
  const payload = await getPayloadClient()
  const [
    { docs: designs },
    profile,
    { docs: listedProducts, totalDocs: listedTotal },
    { docs: communityProfiles },
    feed,
    session,
  ] = await Promise.all([
    payload.find({
      collection: "jersey-designs",
      user,
      overrideAccess: false,
      depth: 0,
      sort: "-updatedAt",
      limit: 5,
    }),
    payload.findByID({
      collection: "users",
      id: user.id,
      user,
      overrideAccess: false,
      depth: 1,
      select: { avatar: true, cover: true },
    }),
    payload.find({
      collection: "products",
      user,
      overrideAccess: false,
      depth: 1,
      sort: "-createdAt",
      limit: 8,
      where: { seller: { equals: user.id } },
      select: {
        name: true,
        slug: true,
        price: true,
        oldPrice: true,
        stock: true,
        image: true,
        brand: true,
      },
    }),
    payload.find({
      collection: "community-profiles",
      where: { account: { equals: user.id } },
      depth: 0,
      limit: 1,
      select: { name: true, bio: true, handle: true, visibility: true },
      overrideAccess: false,
      user,
    }),
    readCommunityFeed({ author: user.id }, user),
    communitySession(),
  ])
  const avatarUrl =
    profile.avatar && typeof profile.avatar === "object"
      ? (profile.avatar.url ?? null)
      : null
  const isSeller = user.sellerStatus === "approved"
  const communityProfile = communityProfiles[0]
  const [followCounts, followRequests] = communityProfile
    ? await Promise.all([
        communityFollowCounts(communityProfile.id),
        readFollowRequests(communityProfile.id, user),
      ])
    : [null, []]
  const publicHref = communityProfile ? communityProfileHref(communityProfile.id) : null
  const quickLinks = [
    {
      href: "/cai-dat#ho-so",
      icon: UserPen,
      label: tr("Thông tin cá nhân & địa chỉ", "Personal details & addresses"),
    },
    {
      href: "/don-hang",
      icon: PackageSearch,
      label: tr("Đơn hàng & thanh toán", "Orders & payments"),
    },
    {
      href: "/cai-dat",
      icon: Settings,
      label: tr("Cài đặt", "Settings"),
    },
    isSeller
      ? {
          href: "/kenh-ban-hang",
          icon: Store,
          label: tr("Kênh bán hàng", "Seller center"),
        }
      : {
          href: "/dang-ky-ban-hang",
          icon: Store,
          label: tr("Đăng ký bán hàng", "Become a seller"),
        },
  ]

  return (
    <main className="search-page">
      <SiteHeader />
      <section className="page-shell flow-page">
        <ProfileBanner
          name={user.name}
          coverUrl={
            profile.cover && typeof profile.cover === "object"
              ? (profile.cover.url ?? null)
              : null
          }
        >
          <AvatarUploader name={user.name} avatarUrl={avatarUrl} />
          <div className="min-w-0 flex-1 basis-40 md:basis-48">
            <small>
              {isSeller
                ? tr("SHOP THỂ THAO", "SPORTS SHOP")
                : tr("THÀNH VIÊN BOAI", "BOAI MEMBER")}
            </small>
            <h1 className="break-words text-3xl! md:text-4xl!">{user.name}</h1>
            <p className="break-words">
              {communityProfile?.bio ||
                tr("Thành viên BOAI Community", "BOAI Community member")}
            </p>
          </div>
          <div className="profile-stats">
            <div>
              <b>{feed.totalDocs}</b>
              <span>{tr("Bài viết", "Posts")}</span>
            </div>
            {followCounts && publicHref && (
              <>
                <Link href={`${publicHref}?tab=followers`} className="text-inherit! hover:opacity-80">
                  <b>{followCounts.followers}</b>
                  <span>{tr("Người theo dõi", "Followers")}</span>
                </Link>
                <Link href={`${publicHref}?tab=following`} className="text-inherit! hover:opacity-80">
                  <b>{followCounts.following}</b>
                  <span>{tr("Đang theo dõi", "Following")}</span>
                </Link>
              </>
            )}
            <div>
              <b>{isSeller ? listedTotal : designs.length}</b>
              <span>
                {isSeller
                  ? tr("Sản phẩm", "Products")
                  : tr("Thiết kế áo", "Jersey designs")}
              </span>
            </div>
          </div>
        </ProfileBanner>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <aside className="grid min-w-0 gap-4 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--white)] p-5">
              <h2 className="m-0 text-base font-bold">{tr("Giới thiệu", "Intro")}</h2>
              <p className="m-0 mt-3 flex items-center gap-2 text-xs break-all text-[var(--muted)]">
                <Mail size={14} className="shrink-0" /> {user.email}
              </p>
              {communityProfile && (
                <div className="mt-3 border-t border-[var(--line)] pt-3">
                  <p className="m-0 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                    {tr("Mã cộng đồng", "Community ID")}
                  </p>
                  <CommunityIdBadge
                    profileId={communityProfile.id}
                    handle={communityProfile.handle}
                  />
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <Link
                      href={publicHref!}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1677ff]"
                    >
                      {tr("Xem hồ sơ công khai", "View public profile")}
                      <ArrowRight size={13} />
                    </Link>
                    <Link
                      href="/cai-dat#cong-dong"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--muted)] hover:text-[#1677ff]"
                    >
                      {communityProfile.visibility === "private" ? (
                        <Lock size={12} />
                      ) : (
                        <Globe2 size={12} />
                      )}
                      {communityProfile.visibility === "private"
                        ? tr("Riêng tư", "Private")
                        : tr("Công khai", "Public")}
                      {" · "}
                      {tr("Đổi ID", "Change ID")}
                    </Link>
                  </div>
                  <div id="ket-noi" className="scroll-mt-28">
                    <FollowRequests
                      key={followRequests.map((p) => p.id).join()}
                      requests={followRequests}
                      isPrivate={communityProfile.visibility === "private"}
                    />
                  </div>
                </div>
              )}
              <nav className="mt-4 grid gap-1 border-t border-[var(--line)] pt-3" aria-label={tr("Lối tắt tài khoản", "Account shortcuts")}>
                {quickLinks.map(({ href, icon: Icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)]"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--soft-blue)] text-[#1677ff]">
                      <Icon size={15} />
                    </span>
                    <span className="flex-1">{label}</span>
                    <ArrowRight size={14} className="text-[var(--muted)]" />
                  </Link>
                ))}
              </nav>
            </section>
            <AccountSportDna />
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--white)] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 flex items-center gap-2 text-base font-bold">
                  <Shirt size={16} className="text-[#1677ff]" />
                  {tr("Thiết kế áo", "Jersey designs")}
                </h2>
                <Link href="/custom-ao" className="text-xs font-bold text-[#1677ff]">
                  {tr("Tạo mới", "New")}
                </Link>
              </div>
              {designs.length ? (
                <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                  {designs.map((design) => (
                    <li key={design.id}>
                      <Link
                        href={`/custom-ao?design=${design.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs hover:bg-[var(--paper)]"
                      >
                        <b className="truncate">{design.name}</b>
                        <small className="shrink-0 text-[var(--muted)]">
                          {new Date(design.updatedAt).toLocaleDateString(tr("vi-VN", "en-GB"))}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-2 text-xs text-[var(--muted)]">
                  {tr("Bạn chưa lưu thiết kế nào.", "You have no saved designs yet.")}
                </p>
              )}
            </section>
          </aside>

          <div className="grid min-w-0 gap-5">
            <SportProfile />
            {isSeller && (
        <section className="form-card account-card m-0!" id="san-pham-dang-ban">
              <div className="account-card-head flex-wrap">
                <span>
                  <Store size={20} />
                </span>
                <div>
                  <h3>{tr("Sản phẩm đăng bán", "Products for sale")}</h3>
                  <p>
                    {isSeller
                      ? tr(
                          `${listedTotal} sản phẩm đang được đăng bán từ cửa hàng của bạn.`,
                          `${listedTotal} products listed from your shop.`,
                        )
                      : tr(
                          "Đăng ký bán hàng để đưa sản phẩm của bạn lên BOAI.",
                          "Register as a seller to list your products on BOAI.",
                        )}
                  </p>
                </div>
                {isSeller ? (
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/cua-hang/${user.id}`} className="boai-button">
                      <Store size={16} /> {tr("Xem trang shop", "View my shop")}
                    </Link>
                    <Link
                      href="/kenh-ban-hang/san-pham"
                      className="boai-button primary"
                    >
                      {tr("Quản lý sản phẩm", "Manage products")}{" "}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <Link href="/dang-ky-ban-hang" className="boai-button primary">
                    {tr("Đăng ký bán hàng", "Become a seller")}{" "}
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              {listedProducts.length ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {listedProducts.map((product) => {
                      const image =
                        product.image && typeof product.image === "object"
                          ? product.image
                          : null
                      return (
                        <Link
                          key={product.id}
                          href={`/san-pham/${product.slug}`}
                          className="group flex min-w-0 flex-col border border-[var(--line)] bg-[var(--white)] transition hover:-translate-y-0.5 hover:border-[var(--lime)] hover:shadow-md"
                        >
                          <span className="relative block aspect-square overflow-hidden bg-[var(--paper)]">
                            {image?.url ? (
                              <Image
                                src={image.url}
                                alt={image.alt || product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                                className="object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span className="grid size-full place-items-center text-[var(--muted)]">
                                <PackageOpen size={28} />
                              </span>
                            )}
                            {product.stock <= 0 && (
                              <span className="absolute top-2 left-2 bg-[#071a33] px-2 py-1 text-[9px] font-black tracking-wide text-white uppercase">
                                {tr("Hết hàng", "Sold out")}
                              </span>
                            )}
                          </span>
                          <span className="flex flex-1 flex-col gap-1 p-3">
                            <small className="text-[9px] font-extrabold tracking-[.08em] text-[var(--muted)] uppercase">
                              {product.brand}
                            </small>
                            <b className="line-clamp-2 text-xs leading-5">
                              {product.name}
                            </b>
                            <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
                              <strong className="text-sm text-[var(--lime-dark)]">
                                {money.format(product.price)}₫
                              </strong>
                              {product.oldPrice &&
                              product.oldPrice > product.price ? (
                                <s className="text-[10px] text-[var(--muted)]">
                                  {money.format(product.oldPrice)}₫
                                </s>
                              ) : null}
                            </span>
                            <small className="text-[10px] text-[var(--muted)]">
                              {tr("Tồn kho", "Stock")}: {product.stock}
                            </small>
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                  {listedTotal > listedProducts.length && (
                    <p className="hint mt-4 mb-0">
                      {tr(
                        `Đang hiển thị ${listedProducts.length}/${listedTotal} sản phẩm mới nhất.`,
                        `Showing the latest ${listedProducts.length} of ${listedTotal} products.`,
                      )}{" "}
                      <Link href="/kenh-ban-hang/san-pham">
                        {tr("Xem tất cả", "View all")}
                      </Link>
                    </p>
                  )}
                </>
              ) : (
                <div className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--paper)] px-6 py-10 text-center">
                  <PackageOpen size={28} className="text-[var(--lime-dark)]" />
                  <b className="text-sm">
                    {tr("Chưa có sản phẩm đăng bán", "No products listed yet")}
                  </b>
                  <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">
                    {isSeller
                      ? tr(
                          "Thêm sản phẩm đầu tiên trong kênh người bán để khách hàng có thể mua.",
                          "Add your first product in the seller center so customers can buy it.",
                        )
                      : tr(
                          "Sau khi được duyệt bán hàng, sản phẩm của bạn sẽ hiển thị tại đây.",
                          "Once approved as a seller, your products will appear here.",
                        )}
                  </p>
                  {isSeller && (
                    <Link
                      href="/kenh-ban-hang/san-pham"
                      className="text-link text-xs"
                    >
                      {tr("Thêm sản phẩm", "Add a product")}
                    </Link>
                  )}
                </div>
              )}
            </section>
            )}
            <ProfileTimeline initialFeed={feed} session={session} name={user.name} />
          </div>
        </div>
      </section>
    </main>
  )
}
