import Link from "next/link"
import type { Where } from "payload"
import { MessageSquareText, Star } from "lucide-react"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { ProductFeedbackControls } from "../AdminControls"
import { Badge, Empty, PageHead, Pager, param, SearchForm, type SearchParams, Tabs } from "../ui"

export const metadata = { title: "Đánh giá & bình luận | Quản trị BOAI" }

const productOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { name?: string; slug?: string }) : null

export default async function FeedbackModerationPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const tab = param(sp.tab) === "comments" ? "comments" : "reviews"
  const stars = Number(param(sp.stars))
  const rating = stars >= 1 && stars <= 5 ? stars : 0
  const q = param(sp.q).trim().slice(0, 100)
  const page = Math.max(1, Math.min(500, Number(param(sp.page)) || 1))
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const qs = (extra: Record<string, string | number>) =>
    "/quan-tri/danh-gia?" +
    new URLSearchParams(
      Object.entries({ tab, stars: rating || "", q, ...extra })
        .filter(([, v]) => v !== "" && v !== 0 && v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString()

  const searchWhere: Where[] = q ? [{ or: [{ comment: { like: q } }, { authorName: { like: q } }] }] : []
  const reviewWhere: Where = {
    and: [...(rating ? [{ rating: { equals: rating } }] : []), ...searchWhere],
  }
  const commentWhere: Where = q ? { or: [{ body: { like: q } }, { authorName: { like: q } }] } : {}

  // Star chips show how many reviews match each star under the current search.
  const [starCounts, searchedTotal] = await Promise.all([
    Promise.all(
      ([5, 4, 3, 2, 1] as const).map((star) =>
        payload.count({ collection: "reviews", where: { and: [{ rating: { equals: star } }, ...searchWhere] }, ...scoped }).then((r) => [star, r.totalDocs] as const),
      ),
    ),
    payload.count({ collection: "reviews", where: { and: searchWhere }, ...scoped }),
  ])
  const [reviews, comments, reviewTotal, commentTotal] = await Promise.all([
    tab === "reviews"
      ? payload.find({ collection: "reviews", where: reviewWhere, sort: "-createdAt", limit: 25, page, depth: 1, ...scoped })
      : null,
    tab === "comments"
      ? payload.find({ collection: "product-comments", where: commentWhere, sort: "-createdAt", limit: 25, page, depth: 1, ...scoped })
      : null,
    payload.count({ collection: "reviews", ...scoped }),
    payload.count({ collection: "product-comments", ...scoped }),
  ])

  return (
    <>
      <PageHead eyebrow="Kiểm duyệt" title="Đánh giá & bình luận sản phẩm">
        <SearchForm
          action="/quan-tri/danh-gia"
          q={q}
          placeholder={tab === "reviews" ? "Tìm theo nội dung hoặc tên…" : "Tìm trong bình luận…"}
          hidden={{ tab, stars: rating ? String(rating) : "" }}
        />
      </PageHead>
      <Tabs
        active={tab}
        items={[
          { key: "reviews", href: `/quan-tri/danh-gia?${new URLSearchParams({ ...(rating ? { stars: String(rating) } : {}), ...(q ? { q } : {}) })}`, label: "Đánh giá có sao", count: reviewTotal.totalDocs },
          { key: "comments", href: `/quan-tri/danh-gia?${new URLSearchParams({ tab: "comments", ...(rating ? { stars: String(rating) } : {}), ...(q ? { q } : {}) })}`, label: "Bình luận & hỏi đáp", count: commentTotal.totalDocs },
        ]}
      />
      {tab === "reviews" && (
        <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Lọc theo số sao">
          <span className="text-[11px] font-bold text-[var(--muted)]">Số sao:</span>
          {[{ star: 0, label: "Tất cả", count: searchedTotal.totalDocs }, ...starCounts.map(([star, count]) => ({ star, label: `${star}★`, count }))].map((chip) => {
            const active = rating === chip.star
            return (
              <Link
                key={chip.star}
                href={qs({ stars: chip.star, page: 1 })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold no-underline ${
                  active ? "border-[#071a33] bg-[#071a33] text-white" : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#071a33]"
                }`}
              >
                {chip.label}
                <span className={active ? "opacity-80" : "text-[var(--muted)]"}>{chip.count}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {reviews &&
        (reviews.docs.length ? (
          <section className="sc-card p-0">
            <ul className="m-0 list-none p-0">
              {reviews.docs.map((review) => {
                const product = productOf(review.product)
                return (
                  <li key={review.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0">
                    <div className="min-w-0 flex-1 basis-[420px]">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <b className="text-[12px] text-[var(--ink)]">{review.authorName}</b>
                        <span>·</span>
                        <span>{fmtDate(review.createdAt, true)}</span>
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#c98a00]" aria-label={`${review.rating} sao`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} size={11} fill={i < review.rating ? "currentColor" : "none"} />
                          ))}
                        </span>
                        {review.verifiedPurchase && <Badge tone="delivered">Đã mua hàng</Badge>}
                      </div>
                      <p className="m-0 text-[13px] leading-5 whitespace-pre-line">{review.comment}</p>
                      {product?.slug && (
                        <Link href={`/san-pham/${product.slug}#danh-gia`} className="mt-1.5 inline-block text-[11px] text-[var(--muted)] underline-offset-2 hover:underline">
                          Sản phẩm: {product.name}
                        </Link>
                      )}
                    </div>
                    <ProductFeedbackControls kind="review" id={String(review.id)} />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : (
          <Empty icon={<Star size={22} />} title="Không có đánh giá" text="Không tìm thấy đánh giá phù hợp với bộ lọc." />
        ))}

      {comments &&
        (comments.docs.length ? (
          <section className="sc-card p-0">
            <ul className="m-0 list-none p-0">
              {comments.docs.map((comment) => {
                const product = productOf(comment.product)
                return (
                  <li key={comment.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0">
                    <div className="min-w-0 flex-1 basis-[420px]">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <b className="text-[12px] text-[var(--ink)]">{comment.authorName}</b>
                        <span>·</span>
                        <span>{fmtDate(comment.createdAt, true)}</span>
                        {comment.parent && <Badge>Trả lời</Badge>}
                        {comment.isSeller && <Badge tone="confirmed">Người bán</Badge>}
                      </div>
                      <p className="m-0 text-[13px] leading-5 whitespace-pre-line">{comment.body}</p>
                      {product?.slug && (
                        <Link href={`/san-pham/${product.slug}#binh-luan`} className="mt-1.5 inline-block text-[11px] text-[var(--muted)] underline-offset-2 hover:underline">
                          Sản phẩm: {product.name}
                        </Link>
                      )}
                    </div>
                    <ProductFeedbackControls kind="comment" id={String(comment.id)} />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : (
          <Empty icon={<MessageSquareText size={22} />} title="Không có bình luận" text="Không tìm thấy bình luận phù hợp." />
        ))}

      <Pager page={page} totalPages={(reviews ?? comments)?.totalPages ?? 1} href={(p) => qs({ page: p })} />
    </>
  )
}
