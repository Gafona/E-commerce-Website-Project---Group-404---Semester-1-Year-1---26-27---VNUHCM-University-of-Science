"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Clock, Lock, Plus } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { toggleFollow, useFollow } from "./follow-store"

/** Compact follow control shown beside an author's name. */
export function FollowButton({
  profileId,
  isPrivate = false,
  className = "",
}: {
  profileId: string
  isPrivate?: boolean
  className?: string
}) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const { loaded, signedIn, self, status, busy } = useFollow(profileId)
  const [hover, setHover] = useState(false)
  if (self) return null
  if (!loaded) return <span className={`inline-block h-6 w-[74px] animate-pulse rounded-full bg-[var(--paper)] ${className}`} aria-hidden />

  const base = `inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[10px]! font-bold! transition disabled:opacity-60 ${className}`
  const onClick = async () => {
    if (!signedIn) {
      router.push(`/dang-nhap?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    const result = await toggleFollow(profileId, isPrivate)
    if (!result.ok) notify(result.error)
    else if (status === "none" && isPrivate) notify(tr("Đã gửi yêu cầu theo dõi", "Follow request sent"))
  }

  if (status === "accepted")
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`${base} ${hover ? "border-red-200 bg-red-50 text-red-600" : "border-blue-200 bg-blue-50 text-[#1677ff]"}`}
        aria-label={tr("Bỏ theo dõi", "Unfollow")}
      >
        <Check size={11} strokeWidth={3} />
        {hover ? tr("Bỏ theo dõi", "Unfollow") : tr("Đang theo dõi", "Following")}
      </button>
    )
  if (status === "pending")
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={`${base} border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]`}
        title={tr("Bấm để hủy yêu cầu", "Click to cancel the request")}
      >
        <Clock size={11} /> {tr("Đã gửi yêu cầu", "Requested")}
      </button>
    )
  return (
    <button type="button" disabled={busy} onClick={onClick} className={`${base} border-[#1677ff] bg-[#1677ff] text-white! hover:bg-[#0865e5]`}>
      {isPrivate ? <Lock size={10} /> : <Plus size={11} strokeWidth={3} />}
      {tr("Theo dõi", "Follow")}
    </button>
  )
}
