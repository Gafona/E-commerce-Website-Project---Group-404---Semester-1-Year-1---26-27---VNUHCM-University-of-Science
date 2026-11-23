"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Lock,
  RefreshCw,
  Settings2,
  Sparkles,
  UserPlus,
  BellPlus,
  UserCheck,
  X,
  Search,
} from "lucide-react"
import { CommunityIdBadge } from "./CommunityIdBadge"
import {
  refreshSuggestedMembers,
  searchCommunityMembers,
} from "./directory-actions"
import { communityProfileHref } from "@/lib/community-identity"
import type { CommunityMember } from "@/lib/community"
import { useShop } from "../components/ShopProvider"
import {
  CommunityAvatar,
  communityName,
  communityPalette,
} from "./CommunityAvatar"
import {
  connectCommunityMember,
  loadCommunityConnections,
  joinCommunityDirectory,
} from "./social-actions"

type Connections = Extract<Awaited<ReturnType<typeof loadCommunityConnections>>, {
  ok: true
}>
const button =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition disabled:opacity-50"

export function CommunityMembers({
  members,
  suggested: initialSuggested,
  selectedMember,
}: {
  members: CommunityMember[]
  suggested: CommunityMember[]
  selectedMember?: string
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [suggested, setSuggested] = useState(initialSuggested)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState("")
  async function shuffleSuggestions() {
    if (suggesting) return
    setSuggesting(true)
    setSuggestError("")
    try {
      const result = await refreshSuggestedMembers(suggested.map((m) => m.id))
      if (result.ok) setSuggested(result.members)
      else setSuggestError(result.error)
    } catch {
      setSuggestError(
        tr("Không thể tải gợi ý. Vui lòng thử lại.", "Couldn't load suggestions. Please try again."),
      )
    } finally {
      setSuggesting(false)
    }
  }
  const [kind, setKind] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState("")
  const [searchResult, setSearchResult] = useState<{
    query: string
    members: CommunityMember[]
    page: number
    totalDocs: number
    hasNextPage: boolean
  } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [searchRetry, setSearchRetry] = useState(0)
  const searchGeneration = useRef(0)
  const query = search.trim()
  useEffect(() => {
    const generation = ++searchGeneration.current
    setSearchError("")
    if (!query) {
      setSearchResult(null)
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const result = await searchCommunityMembers(query)
        if (generation !== searchGeneration.current) return
        if (result.ok)
          setSearchResult({
            query,
            members: result.members,
            page: result.page,
            totalDocs: result.totalDocs,
            hasNextPage: result.hasNextPage,
          })
        else setSearchError(result.error)
      } catch {
        if (generation === searchGeneration.current)
          setSearchError(tr("Không thể tìm thành viên. Vui lòng thử lại.", "Couldn't search members. Please try again."))
      } finally {
        if (generation === searchGeneration.current) setSearchLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      searchGeneration.current++
    }
  }, [query, searchRetry])
  const activeSearch = searchResult?.query === query ? searchResult : null
  const searchMembers = activeSearch?.members ?? []
  async function loadMoreMatches() {
    if (!activeSearch || searchLoading) return
    const generation = searchGeneration.current
    setSearchLoading(true)
    setSearchError("")
    try {
      const result = await searchCommunityMembers(query, activeSearch.page + 1)
      if (generation !== searchGeneration.current) return
      if (result.ok)
        setSearchResult({
          query,
          members: [
            ...new Map(
              [...activeSearch.members, ...result.members].map((m) => [
                m.id,
                m,
              ]),
            ).values(),
          ],
          page: result.page,
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
        })
      else setSearchError(result.error)
    } catch {
      if (generation === searchGeneration.current)
        setSearchError(tr("Không thể tải thêm thành viên.", "Couldn't load more members."))
    } finally {
      if (generation === searchGeneration.current) setSearchLoading(false)
    }
  }
  const [connections, setConnections] = useState<Connections | null>(null)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const reload = useCallback(async () => {
    const r = await loadCommunityConnections()
    if (r.ok) {
      setConnections(r)
      setError("")
    } else setError(r.error)
  }, [])
  useEffect(() => {
    void reload()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload()
    }, 45_000)
    return () => clearInterval(timer)
  }, [reload])
  const own = connections?.own
  const incoming =
    connections?.friends.filter((f) => f.target === own && !f.accepted) ?? []
  const followRequests =
    connections?.follows.filter((f) => f.target === own && f.pending) ?? []
  const friendFor = (id: string) =>
    connections?.friends.find((f) => f.source === id || f.target === id)
  const followOf = (id: string) =>
    connections?.follows.find((f) => f.source === own && f.target === id)
  const following = (id: string) => {
    const f = followOf(id)
    return !!f && !f.pending
  }
  const followerCount = (id: string) =>
    connections?.follows.filter((f) => f.target === id && !f.pending).length
  const lookup = (id: string) =>
    [...members, ...suggested, ...searchMembers].find((m) => m.id === id)
  const filtered = (query ? searchMembers : members).filter((m) => {
    const f = friendFor(m.id)
    return (
      !kind ||
      kind === m.kind ||
      (kind === "following" && following(m.id)) ||
      (kind === "friends" && f?.accepted)
    )
  })
  const browsing = !!(expanded || kind || query)
  const shown = browsing ? filtered : suggested
  const selected = lookup(selectedMember ?? "")
  function connect(
    id: string,
    action: Parameters<typeof connectCommunityMember>[1],
  ) {
    if (!connections?.signedIn) {
      router.push("/dang-nhap")
      return
    }
    if (
      action === "remove-friend" &&
      friendFor(id)?.accepted &&
      !window.confirm(
        tr("Hủy kết bạn với thành viên này?", "Remove this friend?"),
      )
    )
      return
    setError("")
    start(async () => {
      try {
        const r = await connectCommunityMember(id, action)
        if (!r.ok) {
          setError(r.error)
          return
        }
        await reload()
        router.refresh()
      } catch {
        setError(
          tr(
            "Không thể cập nhật kết nối. Thử lại nhé.",
            "Unable to update connection. Please retry.",
          ),
        )
      }
    })
  }
  function controls(m: CommunityMember) {
    if (m.id === own)
      return (
        <Link
          href="/tai-khoan"
          className={`${button} border-[var(--line)] text-[#1677ff]`}
        >
          {tr("Chỉnh sửa hồ sơ", "Edit profile")}
        </Link>
      )
    const f = friendFor(m.id)
    const follow = followOf(m.id)
    const follows = !!follow && !follow.pending
    const requested = !!follow?.pending
    const waiting = f && !f.accepted && f.target === own
    return (
      <div className="flex flex-wrap gap-1.5">
        <button
          disabled={pending || !connections}
          onClick={() => connect(m.id, follow ? "unfollow" : "follow")}
          title={
            requested
              ? tr("Bấm để hủy yêu cầu", "Click to cancel the request")
              : undefined
          }
          className={`${button} ${
            follows || requested
              ? "border-blue-200 bg-blue-50 text-[#1677ff]"
              : "border-[#1677ff] bg-[#1677ff] text-white!"
          }`}
        >
          {follows ? (
            <Check size={13} />
          ) : requested ? (
            <Clock size={13} />
          ) : m.visibility === "private" ? (
            <Lock size={13} />
          ) : (
            <BellPlus size={13} />
          )}
          {follows
            ? tr("Đang theo dõi", "Following")
            : requested
              ? tr("Đã gửi yêu cầu", "Requested")
              : m.visibility === "private"
                ? tr("Yêu cầu theo dõi", "Request to follow")
                : tr("Theo dõi", "Follow")}
        </button>
        <button
          disabled={pending || !connections}
          onClick={() =>
            connect(m.id, waiting ? "accept" : f ? "remove-friend" : "request")
          }
          className={`${button} border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]`}
        >
          {f?.accepted ? <UserCheck size={13} /> : <UserPlus size={13} />}
          {waiting
            ? tr("Chấp nhận", "Accept")
            : f?.accepted
              ? tr("Bạn bè", "Friends")
              : f
                ? tr("Hủy lời mời", "Cancel request")
                : tr("Kết bạn", "Add friend")}
        </button>
        {waiting && (
          <button
            disabled={pending}
            onClick={() => connect(m.id, "remove-friend")}
            className={`${button} border-[var(--line)] text-[var(--muted)]`}
          >
            {tr("Từ chối", "Decline")}
          </button>
        )}
      </div>
    )
  }
  return (
    <section
      id="thanh-vien"
      className="mb-7 rounded-2xl border border-[var(--line)] bg-[var(--white)] p-5 md:p-6"
      aria-labelledby="community-members-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[0.18em] text-[var(--lime)]">
            BOAI PEOPLE
          </div>
          <h2 id="community-members-title" className="text-xl font-bold">
            {tr("Kết nối cùng đam mê", "Connect through your game")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {tr(
              "Theo dõi để kết nối. Kết bạn khi cả hai cùng đồng ý.",
              "Follow people. Become friends when both agree.",
            )}
          </p>
        </div>
        {pending && (
          <Loader2 size={18} className="animate-spin text-[#1677ff]" />
        )}
      </div>
      {followRequests.length > 0 && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-[var(--soft-blue)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Lock size={16} />
            {tr("Yêu cầu theo dõi", "Follow requests")}{" "}
            <span className="rounded-full bg-[#1677ff] px-2 text-xs text-white">
              {followRequests.length}
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {followRequests.map((f) => {
              const m = lookup(f.source)
              const name = m?.name ?? tr("Thành viên", "Member")
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--white)] p-3"
                >
                  <CommunityAvatar name={name} image={m?.avatar} small />
                  <Link
                    href={communityProfileHref(f.source)}
                    className="flex-1 text-xs font-bold hover:text-[#1677ff]"
                  >
                    {communityName(name)}
                  </Link>
                  <button
                    disabled={pending}
                    onClick={() => connect(f.source, "accept-follow")}
                    className={`${button} border-[#1677ff] bg-[#1677ff] text-white!`}
                  >
                    <Check size={13} />
                    {tr("Chấp nhận", "Accept")}
                  </button>
                  <button
                    disabled={pending}
                    aria-label={tr("Từ chối", "Decline")}
                    onClick={() => connect(f.source, "decline-follow")}
                    className={`${button} border-[var(--line)]`}
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {incoming.length > 0 && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-[var(--soft-blue)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <UserPlus size={17} />
            {tr("Lời mời kết bạn", "Friend requests")}{" "}
            <span className="rounded-full bg-[#1677ff] px-2 text-xs text-white">
              {incoming.length}
            </span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {incoming.map((f) => {
              const m = lookup(f.source)
              return (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--white)] p-3"
                >
                  <CommunityAvatar
                    name={m?.name ?? tr("Thành viên", "Member")}
                    image={m?.avatar}
                    small
                  />
                  <Link
                    href={communityProfileHref(f.source)}
                    className="flex-1 text-xs font-bold hover:text-[#1677ff]"
                  >
                    {communityName(m?.name ?? tr("Thành viên", "Member"))}
                  </Link>
                  <button
                    disabled={pending}
                    onClick={() => connect(f.source, "accept")}
                    className={`${button} border-[#1677ff] bg-[#1677ff] text-white!`}
                  >
                    <Check size={13} />
                    {tr("Chấp nhận", "Accept")}
                  </button>
                  <button
                    disabled={pending}
                    aria-label={tr("Từ chối", "Decline")}
                    onClick={() => connect(f.source, "remove-friend")}
                    className={`${button} border-[var(--line)]`}
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["", "Tất cả", "All"],
          ["person", "Cá nhân", "Players"],
          ["shop", "Shop", "Shops"],
          ...(connections?.signedIn
            ? [
                ["following", "Đang theo dõi", "Following"],
                ["friends", "Bạn bè", "Friends"],
              ]
            : []),
        ].map(([value, vi, en]) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value)
              setExpanded(true)
            }}
            className={`rounded-full border px-4 py-2 text-xs ${
              kind === value
                ? "border-[#1677ff] bg-[#1677ff] text-white!"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {tr(vi, en)}
          </button>
        ))}
      </div>
      {connections?.signedIn && !own && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-[var(--soft-blue)] p-4">
          <h3 className="text-sm font-bold">
            {tr("Tạo ID cộng đồng của bạn", "Create your community ID")}
          </h3>
          <p className="my-2 text-xs leading-5 text-[var(--muted)]">
            {tr(
              "Tham gia để mọi người tìm bạn bằng tên hoặc ID. Hồ sơ chỉ công khai tên, giới thiệu, môn thể thao và ảnh hồ sơ; không hiện email hay số điện thoại.",
              "Join so others can find you by name or ID. Only your public name, bio, sports and profile photos are listed, not your email or phone number.",
            )}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError("")
              start(async () => {
                try {
                  const result = await joinCommunityDirectory()
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  await reload()
                  router.refresh()
                } catch {
                  setError(tr("Không thể tạo hồ sơ cộng đồng. Vui lòng thử lại.", "Couldn't create your community profile. Please try again."))
                }
              })
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1677ff] px-4 py-2.5 text-xs font-bold text-white! disabled:opacity-50"
          >
            <UserPlus size={15} />
            {tr("Tạo ID cộng đồng", "Create community ID")}
          </button>
        </div>
      )}
      {own && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-[var(--soft-blue)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1677ff]">
            {tr("Mã cộng đồng của bạn", "Your community ID")}
          </p>
          <CommunityIdBadge
            profileId={own}
            handle={lookup(own)?.handle}
          />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--muted)]">
            {tr(
              "Chia sẻ mã này để bạn bè tìm đúng tài khoản của bạn.",
              "Share this ID so friends can find your exact profile.",
            )}
            <Link
              href="/cai-dat#cong-dong"
              className="inline-flex items-center gap-1 font-bold text-[#1677ff]"
            >
              <Settings2 size={12} />
              {tr("Đặt ID riêng & quyền riêng tư", "Custom ID & privacy")}
            </Link>
            <Link
              href={communityProfileHref(own)}
              className="inline-flex items-center gap-1 font-bold text-[#1677ff]"
            >
              {tr("Trang cá nhân", "My profile")}
              <ArrowRight size={12} />
            </Link>
          </p>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSearchRetry((v) => v + 1)
        }}
        role="search"
        aria-label={tr("Tìm người dùng cộng đồng", "Search community members")}
        className="mt-5 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3"
      >
        <label
          htmlFor="community-member-search"
          className="mb-2 flex items-center gap-2 text-xs font-bold"
        >
          <Search size={15} className="text-[#1677ff]" />
          {tr("Tìm người dùng theo tên hoặc ID", "Find people by name or ID")}
        </label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="community-member-search"
              type="search"
              maxLength={100}
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr(
                "Nhập tên, @tên tùy chỉnh hoặc mã Boai123456",
                "Enter a name, @handle or Boai123456 code",
              )}
              aria-controls="community-member-results"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 pr-8 text-xs outline-none focus:border-[#1677ff]"
            />
            {searchLoading && (
              <Loader2
                size={15}
                className="absolute right-3 top-3 animate-spin text-[#1677ff]"
              />
            )}
          </div>
          <button className="shrink-0 rounded-lg bg-[#1677ff] px-4 py-2.5 text-xs font-bold text-white!">
            {tr("Tìm", "Search")}
          </button>
          {query && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={tr("Xóa tìm kiếm", "Clear search")}
              className="rounded-lg border border-[var(--line)] p-2.5"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <p
          role="status"
          className="mt-2 text-[10px] leading-4 text-[var(--muted)]"
        >
          {searchLoading
            ? tr("Đang tìm thành viên…", "Searching members…")
            : activeSearch
              ? tr(
                  `Tìm thấy ${activeSearch.totalDocs} hồ sơ.`,
                  `${activeSearch.totalDocs} profiles found.`,
                )
              : tr(
                  "Tìm được cả tên có dấu/không dấu; không cần nhập đầy đủ họ tên.",
                  "Partial names and Vietnamese names without accents are supported.",
                )}
        </p>
        {searchError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {searchError}{" "}
            <button
              type="button"
              onClick={() => setSearchRetry((v) => v + 1)}
              className="font-bold underline"
            >
              {tr("Thử lại", "Retry")}
            </button>
          </p>
        )}
      </form>
      {error && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {error}{" "}
          <button onClick={() => void reload()} className="underline">
            {tr("Thử lại", "Retry")}
          </button>
        </p>
      )}
      {!browsing && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Sparkles size={15} className="text-[#1677ff]" />
            {tr("Gợi ý cho bạn", "Suggested for you")}
          </h3>
          <button
            type="button"
            onClick={() => void shuffleSuggestions()}
            disabled={suggesting}
            className={`${button} border-[var(--line)] text-[#1677ff]`}
          >
            <RefreshCw size={13} className={suggesting ? "animate-spin" : ""} />
            {tr("Làm mới", "Refresh")}
          </button>
        </div>
      )}
      {suggestError && !browsing && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {suggestError}
        </p>
      )}
      <div
        id="community-member-results"
        aria-busy={searchLoading || suggesting}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {shown.map((m) => (
          <article
            key={m.id}
            className={`overflow-hidden rounded-2xl border bg-[var(--white)] p-4 transition hover:border-blue-300 ${
              selectedMember === m.id
                ? "border-[#1677ff]"
                : "border-[var(--line)]"
            }`}
          >
            <Link
              href={communityProfileHref(m.id)}
              className="block cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1677ff]"
              aria-label={tr(`Trang cá nhân của ${m.name}`, `${m.name}'s profile`)}
            >
              <div
                className={`relative -mx-4 -mt-4 mb-[-24px] h-24 overflow-hidden bg-gradient-to-br ${communityPalette(m.name).cover}`}
              >
                {m.cover ? (
                  <Image
                    src={m.cover}
                    alt={tr(`Ảnh bìa ${m.name}`, `${m.name}'s cover`)}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute -right-3 -top-6 size-28 rounded-full border-[18px] border-white/25" />
                )}
              </div>
              <div className="relative mb-3">
                <CommunityAvatar
                  name={m.name}
                  image={m.avatar}
                  large
                  shop={m.kind === "shop"}
                />
              </div>
              <h3 className="flex items-center gap-1.5 text-sm font-bold hover:text-[#1677ff]">
                <span className="truncate">{communityName(m.name)}</span>
                {m.visibility === "private" && (
                  <Lock
                    size={12}
                    className="shrink-0 text-[var(--muted)]"
                    aria-label={tr("Tài khoản riêng tư", "Private account")}
                  />
                )}
              </h3>
            </Link>
            <CommunityIdBadge profileId={m.id} handle={m.handle} />
            {m.demo && (
              <span className="text-[9px] text-[var(--muted)]">
                {tr("Hồ sơ minh họa", "Demo profile")}
              </span>
            )}
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {m.kind === "shop" ? "Shop" : tr("Người chơi", "Player")} ·{" "}
              {m.sport === "football"
                ? tr("Bóng đá", "Football")
                : m.sport === "badminton"
                  ? tr("Cầu lông", "Badminton")
                  : tr("Đa môn", "All sports")}
            </p>
            <p className="mt-3 line-clamp-2 min-h-10 text-[11px] leading-5 text-[var(--muted)]">
              {m.bio}
            </p>
            <div className="my-3 flex gap-3 border-t border-[var(--line)] pt-3 text-[10px] text-[var(--muted)]">
              <span>
                <b>{m.posts}</b> {tr("bài viết", "posts")}
              </span>
              <span>
                <b>{followerCount(m.id) ?? "—"}</b>{" "}
                {tr("người theo dõi", "followers")}
              </span>
            </div>
            {controls(m)}
            <Link
              href={communityProfileHref(m.id)}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[#1677ff] transition hover:bg-[var(--soft-blue)]"
            >
              {tr("Xem trang cá nhân", "View profile")}
              <ArrowRight size={14} />
            </Link>
          </article>
        ))}
      </div>
      {!shown.length && !searchLoading && !searchError && (
        <p className="py-8 text-center text-xs text-[var(--muted)]">
          {query
            ? tr(
                "Không tìm thấy tài khoản phù hợp. Thử tên khác hoặc dán mã Boai gồm 6 chữ số.",
                "No matching profiles. Try another name or paste the Boai code with 6 digits.",
              )
            : browsing
              ? tr("Chưa có hồ sơ trong mục này.", "No profiles here yet.")
              : tr(
                  "Bạn đã theo dõi tất cả thành viên. Xem danh sách đầy đủ bên dưới.",
                  "You already follow everyone. Browse the full list below.",
                )}
        </p>
      )}
      {query && activeSearch?.hasNextPage && (
        <button
          type="button"
          disabled={searchLoading}
          onClick={() => void loadMoreMatches()}
          className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-xs text-[#1677ff] disabled:opacity-50"
        >
          {searchLoading && <Loader2 size={13} className="animate-spin" />}
          {tr("Xem thêm kết quả", "More results")}
        </button>
      )}
      {!kind && !search && members.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 rounded-lg border border-[var(--line)] px-4 py-2 text-xs text-[var(--lime)]"
        >
          {expanded
            ? tr("Thu gọn", "Show less")
            : tr(
                `Xem đủ ${members.length} hồ sơ`,
                `View all ${members.length} profiles`,
              )}
        </button>
      )}
      {selected && (
        <div className="relative mt-5 overflow-hidden rounded-xl border border-blue-200 bg-[var(--soft-blue)]">
          {selected.cover && (
            <div className="relative h-44 md:h-60">
              <Image
                src={selected.cover}
                alt={tr("Ảnh bìa hồ sơ", "Profile cover")}
                fill
                sizes="(max-width: 1360px) 90vw, 1200px"
                className="object-cover"
              />
            </div>
          )}
          <div className="p-5">
            <CommunityAvatar
              name={selected.name}
              image={selected.avatar}
              large
            />
            <h3 className="mt-3 text-lg font-bold">
              {communityName(selected.name)}
            </h3>
            <CommunityIdBadge profileId={selected.id} handle={selected.handle} />
            <p className="my-3 text-sm leading-6 text-[var(--muted)]">
              {selected.bio}
            </p>
            {controls(selected)}
            <Link
              href={communityProfileHref(selected.id)}
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--lime)]"
            >
              {tr("Xem trang cá nhân", "View profile")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
