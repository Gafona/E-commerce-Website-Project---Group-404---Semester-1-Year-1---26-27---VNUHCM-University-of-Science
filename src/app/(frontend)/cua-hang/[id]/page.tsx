import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  PackageCheck,
  Search,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { applyActiveEventPricing, eventProductsFirst } from "@/lib/event-pricing"
import { getPublicShop, getShopStats } from "@/lib/shops"
import { formatAverage } from "@/lib/ratings"
import { RatingLine } from "../../components/RatingLine"
import { SiteHeader } from "../../components/SiteHeader"
import { ShopAvatar } from "../../components/ShopAvatar"
import { ProductResultCard } from "../../components/ProductResultCard"
import { ShopRenameForm } from "../../components/ShopRenameForm"
import {
  OpenShopChatButton,
  ShopChatLauncher,
} from "../../components/ShopChatLauncher"
import { appAuth } from "@/lib/app-auth"

// Products, stock, reviews and orders change continuously.
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const { id } = await params
  const shop = await getPublicShop(await getPayloadClient(), id)
  return shop
    ? localizedTitle(
        `${shop.name} — Shop trên BOAI`,
        `${shop.name} — Shop on BOAI`,
      )
    : localizedTitle("Không tìm thấy shop — BOAI", "Shop not found — BOAI")
}

