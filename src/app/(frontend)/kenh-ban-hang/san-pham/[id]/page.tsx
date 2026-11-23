import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { db, requireSeller, sellerProduct } from "../../seller-lib"
import { EditForm } from "./EditForm"
import { getTr } from "@/lib/i18n-server"
import { listProductTaxonomies } from "@/lib/product-taxonomies"
import { specValuesByLabel } from "@/lib/product-specs"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const seller = await requireSeller()
  const tr = await getTr()
  const p = await sellerProduct(seller.id, id)
  if (!p) notFound()
  const img = typeof p.image === "object" ? p.image?.url : null
  const images = [p.image, ...(p.gallery ?? [])]
    .filter((m) => m && typeof m === "object" && m.url)
    .map((m) => ({
      id: String((m as { id: string }).id),
      url: (m as { url: string }).url,
    }))
  const payload = await db()
  const [reviews, comments, taxonomies] = await Promise.all([
    payload.find({
      collection: "reviews",
      where: { product: { equals: p.id } },
      depth: 0,
      limit: 5,
      sort: "-createdAt",
      overrideAccess: false,
    }),
    payload.find({
      collection: "product-comments",
      where: { product: { equals: p.id } },
      depth: 0,
      limit: 5,
      sort: "-createdAt",
      overrideAccess: false,
    }),
    listProductTaxonomies(payload),
  ])
  return (
    <>
      <header className="sc-head">
        <div>
          <small>
            <Link href="/kenh-ban-hang/san-pham">
              ← {tr("Sản phẩm", "Products")}
            </Link>
          </small>
          <h1>{tr("Sửa sản phẩm", "Edit product")}</h1>
        </div>
        <Link className="boai-button" href={`/san-pham/${p.slug}`}>
          {tr("Xem trên cửa hàng", "View in store")}
        </Link>
      </header>
      <div className="sc-grid2 wide-left">
        <section className="sc-card">
          <EditForm
            taxonomies={taxonomies}
            p={{
              id: p.id,
              name: p.name,
              sport: p.sport,
              category: p.category,
              productType: p.productType ?? null,
              brand: p.brand,
              price: p.price,
              oldPrice: p.oldPrice,
              stock: p.stock,
              description: p.description,
              specs: specValuesByLabel(p.specs ?? []),
              images,
              colors: (p.colors ?? []).map((c) => ({
                id: c.id ?? undefined,
                name: c.name,
                hex: c.hex,
                images: [c.image, ...(c.gallery ?? [])]
                  .filter((m) => m && typeof m === "object" && m.url)
                  .map((m) => ({
                    id: String((m as { id: string }).id),
                    url: (m as { url: string }).url,
                  })),
              })),
            }}
          />
        </section>
        <section className="sc-card">
          <h3>{tr("Ảnh chính", "Main photo")}</h3>
          {img && (
            <Image
              src={img}
              alt={p.name}
              width={800}
              height={800}
              className="sc-preview-img"
            />
          )}
          <p className="sc-empty">
            {images.length} {tr("ảnh", "photos")} · {tr("Đánh giá", "Rating")}:{" "}
            {p.reviews > 0 ? `★ ${p.rating.toFixed(1)} (${p.reviews})` : tr("Chưa có đánh giá", "No reviews yet")} · {comments.totalDocs}{" "}
            {tr("bình luận", "comments")}
          </p>
          {comments.docs.length > 0 && (
            <div className="mt-4 grid gap-2">
              <h3 className="!mb-0">
                {tr("Bình luận gần đây", "Recent comments")}
              </h3>
              {comments.docs.map((c) => (
                <p
                  key={c.id}
                  className="m-0 border-t border-[var(--line)] pt-2 text-xs leading-relaxed"
                >
                  <b>{c.authorName}</b>
                  {c.isSeller ? ` · ${tr("Bạn", "You")}` : ""}: {c.body}
                </p>
              ))}
            </div>
          )}
          <Link
            className="boai-button mt-4 w-full"
            href={`/san-pham/${p.slug}#binh-luan`}
          >
            {tr("Trả lời bình luận", "Reply to comments")}
          </Link>
        </section>
      </div>
    </>
  )
}
