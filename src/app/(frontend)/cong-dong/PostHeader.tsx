"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import type { CommunityAuthor } from "@/lib/community"
import { communityProfileHref } from "@/lib/community-identity"
import { useShop } from "../components/ShopProvider"
import { communityName, communityPalette } from "./CommunityAvatar"
import { FollowButton } from "./FollowButton"

/** Round avatar: the member's photo, or the first letter of their name. */
export function InitialAvatar({ name, image, size = 44 }: { name: string; image?: string | null; size?: number }) {
  const label = communityName(name) || "BOAI"
  const initial = [...label.trim()][0]?.toLocaleUpperCase("vi") ?? "B"
  return (
    <span
      role="img"
      aria-label={`Avatar ${label}`}
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-black text-slate-800 ring-2 ring-[var(--white)] ${communityPalette(label).avatar}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {image ? <Image src={image} alt={label} fill sizes={`${size}px`} className="object-cover" /> : initial}
    </span>
  )
}

/**
 * The one header for every community post (old and new): round avatar, the
 * author's current name linking to /nguoi-dung/[id], a Follow button (hidden
 * on your own posts), time and topic. Authors without a community profile
 * get an initial avatar, an unlinked name and no Follow button.
 */
export function PostHeader({
  authorName,
  profile,
  createdAt,
  topic,
  own,
  actions,
}: {
  /** Stored name, used only when no profile could be linked. */
  authorName: string
  profile: CommunityAuthor | null
  createdAt: string
  topic: string | null
  own: boolean
  actions?: ReactNode
}) {
  const { tr, lang } = useShop()
  const name = communityName(profile?.name || authorName)
  const when = new Date(createdAt).toLocaleString(lang === "en" ? "en-GB" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  })
  return (
    <div className="flex items-start gap-3">
      {profile ? (
        <Link href={communityProfileHref(profile.id)} aria-label={tr(`Trang cá nhân của ${name}`, `${name}'s profile`)} className="shrink-0">
          <InitialAvatar name={name} image={profile.avatar} />
        </Link>
      ) : (
        <InitialAvatar name={name} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {profile ? (
            <Link href={communityProfileHref(profile.id)} className="min-w-0 truncate text-sm font-bold hover:text-[#1677ff] hover:underline">
              {name}
            </Link>
          ) : (
            <b className="min-w-0 truncate text-sm">{name}</b>
          )}
          {profile && !own && !profile.demo && <FollowButton profileId={profile.id} isPrivate={profile.visibility === "private"} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)]">
          <time dateTime={createdAt}>{when}</time>
          {topic && (
            <>
              <span aria-hidden>·</span>
              <span className="font-semibold">{topic}</span>
            </>
          )}
          {profile?.kind === "shop" && (
            <>
              <span aria-hidden>·</span>
              <span>{tr("Shop thể thao", "Sports shop")}</span>
            </>
          )}
        </div>
      </div>
      {actions}
    </div>
  )
}
