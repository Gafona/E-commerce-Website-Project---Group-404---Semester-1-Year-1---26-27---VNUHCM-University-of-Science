"use client"

// Keep polling independent of filter/page changes: effect cleanup must not
// cancel a manual request that has just selected a new filter.

import { deletePostAction } from "../quan-tri/actions"
import { useSiteContent } from "../components/SiteContentProvider"
import type { SiteImageView } from "@/lib/site-images"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Globe2,
  Heart,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
  ThumbsUp,
  HandHeart,
  Reply,
  Repeat2,
} from "lucide-react"
import type {
  CommunityFeed,
  CommunityPost,
  CommunityMember,
} from "@/lib/community"
import { communityProfileHref } from "@/lib/community-identity"
import { CommunityMembers } from "./CommunityMembers"
import { topics } from "./topics"
import { PostEditor } from "./PostEditor"
import { FollowButton } from "./FollowButton"
import { CommunitySocialHub } from "./CommunitySocialHub"
import { ProductSearch } from "./ProductSearch"
import { SharePanel } from "./SharePanel"
import { DnaResultCard } from "./DnaResultCard"
import { InitialAvatar, PostHeader } from "./PostHeader"
import { PostImages } from "./PostImages"
import { usePostImages } from "./usePostImages"
import { CommunityAvatar as Avatar, communityName } from "./CommunityAvatar"
import { useShop } from "../components/ShopProvider"
import {
  communitySession,
  deleteCommunityComment,
  loadCommunityComments,
  loadCommunityFeed,
  deleteCommunityPost,
  toggleCommunityLike,
  toggleCommentReaction,
  writeCommunityComment,
  writeCommunityPost,
} from "./actions"

