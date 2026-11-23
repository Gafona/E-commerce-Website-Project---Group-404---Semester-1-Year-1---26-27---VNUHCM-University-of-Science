import Link from "next/link"
import Image from "next/image"
import { Megaphone, Pencil, Trash2 } from "lucide-react"
import { deleteProductAction } from "../actions"
import { db, requireSeller, sellerProducts, vnd } from "../seller-lib"
import { ProductForm } from "./ProductForm"
import { getTr } from "@/lib/i18n-server"
import { listProductTaxonomies } from "@/lib/product-taxonomies"

export default async function SellerProducts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; loai?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? "").trim().toLowerCase()
  const loai = (params.loai ?? "").trim()
  const seller = await requireSeller()
  const tr = await getTr()
  const now = new Date().toISOString()
  const [sellerProductList, taxonomies, running] = await Promise.all([
    sellerProducts(seller.id),
    db().then(listProductTaxonomies),
    // Paid homepage spots running right now (approved, within their dates).
    db().then((payload) =>
      payload.find({
        collection: "recommendation-requests",
        where: { and: [{ status: { equals: "approved" } }, { startsAt: { less_than_equal: now } }, { endsAt: { greater_than: now } }] },
        depth: 0,
        limit: 100,
        pagination: false,
        overrideAccess: false,
        user: seller,
        select: { product: true },
      }),
    ),
  ])
  const recommendedIds = new Set(running.docs.map((doc) => String(typeof doc.product === "object" && doc.product ? doc.product.id : doc.product)))
  // Category chips come from the seller's own listings, so every option has results.
  const categories = [
    ...sellerProductList
      .reduce((map, p) => map.set(p.category, (map.get(p.category) ?? 0) + 1), new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
  const products = sellerProductList.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (!loai || p.category === loai),
  )
  const filterHref = (category: string) => {
    const query = new URLSearchParams()
    if (q) query.set("q", q)
    if (category) query.set("loai", category)
    const text = query.toString()
    return `/kenh-ban-hang/san-pham${text ? `?${text}` : ""}`
  }
  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Quản lý gian hàng", "Store management")}</small>
          <h1>{tr("Sản phẩm", "Products")}</h1>
        </div>
      </header>
      <div className="sc-grid2 wide-left">
        <section className="sc-card">
          <div className="sc-card-head">
            <h3>
              {tr("Sản phẩm của bạn", "Your products")} ({products.length})
            </h3>
            <form>
              {loai && <input type="hidden" name="loai" value={loai} />}
              <input
                name="q"
                defaultValue={q}
                placeholder={tr("Tìm sản phẩm...", "Search products...")}
                className="sc-search"
              />
            </form>
          </div>
          {categories.length > 0 && (
            <nav
              aria-label={tr("Lọc theo loại sản phẩm", "Filter by product type")}
              className="mb-4 flex flex-wrap gap-2"
            >
              {[["", sellerProductList.length] as const, ...categories].map(([category, count]) => {
                const active = category === loai
                return (
                  <Link
                    key={category || "all"}
                    href={filterHref(category)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold transition ${
                      active
                        ? "border-[var(--lime)] bg-[var(--lime)] text-white"
                        : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--lime)]"
                    }`}
                  >
                    {category ? tr(category) : tr("Tất cả", "All")}
                    <span className={active ? "text-white/80" : "text-[var(--muted)]"}>{count}</span>
                  </Link>
                )
              })}
            </nav>
          )}
          {products.length ? (
            <table className="sc-table sc-product-table">
              <thead>
                <tr>
                  <th className="sc-col-thumb">
                    <span className="sr-only">{tr("Ảnh", "Image")}</span>
                  </th>
                  <th>{tr("Tên", "Name")}</th>
                  <th className="sc-col-num">{tr("Giá", "Price")}</th>
                  <th className="sc-col-num sc-col-stock">{tr("Kho", "Stock")}</th>
                  <th className="sc-col-actions">
                    <span className="sr-only">{tr("Thao tác", "Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const img = typeof p.image === "object" ? p.image?.url : null
                  return (
                    <tr key={p.id}>
                      <td className="sc-col-thumb">
                        <span className="sc-thumb">
                          {img && (
                            <Image
                              src={img}
                              alt=""
                              width={48}
                              height={48}
                            />
                          )}
                        </span>
                      </td>
                      <td>
                        <Link href={`/san-pham/${p.slug}`}>{p.name}</Link>
                        <small className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)]">
                          {tr(p.category)}
                          {(p.colors ?? []).length > 0 && <span aria-hidden>·</span>}
                          {(p.colors ?? []).map((c) => (
                            <span
                              key={c.id ?? c.name}
                              title={c.name}
                              className="inline-block size-3 rounded-full border border-[var(--line)]"
                              style={{ background: c.hex }}
                            />
                          ))}
                        </small>
                        {recommendedIds.has(String(p.id)) && (
                          <span className="sc-promoted">
                            <Megaphone size={11} />
                            {tr("Đang đề xuất", "Recommended now")}
                          </span>
                        )}
                      </td>
                      <td className="sc-col-num">
                        {vnd(p.price)}
                        {p.oldPrice && p.oldPrice > p.price && (
                          <small className="sc-sale-price">
                            −{Math.min(99, Math.round((1 - p.price / p.oldPrice) * 100))}%
                          </small>
                        )}
                      </td>
                      <td className="sc-col-num sc-col-stock">{p.stock}</td>
                      <td className="sc-col-actions">
                        <div className="sc-actions">
                        <Link
                          className="sc-icon edit"
                          href={`/kenh-ban-hang/san-pham/${p.id}`}
                          aria-label={tr("Sửa", "Edit")}
                        >
                          <Pencil size={16} />
                        </Link>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="sc-icon" aria-label={tr("Xóa")}>
                            <Trash2 size={16} />
                          </button>
                        </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : sellerProductList.length ? (
            <p className="sc-empty">
              {tr("Không có sản phẩm phù hợp bộ lọc.", "No products match this filter.")}{" "}
              <Link href="/kenh-ban-hang/san-pham">{tr("Xóa bộ lọc", "Clear filters")}</Link>
            </p>
          ) : (
            <p className="sc-empty">
              {tr(
                "Chưa có sản phẩm. Đăng sản phẩm đầu tiên ở bên cạnh.",
                "No products yet. Publish your first product using the form.",
              )}
            </p>
          )}
        </section>
        <section className="sc-card">
          <h3>{tr("Đăng sản phẩm mới", "Publish a new product")}</h3>
          <p className="sc-empty">
            {tr(
              "Sản phẩm sẽ được lưu và hiển thị ngay trên website, không cần admin nhập lại.",
              "The product will be saved and shown on the website immediately.",
            )}
          </p>
          <ProductForm taxonomies={taxonomies} />
        </section>
      </div>
    </>
  )
}
