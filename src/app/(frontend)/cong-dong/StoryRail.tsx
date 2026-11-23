"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { communityProfileHref } from "@/lib/community-identity"
import { useRouter } from "next/navigation"
import {
  Camera,
  Eye,
  HandHeart,
  Heart,
  Music2,
  Play,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageCircle,
  Plus,
  Send,
  ThumbsUp,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react"
import { CommunityAvatar, communityName } from "./CommunityAvatar"
import {
  createCommunityStory,
  deleteCommunityStory,
  loadCommunityStories,
  markStoryViewedAction,
  reactToStoryAction,
} from "./social-actions"
import { StoryPlayback } from "./StoryPlayback"
import { StoryMusicPicker } from "./StoryMusicPicker"
import { useShop } from "../components/ShopProvider"
import { ASPECTS, useImageCropper } from "../components/ImageCropper"

type Story = Extract<Awaited<ReturnType<typeof loadCommunityStories>>, {
  ok: true
}>["stories"][number]
const backgrounds: Record<string, string> = {
  ocean: "from-[#041e42] via-[#1349ad] to-[#4a9aff]",
  sunset: "from-[#63295e] via-[#c54863] to-[#f9ad69]",
  forest: "from-[#073e37] via-[#168575] to-[#72bfb0]",
}
function Modal({
  children,
  label,
  close,
}: {
  children: React.ReactNode
  label: string
  close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[min(94vw,440px)] overflow-y-auto rounded-2xl border-0 bg-[var(--white)] p-0 text-[var(--ink)] shadow-2xl backdrop:bg-slate-950/75"
    >
      {children}
    </dialog>
  )
}

export function StoryRail({
  signedIn,
  onMessage,
}: {
  signedIn: boolean
  onMessage: (id: string | null) => void
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [compose, setCompose] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [theme, setTheme] = useState("ocean")
  const [file, setFile] = useState<File | null>(null)
  const { cropImage, cropper } = useImageCropper()
  const [preview, setPreview] = useState<string | null>(null)
  const [music, setMusic] = useState("")
  const isVideo = file?.type.startsWith("video/") ?? false
  const [pending, start] = useTransition()
  const running = useRef(false)
  const [now, setNow] = useState(0)
  const reload = useCallback(async (nextPage = 1) => {
    try {
      const result = await loadCommunityStories(nextPage)
      setLoaded(true)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError("")
      setStories((old) =>
        nextPage === 1
          ? result.stories
          : [
              ...new Map(
                [...old, ...result.stories].map((s) => [s.id, s]),
              ).values(),
            ],
      )
      setPage(nextPage)
      setMore(result.hasNextPage)
      setNow(Date.now())
    } catch {
      setLoaded(true)
      setError(tr("Không thể tải story. Vui lòng thử lại.", "Couldn't load stories. Please try again."))
    }
  }, [])
  useEffect(() => {
    let active = true
    void reload()
    const timer = setInterval(() => {
      if (active && document.visibilityState === "visible" && !running.current)
        void reload()
    }, 60_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [reload])
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const live = stories.filter((s) => new Date(s.expiresAt).getTime() > now)
  const index = live.findIndex((s) => s.id === selected)
  const story = live[index]
  function closeCompose() {
    if (!pending) {
      setCompose(false)
      setText("")
      setFile(null)
      setMusic("")
      setError("")
    }
  }
  function removeStory(id: string) {
    if (!window.confirm(tr("Gỡ story này?", "Remove this story?"))) return
    setError("")
    start(async () => {
      try {
        const r = await deleteCommunityStory(id)
        if (!r.ok) {
          setError(r.error)
          return
        }
        setSelected(null)
        await reload()
        router.refresh()
      } catch {
        setError(
          tr(
            "Không thể gỡ story. Vui lòng thử lại.",
            "Unable to remove story. Please retry.",
          ),
        )
      }
    })
  }
  return (
    <section
      aria-label="Community stories"
      className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--white)] p-4 md:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Camera size={18} className="text-[#1677ff]" />
            {tr("Khoảnh khắc trên sân", "Moments from the game")}
          </h2>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            {tr(
              "Story của cộng đồng · Hiển thị trong 24 giờ",
              "Community stories · Visible for 24 hours",
            )}
          </p>
        </div>
        <button
          onClick={() =>
            signedIn ? onMessage(null) : router.push("/dang-nhap")
          }
          className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--soft-blue)] px-3 py-2.5 text-[#1677ff]"
        >
          <MessageCircle size={17} />
          {tr("Tin nhắn", "Messages")}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => {
            if (!signedIn) {
              router.push("/dang-nhap")
              return
            }
            setError("")
            setCompose(true)
          }}
          className="flex h-36 w-24 shrink-0 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-300 bg-[var(--soft-blue)] text-[#1677ff]"
        >
          <span className="grid size-11 place-items-center rounded-full bg-white shadow-sm">
            <Plus size={23} />
          </span>
          <span>{tr("Tạo story", "Create story")}</span>
        </button>
        {live.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`relative flex h-36 w-24 shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${backgrounds[s.theme]} p-2.5 text-left text-white! ring-2 ring-blue-400/50 ring-offset-2 ring-offset-[var(--white)]`}
          >
            {s.video && (
              <video
                src={s.video}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            {s.image && (
              <Image
                src={s.image}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
            <span className="relative">
              <CommunityAvatar name={s.authorName} small />
            </span>
            {(s.video || s.music) && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1">
                {s.video ? <Play size={12} /> : <Music2 size={12} />}
              </span>
            )}
            {!s.image && !s.video && (
              <span className="relative line-clamp-2 text-[10px] leading-4">
                {s.content}
              </span>
            )}
            <span className="relative line-clamp-2 text-[10px] font-bold leading-4">
              {s.own
                ? tr("Story của bạn", "Your story")
                : communityName(s.authorName)}
            </span>
          </button>
        ))}
        {loaded && !live.length && (
          <div className="flex min-w-44 flex-1 flex-col justify-center px-3">
            <p className="text-xs font-semibold">
              {tr("Ngày của bạn có gì mới?", "What's new in your day?")}
            </p>
            <p className="mt-2 max-w-xs text-[11px] leading-5 text-[var(--muted)]">
              {tr(
                "Một buổi tập, một trận đấu, một khoảnh khắc đáng nhớ. Hãy là người chia sẻ đầu tiên.",
                "A training session, a match, a moment to remember. Share the first story.",
              )}
            </p>
          </div>
        )}
        {more && (
          <button
            className="shrink-0 px-3 text-[#1677ff]"
            onClick={() => void reload(page + 1)}
          >
            {tr("Xem thêm", "More")}
          </button>
        )}
      </div>
      {error && !compose && (
        <p role="alert" className="mt-3 text-xs text-red-600">
          {error}{" "}
          <button className="underline" onClick={() => void reload()}>
            {tr("Thử lại", "Retry")}
          </button>
        </p>
      )}
      {compose && (
        <Modal label={tr("Tạo story", "Create story")} close={closeCompose}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (running.current) return
              running.current = true
              setError("")
              start(async () => {
                try {
                  const form = new FormData()
                  form.set("content", text)
                  form.set("theme", theme)
                  if (file) form.set("image", file)
                  if (music) form.set("music", music)
                  const r = await createCommunityStory(form)
                  if (!r.ok) {
                    setError(r.error)
                    return
                  }
                  setCompose(false)
                  setText("")
                  setFile(null)
                  setMusic("")
                  await reload()
                  router.refresh()
                } catch {
                  setError(
                    tr(
                      "Không thể đăng story. Vui lòng thử lại.",
                      "Unable to post story. Please retry.",
                    ),
                  )
                } finally {
                  running.current = false
                }
              })
            }}
          >
            <header className="flex items-center justify-between border-b border-[var(--line)] p-4">
              <h3 className="text-base font-bold">
                {tr("Tạo story", "Create story")}
              </h3>
              <button
                type="button"
                disabled={pending}
                onClick={closeCompose}
                aria-label={tr("Đóng", "Close")}
              >
                <X size={19} />
              </button>
            </header>
            <div className="space-y-4 p-4">
              <div
                className={`relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br sm:h-40 ${backgrounds[theme]}`}
              >
                {preview && isVideo && (
                  <video
                    src={preview}
                    controls
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-contain"
                  />
                )}
                {preview && !isVideo && (
                  <img
                    src={preview}
                    alt={tr("Xem trước story", "Story preview")}
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                {preview && (
                  <div className="pointer-events-none absolute inset-0 bg-black/20" />
                )}
                <p className="pointer-events-none relative line-clamp-5 whitespace-pre-wrap break-words px-6 text-center text-xl font-bold leading-8 text-white">
                  {text || tr("Khoảnh khắc của bạn…", "Your moment…")}
                </p>
              </div>
              <StoryMusicPicker value={music} onChange={setMusic} />
              <textarea
                aria-label={tr("Nội dung story", "Story content")}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder={tr(
                  "Viết điều bạn muốn chia sẻ…",
                  "Share what's on your mind…",
                )}
                className="min-h-20 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-sm outline-none focus:border-[#1677ff]"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-xs">
                  <ImagePlus size={17} />
                  {tr("Ảnh / video", "Photo / video")}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    onChange={async (e) => {
                      const input = e.target
                      const picked = input.files?.[0] ?? null
                      const next =
                        picked && picked.type.startsWith("image/")
                          ? await cropImage(picked, {
                              title: tr("Cắt ảnh story", "Crop story photo"),
                              aspects: [ASPECTS.story, ASPECTS.square, ASPECTS.original],
                              maxOutput: 1920,
                            })
                          : picked
                      if (picked && !next) {
                        input.value = ""
                        return
                      }
                      if (
                        next &&
                        next.size >
                          (next.type.startsWith("video/") ? 30 : 5) *
                            1024 *
                            1024
                      ) {
                        setError(
                          tr(
                            "Ảnh tối đa 5 MB, video tối đa 30 MB.",
                            "Photos up to 5 MB, videos up to 30 MB.",
                          ),
                        )
                        input.value = ""
                        return
                      }
                      setFile(next)
                      setError("")
                      // Allow choosing the same file again after removing it.
                      input.value = ""
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  {Object.keys(backgrounds).map((color) => (
                    <button
                      type="button"
                      key={color}
                      aria-label={color}
                      aria-pressed={theme === color}
                      onClick={() => setTheme(color)}
                      className={`size-7 rounded-full bg-gradient-to-br ${backgrounds[color]} ${
                        theme === color
                          ? "ring-2 ring-[#1677ff] ring-offset-2"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-red-600"
                >
                  {tr("Bỏ tệp", "Remove file")} · {file.name}
                </button>
              )}
              <p className="text-[10px] leading-5 text-[var(--muted)]">
                {tr(
                  "Ảnh JPG, PNG, WebP tối đa 5 MB; video MP4/WebM tối đa 30 MB. Story công khai và tự ẩn sau 24 giờ. Tên của bạn sẽ có trong danh sách thành viên để mọi người kết nối.",
                  "JPG, PNG or WebP up to 5 MB; MP4/WebM up to 30 MB. Public stories disappear after 24 hours. Your name will appear in the community directory.",
                )}
              </p>
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
              <button
                disabled={pending || (!text.trim() && !file)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677ff] py-3 text-white! disabled:opacity-50"
              >
                <Send size={16} />
                {pending
                  ? tr("Đang đăng…", "Posting…")
                  : tr("Đăng story", "Share story")}
              </button>
            </div>
          </form>
          {cropper}
        </Modal>
      )}
      {story && (
        <StoryViewer
          live={live}
          index={index}
          signedIn={signedIn}
          pending={pending}
          error={error}
          onSelect={setSelected}
          onRemove={removeStory}
          onMessage={onMessage}
        />
      )}
    </section>
  )
}

type Reaction = "heart" | "like" | "support"
const REACTIONS: { id: Reaction; Icon: LucideIcon; vi: string; en: string }[] = [
  { id: "heart", Icon: Heart, vi: "Thả tim", en: "Love" },
  { id: "like", Icon: ThumbsUp, vi: "Thích", en: "Like" },
  { id: "support", Icon: HandHeart, vi: "Ủng hộ", en: "Support" },
]
/** Seconds a story stays on screen: photo/text 7 s, with music 10 s, video = its length (3–30 s). */
const baseDuration = (s: Story) => (s.video ? 15 : s.music ? 10 : 7)

/**
 * Full-screen story viewer. The active progress segment fills over the story's
 * duration, then the next story opens (the last one closes the viewer).
 * Pressing and holding, a hidden tab, or pausing the video pauses the timer.
 */
function StoryViewer({
  live,
  index,
  signedIn,
  pending,
  error,
  onSelect,
  onRemove,
  onMessage,
}: {
  live: Story[]
  index: number
  signedIn: boolean
  pending: boolean
  error: string
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onMessage: (id: string | null) => void
}) {
  const { tr, lang } = useShop()
  const router = useRouter()
  const story = live[index]
  const [holding, setHolding] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [playbackPaused, setPlaybackPaused] = useState(false)
  const [videoSeconds, setVideoSeconds] = useState<number | null>(null)
  const [reactions, setReactions] = useState<Record<string, Reaction | null>>({})
  const [reactError, setReactError] = useState("")
  const [, startReact] = useTransition()
  const seconds = story.video && videoSeconds ? Math.min(30, Math.max(3, videoSeconds)) : baseDuration(story)
  const paused = holding || hidden || playbackPaused

  useEffect(() => {
    setVideoSeconds(null)
    setPlaybackPaused(false)
    setReactError("")
    if (signedIn && !story.own) void markStoryViewedAction(story.id)
  }, [story.id, story.own, signedIn])
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState !== "visible")
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  const next = () => (index < live.length - 1 ? onSelect(live[index + 1].id) : onSelect(null))
  const mine = story.id in reactions ? reactions[story.id] : (story.myReaction ?? null)
  const react = (reaction: Reaction) => {
    if (!signedIn) {
      router.push("/dang-nhap")
      return
    }
    const target = mine === reaction ? null : reaction
    const before = mine
    setReactions((current) => ({ ...current, [story.id]: target }))
    setReactError("")
    startReact(async () => {
      const result = await reactToStoryAction(story.id, target).catch(() => null)
      if (!result?.ok) {
        setReactions((current) => ({ ...current, [story.id]: before }))
        setReactError(result?.error ?? tr("Mất kết nối, chưa thả được cảm xúc.", "Connection lost; reaction not saved."))
      }
    })
  }
  const total = story.stats ? story.stats.reactions.heart + story.stats.reactions.like + story.stats.reactions.support : 0

  return (
    <Modal label={tr(`Story của ${story.authorName}`, `${story.authorName}'s story`)} close={() => onSelect(null)}>
      <div
        className={`relative flex h-[min(78dvh,680px)] min-h-96 flex-col overflow-hidden bg-gradient-to-br ${backgrounds[story.theme]} text-white`}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("button, a, input, textarea")) setHolding(true)
        }}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
      >
        {story.image && <Image src={story.image} alt={story.authorName} fill sizes="440px" className="object-cover" />}
        {(story.video || story.music) && (
          <StoryPlayback
            key={story.id}
            video={story.video}
            music={story.music}
            onDuration={setVideoSeconds}
            onPlayingChange={(playing) => setPlaybackPaused(!playing)}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-black/15 to-black/65" />
        <div className="relative z-10 p-4">
          <div className="mb-4 flex gap-1" role="progressbar" aria-label={tr(`Story ${index + 1} trên ${live.length}`, `Story ${index + 1} of ${live.length}`)} aria-valuemin={1} aria-valuemax={live.length} aria-valuenow={index + 1}>
            {live.map((s, i) => (
              <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  key={i === index ? `${s.id}-active` : s.id}
                  className={`block h-full origin-left bg-white ${i < index ? "" : i === index ? "story-progress" : "scale-x-0"}`}
                  style={i === index ? { ["--story-duration" as string]: `${seconds}s`, animationPlayState: paused ? "paused" : "running" } : undefined}
                  onAnimationEnd={i === index ? next : undefined}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <CommunityAvatar name={story.authorName} small />
            <div className="flex-1">
              {story.profileID ? (
                <Link href={communityProfileHref(story.profileID)} className="text-xs font-bold text-white! hover:underline">
                  {communityName(story.authorName)}
                </Link>
              ) : (
                <b className="text-xs">{communityName(story.authorName)}</b>
              )}
              <p className="mt-1 text-[10px] text-white/75">
                {tr("Hết hạn lúc", "Expires at")}{" "}
                {new Date(story.expiresAt).toLocaleTimeString(lang === "en" ? "en-GB" : "vi-VN", { hour: "2-digit", minute: "2-digit" })}
                {paused && <span className="ml-2 rounded bg-black/40 px-1.5 py-0.5">{tr("Tạm dừng", "Paused")}</span>}
              </p>
            </div>
            <button aria-label={tr("Đóng story", "Close story")} onClick={() => onSelect(null)}>
              <X size={21} />
            </button>
          </div>
        </div>
        <div className={`relative flex min-h-0 flex-1 items-center justify-center px-10 ${story.video || story.music ? "pb-24" : ""}`}>
          <p tabIndex={0} className="max-h-full overflow-y-auto whitespace-pre-wrap break-words text-center text-2xl font-bold leading-10">
            {story.content}
          </p>
        </div>
        {index > 0 && (
          <button onClick={() => onSelect(live[index - 1].id)} aria-label={tr("Story trước", "Previous story")} className="absolute left-2 top-1/2 z-10 rounded-full bg-black/25 p-1">
            <ChevronLeft size={24} />
          </button>
        )}
        {index < live.length - 1 && (
          <button onClick={() => onSelect(live[index + 1].id)} aria-label={tr("Story tiếp", "Next story")} className="absolute right-2 top-1/2 z-10 rounded-full bg-black/25 p-1">
            <ChevronRight size={24} />
          </button>
        )}
        <footer className="relative z-10 grid gap-3 p-4">
          {(error || reactError) && (
            <p role="alert" className="rounded-lg bg-red-950/80 p-3 text-xs text-white">
              {reactError || error}
            </p>
          )}
          {story.own ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-3" aria-label={tr("Thống kê story", "Story stats")}>
                <span className="inline-flex items-center gap-1">
                  <Eye size={14} /> {story.stats?.views ?? 0} {tr("lượt xem", "views")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {REACTIONS.map(({ id, Icon, vi, en }) => (
                    <span key={id} className="inline-flex items-center gap-0.5" title={tr(vi, en)}>
                      <Icon size={13} /> {story.stats?.reactions[id] ?? 0}
                    </span>
                  ))}
                  <span className="sr-only">{tr(`${total} cảm xúc`, `${total} reactions`)}</span>
                </span>
              </span>
              <button disabled={pending} className="flex items-center gap-2" onClick={() => onRemove(story.id)}>
                <Trash2 size={15} />
                {tr("Gỡ story", "Remove story")}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2" role="group" aria-label={tr("Thả cảm xúc", "React")}>
                {REACTIONS.map(({ id, Icon, vi, en }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => react(id)}
                    aria-pressed={mine === id}
                    aria-label={tr(vi, en)}
                    title={tr(vi, en)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold transition ${mine === id ? "border-white bg-white text-[#1349ad]" : "border-white/40 bg-black/25 hover:bg-black/40"}`}
                  >
                    <Icon size={15} fill={mine === id && id === "heart" ? "currentColor" : "none"} /> {tr(vi, en)}
                  </button>
                ))}
              </div>
              {story.profileID && (
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-black/20 py-3 text-xs"
                  onClick={() => {
                    if (!signedIn) {
                      router.push("/dang-nhap")
                      return
                    }
                    onSelect(null)
                    onMessage(story.profileID)
                  }}
                >
                  <MessageCircle size={16} />
                  {tr("Nhắn tin riêng", "Send a private message")}
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </Modal>
  )
}
