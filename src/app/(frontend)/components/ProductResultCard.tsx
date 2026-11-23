import Image from "next/image"
import Link from "next/link"
import { Store } from "lucide-react"
import { discountPercent, hasDiscount } from "@/lib/pricing"
import { RatingLine } from "./RatingLine"
import type { Tr } from "@/lib/i18n"
import type { PricedProduct } from "@/lib/event-pricing"
import { toDnaProduct } from "@/lib/sportdna"
import { MatchBadge } from "./MatchBadge"
import { deriveProductType, isProductType, productTypeLabel } from "@/lib/product-types"

const money = new Intl.NumberFormat("vi-VN")

export function ProductResultCard({
  product,
  tr,
}: {
  product: PricedProduct
  tr: Tr
}) {
  const image = product.image
  const src = typeof image === "object" ? (image.url ?? "") : ""
  return (
    <Link className="product-card" href={`/san-pham/${product.slug}`}>
      <div className="product-image-wrap">
        {src && (
          <Image
            src={src}
            alt={typeof image === "object" ? image.alt : product.name}
            fill
            sizes="(max-width: 720px) 50vw, 25vw"
          />
        )}
        {product.eventName && (
          <span className="product-tag">{product.eventName}</span>
        )}
        {hasDiscount(product.price, product.oldPrice) && (
          <span className={`product-discount ${product.eventName ? "with-tag" : ""}`}>
            −{discountPercent(product.price, product.oldPrice)}%
          </span>
        )}
        <MatchBadge product={toDnaProduct(product)} />
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.brand}</span>
          <span>
            {(() => {
              const type = productTypeLabel(isProductType(product.productType) ? product.productType : deriveProductType(product))
              return type ? `${tr(type.vi, type.en)} · ` : ""
            })()}
            {tr(product.sport === "football" ? "Bóng đá" : "Cầu lông")}
          </span>
        </div>
        <h3>{product.name}</h3>
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
        </div>
      </div>
    </Link>
  )
}
