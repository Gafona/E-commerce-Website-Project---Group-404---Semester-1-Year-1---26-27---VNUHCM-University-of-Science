import Link from "next/link"
import { getTr } from "@/lib/i18n-server"
import { ArrowLeft, ArrowRight, BadgeCheck } from "lucide-react"
import { getPayloadClient } from "@/lib/payload"
import { applyActiveEventPricing, eventProductsFirst } from "@/lib/event-pricing"
import { SiteHeader } from "../components/SiteHeader"
import { ProductResultCard } from "../components/ProductResultCard"
import { ShopAvatar } from "../components/ShopAvatar"
import { matchesSearch, matchesShop, type SearchItem } from "@/lib/search"
import { listPublicShops, relationId } from "@/lib/shops"
import { filtersFromParams } from "@/lib/catalog-filters"
import { SearchCatalog } from "./SearchCatalog"

import { localizedTitle } from "@/lib/i18n-server"
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return localizedTitle("Tìm kiếm — BOAI", "Search — BOAI")
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) ?? ""
  // Every filter (sport, type, brands, price, size, colour, stock, sort) lives in the URL.
  const initial = filtersFromParams(params)
  const tr = await getTr()
  const payload = await getPayloadClient()
  const { docs: baseProducts } = await payload.find({
    collection: "products",
    depth: 1,
    pagination: false,
    sort: "-match",
    overrideAccess: false,
  })
  const [docs, shops] = await Promise.all([
    applyActiveEventPricing(payload, baseProducts).then(eventProductsFirst),
    listPublicShops(payload, baseProducts),
  ])

  const items: SearchItem[] = docs.map((p) => ({
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    category: p.category,
    price: p.price,
    image: typeof p.image === "object" ? (p.image.url ?? "") : "",
  }))

  const matchedShops = q.trim() ? shops.filter((s) => matchesShop(s, q)) : []
  const matchedShopIds = new Set(matchedShops.map((s) => s.id))
  const matched = q.trim()
    ? docs.filter((p) => matchesSearch(p, q) || matchedShopIds.has(relationId(p.seller)))
    : docs
  const related = q.trim()
    ? docs.filter((p) => !matched.includes(p) && matched.some((m) => m.sport === p.sport)).slice(0, 4)
    : []
  const fallback = matched.length ? related : docs.slice(0, 4)

  return (
    <main className="search-page">
      <SiteHeader searchItems={items} searchShops={shops} defaultSearch={q} />
      <section className="page-shell search-hero">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> {tr("Về trang chính", "Back to home")}
        </Link>
        <div className="eyebrow">
          {tr("KẾT QUẢ TÌM KIẾM", "SEARCH RESULTS")}
        </div>
        <h1>{q ? <>“{q}”</> : tr("Tất cả sản phẩm", "All products")}</h1>
        <p>
          {q
            ? tr(`${matched.length} sản phẩm khớp từ khóa`, `${matched.length} products match the keyword`)
            : tr(`${matched.length} sản phẩm đang bán`, `${matched.length} products on sale`)}
        </p>
      </section>
      {matchedShops.length > 0 && (
        <section className="page-shell mb-8">
          <div className="eyebrow mb-3">
            {tr("CỬA HÀNG PHÙ HỢP", "MATCHING SHOPS")} · {matchedShops.length}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchedShops.slice(0, 6).map((shop) => (
              <Link
                key={shop.id}
                href={`/cua-hang/${shop.id}`}
                className="group flex items-center gap-4 border border-[var(--line)] bg-[var(--white)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--lime)] hover:shadow-md"
              >
                <ShopAvatar name={shop.name} url={shop.avatar || null} size={52} />
                <span className="min-w-0 flex-1">
                  <b className="flex items-center gap-1.5 truncate text-sm">
                    {shop.name}
                    <BadgeCheck size={15} className="shrink-0 text-[var(--lime-dark)]" />
                  </b>
                  <small className="text-xs text-[var(--muted)]">
                    {tr(`${shop.productCount} sản phẩm`, `${shop.productCount} products`)}
                  </small>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--lime-dark)]"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="page-shell">
        <SearchCatalog products={matched} initial={initial} query={q} />
      </section>
      {fallback.length > 0 && (
        <section className="page-shell search-related">
          <div className="eyebrow">
            {matched.length
              ? tr("SẢN PHẨM LIÊN QUAN", "RELATED PRODUCTS")
              : tr("CÓ THỂ BẠN QUAN TÂM", "YOU MAY LIKE")}
          </div>
          <div className="product-grid">
            {fallback.map((p) => (
              <ProductResultCard key={p.id} product={p} tr={tr} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
