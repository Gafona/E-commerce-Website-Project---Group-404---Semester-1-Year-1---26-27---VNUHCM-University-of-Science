"use client"

// Facebook-style personal timeline: posts written here are regular community
// posts, so they also appear on /cong-dong, and vice versa.

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Globe2, LoaderCircle, MessageCircle, Radar, Send, Swords, X } from "lucide-react"
import type { CommunityFeed } from "@/lib/community"
import { buildDnaShare, type DnaShareKind } from "@/lib/sportdna-share"
import type { DnaSportKey } from "@/lib/sportdna-radar"
import { useShop } from "../components/ShopProvider"
import { useSportDnaContext } from "../components/MatchBadge"
import { CommunityAvatar } from "../cong-dong/CommunityAvatar"
import { DnaResultCard } from "../cong-dong/DnaResultCard"
import { PostCard, topics } from "../cong-dong/Community"
import { usePostImages } from "../cong-dong/usePostImages"
import { communitySession, loadMyProfileFeed, writeCommunityPost } from "../cong-dong/actions"

type Session = Awaited<ReturnType<typeof communitySession>>
type Attachment = { kind: DnaShareKind; sport: DnaSportKey }

export const SHARE_ACHIEVEMENT_EVENT = "boai:share-achievement"

/** Ask the profile timeline composer to attach an ELO / radar card. */
export function requestAchievementShare(detail: Attachment) {
  window.dispatchEvent(new CustomEvent(SHARE_ACHIEVEMENT_EVENT, { detail }))
}

