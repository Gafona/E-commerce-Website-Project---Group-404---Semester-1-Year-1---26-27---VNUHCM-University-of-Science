"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  AtSign,
  Check,
  Globe2,
  Loader2,
  Lock,
  UserCheck,
} from "lucide-react"
import {
  communityHandleError,
  communityProfileHref,
  communityPublicId,
  HANDLE_MAX,
  normalizeCommunityHandle,
} from "@/lib/community-identity"
import { useShop } from "../components/ShopProvider"
import { updateCommunityIdentity } from "./community-actions"

type Visibility = "public" | "private"

export function CommunityIdentitySettings({
  profileId,
  handle: savedHandle,
  visibility: savedVisibility,
  pendingRequests,
}: {
  profileId: string | null
  handle: string | null
  visibility: Visibility
  pendingRequests: number
}) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const [saved, setSaved] = useState({
    handle: savedHandle ?? "",
    visibility: savedVisibility,
  })
  const [handle, setHandle] = useState(savedHandle ?? "")
  const [visibility, setVisibility] = useState<Visibility>(savedVisibility)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const normalized = normalizeCommunityHandle(handle)
  const liveError = normalized ? communityHandleError(normalized) : null
  const dirty =
    normalized !== saved.handle || visibility !== saved.visibility

  function save() {
    if (liveError) {
      setError(liveError)
      return
    }
    setError("")
    start(async () => {
      try {
        const result = await updateCommunityIdentity({
          handle: normalized,
          visibility,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setSaved({ handle: result.handle ?? "", visibility: result.visibility })
        setHandle(result.handle ?? "")
        notify(
          result.approved
            ? tr(
                `Đã lưu. ${result.approved} yêu cầu theo dõi đang chờ đã được chấp nhận.`,
                `Saved. ${result.approved} pending follow requests were approved.`,
              )
            : tr("Đã lưu cài đặt cộng đồng", "Community settings saved"),
        )
        router.refresh()
      } catch {
        setError(
          tr(
            "Không thể lưu cài đặt. Vui lòng thử lại.",
            "Couldn't save settings. Please try again.",
          ),
        )
      }
    })
  }

  const options: {
    value: Visibility
    icon: typeof Globe2
    title: [string, string]
    hint: [string, string]
  }[] = [
    {
      value: "public",
      icon: Globe2,
      title: ["Công khai", "Public"],
      hint: [
        "Ai cũng xem được bài viết, story và có thể theo dõi bạn ngay.",
        "Anyone can see your posts and stories and follow you instantly.",
      ],
    },
    {
      value: "private",
      icon: Lock,
      title: ["Riêng tư", "Private"],
      hint: [
        "Người muốn theo dõi phải được bạn chấp nhận qua thông báo mới xem được nội dung.",
        "People must be approved from your notifications before they see your content.",
      ],
    },
  ]

  return (
    <section className="form-card settings-card" id="cong-dong">
      <div className="settings-head">
        <span>
          <AtSign size={20} />
        </span>
        <div>
          <h3>{tr("ID cộng đồng & quyền riêng tư", "Community ID & privacy")}</h3>
          <p className="hint">
            {tr(
              "Đặt ID riêng dễ nhớ để bạn bè tìm bạn, và chọn ai được xem trang cá nhân của bạn.",
              "Pick a memorable ID so friends can find you, and choose who can see your profile.",
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="community-handle" className="text-xs font-bold">
          {tr("ID tùy chỉnh", "Custom ID")}
        </label>
        <div
          className={`flex items-center border bg-[var(--white)] transition focus-within:border-[#1677ff] ${
            liveError || error ? "border-red-400" : "border-[var(--line)]"
          }`}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center border-r border-[var(--line)] bg-[var(--paper)] text-[var(--muted)]">
            <AtSign size={16} />
          </span>
          <input
            id="community-handle"
            value={handle}
            onChange={(event) => {
              setHandle(event.target.value.replace(/\s/g, "").toLowerCase())
              setError("")
            }}
            maxLength={HANDLE_MAX + 1}
            autoComplete="off"
            spellCheck={false}
            placeholder={tr("vd: minhanh.badminton", "e.g. minhanh.badminton")}
            aria-describedby="community-handle-hint"
            aria-invalid={!!(liveError || error)}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
          />
          {normalized && !liveError && (
            <Check size={16} className="mr-3 shrink-0 text-[var(--lime-dark)]" />
          )}
        </div>
        <p
          id="community-handle-hint"
          className={`m-0 text-[11px] leading-5 ${
            liveError || error ? "text-red-600" : "text-[var(--muted)]"
          }`}
          role={liveError || error ? "alert" : undefined}
        >
          {error ||
            liveError ||
            tr(
              "3–24 ký tự: chữ thường không dấu, số, dấu chấm hoặc gạch dưới. Để trống để dùng mã mặc định.",
              "3–24 characters: lowercase letters, numbers, dots or underscores. Leave empty to use the default ID.",
            )}
        </p>
        {profileId && (
          <p className="m-0 text-[11px] text-[var(--muted)]">
            {tr("Mã mặc định (luôn dùng được)", "Default ID (always works)")}:{" "}
            <code className="break-all">{communityPublicId(profileId)}</code>
          </p>
        )}
      </div>

      <div
        className="lang-options"
        role="radiogroup"
        aria-label={tr("Quyền riêng tư trang cá nhân", "Profile privacy")}
      >
        {options.map(({ value, icon: Icon, title, hint }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={visibility === value}
            className={visibility === value ? "active" : ""}
            onClick={() => setVisibility(value)}
          >
            <span className="lang-code">
              <Icon size={17} />
            </span>
            <span>
              <b>{tr(...title)}</b>
              <small>{tr(...hint)}</small>
            </span>
            {visibility === value && <Check size={18} />}
          </button>
        ))}
      </div>
      {saved.visibility === "private" && visibility === "public" && pendingRequests > 0 && (
        <p className="m-0 text-[11px] text-[var(--muted)]">
          {tr(
            `Chuyển sang công khai sẽ tự chấp nhận ${pendingRequests} yêu cầu theo dõi đang chờ.`,
            `Switching to public approves ${pendingRequests} pending follow requests.`,
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
          {profileId && (
            <Link
              href={communityProfileHref(profileId)}
              className="inline-flex items-center gap-1 text-[#1677ff]"
            >
              {tr("Xem trang cá nhân công khai", "View public profile")}
              <ArrowRight size={13} />
            </Link>
          )}
          {pendingRequests > 0 && (
            <Link
              href="/tai-khoan#ket-noi"
              className="inline-flex items-center gap-1 text-[var(--ink)]"
            >
              <UserCheck size={14} />
              {tr(
                `${pendingRequests} yêu cầu theo dõi đang chờ`,
                `${pendingRequests} pending follow requests`,
              )}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || !!liveError}
          className="boai-button primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {pending ? tr("Đang lưu…", "Saving…") : tr("Lưu thay đổi", "Save changes")}
        </button>
      </div>
    </section>
  )
}
