"use client"

import Image from "next/image"
import Link from "next/link"
import {
  BadgePercent,
  Flame,
  GitCompare,
  Heart,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Timer,
  Zap,
} from "lucide-react"
import { useState } from "react"
import { useShop } from "../components/ShopProvider"
import { useQuickAdd, type QuickProduct } from "../components/useQuickAdd"
import { PRODUCT_TYPES, deriveProductType, isProductType, type ProductTypeId } from "@/lib/product-types"
import { discountPercent } from "@/lib/pricing"
import { formatEventMoment } from "@/lib/event-dates"

type SaleProduct = {
  id: string
  slug: string
  name: string
  brand: string
  sport: "football" | "badminton"
  category: string
  productType?: string | null
  price: number
  oldPrice: number
  image: string
  imageAlt: string
  color?: string
  shopName?: string | null
  /** Live platform event giving this price (null = the shop's own sale price). */
  eventId?: string | null
  eventName?: string | null
  eventEndsAt?: string | null
  /** Event-price units left; null = unlimited. */
  quotaLeft?: number | null
}

const money = new Intl.NumberFormat("vi-VN")

export function SaleIntro({
  maxDiscount,
  productCount,
}: {
  maxDiscount: number
  productCount: number
}) {
  const { tr } = useShop()
  return (
    <>
      <section className="sale-hero">
        <div className="sale-hero-noise" />
        <div className="page-shell sale-hero-inner">
          <div className="sale-hero-copy">
            <span>
              <Flame size={15} fill="currentColor" /> BOAI DEAL ZONE
            </span>
            <h1>
              {tr("Giá hạ nhiệt.", "Prices down.")}
              <br />
              <em>{tr("Phong độ lên cao.", "Performance up.")}</em>
            </h1>
            <p>
              {tr(
                "Ưu đãi được đồng bộ trực tiếp từ giá bán và chiến dịch của người bán. Không mã ẩn, không bước thừa.",
                "Offers sync directly from seller pricing and campaigns. No hidden codes, no extra steps.",
              )}
            </p>
            <a className="sale-hero-cta" href="#deals">
              {tr("Săn deal ngay", "Shop deals")} <Zap size={17} />
            </a>
          </div>
          <div className="sale-hero-stat">
            <small>{tr("GIẢM ĐẾN", "SAVE UP TO")}</small>
            <b>{maxDiscount || 0}%</b>
            <span>
              {productCount} {tr("lựa chọn", "offers")}
            </span>
          </div>
        </div>
      </section>
      <div className="sale-trust">
        <span>
          <Timer size={17} />{" "}
          {tr("Giá cập nhật theo chiến dịch", "Campaign-synced pricing")}
        </span>
        <span>
          <ShieldCheck size={17} />{" "}
          {tr(
            "Mua trực tiếp, thanh toán an toàn",
            "Direct purchase, secure checkout",
          )}
        </span>
      </div>
    </>
  )
}

type SaleEvent = { id: string; name: string; endsAt: string; maxDiscount: number }
/** "all", a live event id, or "shop" for the shops' own sale prices. */
type EventFilter = string

