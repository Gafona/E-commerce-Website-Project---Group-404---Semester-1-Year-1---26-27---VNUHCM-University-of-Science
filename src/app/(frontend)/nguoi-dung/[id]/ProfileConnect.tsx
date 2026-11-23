"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BellPlus,
  Check,
  Clock,
  Lock,
  MessageCircle,
  Settings2,
  UserCheck,
  UserPen,
  UserPlus,
  X,
} from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import {
  connectCommunityMember,
  type ConnectAction,
} from "../../cong-dong/social-actions"
import type { FollowState } from "@/lib/community-profile-view"

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50"
const solid = `${base} border-[#1677ff] bg-[#1677ff] text-white! hover:bg-[#0865e5]`
const quiet = `${base} border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#1677ff]`
const soft = `${base} border-blue-200 bg-blue-50 text-[#1677ff]`

export function ProfileConnect({
  profileId,
  name,
  visibility,
  relation,
}: {
  profileId: string
  name: string
  visibility: "public" | "private"
  relation: {
    signedIn: boolean
    own: boolean
    following: FollowState
    followsYou: FollowState
    friend: { accepted: boolean; incoming: boolean } | null
  }
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState("")

  if (relation.own)
    return (
      <div className="flex flex-wrap gap-2">
        <Link href="/tai-khoan" className={quiet}>
          <UserPen size={15} /> {tr("Trang tài khoản", "Account page")}
        </Link>
        <Link href="/cai-dat#cong-dong" className={quiet}>
          <Settings2 size={15} /> {tr("ID & quyền riêng tư", "ID & privacy")}
        </Link>
      </div>
    )

  function run(action: ConnectAction, confirmText?: string) {
    if (!relation.signedIn) {
      router.push(`/dang-nhap?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (confirmText && !window.confirm(confirmText)) return
    setError("")
    start(async () => {
      try {
        const result = await connectCommunityMember(profileId, action)
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.refresh()
      } catch {
        setError(
          tr("Không thể cập nhật kết nối. Thử lại nhé.", "Unable to update connection. Please retry."),
        )
      }
    })
  }

  const { following, friend } = relation
  const followButton =
    following === "accepted" ? (
      <button
        type="button"
        disabled={pending}
        className={soft}
        onClick={() =>
          run(
            "unfollow",
            visibility === "private"
              ? tr(
                  `Bỏ theo dõi ${name}? Tài khoản riêng tư, bạn sẽ cần gửi yêu cầu lại để xem nội dung.`,
                  `Unfollow ${name}? This account is private, so you'll need to request again.`,
                )
              : undefined,
          )
        }
      >
        <Check size={15} /> {tr("Đang theo dõi", "Following")}
      </button>
    ) : following === "pending" ? (
      <button
        type="button"
        disabled={pending}
        className={soft}
        title={tr("Bấm để hủy yêu cầu", "Click to cancel the request")}
        onClick={() => run("unfollow")}
      >
        <Clock size={15} /> {tr("Đã gửi yêu cầu", "Requested")}
      </button>
    ) : (
      <button
        type="button"
        disabled={pending}
        className={solid}
        onClick={() => run("follow")}
      >
        {visibility === "private" ? <Lock size={15} /> : <BellPlus size={15} />}
        {visibility === "private"
          ? tr("Yêu cầu theo dõi", "Request to follow")
          : relation.followsYou === "accepted"
            ? tr("Theo dõi lại", "Follow back")
            : tr("Theo dõi", "Follow")}
      </button>
    )

  return (
    <div className="grid gap-3">
      {relation.followsYou === "pending" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-[var(--soft-blue)] px-4 py-3">
          <p className="m-0 min-w-0 flex-1 text-xs">
            <b>{name}</b>{" "}
            {tr("muốn theo dõi bạn.", "wants to follow you.")}
          </p>
          <button
            type="button"
            disabled={pending}
            className={solid}
            onClick={() => run("accept-follow")}
          >
            <Check size={14} /> {tr("Chấp nhận", "Accept")}
          </button>
          <button
            type="button"
            disabled={pending}
            className={quiet}
            onClick={() => run("decline-follow")}
          >
            <X size={14} /> {tr("Từ chối", "Decline")}
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {followButton}
        <button
          type="button"
          disabled={pending}
          className={quiet}
          onClick={() =>
            run(
              friend && !friend.accepted && friend.incoming
                ? "accept"
                : friend
                  ? "remove-friend"
                  : "request",
              friend?.accepted
                ? tr("Hủy kết bạn với thành viên này?", "Remove this friend?")
                : undefined,
            )
          }
        >
          {friend?.accepted ? <UserCheck size={15} /> : <UserPlus size={15} />}
          {friend?.accepted
            ? tr("Bạn bè", "Friends")
            : friend?.incoming
              ? tr("Chấp nhận kết bạn", "Accept friend")
              : friend
                ? tr("Hủy lời mời", "Cancel request")
                : tr("Kết bạn", "Add friend")}
        </button>
        <button
          type="button"
          className={quiet}
          onClick={() =>
            relation.signedIn
              ? router.push(`/tin-nhan?voi=${encodeURIComponent(profileId)}`)
              : router.push(`/dang-nhap?next=${encodeURIComponent(window.location.pathname)}`)
          }
        >
          <MessageCircle size={15} /> {tr("Nhắn tin", "Message")}
        </button>
        {relation.followsYou === "accepted" && (
          <button
            type="button"
            disabled={pending}
            className={`${base} border-transparent px-2 text-[var(--muted)] hover:text-red-600`}
            onClick={() =>
              run(
                "decline-follow",
                tr(
                  `Xóa ${name} khỏi danh sách người theo dõi của bạn?`,
                  `Remove ${name} from your followers?`,
                ),
              )
            }
          >
            {tr("Xóa người theo dõi", "Remove follower")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="m-0 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