type Session = Awaited<ReturnType<typeof communitySession>>
type Comment = Extract<Awaited<ReturnType<typeof loadCommunityComments>>, {
  ok: true
}>["comments"][number]
export { topics }
const panel = "rounded-2xl border border-[var(--line)] bg-[var(--white)]"
const field =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm! outline-none focus:border-[#1677ff]"
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1677ff] px-5 py-2.5 text-sm! font-bold! text-white! transition hover:bg-[#0865e5] disabled:cursor-wait disabled:opacity-50"

export function Community({
  initialFeed,
  session,
  selectedPost,
  members,
  suggested,
  selectedMember,
  cover,
}: {
  initialFeed: CommunityFeed
  session: Session
  selectedPost?: string
  members: CommunityMember[]
  suggested: CommunityMember[]
  selectedMember?: string
  cover: SiteImageView | null
}) {
  const { tr } = useShop()
  const { t: copy } = useSiteContent()
  const router = useRouter()
  const [feed, setFeed] = useState(initialFeed)
  const [identity, setIdentity] = useState(session)
  const [sport, setSport] = useState("")
  const [topic, setTopic] = useState("")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [busy, start] = useTransition()
  const [error, setError] = useState("")
  const [content, setContent] = useState("")
  const [postSport, setPostSport] = useState("all")
  const [postTopic, setPostTopic] = useState("experience")
  const [product, setProduct] = useState("")
  const [productName, setProductName] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const photos = usePostImages(setError)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  // "loading" only while a sync is in flight; a failure or an 8-second stall shows a retry.
  const [feedStatus, setFeedStatus] = useState<"loading" | "ok" | "error">("loading")
  const composer = useRef<HTMLTextAreaElement>(null)
  const requestId = useRef(0)
  const reloadRef = useRef<() => Promise<void>>(async () => {})
  const actionRunning = useRef(false)

  const reload = useCallback(
    async (
      options: {
        sport?: string
        topic?: string
        query?: string
        page?: number
      } = {},
    ) => {
      const token = ++requestId.current
      setFeedStatus("loading")
      const stall = window.setTimeout(() => {
        if (token === requestId.current) setFeedStatus("error")
      }, 8000)
      try {
        const result = await loadCommunityFeed({
          sport,
          topic,
          query: search,
          page: feed.page,
          post: selectedPost,
          member: selectedMember,
          ...options,
        })
        if (
          token !==
          requestId.current
        )
          return
        if (result.ok) {
          setFeed(result.feed)
          setError("")
          setFeedStatus("ok")
          setSyncedAt(
            new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          )
        } else {
          setError(result.error)
          setFeedStatus("error")
        }
      } catch {
        if (token === requestId.current) setFeedStatus("error")
        if (
          token ===
          requestId.current
        )
          setError(
            tr(
              "Không thể đồng bộ bảng tin. Hãy bấm Làm mới bảng tin.",
              "Unable to sync. Please refresh the feed.",
            ),
          )
      } finally {
        window.clearTimeout(stall)
      }
    },
    [sport, topic, search, feed.page, selectedPost, selectedMember, tr],
  )

  useEffect(() => {
    setIdentity(session)
  }, [session])
  useEffect(() => {
    reloadRef.current = reload
  }, [reload])
  useEffect(() => {
    void reloadRef.current()
  }, [initialFeed])
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible" && !actionRunning.current)
        void reloadRef.current()
    }
    const interval = window.setInterval(sync, 30_000)
    window.addEventListener("focus", sync)
    document.addEventListener("visibilitychange", sync)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", sync)
      document.removeEventListener("visibilitychange", sync)
      requestId.current++
    }
  }, [])

  function run(action: () => Promise<void>) {
    if (actionRunning.current) return
    actionRunning.current = true
    setError("")
    start(async () => {
      try {
        await action()
      } catch {
        setError(
          tr(
            "Kết nối bị gián đoạn. Vui lòng thử lại.",
            "Connection interrupted. Please try again.",
          ),
        )
      } finally {
        actionRunning.current = false
      }
    })
  }
  async function refresh() {
    await Promise.all([reload(), communitySession().then(setIdentity)])
    router.refresh()
  }
  function cancelEdit() {
    setEditing(null)
    photos.reset()
    setContent("")
    setProduct("")
    setProductName("")
    setPostSport("all")
    setPostTopic("experience")
  }
  function selectTopic(value: string) {
    setTopic(value)
    run(() => reload({ topic: value, page: 1 }))
  }
  function selectSport(value: string) {
    setSport(value)
    run(() => reload({ sport: value, page: 1 }))
  }

  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-7 md:px-8 [&_button]:text-xs! [&_button]:font-semibold! [&_input]:text-xs! [&_select]:text-xs!">
      <section className="relative mb-7 overflow-hidden rounded-2xl bg-[#071c3b] px-7 py-9 text-white md:px-10 md:py-11">
        {cover && (
          <Image
            src={cover.url}
            alt=""
            fill
            sizes="(max-width: 1360px) 100vw, 1360px"
            className="object-cover"
            style={{ objectPosition: cover.objectPosition }}
            preload
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041b21]/95 via-[#062c36]/80 to-[#061c31]/20" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-[#82baff]">
              <Users size={15} /> {copy("communityHero.eyebrow")}
            </div>
            <h1 className="font-[family-name:var(--display)] text-4xl font-extrabold leading-none uppercase md:text-6xl">
              {copy("communityHero.title1")}
              {copy("communityHero.title2") && (
                <>
                  <br />
                  <span className="text-[#6caaff]">{copy("communityHero.title2")}</span>
                </>
              )}
            </h1>
            {copy("communityHero.text") && (
              <p className="mt-4 max-w-lg text-xs leading-6 text-slate-300">
                {copy("communityHero.text")}
              </p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((member) => (
                  <Avatar
                    key={member.id}
                    name={member.name}
                    small
                    shop={member.kind === "shop"}
                    image={member.avatar}
                  />
                ))}
              </div>
              <span className="text-[10px] font-semibold text-white/85">
                {copy("communityHero.tagline")}
              </span>
            </div>
          </div>
          <button
            className={primary + " relative shrink-0 self-start md:self-auto"}
            onClick={() => {
              if (!identity.viewer) router.push("/dang-nhap")
              else composer.current?.focus()
            }}
          >
            <Pencil size={16} />
            {copy("communityHero.cta")}
          </button>
        </div>
      </section>
      {cover?.credit && (
        <p className="-mt-5 mb-6 text-right text-[9px] text-[var(--muted)]">
          {tr("Ảnh bìa", "Cover photo")}:{" "}
          {cover.credit.url ? (
            <a
              href={cover.credit.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {cover.credit.author}
            </a>
          ) : (
            cover.credit.author
          )}
        </p>
      )}

      <CommunitySocialHub signedIn={!!identity.viewer} />
      <CommunityMembers
        members={members}
        suggested={suggested}
        selectedMember={selectedMember}
      />
      <div
        id="bang-tin"
        className="grid scroll-mt-24 items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_270px]"
      >
        <aside className="hidden lg:block">
          <div className="mb-4 px-3 text-[10px] font-bold tracking-widest text-[var(--muted)]">
            {tr("GÓC CỘNG ĐỒNG", "YOUR COMMUNITY")}
          </div>
          <nav
            className="grid gap-1"
            aria-label={tr("Chủ đề cộng đồng", "Community topics")}
          >
            {topics.map(({ id, vi, en, icon: Icon }) => (
              <button
                key={id}
                disabled={busy}
                onClick={() => selectTopic(id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${
                  topic === id
                    ? "bg-[var(--soft-blue)] text-[var(--lime)]"
                    : "text-[var(--muted)] hover:bg-[var(--white)]"
                }`}
              >
                <Icon size={18} />
                {tr(vi, en)}
              </button>
            ))}
          </nav>
          <div className="my-6 border-t border-[var(--line)]" />
          <Link
            href="/tai-khoan"
            className="flex items-center gap-3 px-3 text-xs font-semibold text-[var(--muted)]"
          >
            <Avatar name={identity.viewer?.name ?? "BOAI"} small image={identity.viewer?.avatar} />
            {tr("Tài khoản của tôi", "My account")}
          </Link>
          <p className="mt-8 px-3 text-[10px] leading-5 text-[var(--muted)]">
            BOAI ·{" "}
            {tr("Thể thao kết nối chúng ta.", "Sport brings us together.")}
          </p>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className={panel + " p-5"}>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={identity.viewer?.name ?? "BOAI"} image={identity.viewer?.avatar} />
              <div>
                <h2 className="text-sm font-bold">
                  {editing
                    ? tr("Chỉnh sửa bài viết", "Edit your post")
                    : identity.viewer
                      ? tr(
                          `Chào ${identity.viewer.name}, hôm nay bạn chơi gì?`,
                          `Hi ${identity.viewer.name}, what's your game today?`,
                        )
                      : tr(
                          "Chuyện trên sân, kể ở đây.",
                          "Your game. Your story.",
                        )}
                </h2>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {tr(
                    "Trải nghiệm thật giúp cộng đồng chọn đồ tốt hơn.",
                    "Real experiences help everyone choose better gear.",
                  )}
                </p>
              </div>
            </div>
            {identity.viewer ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  run(async () => {
                    const data = new FormData()
                    data.set("content", content)
                    data.set("sport", postSport)
                    data.set("topic", postTopic)
                    data.set("product", product)
                    if (editing) data.set("id", editing)
                    photos.appendTo(data)
                    const result = await writeCommunityPost(data)
                    if (!result.ok) {
                      setError(result.error ?? tr("Không thể lưu.", "Couldn't save."))
                      return
                    }
                    cancelEdit()
                    setSport("")
                    setTopic("")
                    setSearch("")
                    setQuery("")
                    await Promise.all([
                      reload({ sport: "", topic: "", query: "", page: 1 }),
                      communitySession().then(setIdentity),
                    ])
                    router.refresh()
                  })
                }}
              >
                <textarea
                  ref={composer}
                  aria-label={tr("Nội dung bài viết", "Post content")}
                  className={field + " min-h-28 resize-y leading-6"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  minLength={5}
                  maxLength={3000}
                  required
                  placeholder={tr(
                    "Đôi giày mới có thực sự đáng tiền? Cây vợt nào hợp với người mới? Chia sẻ cùng mọi người…",
                    "Is your new gear worth it? Which racket suits a beginner? Share with everyone…",
                  )}
                />
                {photos.previews}
                <div className="my-3 grid grid-cols-2 gap-2">
                  <select
                    aria-label={tr("Môn thể thao", "Sport")}
                    className={field}
                    value={postSport}
                    onChange={(e) => {
                      setPostSport(e.target.value)
                      setProduct("")
                    }}
                  >
                    <option value="all">{tr("Mọi môn", "All sports")}</option>
                    <option value="football">
                      {tr("Bóng đá", "Football")}
                    </option>
                    <option value="badminton">
                      {tr("Cầu lông", "Badminton")}
                    </option>
                  </select>
                  <select
                    aria-label={tr("Chủ đề bài viết", "Post topic")}
                    className={field}
                    value={postTopic}
                    onChange={(e) => setPostTopic(e.target.value)}
                  >
                    {topics
                      .slice(1)
                      .filter(
                        (t) => t.id !== "offer" || identity.viewer?.seller,
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {tr(t.vi, t.en)}
                        </option>
                      ))}
                  </select>
                </div>
                <ProductSearch
                  value={product}
                  name={productName}
                  sport={postSport}
                  onSelect={(id, name) => {
                    setProduct(id)
                    setProductName(name)
                  }}
                />
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {photos.picker}
                    <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                      <Globe2 size={13} />
                      {tr("Công khai", "Public")} · {content.length}/3000
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {editing && (
                      <button
                        type="button"
                        className="px-3 text-xs"
                        onClick={cancelEdit}
                      >
                        {tr("Hủy", "Cancel")}
                      </button>
                    )}
                    <button
                      disabled={busy || content.trim().length < 5}
                      className={primary}
                    >
                      <Send size={14} />
                      {busy
                        ? tr("Đang lưu…", "Saving…")
                        : editing
                          ? tr("Lưu thay đổi", "Save changes")
                          : tr("Đăng bài", "Post")}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl bg-[var(--paper)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-[var(--muted)]">
                  {tr(
                    "Đăng nhập để đăng bài, thích và bình luận bằng tài khoản BOAI của bạn.",
                    "Sign in with your BOAI account to post, like and comment.",
                  )}
                </p>
                <Link className={primary + " shrink-0"} href="/dang-nhap">
                  {tr("Tham gia", "Join in")}
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--white)] px-4 py-3 text-[11px]">
              <span className="flex items-center gap-2 font-semibold">
                <span className={`h-2 w-2 rounded-full ${feedStatus === "error" ? "bg-red-500" : feedStatus === "loading" ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`} />
                {feedStatus === "loading"
                  ? tr("Bảng tin trực tiếp · Đang đồng bộ…", "Live feed · Syncing…")
                  : feedStatus === "error"
                    ? tr("Không tải được bảng tin.", "Couldn't load the feed.")
                    : `${tr("Bảng tin trực tiếp", "Live feed")} · ${feed.totalDocs} ${tr("bài viết", "posts")}`}
              </span>
              {feedStatus === "error" ? (
                <button type="button" onClick={() => run(refresh)} disabled={busy} className="font-bold text-[#1677ff] hover:underline">
                  {tr("Không tải được. Làm mới", "Couldn't load. Refresh")}
                </button>
              ) : feedStatus === "ok" && syncedAt ? (
                <span className="text-[var(--muted)]">{tr(`Đồng bộ lúc ${syncedAt}`, `Synced at ${syncedAt}`)}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              {topics.slice(1, 3).map((t) => (
                <button
                  key={t.id}
                  disabled={busy}
                  onClick={() => selectTopic(topic === t.id ? "" : t.id)}
                  aria-pressed={topic === t.id}
                  className={`rounded-full border px-4 py-2 ${
                    topic === t.id
                      ? "border-[#1677ff] bg-[var(--soft-blue)] text-[var(--lime)]"
                      : "border-[var(--line)] bg-[var(--white)] text-[var(--muted)]"
                  }`}
                >
                  {tr(t.vi, t.en)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 rounded-xl bg-[var(--white)] p-1">
                {[
                  ["", "Tất cả", "All"],
                  ["football", "Bóng đá", "Football"],
                  ["badminton", "Cầu lông", "Badminton"],
                ].map(([value, vi, en]) => (
                  <button
                    key={value}
                    disabled={busy}
                    onClick={() => selectSport(value)}
                    className={`rounded-lg px-4 py-2 text-xs font-bold ${
                      sport === value
                        ? "bg-[#1677ff] text-white!"
                        : "text-[var(--muted)]!"
                    }`}
                  >
                    {tr(vi, en)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => run(refresh)}
                disabled={busy}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted)]"
              >
                <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
                {tr("Làm mới bảng tin", "Refresh feed")}
              </button>
            </div>
            <div className="flex gap-2">
              <form
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--white)] px-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  setSearch(query.trim())
                  run(() => reload({ query: query.trim(), page: 1 }))
                }}
              >
                <Search size={15} className="text-[var(--muted)]" />
                <input
                  aria-label={tr("Tìm bài viết", "Search posts")}
                  className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none"
                  maxLength={100}
                  placeholder={tr(
                    "Tìm câu chuyện, kinh nghiệm, trang bị…",
                    "Find stories, advice, gear…",
                  )}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  disabled={busy}
                  className="text-xs font-bold text-[var(--lime)]"
                >
                  {tr("Tìm", "Search")}
                </button>
              </form>
              <select
                className={field + " !w-36 lg:hidden"}
                value={topic}
                onChange={(e) => selectTopic(e.target.value)}
                aria-label={tr("Lọc chủ đề", "Filter topic")}
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tr(t.vi, t.en)}
                  </option>
                ))}
              </select>
            </div>
            {selectedPost && (
              <Link
                href="/cong-dong"
                className="flex items-center gap-1 text-xs text-[var(--lime)]"
              >
                <ChevronLeft size={14} />
                {tr("Xem toàn bộ bảng tin", "Back to all posts")}
              </Link>
            )}
          </div>
          {error && (
            <p
              className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}
          <div
            className={busy ? "space-y-5 opacity-70" : "space-y-5"}
            aria-busy={busy}
          >
            {feed.posts.map((post) => (
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
            {!feed.posts.length && (
              <div className={panel + " px-7 py-12 text-center"}>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--soft-blue)] text-[var(--lime)]">
                  <MessageCircle size={28} />
                </div>
                <h3 className="text-lg font-bold">
                  {tr(
                    "Câu chuyện tiếp theo là của bạn.",
                    "The next story is yours.",
                  )}
                </h3>
                <p className="mx-auto mt-3 max-w-sm text-xs leading-6 text-[var(--muted)]">
                  {tr(
                    search || topic || sport || selectedPost
                      ? "Chưa có bài viết phù hợp, hoặc bài viết đã được gỡ. Thử bộ lọc khác hay bắt đầu một cuộc trò chuyện mới."
                      : "Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ một món đồ đáng mua, một trải nghiệm trên sân hoặc câu hỏi của bạn.",
                    search || topic || sport || selectedPost
                      ? "No matching posts, or this post was removed. Try another filter or start a conversation."
                      : "Be the first to share gear worth buying, an on-court experience or a question.",
                  )}
                </p>
                <button
                  className={primary + " mt-5"}
                  onClick={() =>
                    identity.viewer
                      ? composer.current?.focus()
                      : router.push("/dang-nhap")
                  }
                >
                  {tr("Viết bài đầu tiên", "Write the first post")}
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
          {(feed.page > 1 || feed.hasNextPage) && (
            <div className="flex items-center justify-between">
              <button
                disabled={busy || feed.page === 1}
                onClick={() => run(() => reload({ page: feed.page - 1 }))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-4 py-2 text-xs disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                {tr("Trước", "Previous")}
              </button>
              <span className="text-xs text-[var(--muted)]">
                {tr("Trang", "Page")} {feed.page}
              </span>
              <button
                disabled={busy || !feed.hasNextPage}
                onClick={() => run(() => reload({ page: feed.page + 1 }))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-4 py-2 text-xs disabled:opacity-30"
              >
                {tr("Tiếp", "Next")}
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </section>

        <aside className="hidden space-y-5 xl:block">
          <div className={panel + " overflow-hidden"}>
            <div className="bg-[var(--soft-blue)] px-5 py-5">
              <div className="mb-2 flex items-center gap-2 text-[var(--lime)]">
                <ShieldCheck size={19} />
                <span className="text-xs font-bold">
                  {tr("Chơi đẹp, chia sẻ thật.", "Fair play. Real stories.")}
                </span>
              </div>
              <p className="text-[11px] leading-6 text-[var(--muted)]">
                {tr(
                  "Cộng đồng tốt bắt đầu từ những chia sẻ có tâm.",
                  "A great community starts with thoughtful contributions.",
                )}
              </p>
            </div>
            <ul className="space-y-4 p-5 text-[11px] leading-5">
              {[
                [
                  "Tôn trọng người chơi, dù khác quan điểm.",
                  "Respect every player and perspective.",
                ],
                [
                  "Chia sẻ trải nghiệm thật, không spam quảng cáo.",
                  "Share honest experiences, not spam.",
                ],
                [
                  "Không đăng số điện thoại, địa chỉ hoặc dữ liệu nhạy cảm.",
                  "Keep private details and sensitive data off the feed.",
                ],
              ].map(([vi, en]) => (
                <li key={vi} className="flex gap-2">
                  <Check
                    size={14}
                    className="mt-1 shrink-0 text-[var(--lime)]"
                  />
                  <span>{tr(vi, en)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-[#1677ff] p-6 text-white">
            <ShoppingBag size={25} className="mb-4" />
            <h3 className="font-[family-name:var(--display)] text-2xl font-bold uppercase">
              {tr("Nghe người chơi.", "Player-approved.")}
              <br />
              {tr("Chọn đúng đồ.", "Find your gear.")}
            </h3>
            <p className="mt-3 text-[11px] leading-6 text-blue-100">
              {tr(
                "Đọc trải nghiệm, tìm trang bị hợp chất riêng của bạn.",
                "Find gear that matches your game after hearing real experiences.",
              )}
            </p>
            <Link
              href="/tim-kiem"
              className="mt-5 flex items-center justify-between rounded-lg bg-white/15 px-4 py-3 text-xs font-bold"
            >
              {tr("Khám phá trang bị", "Explore gear")}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="px-2 text-[10px] leading-5 text-[var(--muted)]">
            {tr(
              "Bài viết và bình luận công khai. BOAI có thể ẩn nội dung không phù hợp qua hệ thống quản trị.",
              "Posts and comments are public. BOAI can moderate inappropriate content through the admin panel.",
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export function PostCard({
  post,
  liked,
  own,
  moderator,
  signedIn,
  onRefresh,
  seller = false,
}: {
  post: CommunityPost
  liked: boolean
  own: boolean
  moderator: boolean
  signedIn: boolean
  onRefresh: () => Promise<void>
  /** Approved sellers may keep/choose the "offer" topic while editing. */
  seller?: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [showComments, setShowComments] = useState(false)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [commentPage, setCommentPage] = useState(1)
  const [moreComments, setMoreComments] = useState(false)
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [showShare, setShowShare] = useState(false)
  const commentInput = useRef<HTMLTextAreaElement>(null)
  const [error, setError] = useState("")
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [editing, setEditing] = useState(false)
  const actionRunning = useRef(false)
  const topic = topics.find((t) => t.id === post.topic)
  async function fetchComments(page = 1) {
    const result = await loadCommunityComments(post.id, page)
    if (!result.ok) {
      setCommentError(result.error)
      return
    }
    setCommentsLoaded(true)
    setCommentError(result.warning ?? "")
    setComments((old) =>
      page === 1
        ? result.comments
        : [
            ...new Map(
              [...old, ...result.comments].map((comment) => [
                comment.id,
                comment,
              ]),
            ).values(),
          ],
    )
    setCommentPage(page)
    setMoreComments(result.hasNextPage)
  }
  function run(action: () => Promise<void>) {
    if (actionRunning.current) return
    actionRunning.current = true
    setError("")
    start(async () => {
      try {
        await action()
      } catch {
        setError(
          tr(
            "Không thể kết nối, vui lòng thử lại.",
            "Connection failed. Please try again.",
          ),
        )
      } finally {
        actionRunning.current = false
      }
    })
  }
  return (
    <article className={panel + " overflow-hidden"} id={`post-${post.id}`}>
      <div className="p-5">
        <PostHeader
          authorName={post.authorName}
          profile={post.profile}
          createdAt={post.createdAt}
          topic={topic ? tr(topic.vi, topic.en) : null}
          own={own}
          actions={
            own || moderator ? (
            <div className="flex gap-1">
              {own && (
                <button
                  onClick={() => {
                    setConfirmRemove(false)
                    setEditing(true)
                  }}
                  disabled={editing}
                  aria-pressed={editing}
                  className={`rounded-lg p-2 hover:bg-[var(--paper)] ${editing ? "text-[#1677ff]" : "text-[var(--muted)]"}`}
                  aria-label={tr("Sửa bài viết", "Edit post")}
                  title={tr("Sửa bài viết", "Edit post")}
                >
                  <Pencil size={14} />
                </button>
              )}
              <button
                disabled={pending}
                onClick={() => setConfirmRemove(!confirmRemove)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--paper)]"
                aria-label={own ? tr("Xóa bài viết", "Delete post") : tr("Xóa bài viết (quản trị)", "Delete post (moderator)")}
                title={own ? tr("Xóa bài viết", "Delete post") : tr("Xóa bài viết (quản trị)", "Delete post (moderator)")}
              >
                <Trash2 size={14} />
              </button>
            </div>
            ) : null
          }
        />
        <div className="mb-4 mt-4 flex gap-2">
          <span className="rounded-md bg-[var(--paper)] px-2 py-1 text-[9px] font-semibold text-[var(--muted)]">
            {post.sport === "football"
              ? tr("Bóng đá", "Football")
              : post.sport === "badminton"
                ? tr("Cầu lông", "Badminton")
                : tr("Góc thể thao", "Sports talk")}
          </span>
        </div>
        {editing ? (
          <PostEditor
            post={post}
            seller={seller}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false)
              await onRefresh()
            }}
          />
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-[13px] leading-7">
              {post.content}
            </p>
            <PostImages images={post.images} />
          </>
        )}
        {post.achievement && <DnaResultCard achievement={post.achievement} />}
        {post.sharedPost ? (
          <Link
            href={`/cong-dong?post=${encodeURIComponent(post.sharedPost.id)}`}
            className="mt-4 block rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4"
          >
            <span className="mb-2 flex items-center gap-2 text-[10px] font-bold text-[var(--lime)]">
              <Repeat2 size={14} />
              {tr("Bài viết được chia sẻ", "Shared post")}
            </span>
            <span className="flex items-center gap-2">
              <InitialAvatar name={post.sharedPost.profile?.name || post.sharedPost.authorName} image={post.sharedPost.profile?.avatar} size={24} />
              <b className="text-xs">
                {communityName(post.sharedPost.profile?.name || post.sharedPost.authorName)}
              </b>
            </span>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6">
              {post.sharedPost.content}
            </p>
            <PostImages images={post.sharedPost.images} compact />
            <span className="mt-3 block text-[10px] font-semibold text-[var(--lime)]">
              {tr("Xem bài viết gốc", "View original post")}{" "}
              <ArrowRight size={12} className="inline" />
            </span>
          </Link>
        ) : (
          post.isRepost && (
            <p className="mt-4 rounded-xl border border-[var(--line)] p-4 text-xs text-[var(--muted)]">
              {tr(
                "Bài viết gốc không còn công khai.",
                "The original post is no longer available.",
              )}
            </p>
          )
        )}
        {post.product && (
          <Link
            href={`/san-pham/${post.product.slug}`}
            className="mt-5 flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3"
          >
            {post.product.image ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image
                  src={post.product.image}
                  alt={post.product.name}
                  fill
                  sizes="80px"
                  className="object-contain"
                />
              </div>
            ) : (
              <ShoppingBag size={28} className="shrink-0 text-[var(--lime)]" />
            )}
            <div className="min-w-0 flex-1">
              <small className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
                {post.topic === "offer"
                  ? tr("Sản phẩm shop giới thiệu", "Shop's featured gear")
                  : post.topic === "wanted"
                    ? tr("Sản phẩm đang tìm mua", "Gear wanted")
                    : tr("Trang bị trong câu chuyện", "Gear in this story")}
              </small>
              <b className="mt-1 block text-xs">{post.product.name}</b>
              <span className="mt-1 block text-xs font-bold text-[var(--lime)]">
                {new Intl.NumberFormat("vi-VN").format(post.product.price)}₫
              </span>
              <span className="mt-2 block text-[10px] font-semibold text-[var(--lime)]">
                {tr("Xem sản phẩm", "View product")}
              </span>
            </div>
            <ChevronRight size={17} className="shrink-0" />
          </Link>
        )}
        {confirmRemove && (
          <div className="mt-4 rounded-xl border border-red-200 p-3 text-xs">
            <p>
              {own
                ? tr(
                    "Xóa vĩnh viễn bài viết này cùng bình luận, lượt thích và ảnh? Thao tác không thể hoàn tác.",
                    "Permanently delete this post with its comments, likes and photos? This cannot be undone.",
                  )
                : tr(
                    "Xóa vĩnh viễn bài viết này cùng bình luận và lượt thích? Thao tác không thể hoàn tác.",
                    "Permanently delete this post with its comments and likes? This cannot be undone.",
                  )}
            </p>
            <div className="mt-3 flex gap-3">
              <button
                disabled={pending}
                className="font-bold text-red-600"
                onClick={() =>
                  run(async () => {
                    const r = own
                      ? await deleteCommunityPost(post.id)
                      : await deletePostAction(post.id)
                    if (!r.ok) setError(r.error ?? tr("Đã có lỗi, vui lòng thử lại.", "Something went wrong. Please try again."))
                    else await onRefresh()
                  })
                }
              >
                {own ? tr("Xóa bài", "Delete") : tr("Xóa vĩnh viễn", "Delete permanently")}
              </button>
              <button onClick={() => setConfirmRemove(false)}>
                {tr("Giữ lại", "Keep post")}
              </button>
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-between text-[10px] text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <Heart size={12} className="text-[#1677ff]" />
            {post.likes} {tr("lượt thích", "likes")}
          </span>
          <button
            onClick={() =>
              run(async () => {
                setShowComments(true)
                await fetchComments()
              })
            }
          >
            {post.comments} {tr("bình luận", "comments")}
          </button>
        </div>
      </div>
      <div className="mx-5 grid grid-cols-3 border-t border-[var(--line)] py-1">
        <button
          disabled={pending}
          aria-pressed={liked}
          onClick={() =>
            signedIn
              ? run(async () => {
                  const r = await toggleCommunityLike(post.id)
                  if (!r.ok) setError(r.error ?? tr("Đã có lỗi, vui lòng thử lại.", "Something went wrong. Please try again."))
                  else await onRefresh()
                })
              : router.push("/dang-nhap")
          }
          className={`flex items-center justify-center gap-2 rounded-lg py-3 text-[11px] font-bold hover:bg-[var(--paper)] ${
            liked ? "text-[var(--lime)]" : "text-[var(--muted)]"
          }`}
        >
          <Heart size={17} fill={liked ? "currentColor" : "none"} />
          {tr(liked ? "Đã thích" : "Thích", liked ? "Liked" : "Like")}
        </button>
        <button
          disabled={pending}
          onClick={() =>
            run(async () => {
              setShowComments(!showComments)
              if (!showComments) await fetchComments()
            })
          }
          className="flex items-center justify-center gap-2 rounded-lg py-3 text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--paper)]"
        >
          <MessageCircle size={17} />
          {tr("Bình luận", "Comment")}
        </button>
        <button
          aria-expanded={showShare}
          onClick={() => setShowShare(!showShare)}
          className="flex items-center justify-center gap-2 rounded-lg py-3 text-[11px] font-bold text-[var(--muted)] hover:bg-[var(--paper)]"
        >
          <Share2 size={17} />
          {tr("Chia sẻ", "Share")}
          {post.shares > 0 && <span>{post.shares}</span>}
        </button>
      </div>
      {showShare && (
        <SharePanel
          postID={post.id}
          signedIn={signedIn}
          onRefresh={onRefresh}
          onClose={() => setShowShare(false)}
        />
      )}
      {error && (
        <p className="mx-5 mb-3 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {showComments && (
        <div className="border-t border-[var(--line)] bg-[var(--paper)]/50 p-5">
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`flex items-start gap-2.5 ${
                  comment.parent
                    ? "ml-4 border-l-2 border-blue-200 pl-3 sm:ml-8"
                    : ""
                }`}
              >
                {comment.authorProfileId ? (
                  <Link href={communityProfileHref(comment.authorProfileId)} className="shrink-0" aria-label={tr(`Trang cá nhân của ${comment.authorName}`, `${comment.authorName}'s profile`)}>
                    <Avatar name={comment.authorName} small image={comment.authorAvatar} />
                  </Link>
                ) : (
                  <Avatar name={comment.authorName} small image={comment.authorAvatar} />
                )}
                <div className="min-w-0 flex-1 rounded-xl bg-[var(--paper)] px-3 py-2.5">
                  <div className="flex justify-between gap-2">
                    <b className="text-[11px]">
                      {comment.authorProfileId ? (
                        <Link href={communityProfileHref(comment.authorProfileId)} className="hover:text-[#1677ff] hover:underline">
                          {communityName(comment.authorName)}
                        </Link>
                      ) : communityName(comment.authorName)}
                    </b>
                    {(comment.own || moderator) && (
                      <button
                        disabled={pending}
                        aria-label={tr("Xóa bình luận", "Delete comment")}
                        onClick={() =>
                          run(async () => {
                            const r = await deleteCommunityComment(comment.id)
                            if (!r.ok) setError(r.error ?? tr("Đã có lỗi, vui lòng thử lại.", "Something went wrong. Please try again."))
                            else {
                              await fetchComments()
                              await onRefresh()
                            }
                          })
                        }
                      >
                        <Trash2 size={12} className="text-[var(--muted)]" />
                      </button>
                    )}
                  </div>
                  {comment.parent && (
                    <blockquote className="my-2 rounded-lg border-l-2 border-[#1677ff] bg-[var(--white)] px-3 py-2 text-[10px] text-[var(--muted)]">
                      <span className="font-semibold">
                        {tr("Trả lời", "Replying to")}{" "}
                        {communityName(comment.parent.authorName)}
                      </span>
                      <p className="mt-1 line-clamp-2 break-words">
                        {comment.parent.content}
                      </p>
                    </blockquote>
                  )}
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6">
                    {comment.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {comment.reactions.map(({ type, count, active }) => {
                      const Icon =
                        type === "heart"
                          ? Heart
                          : type === "like"
                            ? ThumbsUp
                            : HandHeart
                      const label =
                        type === "heart"
                          ? tr("Yêu thích", "Love")
                          : type === "like"
                            ? tr("Thích", "Like")
                            : tr("Ủng hộ", "Support")
                      return (
                        <button
                          key={type}
                          disabled={pending}
                          aria-label={`${label}: ${count}`}
                          title={label}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${
                            active
                              ? "border-blue-200 bg-[var(--soft-blue)] text-[var(--lime)]"
                              : "border-[var(--line)] text-[var(--muted)] hover:border-blue-300"
                          }`}
                          onClick={() =>
                            signedIn
                              ? run(async () => {
                                  const r = await toggleCommentReaction(
                                    comment.id,
                                    type,
                                  )
                                  if (!r.ok) setError(r.error ?? tr("Đã có lỗi, vui lòng thử lại.", "Something went wrong. Please try again."))
                                  else {
                                    await fetchComments()
                                    router.refresh()
                                  }
                                })
                              : router.push("/dang-nhap")
                          }
                        >
                          <Icon
                            size={13}
                            fill={
                              active && type === "heart"
                                ? "currentColor"
                                : "none"
                            }
                          />
                          <span>{count}</span>
                        </button>
                      )
                    })}
                    <button
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-[var(--muted)] hover:text-[#1677ff]"
                      onClick={() => {
                        if (!signedIn) {
                          router.push("/dang-nhap")
                          return
                        }
                        setReplyTo(comment)
                        commentInput.current?.focus()
                      }}
                    >
                      <Reply size={13} />
                      {tr("Trả lời", "Reply")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {commentError && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><span>{commentError}</span><button disabled={pending} onClick={() => run(() => fetchComments())} className="shrink-0 underline">{tr("Thử lại", "Retry")}</button></div>}
          {commentsLoaded && !commentError && !comments.length && (
            <p className="mb-4 text-xs text-[var(--muted)]">
              {tr(
                "Chưa có bình luận. Bắt đầu trò chuyện nhé!",
                "No comments yet. Start the conversation!",
              )}
            </p>
          )}
          {moreComments && (
            <button
              disabled={pending}
              className="my-3 text-xs font-bold text-[var(--lime)]"
              onClick={() => run(() => fetchComments(commentPage + 1))}
            >
              {tr("Xem thêm bình luận", "More comments")}
            </button>
          )}
          {replyTo && (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-[var(--soft-blue)] p-3 text-xs text-[var(--lime)]">
              <span>
                {tr("Đang trả lời", "Replying to")}{" "}
                <b>{communityName(replyTo.authorName)}</b>
              </span>
              <button
                onClick={() => setReplyTo(null)}
                aria-label={tr("Hủy trả lời", "Cancel reply")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {signedIn ? (
            <form
              className="mt-4 flex items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                run(async () => {
                  const r = await writeCommunityComment(
                    post.id,
                    text,
                    replyTo?.id,
                  )
                  if (!r.ok) setError(r.error ?? tr("Đã có lỗi, vui lòng thử lại.", "Something went wrong. Please try again."))
                  else {
                    setText("")
                    setReplyTo(null)
                    await fetchComments()
                    await onRefresh()
                  }
                })
              }}
            >
              <textarea
                ref={commentInput}
                aria-label={tr("Viết bình luận", "Write a comment")}
                placeholder={
                  replyTo
                    ? tr("Viết câu trả lời của bạn…", "Write your reply…")
                    : tr("Chia sẻ ý kiến của bạn…", "Share your thoughts…")
                }
                className={field + " min-h-12 flex-1 resize-y"}
                value={text}
                maxLength={1000}
                required
                onChange={(e) => setText(e.target.value)}
              />
              <button
                disabled={pending || !text.trim()}
                className={primary + " !px-3 !py-3"}
                aria-label={tr("Gửi bình luận", "Send comment")}
              >
                <Send size={16} />
              </button>
            </form>
          ) : (
            <Link
              href="/dang-nhap"
              className="text-xs font-bold text-[var(--lime)]"
            >
              {tr("Đăng nhập để bình luận", "Sign in to comment")}
              <ArrowRight className="ml-1 inline" size={12} />
            </Link>
          )}
        </div>
      )}
    </article>
  )
}