export function SaleCatalog({ products, events = [], initialEvent = null }: { products: SaleProduct[]; events?: SaleEvent[]; initialEvent?: string | null }) {
  const shop = useShop()
  const quick = useQuickAdd()
  const { tr } = shop
  const [type, setType] = useState<ProductTypeId | "all">("all")
  const [eventFilter, setEventFilter] = useState<EventFilter>(initialEvent && events.some((event) => event.id === initialEvent) ? initialEvent : "all")
  const typeOf = (product: SaleProduct) =>
    isProductType(product.productType) ? product.productType : deriveProductType(product)
  const inEvent = (product: SaleProduct) =>
    eventFilter === "all" || (eventFilter === "shop" ? !product.eventId : product.eventId === eventFilter)
  const eventProducts = products.filter(inEvent)
  const shown = type === "all" ? eventProducts : eventProducts.filter((product) => typeOf(product) === type)
  const shopOnly = products.filter((product) => !product.eventId).length
  const pickEvent = (next: EventFilter) => {
    setEventFilter(next)
    setType("all")
    // Keep the address shareable (the homepage event buttons link here with ?su-kien=).
    const url = new URL(window.location.href)
    if (next === "all") url.searchParams.delete("su-kien")
    else url.searchParams.set("su-kien", next)
    window.history.replaceState(null, "", url)
  }
  const toQuick = (product: SaleProduct): QuickProduct => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    sport: product.sport,
    price: product.price,
    image: product.image,
    category: product.category,
    color: product.color,
  })

  return (
    <section className="sale-catalog page-shell">
      <div className="sale-catalog-head">
        <div>
          <span>
            <Sparkles size={14} /> {tr("GIÁ TỐT ĐANG DIỄN RA", "LIVE OFFERS")}
          </span>
          <h2>{tr("Chọn deal. Vào sân.", "Pick a deal. Get in the game.")}</h2>
        </div>
        <p>
          {products.length}{" "}
          {tr(
            "sản phẩm đang có giá ưu đãi: giá sự kiện toàn sàn (tự bật/tắt theo giờ) và giá giảm riêng của shop.",
            "products on offer: platform event prices (switching on and off by the hour) and shops' own sale prices.",
          )}
        </p>
      </div>
      {events.length > 0 && products.length > 0 && (
        <div className="mb-3 flex min-w-0">
          <div className="filter-chips scroll" role="group" aria-label={tr("Sự kiện đang diễn ra", "Live events")}>
            <button type="button" className={`filter-chip ${eventFilter === "all" ? "active" : ""}`} aria-pressed={eventFilter === "all"} onClick={() => pickEvent("all")}>
              {tr("Mọi ưu đãi", "All offers")}
              <small>{products.length}</small>
            </button>
            {events.map((event) => {
              const count = products.filter((product) => product.eventId === event.id).length
              return (
                <button key={event.id} type="button" className={`filter-chip ${eventFilter === event.id ? "active" : ""}`} aria-pressed={eventFilter === event.id} onClick={() => pickEvent(event.id)}>
                  <Zap size={12} fill="currentColor" /> {event.name}
                  {event.maxDiscount > 0 && <span>−{event.maxDiscount}%</span>}
                  <small>
                    {count} · {tr("đến", "until")} {formatEventMoment(Date.parse(event.endsAt))}
                  </small>
                </button>
              )
            })}
            {shopOnly > 0 && (
              <button type="button" className={`filter-chip ${eventFilter === "shop" ? "active" : ""}`} aria-pressed={eventFilter === "shop"} onClick={() => pickEvent("shop")}>
                {tr("Giá giảm riêng của shop", "Shops' own sale prices")}
                <small>{shopOnly}</small>
              </button>
            )}
          </div>
        </div>
      )}
      {eventProducts.length > 0 && (
        <div className="mb-5 flex min-w-0">
          <div className="filter-chips scroll" role="group" aria-label={tr("Loại sản phẩm", "Product type")}>
            <button type="button" className={`filter-chip ${type === "all" ? "active" : ""}`} aria-pressed={type === "all"} onClick={() => setType("all")}>
              {tr("Tất cả")}
              <small>{eventProducts.length}</small>
            </button>
            {PRODUCT_TYPES.map((item) => {
              const count = eventProducts.filter((product) => typeOf(product) === item.id).length
              if (!count) return null
              return (
                <button key={item.id} type="button" className={`filter-chip ${type === item.id ? "active" : ""}`} aria-pressed={type === item.id} onClick={() => setType(type === item.id ? "all" : item.id)}>
                  {tr(item.vi, item.en)}
                  <small>{count}</small>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {shown.length ? (
        <div className="sale-product-grid">
          {shown.map((product) => {
            const percent = discountPercent(product.price, product.oldPrice)
            const liked = shop.favorites.includes(product.slug)
            const compared = shop.compare.includes(product.slug)
            return (
              <article className="sale-product-card product-card" key={product.id}>
                <div className="sale-product-image">
                  <Link href={`/san-pham/${product.slug}`} className="absolute inset-0" aria-label={tr(`Xem ${product.name}`, `View ${product.name}`)}>
                    {product.image && (
                      <Image
                        src={product.image}
                        alt={product.imageAlt || product.name}
                        fill
                        sizes="(max-width: 720px) 100vw, 33vw"
                      />
                    )}
                  </Link>
                  <b>−{percent}%</b>
                  {product.eventName && (
                    <em className="absolute bottom-2 left-2 z-[2] max-w-[calc(100%-1rem)] truncate bg-[#071a33] px-2 py-1 text-[10px] font-black not-italic tracking-wide text-white uppercase">
                      {product.eventName}
                    </em>
                  )}
                  <button
                    type="button"
                    className={`heart-button z-[3] ${liked ? "liked" : ""}`}
                    onClick={() => shop.toggleFavorite(product.slug)}
                    aria-label={tr(`Yêu thích ${product.name}`, `Save ${product.name}`)}
                    aria-pressed={liked}
                  >
                    <Heart size={19} fill={liked ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    className={`heart-button compare-button z-[3] ${compared ? "liked" : ""}`}
                    onClick={() => shop.toggleCompare(product.slug)}
                    aria-label={tr(`So sánh ${product.name}`, `Compare ${product.name}`)}
                    aria-pressed={compared}
                    title={tr("So sánh")}
                  >
                    <GitCompare size={17} />
                  </button>
                  <button type="button" className="quick-add z-[3]" onClick={() => quick.add(toQuick(product))} aria-label={tr(`Thêm ${product.name} vào giỏ`, `Add ${product.name} to cart`)}>
                    {tr("Thêm vào giỏ")} <Plus size={17} />
                  </button>
                </div>
                <div className="sale-product-copy">
                  <small>
                    {product.brand} ·{" "}
                    {tr(product.sport === "football" ? "Bóng đá" : "Cầu lông")}
                  </small>
                  <Link href={`/san-pham/${product.slug}`}>
                    <h3>{product.name}</h3>
                  </Link>
                  {product.shopName && (
                    <small className="product-shop">
                      <Store size={12} /> <span className="truncate">{product.shopName}</span>
                    </small>
                  )}
                  <div className="sale-price">
                    <strong>{money.format(product.price)}₫</strong>
                    <del>{money.format(product.oldPrice)}₫</del>
                  </div>
                  {(product.eventEndsAt || (product.quotaLeft !== null && product.quotaLeft !== undefined)) && (
                    <small className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-[var(--orange,#c2410c)]">
                      {product.eventEndsAt && (
                        <span className="inline-flex items-center gap-1">
                          <Timer size={12} />
                          {tr("Kết thúc", "Ends")}{" "}
                          {formatEventMoment(Date.parse(product.eventEndsAt))}
                        </span>
                      )}
                      {product.quotaLeft !== null && product.quotaLeft !== undefined && (
                        <span>{tr(`Còn ${product.quotaLeft} suất`, `${product.quotaLeft} left`)}</span>
                      )}
                    </small>
                  )}
                  <button onClick={() => quick.buyNow(toQuick(product))}>
                    <ShoppingBag size={16} /> {tr("Mua ngay", "Buy now")}{" "}
                    <Zap size={16} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="sale-empty">
          <BadgePercent size={34} />
          {eventFilter !== "all" && products.length > 0 ? (
            <>
              <h3>
                {eventFilter === "shop"
                  ? tr("Chưa có giá giảm riêng của shop", "No shop sale prices yet")
                  : tr(
                      `“${events.find((event) => event.id === eventFilter)?.name ?? ""}” chưa có sản phẩm được duyệt`,
                      `“${events.find((event) => event.id === eventFilter)?.name ?? ""}” has no approved products yet`,
                    )}
              </h3>
              <p>{tr("Các shop vẫn đang đăng ký tham gia. Trong lúc chờ, xem các ưu đãi khác đang diễn ra.", "Shops are still joining. Meanwhile, browse the other live offers.")}</p>
              <button type="button" className="boai-button dark" onClick={() => pickEvent("all")}>
                {tr("Xem mọi ưu đãi", "See all offers")}
              </button>
            </>
          ) : (
            <>
          <h3>
            {tr("Ưu đãi mới đang được chuẩn bị", "New offers are on the way")}
          </h3>
          <p>
            {tr(
              "Quay lại sớm để không bỏ lỡ mức giá mới từ các gian hàng.",
              "Check back soon for fresh seller offers.",
            )}
          </p>
          <Link className="boai-button dark" href="/">
            {tr("Xem tất cả sản phẩm", "Browse all products")}
          </Link>
            </>
          )}
        </div>
      )}
    </section>
  )
}
