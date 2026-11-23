import type { Where } from "payload"
import { MessagesSquare } from "lucide-react"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { CommentControls, PostControls } from "../AdminControls"
import { Badge, Empty, PageHead, Pager, param, SearchForm, type SearchParams, Tabs } from "../ui"

export const metadata = { title: "Nội dung cộng đồng | Quản trị BOAI" }

const VISIBILITY: Record<string, { label: string; tone: string }> = {
  visible: { label: "Công khai", tone: "delivered" },
  hidden: { label: "Quản trị đã ẩn", tone: "cancelled" },
  removed: { label: "Tác giả đã gỡ", tone: "" },
}
const TOPIC: Record<string, string> = {
  experience: "Trải nghiệm", question: "Hỏi đáp", review: "Đánh giá", tips: "Mẹo", offer: "Shop chào hàng", wanted: "Tìm mua",
}

export default async function CommunityModerationPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const tab = param(sp.tab) === "comments" ? "comments" : "posts"
  const visibility = ["visible", "hidden", "removed"].includes(param(sp.visibility)) ? param(sp.visibility) : ""
  const q = param(sp.q).trim().slice(0, 100)
  const page = Math.max(1, Math.min(500, Number(param(sp.page)) || 1))
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const qs = (extra: Record<string, string | number>) =>
    "/quan-tri/cong-dong?" + new URLSearchParams(Object.entries({ tab, visibility, q, ...extra }).filter(([, v]) => v !== "" && v !== undefined).map(([k, v]) => [k, String(v)])).toString()

  const postWhere: Where = { and: [...(visibility ? [{ visibility: { equals: visibility } }] : []), ...(q ? [{ content: { like: q } }] : [])] }
  const commentWhere: Where = q ? { content: { like: q } } : {}

  const [posts, comments] = await Promise.all([
    tab === "posts"
      ? payload.find({ collection: "community-posts", where: postWhere, sort: "-createdAt", limit: 20, page, depth: 0, ...scoped })
      : null,
    tab === "comments"
      ? payload.find({ collection: "community-comments", where: commentWhere, sort: "-createdAt", limit: 25, page, depth: 1, ...scoped })
      : null,
  ])

  return (
    <>
      <PageHead eyebrow="Kiểm duyệt" title="Nội dung cộng đồng">
        <SearchForm action="/quan-tri/cong-dong" q={q} placeholder={tab === "posts" ? "Tìm trong bài viết…" : "Tìm trong bình luận…"} hidden={{ tab, visibility }} />
      </PageHead>
      <Tabs
        active={tab === "posts" ? `posts-${visibility || "all"}` : "comments"}
        items={[
          { key: "posts-all", href: "/quan-tri/cong-dong", label: "Tất cả bài viết" },
          { key: "posts-visible", href: "/quan-tri/cong-dong?visibility=visible", label: "Công khai" },
          { key: "posts-hidden", href: "/quan-tri/cong-dong?visibility=hidden", label: "Đã ẩn" },
          { key: "posts-removed", href: "/quan-tri/cong-dong?visibility=removed", label: "Tác giả đã gỡ" },
          { key: "comments", href: "/quan-tri/cong-dong?tab=comments", label: "Bình luận" },
        ]}
      />

      {posts &&
        (posts.docs.length ? (
          <section className="sc-card p-0">
            <ul className="m-0 list-none p-0">
              {posts.docs.map((post) => {
                const vis = VISIBILITY[post.visibility] ?? VISIBILITY.visible
                return (
                  <li key={post.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0">
                    <div className="min-w-0 flex-1 basis-[420px]">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <b className="text-[12px] text-[var(--ink)]">{post.authorName}</b>
                        <span>·</span>
                        <span>{fmtDate(post.createdAt, true)}</span>
                        <Badge tone={vis.tone}>{vis.label}</Badge>
                        <Badge>{TOPIC[post.topic] ?? post.topic}</Badge>
                        {post.sharedPost && <Badge>Chia sẻ lại</Badge>}
                      </div>
                      <p className="m-0 line-clamp-3 text-[13px] leading-5 whitespace-pre-line">{post.content}</p>
                    </div>
                    <PostControls id={String(post.id)} visibility={post.visibility} />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : (
          <Empty icon={<MessagesSquare size={22} />} title="Không có bài viết" text="Không tìm thấy bài viết phù hợp với bộ lọc." />
        ))}

      {comments &&
        (comments.docs.length ? (
          <section className="sc-card p-0">
            <ul className="m-0 list-none p-0">
              {comments.docs.map((comment) => {
                const post = typeof comment.post === "object" ? comment.post : null
                return (
                  <li key={comment.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0">
                    <div className="min-w-0 flex-1 basis-[420px]">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                        <b className="text-[12px] text-[var(--ink)]">{comment.authorName}</b>
                        <span>·</span>
                        <span>{fmtDate(comment.createdAt, true)}</span>
                        {comment.parent && <Badge>Trả lời</Badge>}
                      </div>
                      <p className="m-0 text-[13px] leading-5">{comment.content}</p>
                      {post && <p className="m-0 mt-1.5 line-clamp-1 text-[11px] text-[var(--muted)]">Trong bài: “{post.content}”</p>}
                    </div>
                    <CommentControls id={String(comment.id)} />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : (
          <Empty icon={<MessagesSquare size={22} />} title="Không có bình luận" text="Không tìm thấy bình luận phù hợp." />
        ))}

      <Pager page={page} totalPages={(posts ?? comments)?.totalPages ?? 1} href={(p) => qs({ page: p })} />
    </>
  )
}
