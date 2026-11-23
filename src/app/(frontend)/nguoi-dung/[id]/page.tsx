import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft, Lock, ShieldCheck, Store, Trophy, Users } from "lucide-react"
import { appAuth } from "@/lib/app-auth"
import { getTr } from "@/lib/i18n-server"
import { readCommunityFeed } from "@/lib/community"
import { communityProfileHref } from "@/lib/community-identity"
import {
  readCommunityProfilePage,
  readFollowList,
  resolveCommunityProfile,
  type ProfilePerson,
} from "@/lib/community-profile-view"
import { SiteHeader } from "../../components/SiteHeader"
import { CommunityAvatar, communityName, communityPalette } from "../../cong-dong/CommunityAvatar"
import { CommunityIdBadge } from "../../cong-dong/CommunityIdBadge"
import { communitySession } from "../../cong-dong/actions"
import { ProfileConnect } from "./ProfileConnect"
import { MemberTimeline } from "./MemberTimeline"

// Visibility depends on who is viewing (private profiles, follow approval).
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string | string[] }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const profile = await resolveCommunityProfile(id)
  const tr = await getTr()
  if (!profile) return { title: tr("Không tìm thấy thành viên — BOAI", "Member not found — BOAI") }
  return {
    title: `${communityName(profile.name)} — BOAI Community`,
    description:
      profile.visibility === "private"
        ? tr("Tài khoản riêng tư trên BOAI Community.", "Private account on BOAI Community.")
        : profile.bio,
  }
}

const SPORT: Record<string, [string, string]> = {
  football: ["Bóng đá", "Football"],
  badminton: ["Cầu lông", "Badminton"],
  all: ["Đa môn", "All sports"],
}

