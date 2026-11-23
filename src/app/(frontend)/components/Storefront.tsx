"use client"
// Show the stronger of the two sport profiles, or a "take the test" prompt until one is taken.
// Personal fit per product; null for sports whose quiz has not been taken.
/* This is a remote editorial image, so a native image avoids applying
             the Payload media loader intended for CMS uploads. */
import { useEffect, useMemo, useState } from "react"
import { MatchBadge, useSportDnaContext } from "./MatchBadge"
import { CustomKitPromo } from "./CustomKitPromo"
import { fitFor, preferredSkill, toDnaProduct } from "@/lib/sportdna"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  GitCompare,
  Minus,
  ChevronDown,
  ExternalLink,
  Heart,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  X,
  Zap,
} from "lucide-react"
import type { Product, User as AppUser } from "@/payload-types"
import type { LiveEventSummary, PricedProduct } from "@/lib/event-pricing"
import { formatEventMoment } from "@/lib/event-dates"
import { EventDots, eventStyle, useRotation } from "./EventCarousel"
import { SearchBox } from "./SearchBox"
import type { SearchItem, ShopSearchItem } from "@/lib/search"
import { useShop } from "./ShopProvider"
import { ProductImage } from "./ProductImage"
import { useQuickAdd, type QuickProduct } from "./useQuickAdd"
import { deriveProductType, isProductType, productTypeLabel } from "@/lib/product-types"
import { EMPTY_FILTERS } from "@/lib/catalog-filters"
import { useCatalogFilters } from "./catalog/useCatalogFilters"
import { CatalogControls } from "./catalog/CatalogControls"

import { useSiteContent } from "./SiteContentProvider"
import type { SiteImageView } from "@/lib/site-images"
import { SiteHeader } from "./SiteHeader"
import { RatingLine } from "./RatingLine"
import { discountPercent, displayTag, hasDiscount, maxDiscountOf } from "@/lib/pricing"
import { fillSection, type RecommendationPosition } from "@/lib/recommendations"

const money = new Intl.NumberFormat("vi-VN")
const typeOf = (product: { productType?: string | null; category: string; name: string }) =>
  isProductType(product.productType) ? product.productType : deriveProductType(product)


export type StorefrontImages = {
  hero: SiteImageView | null
  football: SiteImageView | null
  badminton: SiteImageView | null
}


/** Decorative slot photo from the website image library. */
function SlotPhoto({ image, sizes, className = "", preload }: { image: SiteImageView | null; sizes: string; className?: string; preload?: boolean }) {
  if (!image) return null
  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      preload={preload}
      className={`object-cover ${className}`}
      style={{ objectPosition: image.objectPosition }}
    />
  )
}

export type AthleteStoryCard = {
  id: string
  name: string
  sport: "football" | "badminton"
  traitsVi: string
  traitsEn: string
  imageUrl: string
  imageAlt: string
  objectPosition: string
  creditAuthor: string | null
  creditUrl: string | null
  license: string | null
  licenseUrl: string | null
}

const imageOf = (product: Product) =>
  typeof product.image === "object" && product.image.url
    ? product.image.url
    : ""