export default async function ShopPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ mon?: string }> }) {
  const [{ id }, { mon }, tr, payload, viewer] = await Promise.all([
    params,
    searchParams,
    getTr(),
    getPayloadClient(),
    appAuth.currentUser(),
  ])
  const shop = await getPublicShop(payload, id)
  if (!shop) notFound()
  const isOwner = !!viewer && String(viewer.id) === shop.id

  const [stats, productResult] = await Promise.all([
    getShopStats(payload, shop),
    payload.find({
      collection: "products",
      depth: 1,
      limit: 200,
      sort: "-createdAt",
      overrideAccess: false,
      where: { seller: { equals: shop.id } },
    }),
  ])
  const products = eventProductsFirst(
    await applyActiveEventPricing(payload, productResult.docs),
  )
  const eventProducts = products.filter((product) => product.eventDiscount)
  const eventVisual = eventProducts[0]?.eventVisual
  const eventTopDiscount = eventProducts.reduce(
    (max, product) => Math.max(max, product.eventDiscount ?? 0),
    0,
  )
  const productIds = products.map((product) => product.id)
  const { docs: recentReviews } = productIds.length
    ? await payload.find({
        collection: "reviews",
        depth: 0,
        limit: 4,
        sort: "-createdAt",
        overrideAccess: false,
        where: { product: { in: productIds } },
      })
    : { docs: [] }
  const productName = new Map(products.map((p) => [String(p.id), p.name]))

  const sport = mon === "football" || mon === "badminton" ? mon : null
  const visible = sport ? products.filter((p) => p.sport === sport) : products
  const tab = (value?: string) =>
    `/cua-hang/${shop.id}${value ? `?mon=${value}` : ""}`
  const joined = new Date(shop.joinedAt).toLocaleDateString(
    tr("vi-VN", "en-GB"),
    { month: "long", year: "numeric" },
  )
  const rating = stats.rating
  const highlights = [
    {
      icon: <Star size={18} fill="currentColor" />,
      value: rating.average !== null ? `${formatAverage(rating.average)} (${rating.count})` : tr("Chưa có đánh giá", "No reviews yet"),
      label: tr("Đánh giá của khách", "Customer rating"),
    },
    {
      icon: <Store size={18} />,
      value: String(stats.productCount),
      label: tr(
        `${stats.inStockCount} sản phẩm còn hàng`,
        `${stats.inStockCount} in stock`,
      ),
    },
    {
      icon: <PackageCheck size={18} />,
      value: String(stats.soldUnits),
      label: tr("Sản phẩm đã bán", "Items sold"),
    },
    {
      icon: <Truck size={18} />,
      value: stats.completionRate === null ? tr("Chưa có đơn", "No orders yet") : `${Math.round(stats.completionRate * 100)}%`,
      label: tr("Giao hàng thành công", "Successful deliveries"),
    },
  ]

  return (
    <main className="search-page">
      <SiteHeader />
      <div className="page-shell pt-6">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> {tr("Về trang chính", "Back to home")}
        </Link>
      </div>

      <section className="page-shell mt-4">
        <div className="relative overflow-hidden bg-[#071a33] text-white">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-[var(--lime)] opacity-25 blur-3xl"
          />
          <div className="relative flex flex-wrap items-center gap-6 p-6 sm:p-9">
            <ShopAvatar
              name={shop.name}
              url={shop.avatarUrl}
              size={104}
              className="ring-4 ring-white/20"
            />
            <div className="min-w-0 flex-1">
              <small className="text-[10px] font-black tracking-[.16em] text-white/70 uppercase">
                {tr("Cửa hàng trên BOAI", "Shop on BOAI")}
              </small>
              <h1 className="m-0 mt-1 flex flex-wrap items-center gap-2 font-[family-name:var(--display)] text-4xl leading-none uppercase sm:text-5xl">
                {shop.name}
                <BadgeCheck size={28} className="text-[#7fb2ff]" />
              </h1>
              <p className="m-0 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/75">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} />{" "}
                  {tr("Người bán đã xác minh", "Verified seller")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} /> {tr("Tham gia", "Joined")} {joined}
                </span>
              </p>
              <div className="mt-4 max-w-xl">
                {isOwner ? (
                  <ShopRenameForm name={shop.name} tone="dark" />
                ) : (
                  <OpenShopChatButton className="boai-button primary" />
                )}
              </div>
            </div>
            <div className="grid min-w-36 place-items-center border border-white/15 bg-white/5 px-6 py-4 text-center">
              {rating.average !== null ? (
                <>
                  <b className="flex items-center gap-2 font-[family-name:var(--display)] text-5xl leading-none">
                    <Star size={30} fill="currentColor" className="text-[#ffd24a]" aria-hidden />
                    {formatAverage(rating.average)}
                  </b>
                  <small className="mt-2 text-[11px] font-bold text-white/75">
                    {tr(`(${rating.count} đánh giá)`, `(${rating.count} reviews)`)}
                  </small>
                </>
              ) : (
                <>
                  <Star size={28} className="text-white/60" aria-hidden />
                  <small className="mt-2 text-[11px] font-bold text-white/75">
                    {tr("Chưa có đánh giá", "No reviews yet")}
                  </small>
                </>
              )}
            </div>
          </div>
          <dl className="relative m-0 grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.label} className="bg-[#071a33] px-6 py-4">
                <dt className="text-[11px] text-white/65">{item.label}</dt>
                <dd className={`m-0 mt-1 flex items-center gap-2 font-black ${/\d/.test(item.value) ? "text-xl" : "text-sm"}`}>
                  <span className="text-[#7fb2ff]">{item.icon}</span>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="page-shell mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border border-[var(--line)] bg-[var(--white)] p-5 sm:p-7">
          <div className="eyebrow">{tr("ĐÁNH GIÁ CỦA KHÁCH HÀNG", "CUSTOMER REVIEWS")}</div>
          <h2 className="m-0 mt-2 font-[family-name:var(--display)] text-3xl uppercase">
            {tr("Khách hàng chấm shop thế nào", "How customers rate this shop")}
          </h2>
          <p className="mt-2 mb-5 text-sm leading-6 text-[var(--muted)]">
            {tr(
              "Trung bình cộng số sao của mọi đánh giá thật thuộc các sản phẩm của shop.",
              "The average star rating of every real review on this shop's products.",
            )}
          </p>
          <RatingLine
            average={rating.average}
            count={rating.count}
            tr={tr}
            long
            className="flex items-center gap-2 text-2xl font-black [&_svg]:size-6 [&_svg]:text-[#e0a800] [&_span]:text-sm [&_span]:font-semibold [&_span]:text-[var(--muted)] [&.no-rating]:text-base [&.no-rating]:font-semibold [&.no-rating]:text-[var(--muted)]"
          />
          {rating.count > 0 && (
            <div className="mt-5 grid max-w-lg gap-2" aria-label={tr("Phân bố số sao", "Star distribution")}>
              {rating.distribution.map((row) => (
                <div key={row.star} className="flex items-center gap-3 text-xs">
                  <span className="inline-flex w-8 shrink-0 items-center gap-0.5 font-bold">
                    {row.star}
                    <Star size={11} fill="currentColor" className="text-[#e0a800]" aria-hidden />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden bg-[var(--paper)]">
                    <span
                      className="block h-full bg-[var(--lime)]"
                      style={{ width: `${(row.count / rating.count) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[var(--muted)] tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="border border-[var(--line)] bg-[var(--white)] p-5 sm:p-7">
          <div className="eyebrow">
            {tr("KHÁCH HÀNG NÓI GÌ", "WHAT CUSTOMERS SAY")}
          </div>
          {recentReviews.length ? (
            <div className="mt-4 grid gap-4">
              {recentReviews.map((review) => (
                <article
                  key={review.id}
                  className="border-b border-[var(--line)] pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm">{review.authorName}</b>
                    <span className="flex shrink-0 text-[var(--lime-dark)]">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={12}
                          fill={review.rating >= n ? "currentColor" : "none"}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="m-0 mt-1 line-clamp-3 text-xs leading-5 text-[var(--muted)]">
                    {review.comment}
                  </p>
                  <small className="mt-1 block text-[10px] text-[var(--muted)]">
                    {productName.get(String(review.product)) ?? ""}
                    {review.verifiedPurchase
                      ? ` · ${tr("Đã mua hàng", "Verified purchase")}`
                      : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="hint mt-4">
              {tr(
                "Shop chưa có nhận xét nào từ khách hàng.",
                "This shop has no customer reviews yet.",
              )}
            </p>
          )}
        </aside>
      </section>

      {eventProducts.length > 0 && (
        <section
          className="page-shell mt-10 px-4 py-7 sm:px-8"
          style={{
            background: eventVisual?.backgroundColor ?? "#071a33",
            color: eventVisual?.textColor ?? "#ffffff",
          }}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <ShopAvatar name={shop.name} url={shop.avatarUrl} size={52} />
              <div className="min-w-0">
                <small className="text-[11px] font-black tracking-[0.18em] uppercase opacity-80">
                  {tr("Shop đang tham gia sự kiện", "This shop is in an event")}
                </small>
                <h2 className="m-0 truncate font-[family-name:var(--display)] text-3xl leading-tight font-black uppercase sm:text-4xl">
                  {eventProducts[0]?.eventName}
                </h2>
              </div>
            </div>
            <span className="bg-white px-4 py-2 font-[family-name:var(--display)] text-2xl font-black text-[#071a33]">
              {tr(`Giảm đến ${eventTopDiscount}%`, `Up to ${eventTopDiscount}% off`)}
            </span>
          </div>
          <div className="product-grid">
            {eventProducts.slice(0, 8).map((product) => (
              <ProductResultCard key={product.id} product={product} tr={tr} />
            ))}
          </div>
        </section>
      )}

      <section className="page-shell search-hero mt-10">
        <div className="eyebrow">
          {tr("SẢN PHẨM CỦA SHOP", "SHOP PRODUCTS")}
        </div>
        <h2 className="m-0 font-[family-name:var(--display)] text-4xl uppercase">
          {tr("Tất cả sản phẩm", "All products")}
        </h2>
        <div className="sport-tabs">
          <Link className={!sport ? "active" : ""} href={tab()}>
            {tr("Tất cả")} ({products.length})
          </Link>
          <Link
            className={sport === "football" ? "active" : ""}
            href={tab("football")}
          >
            {tr("Bóng đá")} (
            {products.filter((p) => p.sport === "football").length})
          </Link>
          <Link
            className={sport === "badminton" ? "active" : ""}
            href={tab("badminton")}
          >
            {tr("Cầu lông")} (
            {products.filter((p) => p.sport === "badminton").length})
          </Link>
        </div>
      </section>
      <section className="page-shell">
        {visible.length ? (
          <div className="product-grid">
            {visible.map((product) => (
              <ProductResultCard key={product.id} product={product} tr={tr} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={28} />
            <h3>{tr("Chưa có sản phẩm", "No products yet")}</h3>
            <p>
              {tr(
                "Shop chưa đăng sản phẩm nào trong mục này.",
                "This shop has no products in this category yet.",
              )}
            </p>
          </div>
        )}
      </section>

      {!isOwner && (
        <ShopChatLauncher
          shopId={shop.id}
          shopName={shop.name}
          avatarUrl={shop.avatarUrl}
        />
      )}
    </main>
  )
}
