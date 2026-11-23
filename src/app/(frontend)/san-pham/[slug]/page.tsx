import type { Metadata } from "next"
import { cache } from "react"
import Image from "next/image"
import { EquipmentFitPanel, MatchBadge, RacketRadarPanel } from "../../components/MatchBadge"
import { toDnaProduct } from "@/lib/sportdna"
import type { Media } from "@/payload-types"
import { ProductGallery } from "../../components/ProductGallery"
import { ProductVariantProvider } from "../../components/ProductVariantProvider"
import { getLang, getTr } from "@/lib/i18n-server"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Check,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
} from "lucide-react"
import { findBySlug, getPayloadClient } from "@/lib/payload"
import { SiteHeader } from "../../components/SiteHeader"
import { ProductPurchase } from "../../components/ProductPurchase"
import { ReviewForm } from "../../components/ReviewForm"
import { ReviewDeleteButton } from "../../components/ReviewDeleteButton"
import { isAppAdmin } from "@/access/roles"
import {
  ProductComments,
  type CommentView,
} from "../../components/ProductComments"
import { appAuth } from "@/lib/app-auth"
import { applyActiveEventPricing, eventProductsFirst } from "@/lib/event-pricing"
import { getPublicShop, getShopStats, relationId } from "@/lib/shops"
import { formatAverage, summarizeRatings } from "@/lib/ratings"
import { discountPercent, displayTag, hasDiscount } from "@/lib/pricing"
import { ShopSellerCard } from "../../components/ShopSellerCard"
import { ShopChatLauncher } from "../../components/ShopChatLauncher"
import { shippingFeeFor } from "@/lib/shipping"
import { getShippingSettings } from "@/lib/shipping-server"
import { RETURN_WINDOW_DAYS } from "@/lib/returns"

const money = new Intl.NumberFormat("vi-VN")

// Stock and reviews change per request, so render on demand.
export const dynamic = "force-dynamic"