export function Storefront({
  products,
  recommended,
  recommendationSlots,
  shops,
  athleteStories,
  images,
  user,
  activeEvents,
}: {
  products: PricedProduct[]
  /** Product ids of paid "Đề xuất" spots running today, ranked, per homepage section. */
  recommended: Record<RecommendationPosition, string[]>
  recommendationSlots: number
  shops: ShopSearchItem[]
  athleteStories: AthleteStoryCard[]
  images: StorefrontImages
  user: Pick<AppUser, "name" | "email"> | null
  /** Platform events running now (several can overlap), soonest-ending first. */
  activeEvents: LiveEventSummary[]
}) {
  const quick = useQuickAdd()
  const shop = useShop()
  const catalog = useCatalogFilters(products)
  const { t } = useSiteContent()
  const hotline = t("contact.hotline")
  const { profiles: dnaProfiles, preferences: dnaPreferences, runs: dnaRuns } =
    useSportDnaContext()
  const fits = useMemo(
    () =>
      new Map(
        products.map((p) => [
          p.id,
          fitFor(dnaProfiles, toDnaProduct(p), dnaPreferences, dnaRuns)?.score ?? null,
        ]),
      ),
    [products, dnaProfiles, dnaPreferences, dnaRuns],
  )
  const fitValues = [...fits.values()].filter((f): f is number => f !== null)
  const bestFit = fitValues.length ? Math.max(...fitValues) : null
  const preferredTiers = (["football", "badminton"] as const)
    .map((item) => preferredSkill(dnaProfiles, item)?.tier.label)
    .filter(Boolean) as string[]
  const dnaTier = preferredTiers[0] ?? null
  const { tr } = shop
  const [cartOpen, setCartOpen] = useState(false)
  // The catalogue grid shows 24 products at a time; "Xem thêm" reveals the next 24.
  const PAGE_SIZE = 24
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const filtered = catalog.results
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [catalog.filters])

  const football = products.filter((item) => item.sport === "football")
  const badminton = products.filter((item) => item.sport === "badminton")
  // Each sport section: running paid spots first (labelled "Đề xuất"), then the usual picks.
  const sectionOf = (sport: RecommendationPosition, pool: PricedProduct[]) => {
    const byId = new Map(pool.map((item) => [String(item.id), item]))
    const paid = recommended[sport].flatMap((id) => byId.get(id) ?? []).slice(0, recommendationSlots)
    return {
      items: fillSection(paid, pool, Math.max(3, recommendationSlots), recommendationSlots),
      paid: new Set(paid.map((item) => String(item.id))),
    }
  }
  const footballSection = sectionOf("football", football)
  const badmintonSection = sectionOf("badminton", badminton)
  // Same rule as /giam-gia: the largest real discount among visible products.
  const saleProducts = products.filter((item) => hasDiscount(item.price, item.oldPrice))
  const maxDiscount = maxDiscountOf(saleProducts)
  const searchItems: SearchItem[] = products.map((p) => ({
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    category: p.category,
    price: p.price,
    image: imageOf(p),
  }))
  const toQuick = (product: PricedProduct): QuickProduct => ({
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    sport: product.sport,
    price: product.price,
    image: imageOf(product),
    category: product.category,
    color: product.colors?.[0]?.name,
  })
  const cardProps = (product: PricedProduct) => ({
    product,
    liked: shop.favorites.includes(product.slug),
    compared: shop.compare.includes(product.slug),
    onLike: () => shop.toggleFavorite(product.slug),
    onCompare: () => shop.toggleCompare(product.slug),
    // Shoes/apparel open the product page to pick a size; other items are added directly.
    onAdd: () => quick.add(toQuick(product)),
    onBuy: () => quick.buyNow(toQuick(product)),
  })

  const goToSale = () => {
    catalog.setFilters({ ...EMPTY_FILTERS, onSale: true })
    document
      .getElementById("san-pham")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const benefits = (
    [
      [PackageCheck, "homeBenefits.b1Title", "homeBenefits.b1Text"],
      [ArrowRight, "homeBenefits.b2Title", "homeBenefits.b2Text"],
      [Sparkles, "homeBenefits.b3Title", "homeBenefits.b3Text"],
    ] as const
  )
    .map(([Icon, title, text]) => ({ Icon, title: t(title), text: t(text) }))
    .filter((b) => b.title)
  const socials = (
    [
      ["Zalo", "contact.zalo"],
      ["Facebook", "contact.facebook"],
      ["TikTok", "contact.tiktok"],
      ["Instagram", "contact.instagram"],
      ["YouTube", "contact.youtube"],
    ] as const
  )
    .map(([label, key]) => ({ label, href: t(key) }))
    .filter((link) => link.href)

  // Several platform events can run at once: each placement rotates through its own events.
  const heroEvents = activeEvents.filter((event) => event.displayPlacement !== "midpage")
  const midEvents = activeEvents.filter((event) => event.displayPlacement !== "hero")
  const heroRotation = useRotation(heroEvents.length)
  const midRotation = useRotation(midEvents.length)
  const heroEvent = heroEvents[heroRotation.index] ?? null
  const midEvent = midEvents[midRotation.index] ?? null
  const until = (event: LiveEventSummary) => formatEventMoment(Date.parse(event.endsAt))

  return (
    <main
      className={activeEvents.length ? "event-themed-storefront" : undefined}
      style={activeEvents[0] ? eventStyle(activeEvents[0]) : undefined}
    >
      <div className="announcement">
        <span>{t("topbar.left")}</span>
        <span className="announcement-center">{t("topbar.center")}</span>
        <span>
          {hotline && (
            <a href={`tel:${hotline.replace(/[^\d+]/g, "")}`}>Hotline: {hotline}</a>
          )}
        </span>
      </div>

      <SiteHeader
        user={user}
        searchItems={searchItems}
        searchShops={shops}
        onCartClick={() => setCartOpen(true)}
        saleDiscount={maxDiscount}
      />

      <div className="mobile-search-wrap home-mobile-search">
        <SearchBox items={searchItems} shops={shops} />
      </div>

      <section className="hero page-shell" style={heroEvent ? eventStyle(heroEvent) : undefined} {...heroRotation.bind}>
        {heroEvent?.image ? (
          <Image
            key={heroEvent.id}
            className="hero-image object-cover"
            src={heroEvent.image}
            alt={heroEvent.imageAlt}
            fill
            preload
            sizes="(max-width: 1440px) 100vw, 1380px"
          />
        ) : (
          <SlotPhoto
            image={images.hero}
            sizes="(max-width: 1440px) 100vw, 1380px"
            className="hero-image"
            preload
          />
        )}
        <div className="hero-overlay" />
        <div
          className={`hero-copy event-text-${heroEvent?.textPosition ?? "center-left"} event-font-${heroEvent?.fontFamily ?? "display"}`}
        >
          <div className="eyebrow light">
            <Zap size={14} fill="currentColor" />{" "}
            {heroEvent
              ? `${tr("SỰ KIỆN ĐANG DIỄN RA", "EVENT NOW LIVE")} · ${tr("đến", "until")} ${until(heroEvent)}`
              : t("homeHero.eyebrow")}
          </div>
          {heroEvent ? (
            <>
              <h1
                className={`event-copy-title event-type-${heroEvent.titleTypography.fontFamily}`}
              >
                <span>{heroEvent.name}</span>
              </h1>
              {heroEvent.slogan && (
                <strong
                  className={`event-hero-slogan event-copy-slogan event-type-${heroEvent.sloganTypography.fontFamily}`}
                >
                  {heroEvent.slogan}
                </strong>
              )}
              <p
                className={`event-copy-description event-type-${heroEvent.descriptionTypography.fontFamily}`}
              >
                {heroEvent.description}
              </p>
            </>
          ) : (
            <>
              <h1>
                <span>{t("homeHero.title1")}</span>
                {t("homeHero.title2") && <span>{t("homeHero.title2")}</span>}
              </h1>
              {t("homeHero.text") && <p>{t("homeHero.text")}</p>}
            </>
          )}
          <div className="hero-actions">
            {heroEvent ? (
              <Link className="boai-button primary" href={`/giam-gia?su-kien=${heroEvent.id}`}>
                {heroEvent.maxDiscount
                  ? tr(`Ưu đãi đến ${heroEvent.maxDiscount}%`, `Up to ${heroEvent.maxDiscount}% off`)
                  : tr("Xem ưu đãi sự kiện", "See event deals")}{" "}
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                className="boai-button primary"
                onClick={() =>
                  document
                    .getElementById("san-pham")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {t("homeHero.primaryCta")} <ArrowRight size={18} />
              </button>
            )}
            <Link className="boai-button glass" href="/sportdna">
              <Sparkles size={17} />{" "}
              {t("homeHero.secondaryCta")}
            </Link>
          </div>
          <EventDots events={heroEvents} index={heroRotation.index} onSelect={heroRotation.go} className="mt-6" />
        </div>
        <div className="hero-stat desktop-only">
          <Link
            className="stat-ring"
            href="/sportdna"
            style={{ ["--p" as string]: bestFit ?? 0 }}
            title={tr("Xem SportDNA", "View SportDNA")}
          >
            {bestFit === null || bestFit === undefined ? (
              <span className="px-2 text-center text-[11px]! leading-tight">{tr("Làm bài test", "Take the test")}</span>
            ) : (
              <span>{bestFit}%</span>
            )}
            <small>{bestFit === null || bestFit === undefined ? tr("ĐỂ XEM ĐỘ PHÙ HỢP", "TO SEE YOUR FIT") : tr("PHÙ HỢP", "MATCH")}</small>
          </Link>
          <div>
            <b>{t("homeHero.statTitle")}</b>
            <span>{t("homeHero.statText")}</span>
          </div>
        </div>
      </section>

      <EventShowcase
        products={products}
        cardProps={cardProps}
        events={activeEvents}
      />

      <section className="sport-section page-shell" id="bong-da">
        <div className="sport-heading">
          <div>
            <span className="index">01</span>
            <div className="eyebrow">{t("homeFootball.eyebrow")}</div>
            <h2>{t("homeFootball.title")}</h2>
          </div>
          <p>{t("homeFootball.text")}</p>
        </div>
        <div className="featured-strip">
          <div className="feature-photo football-photo">
            <SlotPhoto image={images.football} sizes="(max-width: 900px) 100vw, 35vw" />
          </div>
          <div className="featured-products">
            {footballSection.items.map((product) => (
              <ProductCard key={product.id} {...cardProps(product)} recommended={footballSection.paid.has(String(product.id))} />
            ))}
          </div>
        </div>
        <button
          className="section-cta"
          onClick={() => {
            catalog.update({ sport: "football" })
            document
              .getElementById("san-pham")
              ?.scrollIntoView({ behavior: "smooth" })
          }}
        >
          {tr(
            `Xem tất cả ${football.length} sản phẩm bóng đá`,
            `View all ${football.length} football products`,
          )}{" "}
          <ArrowRight size={18} />
        </button>
      </section>

      {midEvent && (
        <section className="event-mid-banner page-shell" style={eventStyle(midEvent)} {...midRotation.bind}>
          {midEvent.image && (
            <Image
              key={midEvent.id}
              src={midEvent.image}
              alt={midEvent.imageAlt}
              fill
              sizes="(max-width: 1440px) 100vw, 1380px"
              // With "both" placement this reuses the preloaded hero file, so
              // lazy-loading the duplicate only hides the hero from LCP tracking.
              loading={heroEvent?.id === midEvent.id ? "eager" : "lazy"}
              className="object-cover"
            />
          )}
          <div className="event-mid-overlay" />
          <div
            className={`event-mid-copy event-text-${midEvent.textPosition} event-font-${midEvent.fontFamily}`}
          >
            <div className="eyebrow">
              <Sparkles size={14} /> {tr("SỰ KIỆN NỔI BẬT", "FEATURED EVENT")} · {tr("đến", "until")} {until(midEvent)}
            </div>
            <h2
              className={`event-copy-title event-type-${midEvent.titleTypography.fontFamily}`}
            >
              {midEvent.name}
            </h2>
            {midEvent.slogan && (
              <strong
                className={`event-copy-slogan event-type-${midEvent.sloganTypography.fontFamily}`}
              >
                {midEvent.slogan}
              </strong>
            )}
            <p
              className={`event-copy-description event-type-${midEvent.descriptionTypography.fontFamily}`}
            >
              {midEvent.description}
            </p>
            <Link className="boai-button primary" href={`/giam-gia?su-kien=${midEvent.id}`}>
              {midEvent.maxDiscount
                ? tr(
                    `Khám phá ưu đãi đến ${midEvent.maxDiscount}%`,
                    `Explore up to ${midEvent.maxDiscount}% off`,
                  )
                : tr("Khám phá ưu đãi sự kiện", "Explore event deals")}
              <ArrowRight size={18} />
            </Link>
            <EventDots events={midEvents} index={midRotation.index} onSelect={midRotation.go} className="mt-5" />
          </div>
          {midEvent.maxDiscount > 0 && (
            <span className="event-mid-discount">
              −{midEvent.maxDiscount}%
            </span>
          )}
        </section>
      )}

      <section className="sport-section sport-dark" id="cau-long">
        <div className="page-shell">
          <div className="sport-heading">
            <div>
              <span className="index">02</span>
              <div className="eyebrow">{t("homeBadminton.eyebrow")}</div>
              <h2>{t("homeBadminton.title")}</h2>
            </div>
            <p>{t("homeBadminton.text")}</p>
          </div>
          <div className="featured-strip reverse">
            <div className="feature-photo badminton-photo">
              <SlotPhoto image={images.badminton} sizes="(max-width: 900px) 100vw, 35vw" />
            </div>
            <div className="featured-products">
              {badmintonSection.items.map((product) => (
                <ProductCard key={product.id} {...cardProps(product)} recommended={badmintonSection.paid.has(String(product.id))} />
              ))}
            </div>
          </div>
          <button
            className="section-cta light"
            onClick={() => {
              catalog.update({ sport: "badminton" })
              document
                .getElementById("san-pham")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            {tr(
              `Xem tất cả ${badminton.length} sản phẩm cầu lông`,
              `View all ${badminton.length} badminton products`,
            )}{" "}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {athleteStories.length > 0 && (
      <section
        className="page-shell max-w-[1180px] py-14 md:py-20"
        aria-labelledby="athlete-stories-title"
      >
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="eyebrow text-[var(--lime-dark)]">
              <Sparkles size={14} />{" "}
              {t("homeAthletes.eyebrow")}
            </div>
            <h2
              id="athlete-stories-title"
              className="m-0 max-w-3xl [font-family:var(--display)] text-4xl leading-[.92] font-black tracking-[.01em] uppercase italic md:text-6xl"
            >
              {t("homeAthletes.title")}
            </h2>
          </div>
          {t("homeAthletes.text") && (
            <p className="m-0 max-w-md text-xs leading-6 text-[var(--muted)]">
              {t("homeAthletes.text")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {athleteStories.map((athlete, index) => (
            <article
              key={athlete.id}
              className="group overflow-hidden border border-[var(--line)] bg-[var(--white)]"
            >
              <div className="relative aspect-[5/6] overflow-hidden bg-[var(--dark)]">
                <Image
                  src={athlete.imageUrl}
                  alt={tr(
                    athlete.imageAlt,
                    `${athlete.name} in competition`,
                  )}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  style={{ objectPosition: athlete.objectPosition }}
                  className="object-cover grayscale-[20%] transition duration-500 group-hover:scale-[1.035] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 bg-[var(--lime)] px-2 py-1 text-[8px] font-black tracking-widest text-white uppercase">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="absolute right-3 bottom-3 left-3 text-white">
                  <small className="text-[8px] font-extrabold tracking-[.14em] text-white/65 uppercase">
                    {athlete.sport === "badminton"
                      ? tr("Cầu lông", "Badminton")
                      : tr("Bóng đá", "Football")}
                  </small>
                  <h3 className="mt-1 mb-0 [font-family:var(--display)] text-2xl leading-none font-black uppercase italic md:text-3xl">
                    {athlete.name}
                  </h3>
                </div>
              </div>
              <div className="p-3">
                <p className="m-0 text-[9px] font-bold tracking-wide text-[var(--muted)] uppercase">
                  {tr(athlete.traitsVi, athlete.traitsEn)}
                </p>
                {(athlete.creditAuthor || athlete.license) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-[var(--line)] pt-2.5 text-[8px] text-[var(--muted)]">
                    {athlete.creditAuthor &&
                      (athlete.creditUrl ? (
                        <a
                          className="inline-flex items-center gap-1 hover:text-[var(--ink)]"
                          href={athlete.creditUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {athlete.creditAuthor}
                          <ExternalLink size={9} />
                        </a>
                      ) : (
                        <span>{athlete.creditAuthor}</span>
                      ))}
                    {athlete.creditAuthor && athlete.license && <span>·</span>}
                    {athlete.license &&
                      (athlete.licenseUrl ? (
                        <a
                          className="hover:text-[var(--ink)]"
                          href={athlete.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {athlete.license}
                        </a>
                      ) : (
                        <span>{athlete.license}</span>
                      ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {t("homeAthletes.disclaimer") && (
          <p className="mt-4 text-[9px] leading-4 text-[var(--muted)]">
            {t("homeAthletes.disclaimer")}
          </p>
        )}
      </section>
      )}

      <CustomKitPromo />

      <section className="dna-banner page-shell" id="sportdna">
        <Link
          className="dna-score"
          href="/sportdna"
          style={{ ["--p" as string]: bestFit ?? 0 }}
          title={tr("Làm bài kiểm tra SportDNA", "Take the SportDNA quiz")}
        >
          <span>
            BOAI
            <br />
            SPORTDNA™
          </span>
          <b>{dnaTier ?? tr("CHƯA ĐO", "NOT TESTED")}</b>
          <small>
            {bestFit === null ? tr("HỒ SƠ KỸ NĂNG", "SKILL PROFILE") : tr(`FIT TỐT NHẤT ${bestFit}%`, `BEST FIT ${bestFit}%`)}
          </small>
        </Link>
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />{" "}
            {t("homeDna.eyebrow")}
          </div>
          <h2>
            {t("homeDna.title1")}
            <br />
            {t("homeDna.title2")} {t("homeDna.accent") && <em>{t("homeDna.accent")}</em>}
          </h2>
        </div>
        <div>
          <p>{t("homeDna.text")}</p>
          <Link className="boai-button primary" href="/sportdna">
            {t("homeDna.cta")}{" "}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {saleProducts.length > 0 && (
        <section className="sale-banner page-shell" id="sale">
          <div className="sale-stamp">
            <small>BOAI</small>
            <b>SALE</b>
            <span>{t("homeSale.stamp")}</span>
          </div>
          <div className="sale-copy">
            <div className="eyebrow">
              <Zap size={14} fill="currentColor" />{" "}
              {t("homeSale.eyebrow")}
            </div>
            <h2>
              {t("homeSale.title")} <em>{maxDiscount}%</em>
            </h2>
            <p>{t("homeSale.text", { count: saleProducts.length })}</p>
          </div>
          <button className="sale-cta" onClick={goToSale}>
            <span>{t("homeSale.cta")}</span>
            <ArrowRight size={20} />
          </button>
        </section>
      )}

      <section className="products-section page-shell" id="san-pham">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">{t("homeCatalog.eyebrow")}</div>
            <h2>{t("homeCatalog.title")}</h2>
          </div>
          <div className="count-pill">
            {filtered.length} {tr("sản phẩm", "products")}
          </div>
        </div>
        <CatalogControls
          filters={catalog.filters}
          facets={catalog.facets}
          resultCount={filtered.length}
          update={catalog.update}
          reset={catalog.reset}
          fitActive={catalog.fitActive}
        />
        <div className="product-grid">
          {filtered.slice(0, visibleCount).map((product) => (
            <ProductCard key={product.id} {...cardProps(product)} />
          ))}
        </div>
        {filtered.length > visibleCount && (
          <div className="mt-6 flex justify-center">
            <button type="button" className="boai-button" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              {tr(`Xem thêm (${filtered.length - visibleCount} sản phẩm)`, `Show more (${filtered.length - visibleCount} products)`)}
            </button>
          </div>
        )}
        {!filtered.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>{tr("Chưa tìm thấy sản phẩm", "No products found")}</h3>
            <p>
              {tr(
                "Thử đổi bộ lọc để xem thêm lựa chọn.",
                "Try a different filter.",
              )}
            </p>
          </div>
        )}
      </section>

      {benefits.length > 0 && (
        <section className="benefits page-shell">
          {benefits.map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon size={24} />
              <span>
                <b>{title}</b>
                {text && <small>{text}</small>}
              </span>
            </div>
          ))}
        </section>
      )}


      {cartOpen && (
        <div className="overlay" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-panel-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <span>{tr("TÚI CỦA BẠN", "YOUR BAG")}</span>
                <h2 id="cart-panel-title">
                  {shop.count} {tr("sản phẩm", "items")}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setCartOpen(false)}
                aria-label={tr("Đóng giỏ hàng", "Close cart")}
              >
                <X size={21} />
              </button>
            </div>
            <div className="cart-content">
              {shop.cart.length ? (
                shop.cart.map((line) => (
                  <div className="cart-item" key={line.key}>
                    {line.image && (
                      <Link
                        href={`/san-pham/${line.slug}`}
                        onClick={() => setCartOpen(false)}
                      >
                        <Image
                          src={line.image}
                          alt={line.name}
                          width={92}
                          height={112}
                        />
                      </Link>
                    )}
                    <div>
                      <small>{line.brand}</small>
                      <b>{line.name}</b>
                      <span>
                        {[line.color, line.size && `Size ${line.size}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <div className="qty-control">
                        <button
                          onClick={() =>
                            shop.setQuantity(line.key, line.quantity - 1)
                          }
                          aria-label={tr("Giảm")}
                        >
                          <Minus size={12} />
                        </button>
                        <b>{line.quantity}</b>
                        <button
                          onClick={() =>
                            shop.setQuantity(line.key, line.quantity + 1)
                          }
                          aria-label={tr("Tăng")}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <strong>
                        {money.format(line.price * line.quantity)}₫
                      </strong>
                    </div>
                    <button
                      onClick={() => shop.remove(line.key)}
                      aria-label={tr("Xóa")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-cart">
                  <ShoppingBag size={34} />
                  <h3>{tr("Túi của bạn đang trống", "Your bag is empty")}</h3>
                  <p>
                    {tr(
                      "Khám phá trang bị phù hợp nhất với lối chơi của bạn.",
                      "Discover gear that best fits your game.",
                    )}
                  </p>
                </div>
              )}
            </div>
            {!!shop.cart.length && (
              <div className="cart-footer">
                <div>
                  <span>{tr("Tạm tính")}</span>
                  <b>
                    {money.format(
                      shop.cart.reduce(
                        (sum, l) => sum + l.price * l.quantity,
                        0,
                      ),
                    )}
                    ₫
                  </b>
                </div>
                {t("commerce.cartNote") && <small>{t("commerce.cartNote")}</small>}
                <Link className="boai-button primary full" href="/thanh-toan">
                  {tr("Thanh toán", "Checkout")} <ArrowRight size={18} />
                </Link>
                <Link className="text-link" href="/gio-hang">
                  {tr("Xem giỏ hàng chi tiết", "View full cart")}
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}

type CardProps = Parameters<typeof ProductCard>[0]

/** Approved event offers, grouped by live event (chips switch event), then by shop. */
function EventShowcase({
  products,
  cardProps,
  events,
}: {
  products: PricedProduct[]
  cardProps: (product: PricedProduct) => CardProps
  events: LiveEventSummary[]
}) {
  const { tr } = useShop()
  const [selected, setSelected] = useState<string | null>(null)
  type ShopGroup = { shop: NonNullable<PricedProduct["eventShop"]>; percent: number; items: PricedProduct[] }
  const byEvent = new Map<string, { id: string; name: string; visual?: PricedProduct["eventVisual"]; endsAt?: string; percent: number; shops: Map<string, ShopGroup> }>()
  for (const product of products) {
    if (!product.eventShop || !product.eventDiscount || !product.eventId) continue
    const entry = byEvent.get(product.eventId) ?? {
      id: product.eventId,
      name: product.eventName ?? "",
      visual: product.eventVisual,
      endsAt: product.eventEndsAt,
      percent: 0,
      shops: new Map<string, ShopGroup>(),
    }
    const group = entry.shops.get(product.eventShop.id) ?? { shop: product.eventShop, percent: 0, items: [] }
    group.percent = Math.max(group.percent, product.eventDiscount)
    group.items.push(product)
    entry.shops.set(product.eventShop.id, group)
    entry.percent = Math.max(entry.percent, product.eventDiscount)
    byEvent.set(product.eventId, entry)
  }
  // Same order as the event carousel (soonest-ending first).
  const order = new Map(events.map((event, index) => [event.id, index]))
  const list = [...byEvent.values()].sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
  if (!list.length) return null
  const current = list.find((entry) => entry.id === selected) ?? list[0]
  const visual = current.visual
  const eventName = current.name
  const groups = current.shops
  const shopGroups = [...groups.values()].sort((a, b) => b.percent - a.percent)

  return (
    <section
      id="su-kien"
      className="page-shell my-10 px-4 py-8 sm:px-8 sm:py-10"
      style={{
        background: visual?.backgroundColor ?? "#071a33",
        color: visual?.textColor ?? "#ffffff",
      }}
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] uppercase opacity-80">
            <Sparkles size={14} /> {tr("Đề xuất hàng đầu · Sự kiện", "Top picks · Event")}
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-4xl leading-none font-black uppercase sm:text-5xl">
            {eventName}
          </h2>
          {current.endsAt && (
            <p className="m-0 mt-2 text-xs font-semibold opacity-80">
              {tr("Kết thúc", "Ends")} {formatEventMoment(Date.parse(current.endsAt))}
            </p>
          )}
        </div>
        <p className="m-0 max-w-sm text-sm leading-6 opacity-80">
          {tr(
            `${groups.size} cửa hàng đang giảm giá riêng cho sự kiện. Ưu đãi đã được BOAI duyệt.`,
            `${groups.size} shops are running event-only discounts, approved by BOAI.`,
          )}
        </p>
      </header>
      {list.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={tr("Sự kiện đang diễn ra", "Live events")}>
          {list.map((entry) => {
            const active = entry.id === current.id
            return (
              <button
                key={entry.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(entry.id)}
                className={`inline-flex min-h-9 items-center gap-2 border px-3 text-xs font-bold transition ${active ? "border-white bg-white text-[#071a33]" : "border-current bg-transparent opacity-80 hover:opacity-100"}`}
              >
                {entry.name}
                <span className={active ? "text-[var(--lime)]" : ""}>−{entry.percent}%</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="grid gap-6">
        {shopGroups.map(({ shop, percent, items }) => (
          <div key={shop.id} className="bg-[var(--white)] p-4 text-[var(--ink)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
              <Link
                href={`/cua-hang/${shop.id}`}
                className="flex min-w-0 items-center gap-3 text-inherit no-underline"
              >
                <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#071a33] font-[family-name:var(--display)] text-xl font-black text-white">
                  {shop.avatar ? (
                    <Image src={shop.avatar} alt={shop.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    shop.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-base">{shop.name}</b>
                  <small className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                    <Store size={12} /> {tr(`${items.length} sản phẩm tham gia`, `${items.length} products in event`)}
                  </small>
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="bg-[var(--lime)] px-3 py-1.5 font-[family-name:var(--display)] text-lg font-black text-white">
                  {tr(`Giảm đến ${percent}%`, `Up to ${percent}% off`)}
                </span>
                <Link
                  href={`/cua-hang/${shop.id}`}
                  className="flex items-center gap-1 text-xs font-bold text-[var(--ink)]"
                >
                  {tr("Vào shop", "Visit shop")} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {items.slice(0, 4).map((product) => (
                <ProductCard key={product.id} {...cardProps(product)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductCard({
  product,
  liked,
  compared,
  onLike,
  onCompare,
  onAdd,
  onBuy,
  recommended = false,
}: {
  product: PricedProduct
  liked: boolean
  compared: boolean
  onLike: () => void
  onCompare: () => void
  onAdd: () => void
  onBuy: () => void
  /** A paid, approved homepage spot. */
  recommended?: boolean
}) {
  const { tr } = useShop()
  const discount = discountPercent(product.price, product.oldPrice)
  // A tag like "-10%" only repeats (or contradicts) the computed discount badge.
  const tag = displayTag(product.tag)
  const label = recommended ? tr("Đề xuất", "Recommended") : (product.eventName ?? tag)
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link
          href={`/san-pham/${product.slug}`}
          aria-label={tr(`Xem ${product.name}`, `View ${product.name}`)}
        >
          <ProductImage
            src={imageOf(product)}
            alt={
              typeof product.image === "object"
                ? product.image.alt
                : product.name
            }
            fill
            sizes="(max-width: 720px) 50vw, 25vw"
          />
        </Link>
        {label && <span className="product-tag">{label}</span>}
        {discount > 0 && (
          <span className={`product-discount ${label ? "with-tag" : ""}`}>
            −{discount}%
          </span>
        )}
        <button
          className={`heart-button ${liked ? "liked" : ""}`}
          onClick={onLike}
          aria-label={tr("Yêu thích")}
        >
          <Heart size={19} fill={liked ? "currentColor" : "none"} />
        </button>
        <button
          className={`heart-button compare-button ${compared ? "liked" : ""}`}
          onClick={onCompare}
          aria-label={tr("So sánh")}
          title={tr("So sánh")}
        >
          <GitCompare size={17} />
        </button>
        <button className="quick-add" onClick={onAdd}>
          {tr("Thêm vào túi")} <Plus size={17} />
        </button>
        <MatchBadge product={toDnaProduct(product)} />
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span>
            {(() => {
              const type = productTypeLabel(typeOf(product))
              return type ? `${tr(type.vi, type.en)} · ` : ""
            })()}
            {tr(product.sport === "football" ? "Bóng đá" : "Cầu lông")}
          </span>
        </div>
        <Link href={`/san-pham/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        {product.sellerShopName && (
          <small className="product-shop">
            <Store size={12} /> <span className="truncate">{product.sellerShopName}</span>
          </small>
        )}
        <RatingLine average={product.rating} count={product.reviews} tr={tr} />
        <div className="product-bottom">
          <div className="price">
            <b>{money.format(product.price)}₫</b>
            {hasDiscount(product.price, product.oldPrice) && <del>{money.format(product.oldPrice)}₫</del>}
          </div>
          <div className="swatches">
            {product.colors?.map((color) => (
              <i
                key={color.id}
                style={{ background: color.hex }}
                title={tr(color.name)}
              />
            ))}
          </div>
        </div>
        <button className="product-buy-now" onClick={onBuy}>
          <Zap size={15} fill="currentColor" />
          {tr("Mua ngay", "Buy now")}
        </button>
      </div>
    </article>
  )
}