const field =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm outline-none focus:border-[#1677ff]"

export function ProfileTimeline({
  initialFeed,
  session,
  name,
}: {
  initialFeed: CommunityFeed
  session: Session
  name: string
}) {
  const { tr } = useShop()
  const router = useRouter()
  const { profiles, runs, ready } = useSportDnaContext()
  const [posts, setPosts] = useState(initialFeed.posts)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(initialFeed.hasNextPage)
  const [total, setTotal] = useState(initialFeed.totalDocs)
  const [identity, setIdentity] = useState(session)
  const [content, setContent] = useState("")
  const [postSport, setPostSport] = useState("all")
  const [postTopic, setPostTopic] = useState("experience")
  const [attach, setAttach] = useState<Attachment | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState("")
  const photos = usePostImages(setError)
  const [busy, start] = useTransition()
  const composer = useRef<HTMLTextAreaElement>(null)
  const composerBox = useRef<HTMLDivElement>(null)

  const preview = useMemo(
    () => (attach && ready ? buildDnaShare(attach.kind, attach.sport, profiles, runs, profiles[attach.sport]?.core?.result ?? null) : null),
    [attach, ready, profiles, runs],
  )

  useEffect(() => {
    const onShare = (event: Event) => {
      const detail = (event as CustomEvent<Attachment>).detail
      if (!detail) return
      const sport = detail.sport === "badminton" ? tr("cầu lông", "badminton") : tr("bóng đá", "football")
      setEditing(null)
      setAttach(detail)
      setPostSport(detail.sport)
      setPostTopic("experience")
      setContent((current) =>
        current.trim()
          ? current
          : detail.kind === "elo"
            ? tr(
                `Điểm ELO ${sport} mới nhất của mình trên BOAI SportDNA. Ai cùng trình muốn giao lưu không?`,
                `My latest ${sport} ELO on BOAI SportDNA. Anyone at my level up for a game?`,
              )
            : tr(
                `Mạng nhện kỹ năng ${sport} của mình. Mọi người góp ý giúp mình cải thiện điểm yếu nhé!`,
                `My ${sport} skill radar. Any tips to work on my weak spots?`,
              ),
      )
      composerBox.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      window.setTimeout(() => composer.current?.focus(), 350)
    }
    window.addEventListener(SHARE_ACHIEVEMENT_EVENT, onShare)
    // "Đăng lên cộng đồng" on a SportDNA result opens /tai-khoan?chia-se=elo&mon=<sport>.
    const params = new URLSearchParams(window.location.search)
    const kind = params.get("chia-se")
    const sport = params.get("mon")
    if ((kind === "elo" || kind === "radar") && (sport === "badminton" || sport === "football")) {
      params.delete("chia-se")
      params.delete("mon")
      const query = params.toString()
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`)
      onShare(new CustomEvent(SHARE_ACHIEVEMENT_EVENT, { detail: { kind, sport } }))
    }
    return () => window.removeEventListener(SHARE_ACHIEVEMENT_EVENT, onShare)
  }, [tr])

  async function reload(pages = page) {
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) => loadMyProfileFeed(i + 1)),
    )
    const failed = results.find((r) => !r.ok)
    if (failed && !failed.ok) {
      setError(failed.error)
      return
    }
    const feeds = results.flatMap((r) => (r.ok ? [r.feed] : []))
    const seen = new Set<string>()
    setPosts(feeds.flatMap((f) => f.posts).filter((p) => !seen.has(p.id) && !!seen.add(p.id)))
    setHasNext(feeds[feeds.length - 1]?.hasNextPage ?? false)
    setTotal(feeds[0]?.totalDocs ?? 0)
    setPage(pages)
  }

  async function refresh() {
    await Promise.all([reload(), communitySession().then(setIdentity)])
    router.refresh()
  }

  function run(action: () => Promise<void>) {
    setError("")
    start(async () => {
      try {
        await action()
      } catch {
        setError(tr("Kết nối bị gián đoạn. Vui lòng thử lại.", "Connection interrupted. Please try again."))
      }
    })
  }

  function reset() {
    setEditing(null)
    photos.reset()
    setContent("")
    setAttach(null)
    setPostSport("all")
    setPostTopic("experience")
  }

  return (
    <section className="min-w-0 space-y-4" id="bai-viet" aria-label={tr("Bài viết của bạn", "Your posts")}>
      <div ref={composerBox} id="dang-bai" className="scroll-mt-28 rounded-2xl border border-[var(--line)] bg-[var(--white)] p-5">
        <div className="mb-3 flex items-center gap-3">
          <CommunityAvatar name={name} />
          <div className="min-w-0">
            <h2 className="m-0 text-sm font-bold">
              {editing ? tr("Chỉnh sửa bài viết", "Edit your post") : tr(`${name} ơi, bạn đang nghĩ gì?`, `What's on your mind, ${name}?`)}
            </h2>
            <p className="m-0 mt-0.5 text-[11px] text-[var(--muted)]">
              {tr("Bài đăng sẽ hiện trên trang cá nhân và bảng tin cộng đồng.", "Posts appear on your profile and the community feed.")}
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            run(async () => {
              const data = new FormData()
              data.set("content", content)
              data.set("sport", postSport)
              data.set("topic", postTopic)
              photos.appendTo(data)
              if (editing) data.set("id", editing)
              else if (attach) {
                data.set("achievementKind", attach.kind)
                data.set("achievementSport", attach.sport)
              }
              const result = await writeCommunityPost(data)
              if (!result.ok) {
                setError(result.error ?? tr("Không thể đăng bài.", "Couldn't publish."))
                return
              }
              reset()
              await refresh()
            })
          }}
        >
          <textarea
            ref={composer}
            aria-label={tr("Nội dung bài viết", "Post content")}
            className={field + " min-h-24 resize-y leading-6"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            minLength={5}
            maxLength={3000}
            required
            placeholder={tr("Chia sẻ trận đấu, trang bị hoặc kết quả SportDNA của bạn…", "Share a match, your gear or a SportDNA result…")}
          />
          {photos.previews}
          {attach && !editing && (
            <div className="relative">
              {preview ? (
                <DnaResultCard achievement={preview} preview />
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">
                  {ready
                    ? tr("Chưa có dữ liệu cho môn này. Hãy làm bài test SportDNA trước.", "No data for this sport yet. Take a SportDNA test first.")
                    : tr("Đang tải dữ liệu SportDNA…", "Loading SportDNA data…")}
                </p>
              )}
              <button
                type="button"
                onClick={() => setAttach(null)}
                aria-label={tr("Bỏ đính kèm", "Remove attachment")}
                className="absolute top-6 right-2 grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-white/15 text-white hover:bg-white/30"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select aria-label={tr("Môn thể thao", "Sport")} className={field} value={postSport} onChange={(e) => setPostSport(e.target.value)}>
              <option value="all">{tr("Mọi môn", "All sports")}</option>
              <option value="football">{tr("Bóng đá", "Football")}</option>
              <option value="badminton">{tr("Cầu lông", "Badminton")}</option>
            </select>
            <select aria-label={tr("Chủ đề", "Topic")} className={field} value={postTopic} onChange={(e) => setPostTopic(e.target.value)}>
              {topics
                .slice(1)
                .filter((t) => t.id !== "offer" || identity.viewer?.seller)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {tr(t.vi, t.en)}
                  </option>
                ))}
            </select>
          </div>
          {!editing && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                {tr("Đính kèm", "Attach")}
              </span>
              {(["badminton", "football"] as const).flatMap((sport) =>
                (["elo", "radar"] as const).map((kind) => {
                  const active = attach?.kind === kind && attach.sport === sport
                  const Icon = kind === "elo" ? Swords : Radar
                  return (
                    <button
                      key={kind + sport}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setAttach(active ? null : { kind, sport })
                        if (!active) setPostSport(sport)
                      }}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                        active
                          ? "border-[#1677ff] bg-[#1677ff] text-white"
                          : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[#1677ff] hover:text-[#1677ff]"
                      }`}
                    >
                      <Icon size={13} />
                      {kind === "elo" ? "ELO" : tr("Mạng nhện", "Radar")} {sport === "badminton" ? tr("cầu lông", "badminton") : tr("bóng đá", "football")}
                    </button>
                  )
                }),
              )}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
            <div className="flex flex-wrap items-center gap-3">
              {photos.picker}
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                <Globe2 size={13} /> {tr("Công khai", "Public")} · {content.length}/3000
              </span>
            </div>
            <div className="flex gap-2">
              {(editing || attach || content || photos.count > 0) && (
                <button type="button" onClick={reset} className="cursor-pointer border-0 bg-transparent px-3 text-xs font-semibold text-[var(--muted)]">
                  {tr("Hủy", "Cancel")}
                </button>
              )}
              <button
                disabled={busy || content.trim().length < 5 || (!!attach && !editing && !preview)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-[#1677ff] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0865e5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                {editing ? tr("Lưu thay đổi", "Save changes") : tr("Đăng bài", "Post")}
              </button>
            </div>
          </div>
        </form>
        {error && (
          <p role="alert" className="m-0 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="m-0 text-sm font-bold">
          {tr("Bài viết", "Posts")} <span className="font-semibold text-[var(--muted)]">· {total}</span>
        </h2>
        <Link href="/cong-dong" className="text-xs font-bold text-[#1677ff]">
          {tr("Mở bảng tin cộng đồng", "Open community feed")}
        </Link>
      </div>

      <div className={busy ? "space-y-4 opacity-70" : "space-y-4"} aria-busy={busy}>
        {posts.map((post) => (
          <PostCard
            key={post.id + post.updatedAt}
            post={post}
            signedIn={!!identity.viewer}
            liked={identity.liked.includes(post.id)}
            own={identity.owned.includes(post.id)}
            moderator={!!identity.viewer?.moderator}
            onRefresh={refresh}
            seller={!!identity.viewer?.seller}
          />
        ))}
        {!posts.length && (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--white)] px-6 py-12 text-center">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-[var(--soft-blue)] text-[#1677ff]">
              <MessageCircle size={26} />
            </div>
            <h3 className="m-0 text-base font-bold">{tr("Chưa có bài viết nào", "No posts yet")}</h3>
            <p className="mx-auto mt-2 mb-0 max-w-sm text-xs leading-6 text-[var(--muted)]">
              {tr(
                "Viết bài đầu tiên hoặc chia sẻ điểm ELO, mạng nhện kỹ năng của bạn để bạn bè cùng xem.",
                "Write your first post or share your ELO and skill radar with friends.",
              )}
            </p>
          </div>
        )}
      </div>
      {hasNext && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => reload(page + 1))}
          className="w-full cursor-pointer rounded-xl border border-[var(--line)] bg-[var(--white)] py-3 text-xs font-bold text-[var(--ink)] hover:border-[#1677ff] disabled:opacity-50"
        >
          {tr("Xem thêm bài viết", "Load more posts")}
        </button>
      )}
    </section>
  )
}
