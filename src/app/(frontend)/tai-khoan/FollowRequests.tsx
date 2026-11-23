"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Lock, UserCheck, X } from "lucide-react"
import { communityProfileHref } from "@/lib/community-identity"
import type { ProfilePerson } from "@/lib/community-profile-view"
import { useShop } from "../components/ShopProvider"
import { CommunityAvatar, communityName } from "../cong-dong/CommunityAvatar"
import { connectCommunityMember } from "../cong-dong/social-actions"

/** Approve or decline people asking to follow a private profile. */
export function FollowRequests({
  requests,
  isPrivate,
}: {
  requests: ProfilePerson[]
  isPrivate: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [items, setItems] = useState(requests)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [, start] = useTransition()

  function respond(person: ProfilePerson, accept: boolean) {
    setError("")
    setBusy(person.id)
    start(async () => {
      try {
        const result = await connectCommunityMember(
          person.id,
          accept ? "accept-follow" : "decline-follow",
        )
        if (!result.ok) {
          setError(result.error)
          return
        }
        setItems((old) => old.filter((item) => item.id !== person.id))
        router.refresh()
      } catch {
        setError(tr("Không thể cập nhật. Thử lại nhé.", "Couldn't update. Please retry."))
      } finally {
        setBusy(null)
      }
    })
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <h3 className="m-0 flex items-center gap-2 text-sm font-bold">
        <Lock size={14} className="text-[#1677ff]" />
        {tr("Yêu cầu theo dõi", "Follow requests")}
        {items.length > 0 && (
          <span className="rounded-full bg-[#1677ff] px-2 text-[10px] text-white">{items.length}</span>
        )}
      </h3>
      {items.length ? (
        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
          {items.map((person) => (
            <li key={person.id} className="flex items-center gap-2">
              <CommunityAvatar name={person.name} image={person.avatar} small />
              <Link
                href={communityProfileHref(person.id)}
                className="min-w-0 flex-1 truncate text-xs font-bold hover:text-[#1677ff]"
              >
                {communityName(person.name)}
              </Link>
              <button
                type="button"
                disabled={busy === person.id}
                onClick={() => respond(person, true)}
                aria-label={tr(`Chấp nhận ${person.name}`, `Accept ${person.name}`)}
                className="grid size-8 place-items-center rounded-lg bg-[#1677ff] text-white disabled:opacity-50"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                disabled={busy === person.id}
                onClick={() => respond(person, false)}
                aria-label={tr(`Từ chối ${person.name}`, `Decline ${person.name}`)}
                className="grid size-8 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
          <UserCheck size={14} />
          {isPrivate
            ? tr("Không có yêu cầu nào đang chờ.", "No pending requests.")
            : tr(
                "Tài khoản đang công khai: ai cũng theo dõi được ngay.",
                "Your account is public: anyone can follow instantly.",
              )}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
