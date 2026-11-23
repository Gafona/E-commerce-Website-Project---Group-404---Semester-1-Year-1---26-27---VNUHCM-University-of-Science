"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Newspaper } from "lucide-react"
import type { CommunityFeed } from "@/lib/community"
import { useShop } from "../../components/ShopProvider"
import { PostCard } from "../../cong-dong/Community"
import { communitySession, loadCommunityFeed } from "../../cong-dong/actions"

type Session = Awaited<ReturnType<typeof communitySession>>

/** Read-only timeline of one member's community posts. */
export function MemberTimeline({
  profileId,
  initialFeed,
  session,
  own,
}: {
  profileId: string
  initialFeed: CommunityFeed
  session: Session
  own: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [posts, setPosts] = useState(initialFeed.posts)
  const [page, setPage] = useState(initialFeed.page)
  const [hasNext, setHasNext] = useState(initialFeed.hasNextPage)
  const [identity, setIdentity] = useState(session)
  const [error, setError] = useState("")
  const [busy, start] = useTransition()

  async function reload(pages = page) {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        loadCommunityFeed({ member: profileId, page: i + 1 }),
      ),
    )
    const failed = results.find((r) => !r.ok)
    if (failed && !failed.ok) {
      setError(failed.error)
      return
    }
    const feeds = results.flatMap((r) => (r.ok ? [r.feed] : []))
    setPosts([...new Map(feeds.flatMap((f) => f.posts).map((p) => [p.id, p])).values()])
    setHasNext(feeds.at(-1)?.hasNextPage ?? false)
    setIdentity(await communitySession())
  }

  function loadMore() {
    setError("")
    start(async () => {
      try {
        const result = await loadCommunityFeed({ member: profileId, page: page + 1 })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setPosts((old) => [
          ...new Map([...old, ...result.feed.posts].map((p) => [p.id, p])).values(),
        ])
        setPage(result.feed.page)
        setHasNext(result.feed.hasNextPage)
      } catch {
        setError(tr("Không thể tải thêm bài viết.", "Couldn't load more posts."))
      }
    })
  }

  if (!posts.length)
    return (
      <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-14 text-center">
        <Newspaper size={26} className="text-[#1677ff]" />
        <b className="text-sm">{tr("Chưa có bài viết", "No posts yet")}</b>
        <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">
          {own
            ? tr(
                "Chia sẻ khoảnh khắc đầu tiên từ trang tài khoản hoặc bảng tin cộng đồng.",
                "Share your first moment from your account page or the community feed.",
              )
            : tr(
                "Khi thành viên này đăng bài, bài viết sẽ xuất hiện tại đây.",
                "Posts from this member will appear here.",
              )}
        </p>
      </div>
    )

  return (
    <div className="space-y-4" aria-busy={busy}>
      {posts.map((post) => (
        <PostCard
          key={post.id + post.updatedAt}
          post={post}
          signedIn={!!identity.viewer}
          liked={identity.liked.includes(post.id)}
          own={identity.owned.includes(post.id)}
          moderator={!!identity.viewer?.moderator}
          onRefresh={async () => {
            await reload()
            router.refresh()
          }}
          seller={!!identity.viewer?.seller}
        />
      ))}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      {hasNext && (
        <button
          type="button"
          disabled={busy}
          onClick={loadMore}
          className="mx-auto flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--white)] px-5 py-2.5 text-xs font-bold text-[#1677ff] disabled:opacity-50"
        >
          {busy && <LoaderCircle size={14} className="animate-spin" />}
          {tr("Xem thêm bài viết", "More posts")}
        </button>
      )}
    </div>
  )
}