export default async function MemberProfilePage({ params, searchParams }: Params) {
  const [{ id }, { tab: rawTab }, tr, viewer] = await Promise.all([
    params,
    searchParams,
    getTr(),
    appAuth.currentUser(),
  ])
  const doc = await resolveCommunityProfile(id)
  if (!doc) notFound()
  const { profile, counts, relation, canView } = await readCommunityProfilePage(doc, viewer)
  const tab = rawTab === "followers" || rawTab === "following" ? rawTab : "posts"
  const [feed, session, list] = await Promise.all([
    canView && tab === "posts"
      ? readCommunityFeed({ member: profile.id }, viewer ?? undefined)
      : null,
    communitySession(),
    canView && tab !== "posts" ? readFollowList(profile.id, tab, viewer) : null,
  ])
  const href = communityProfileHref(profile.id)
  const palette = communityPalette(profile.name)
  const tabs = [
    { key: "posts", label: tr("Bài viết", "Posts"), count: canView ? feed?.totalDocs : undefined },
    { key: "followers", label: tr("Người theo dõi", "Followers"), count: counts.followers },
    { key: "following", label: tr("Đang theo dõi", "Following"), count: counts.following },
  ] as const

  return (
    <main className="search-page">
      <SiteHeader />
      <section className="page-shell flow-page">
        <Link href="/cong-dong#thanh-vien" className="back-link">
          <ArrowLeft size={15} /> {tr("Về cộng đồng", "Back to community")}
        </Link>

        <header className="relative mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--white)]">
          <div className={`relative h-40 bg-gradient-to-br md:h-56 ${palette.cover}`}>
            {profile.cover && (
              <Image
                src={profile.cover}
                alt={tr(`Ảnh bìa của ${profile.name}`, `${profile.name}'s cover`)}
                fill
                sizes="(max-width: 1360px) 100vw, 1360px"
                className="object-cover"
                preload
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          </div>
          <div className="relative flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-5 md:px-8">
            <div className="-mt-12 rounded-full ring-4 ring-[var(--white)] md:-mt-14">
              <CommunityAvatar
                name={profile.name}
                image={profile.avatar}
                large
                shop={profile.kind === "shop"}
              />
            </div>
            <div className="min-w-0 flex-1 basis-56 pt-3">
              <p className="m-0 flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--muted)] uppercase">
                {profile.kind === "shop" ? (
                  <>
                    <Store size={12} /> {tr("Shop thể thao", "Sports shop")}
                  </>
                ) : (
                  <>
                    <Users size={12} /> {tr("Thành viên BOAI", "BOAI member")}
                  </>
                )}
                {profile.visibility === "private" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--paper)] px-2 py-0.5 tracking-normal normal-case">
                    <Lock size={11} /> {tr("Riêng tư", "Private")}
                  </span>
                )}
                {profile.demo && (
                  <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 tracking-normal normal-case">
                    {tr("Hồ sơ minh họa", "Demo profile")}
                  </span>
                )}
              </p>
              <h1 className="m-0 mt-1 font-[family-name:var(--display)] text-3xl leading-none font-extrabold break-words uppercase md:text-4xl">
                {communityName(profile.name)}
              </h1>
              <p className="m-0 mt-1 text-sm font-semibold text-[#1677ff]">{profile.displayId}</p>
            </div>
            <nav className="flex gap-6 md:gap-8" aria-label={tr("Thống kê hồ sơ", "Profile stats")}>
              {tabs.map((item) => (
                <Link
                  key={item.key}
                  href={item.key === "posts" ? href : `${href}?tab=${item.key}`}
                  scroll={false}
                  className="group text-center"
                >
                  <b className="block font-[family-name:var(--display)] text-2xl leading-tight group-hover:text-[#1677ff]">
                    {item.count ?? "—"}
                  </b>
                  <span className="text-[11px] text-[var(--muted)]">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4 md:px-8">
            <ProfileConnect
              profileId={profile.id}
              name={communityName(profile.name)}
              visibility={profile.visibility}
              relation={relation}
            />
          </div>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <aside className="grid gap-4 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--white)] p-5">
              <h2 className="m-0 text-base font-bold">{tr("Giới thiệu", "Intro")}</h2>
              <p className="m-0 mt-3 text-sm leading-6 break-words text-[var(--muted)]">
                {canView ? profile.bio : tr("Thông tin chỉ hiển thị với người theo dõi.", "Details are visible to followers only.")}
              </p>
              <ul className="m-0 mt-4 grid list-none gap-2 border-t border-[var(--line)] p-0 pt-4 text-xs">
                <li className="flex items-center gap-2">
                  <Trophy size={14} className="text-[#1677ff]" />
                  {tr(...(SPORT[profile.sport] ?? SPORT.all))}
                </li>
                <li className="flex items-center gap-2">
                  {profile.visibility === "private" ? (
                    <Lock size={14} className="text-[#1677ff]" />
                  ) : (
                    <ShieldCheck size={14} className="text-[#1677ff]" />
                  )}
                  {profile.visibility === "private"
                    ? tr("Tài khoản riêng tư", "Private account")
                    : tr("Tài khoản công khai", "Public account")}
                </li>
              </ul>
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <p className="m-0 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  {tr("ID cộng đồng", "Community ID")}
                </p>
                <CommunityIdBadge profileId={profile.id} handle={profile.handle} />
              </div>
            </section>
          </aside>

          <div className="grid min-w-0 gap-4">
            <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label={tr("Nội dung hồ sơ", "Profile content")}>
              {tabs.map((item) => (
                <Link
                  key={item.key}
                  role="tab"
                  aria-selected={tab === item.key}
                  href={item.key === "posts" ? href : `${href}?tab=${item.key}`}
                  scroll={false}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    tab === item.key
                      ? "border-[#1677ff] bg-[#1677ff] text-white!"
                      : "border-[var(--line)] bg-[var(--white)] text-[var(--muted)] hover:border-[#1677ff]"
                  }`}
                >
                  {item.label}
                  {item.count !== undefined && <span className="ml-1.5 opacity-75">{item.count}</span>}
                </Link>
              ))}
            </div>

            {!canView ? (
              <div className="grid justify-items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--white)] px-6 py-16 text-center">
                <span className="grid size-14 place-items-center rounded-full border-2 border-[var(--ink)]">
                  <Lock size={24} />
                </span>
                <b className="text-base">{tr("Đây là tài khoản riêng tư", "This account is private")}</b>
                <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">
                  {relation.following === "pending"
                    ? tr(
                        "Yêu cầu theo dõi của bạn đang chờ được chấp nhận. Bạn sẽ nhận thông báo khi được duyệt.",
                        "Your follow request is waiting for approval. You'll be notified once it's accepted.",
                      )
                    : tr(
                        "Gửi yêu cầu theo dõi. Khi được chấp nhận qua thông báo, bạn sẽ xem được bài viết, story và danh sách kết nối.",
                        "Send a follow request. Once it's approved, you'll see their posts, stories and connections.",
                      )}
                </p>
              </div>
            ) : tab === "posts" && feed ? (
              <MemberTimeline
                key={profile.id}
                profileId={profile.id}
                initialFeed={feed}
                session={session}
                own={relation.own}
              />
            ) : list ? (
              <PeopleList
                people={list.people}
                total={list.total}
                empty={
                  tab === "followers"
                    ? tr("Chưa có người theo dõi.", "No followers yet.")
                    : tr("Chưa theo dõi ai.", "Not following anyone yet.")
                }
                privateLabel={tr("Riêng tư", "Private")}
                moreLabel={tr(`Đang hiển thị ${list.people.length}/${list.total} người mới nhất.`, `Showing the latest ${list.people.length} of ${list.total}.`)}
              />
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

function PeopleList({
  people,
  total,
  empty,
  privateLabel,
  moreLabel,
}: {
  people: ProfilePerson[]
  total: number
  empty: string
  privateLabel: string
  moreLabel: string
}) {
  if (!people.length)
    return (
      <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-14 text-center text-xs text-[var(--muted)]">
        {empty}
      </p>
    )
  return (
    <div className="grid gap-2">
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {people.map((person) => (
          <li key={person.id}>
            <Link
              href={communityProfileHref(person.id)}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--white)] p-3 transition hover:border-[#1677ff]"
            >
              <CommunityAvatar name={person.name} image={person.avatar} shop={person.kind === "shop"} />
              <span className="min-w-0 flex-1">
                <b className="flex items-center gap-1.5 truncate text-sm">
                  <span className="truncate">{communityName(person.name)}</span>
                  {person.visibility === "private" && (
                    <Lock size={12} className="shrink-0 text-[var(--muted)]" aria-label={privateLabel} />
                  )}
                </b>
                <small className="block truncate text-[11px] text-[var(--muted)]">{person.displayId}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {total > people.length && <p className="m-0 text-[11px] text-[var(--muted)]">{moreLabel}</p>}
    </div>
  )
}