// One product read shared by the page and its metadata.
const loadProduct = cache((slug: string) => findBySlug("products", slug, { depth: 1 }))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, lang] = await Promise.all([params, getLang()])
  const product = await loadProduct(slug)
  if (!product) return { title: lang === "en" ? "Product not found | BOAI" : "Không tìm thấy sản phẩm | BOAI" }
  const title = `${product.name} | BOAI`
  const description = (product.shortDescription || product.description || "").replace(/\s+/g, " ").trim().slice(0, 180)
  const image = { url: `/api/og/san-pham/${encodeURIComponent(product.slug)}`, width: 1200, height: 630, alt: product.name }
  return {
    title,
    description,
    alternates: { canonical: `/san-pham/${product.slug}` },
    openGraph: { title, description, type: "website", url: `/san-pham/${product.slug}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

const sameName = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi")

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mau?: string | string[]; chon?: string | string[] }>
}) {
  const tr = await getTr()
  const { slug } = await params
  const { mau, chon } = await searchParams
  const requestedColor = typeof mau === "string" ? mau.slice(0, 60) : undefined
  // Quick-buy buttons send buyers here to pick a size first.
  const sizeHint = chon === "size"
  const baseProduct = await loadProduct(slug)
  if (!baseProduct) notFound()
  const payload = await getPayloadClient()
  const [product] = await applyActiveEventPricing(payload, [baseProduct])
  const image = typeof product.image === "object" ? product.image : null
  const gallery = (product.gallery ?? []).filter(
    (g): g is Media => typeof g === "object" && !!g?.url,
  )
  const toGalleryImage = (media: Media) => ({
    id: String(media.id),
    url: media.url!,
    alt: media.alt,
  })
  const fallbackImages = [image, ...gallery]
    .filter((media): media is Media => !!media?.url)
    .map(toGalleryImage)
  const colorVariants = (product.colors ?? []).map((color) => {
    const colorImage = typeof color.image === "object" ? color.image : null
    const colorGallery = (color.gallery ?? []).filter(
      (media): media is Media => typeof media === "object" && !!media?.url,
    )
    return {
      name: color.name,
      images: [colorImage, ...colorGallery]
        .filter((media): media is Media => !!media?.url)
        .map(toGalleryImage),
    }
  })
  const defaultColor =
    product.colors?.find((color) => color.name === requestedColor)?.name ??
    product.colors?.find(
      (color) =>
        color.image &&
        typeof color.image === "object" &&
        color.image.id === image?.id,
    )?.name ?? product.colors?.[0]?.name
  const [user, reviewResult, allRatings, relatedResult, commentResult, shop, shippingSettings, authCodes] =
    await Promise.all([
      appAuth.currentUser(),
      payload.find({
        collection: "reviews",
        where: { product: { equals: product.id } },
        sort: "-createdAt",
        depth: 0,
        limit: 50,
        overrideAccess: false,
      }),
      // Every star of every real review, for the average and distribution.
      payload.find({
        collection: "reviews",
        where: { product: { equals: product.id } },
        depth: 0,
        limit: 5000,
        pagination: false,
        overrideAccess: false,
        select: { rating: true },
      }),
      payload.find({
        collection: "products",
        where: {
          and: [
            { sport: { equals: product.sport } },
            { id: { not_equals: product.id } },
          ],
        },
        depth: 1,
        limit: 4,
        sort: "-match",
        overrideAccess: false,
      }),
      payload.find({
        collection: "product-comments",
        where: { product: { equals: product.id } },
        sort: "createdAt",
        depth: 0,
        limit: 300,
        overrideAccess: false,
      }),
      getPublicShop(payload, relationId(product.seller)),
      getShippingSettings(payload),
      // Show the code check only when the shop has issued codes for this product.
      payload.count({
        collection: "authenticity-codes",
        where: { and: [{ product: { equals: product.id } }, { status: { equals: "active" } }] },
        overrideAccess: true,
      }),
    ])
  // Cheapest real fee: the first-km tariff after the current admin adjustment.
  const firstFee = shippingFeeFor(shippingSettings.firstKm, shippingSettings)
  const firstKm = shippingSettings.firstKm.toLocaleString("vi-VN")
  const sellerId = relationId(product.seller)
  const [shopStats, siblingResult] = await Promise.all([
    shop ? getShopStats(payload, shop) : null,
    // Same shop, same name and category = the same model in another color.
    sellerId
      ? payload.find({
          collection: "products",
          where: {
            and: [
              { seller: { equals: sellerId } },
              { category: { equals: product.category } },
              { id: { not_equals: product.id } },
            ],
          },
          depth: 0,
          limit: 100,
          select: { name: true, slug: true, colors: true },
          overrideAccess: false,
        })
      : null,
  ])
  const ownColorNames = new Set(
    (product.colors ?? []).map((c) => sameName(c.name)),
  )
  const linkedColors = (siblingResult?.docs ?? [])
    .filter((sibling) => sameName(sibling.name) === sameName(product.name))
    .flatMap((sibling) =>
      (sibling.colors ?? []).map((c) => ({
        name: c.name,
        hex: c.hex,
        href: `/san-pham/${sibling.slug}?mau=${encodeURIComponent(c.name)}`,
      })),
    )
    .filter((c) => {
      const key = sameName(c.name)
      if (ownColorNames.has(key)) return false
      ownColorNames.add(key)
      return true
    })
  const moderator = isAppAdmin(user)
  // Older seller listings stored the shop name as a spec row; it now has its own card.
  const specs = (product.specs ?? []).filter(
    (spec) => spec.label.trim().toLocaleLowerCase("vi") !== "người bán",
  )
  const relId = (v: unknown) =>
    v && typeof v === "object"
      ? String((v as { id: string }).id)
      : v
        ? String(v)
        : null
  const comments: CommentView[] = commentResult.docs
    .map((c) => ({
      id: String(c.id),
      parentId: relId(c.parent),
      authorId: relId(c.author) ?? "",
      authorName: c.authorName,
      body: c.body,
      isSeller: !!c.isSeller,
      createdAt: c.createdAt,
    }))
    // Newest discussions first; replies stay in chronological order.
    .sort((a, b) =>
      !a.parentId && !b.parentId ? b.createdAt.localeCompare(a.createdAt) : 0,
    )
  const ratingSummary = summarizeRatings(allRatings.docs)
  const distribution = ratingSummary.distribution
  const relatedProducts = eventProductsFirst(
    await applyActiveEventPricing(payload, relatedResult.docs),
  )
  const reviews = reviewResult.docs
  // Only real customer reviews count (no catalogue baseline).
  const totalReviews = ratingSummary.count
  const avgRating = ratingSummary.average
  const discount = discountPercent(product.price, product.oldPrice)
  const LEVEL: Record<string, string> = {
    beginner: tr("Mới chơi", "Beginner"),
    amateur: tr("Phong trào", "Amateur"),
    "semi-pro": tr("Bán chuyên", "Semi-pro"),
    pro: tr("Chuyên nghiệp", "Professional"),
  }

  return (
    <main
      className={`detail-page ${
        product.eventVisual
          ? `event-product-page event-text-${product.eventVisual.textPosition} event-font-${product.eventVisual.fontFamily}`
          : ""
      }`}
      style={
        product.eventVisual
          ? {
              "--event-background": product.eventVisual.backgroundColor,
              "--event-text-color": product.eventVisual.textColor,
              "--event-title-color": product.eventVisual.titleTypography.color,
              "--event-title-size": `${product.eventVisual.titleTypography.fontSize}px`,
              "--event-slogan-color":
                product.eventVisual.sloganTypography.color,
              "--event-slogan-size": `${product.eventVisual.sloganTypography.fontSize}px`,
              "--event-description-color":
                product.eventVisual.descriptionTypography.color,
              "--event-description-size": `${product.eventVisual.descriptionTypography.fontSize}px`,
            } as React.CSSProperties
          : undefined
      }
    >
      <SiteHeader />
      {product.eventVisual && (
        <section className="product-event-hero">
          {product.eventVisual.image && (
            <Image
              src={product.eventVisual.image}
              alt={product.eventVisual.imageAlt}
              fill
              preload
              sizes="100vw"
              className="object-cover"
            />
          )}
          <span className="product-event-overlay" />
          <div className="product-event-copy page-shell">
            <small>{tr(`SỰ KIỆN ĐANG DIỄN RA · GIẢM ${product.eventDiscount}%`, `EVENT LIVE · ${product.eventDiscount}% OFF`)}</small>
            <h2
              className={`event-copy-title event-type-${product.eventVisual.titleTypography.fontFamily}`}
            >
              {product.eventName}
            </h2>
            {product.eventVisual.slogan && (
              <strong
                className={`event-copy-slogan event-type-${product.eventVisual.sloganTypography.fontFamily}`}
              >
                {product.eventVisual.slogan}
              </strong>
            )}
            <p
              className={`event-copy-description event-type-${product.eventVisual.descriptionTypography.fontFamily}`}
            >
              {product.eventVisual.description}
            </p>
          </div>
        </section>
      )}
      <div className="detail-breadcrumb page-shell">
        <Link href="/">
          <ArrowLeft size={15} /> {tr("Trang chủ", "Home")}
        </Link>
        <span>/</span>
        <Link href={product.sport === "football" ? "/#bong-da" : "/#cau-long"}>
          {tr(product.sport === "football" ? "Bóng đá" : "Cầu lông")}
        </Link>
        <span>/</span>
        <b>{product.name}</b>
      </div>
      <ProductVariantProvider
        key={`${product.id}:${defaultColor ?? ""}`}
        variants={colorVariants}
        defaultColor={defaultColor}
        fallbackImages={fallbackImages}
      >
        <section className="product-detail page-shell">
          <div className="detail-gallery">
            <ProductGallery images={fallbackImages} />
            {(product.eventName || displayTag(product.tag)) && (
              <span className="detail-tag">
                {product.eventName
                  ? `${product.eventName} · −${product.eventDiscount}%`
                  : displayTag(product.tag)}
              </span>
            )}
            <MatchBadge product={toDnaProduct(product)} variant="detail" />
          </div>
          <div className="detail-copy">
            <div className="detail-brand">
              {product.brand} · {tr(product.category)}
            </div>
            <h1>{product.name}</h1>
            {shop && (
              <Link
                href={`/cua-hang/${shop.id}`}
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--lime-dark)]"
              >
                <Store size={14} className="text-[var(--lime-dark)]" />
                {tr("Bán bởi", "Sold by")}{" "}
                <b className="text-[var(--ink)]">{shop.name}</b>
              </Link>
            )}
            <div className="detail-rating">
              {avgRating !== null ? (
                <>
                  <Star size={16} fill="currentColor" />{" "}
                  <b>{formatAverage(avgRating)}</b>
                  <a href="#danh-gia">
                    ({totalReviews} {tr("đánh giá", "reviews")})
                  </a>
                </>
              ) : (
                <a href="#danh-gia">{tr("Chưa có đánh giá", "No reviews yet")}</a>
              )}
              <i>
                {product.stock > 0
                  ? tr(
                      `Còn ${product.stock} sản phẩm`,
                      `${product.stock} in stock`,
                    )
                  : tr(
                      "Hết hàng — nhận đặt trước",
                      "Sold out — pre-orders open",
                    )}
              </i>
            </div>
            <p className="detail-lead">{product.shortDescription}</p>
            <EquipmentFitPanel product={toDnaProduct(product)} />
            <RacketRadarPanel product={toDnaProduct(product)} />
            <div className="detail-price">
              <b>{money.format(product.price)}₫</b>
              {hasDiscount(product.price, product.oldPrice) && (
                <>
                  <del>{money.format(product.oldPrice)}₫</del>
                  <span className="detail-discount">−{discount}%</span>
                </>
              )}
            </div>
            <ProductPurchase
              product={{
                id: String(product.id),
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                sport: product.sport,
                price: product.price,
                image: image?.url ?? "",
                stock: product.stock,
                category: product.category,
                colors: (product.colors ?? []).map((c) => ({
                  name: c.name,
                  hex: c.hex,
                })),
              }}
              linkedColors={linkedColors}
              sizeHint={sizeHint}
            />
            <div className="detail-services">
              <div>
                <Truck size={20} />
                <span>
                  <b>{tr("Phí giao theo khoảng cách", "Distance-based delivery fee")}</b>
                  <small>
                    {tr(
                      `Từ ${money.format(firstFee)}₫ cho ${firstKm} km đầu`,
                      `From ${money.format(firstFee)}₫ for the first ${firstKm} km`,
                    )}
                  </small>
                </span>
              </div>
              {authCodes.totalDocs > 0 ? (
                <Link href="/xac-thuc" className="text-inherit no-underline">
                  <ShieldCheck size={20} />
                  <span>
                    <b>{tr("Có mã xác thực chính hãng", "Authenticity code included")}</b>
                    <small className="underline">{tr("Kiểm tra mã xác thực", "Verify authenticity code")}</small>
                  </span>
                </Link>
              ) : (
                <div>
                  <ShieldCheck size={20} />
                  <span>
                    <b>{tr("Shop đã được BOAI duyệt", "BOAI-approved shop")}</b>
                    <small>{tr("Hoàn tiền nếu hàng không đúng mô tả", "Refund if not as described")}</small>
                  </span>
                </div>
              )}
              <div>
                <PackageCheck size={20} />
                <span>
                  <b>{tr(`Đổi trả ${RETURN_WINDOW_DAYS} ngày`, `${RETURN_WINDOW_DAYS}-day returns`)}</b>
                  <small>{tr("Gửi yêu cầu ngay trong trang Đơn hàng", "Request it from your Orders page")}</small>
                </span>
              </div>
            </div>
          </div>
        </section>
      </ProductVariantProvider>
      {shop && shopStats && (
        <ShopSellerCard
          shop={shop}
          stats={shopStats}
          tr={tr}
          canChat={!user || String(user.id) !== shop.id}
        />
      )}
      {shop && (!user || String(user.id) !== shop.id) && (
        <ShopChatLauncher
          shopId={shop.id}
          shopName={shop.name}
          avatarUrl={shop.avatarUrl}
          product={{
            id: String(product.id),
            name: product.name,
            slug: product.slug,
            image: image?.url ?? null,
          }}
        />
      )}
      <section className="detail-info page-shell">
        <div>
          <div className="eyebrow">
            {tr("VỀ SẢN PHẨM", "ABOUT THE PRODUCT")}
          </div>
          <h2>
            {tr("Được tạo ra", "Built")}
            <br />
            {tr("để nâng tầm ", "to elevate ")}
            <em>{tr("lối chơi.", "your game.")}</em>
          </h2>
          <p>{product.description}</p>
          <ul>
            {product.features?.map((item) => (
              <li key={item.id}>
                <Check size={16} />
                {item.feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="spec-table">
          <div className="eyebrow">
            {tr("THÔNG SỐ KỸ THUẬT", "SPECIFICATIONS")}
          </div>
          {specs.length ? (
            specs.map((spec) => (
              <div key={spec.id}>
                <span>{tr(spec.label)}</span>
                <b>{tr(spec.value)}</b>
              </div>
            ))
          ) : (
            <p className="hint">
              {tr(
                "Người bán chưa cập nhật thông số kỹ thuật cho sản phẩm này.",
                "The seller has not added specifications for this product yet.",
              )}
            </p>
          )}
        </div>
      </section>
      <section className="page-shell reviews-section" id="danh-gia">
        <div className="eyebrow">
          {tr("ĐÁNH GIÁ TỪ NGƯỜI CHƠI", "PLAYER REVIEWS")}
        </div>
        <div className="reviews-grid">
          <div>
            {avgRating !== null ? (
              <div className="review-summary">
                <b>{formatAverage(avgRating)}</b>
                <div>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={16}
                        fill={avgRating >= n - 0.25 ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span>
                    ({totalReviews} {tr("đánh giá", "reviews")})
                  </span>
                </div>
              </div>
            ) : (
              <p className="mb-4 text-sm font-semibold text-[var(--muted)]">{tr("Chưa có đánh giá", "No reviews yet")}</p>
            )}
            {totalReviews > 0 && (
              <div className="mb-5 grid max-w-md gap-1.5">
                {distribution.map((d) => (
                  <div
                    key={d.star}
                    className="flex items-center gap-2.5 text-xs"
                  >
                    <span className="inline-flex w-7 items-center gap-0.5 font-bold">
                      {d.star}
                      <Star size={11} fill="currentColor" />
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden bg-[var(--line)]">
                      <span
                        className="block h-full bg-[var(--lime)]"
                        style={{
                          width: `${(d.count / totalReviews) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="w-6 text-right text-[var(--muted)]">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {reviews.length ? (
              reviews.map((r) => (
                <article className="review-item" key={r.id}>
                  <div className="review-top">
                    <span className="avatar-sm">
                      {r.authorName.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <b>{r.authorName}</b>
                      <small>
                        {tr(
                          r.level
                            ? (LEVEL[r.level] ?? "Người chơi")
                            : "Người chơi",
                          r.level ? undefined : "Player",
                        )}
                        {r.verifiedPurchase
                          ? ` · ${tr("Đã mua hàng", "Verified purchase")}`
                          : ""}{" "}
                        ·{" "}
                        {new Date(r.createdAt).toLocaleDateString(
                          tr("vi-VN", "en-GB"),
                        )}
                      </small>
                    </div>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          fill={r.rating >= n ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                  </div>
                  <p>{r.comment}</p>
                  {(moderator ||
                    (user && String(relId(r.author)) === String(user.id))) && (
                    <ReviewDeleteButton id={String(r.id)} moderator={moderator} />
                  )}
                </article>
              ))
            ) : (
              <p className="hint">
                {tr(
                  "Chưa có nhận xét chi tiết nào. Hãy là người đầu tiên chia sẻ cảm nhận.",
                  "No written reviews yet. Be the first to share your thoughts.",
                )}
              </p>
            )}
          </div>
          <ReviewForm
            productId={String(product.id)}
            slug={product.slug}
            loggedIn={!!user}
          />
        </div>
      </section>
      <section className="page-shell reviews-section" id="binh-luan">
        <div className="eyebrow">
          {tr("HỎI ĐÁP & BÌNH LUẬN", "Q&A & COMMENTS")} · {comments.length}
        </div>
        <div className="max-w-3xl">
          <ProductComments
            productId={String(product.id)}
            comments={comments}
            currentUserId={user ? String(user.id) : null}
            canModerate={moderator}
          />
        </div>
      </section>
      {relatedResult.docs.length > 0 && (
        <section className="page-shell reviews-section">
          <div className="eyebrow">
            {tr("CÓ THỂ BẠN CŨNG THÍCH", "YOU MAY ALSO LIKE")}
          </div>
          <div className="product-grid">
            {relatedProducts.map((p) => {
              const img = typeof p.image === "object" ? (p.image.url ?? "") : ""
              return (
                <Link
                  className="product-card"
                  key={p.id}
                  href={`/san-pham/${p.slug}`}
                >
                  <div className="product-image-wrap">
                    {img && (
                      <Image
                        src={img}
                        alt={typeof p.image === "object" ? p.image.alt : p.name}
                        fill
                        sizes="(max-width: 720px) 50vw, 25vw"
                      />
                    )}
                    <MatchBadge product={toDnaProduct(p)} />
                  </div>
                  <div className="product-info">
                    <div className="product-meta">
                      <span>{p.brand}</span>
                      <span>{tr(p.category)}</span>
                    </div>
                    <h3>{p.name}</h3>
                    {p.sellerShopName && (
                      <small className="product-shop">
                        <Store size={12} /> {p.sellerShopName}
                      </small>
                    )}
                    <div className="product-bottom">
                      <div className="price">
                        <b>{money.format(p.price)}₫</b>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
