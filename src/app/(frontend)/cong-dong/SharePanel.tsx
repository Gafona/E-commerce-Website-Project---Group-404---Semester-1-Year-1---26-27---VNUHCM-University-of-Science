"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  Copy,
  ExternalLink,
  Globe2,
  Repeat2,
  Share2,
  X,
} from "lucide-react"
import { repostCommunityPost } from "./actions"
import { useShop } from "../components/ShopProvider"

export function SharePanel({
  postID,
  signedIn,
  onRefresh,
  onClose,
}: {
  postID: string
  signedIn: boolean
  onRefresh: () => Promise<void>
  onClose: () => void
}) {
  const { tr } = useShop()
  const [text, setText] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [repostedID, setRepostedID] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const url = () =>
    `${window.location.origin}/cong-dong?post=${encodeURIComponent(postID)}`
  async function copy() {
    try {
      await navigator.clipboard.writeText(url())
      setNotice(tr("Đã sao chép liên kết.", "Link copied."))
      return true
    } catch {
      setNotice(url())
      return false
    }
  }
  async function nativeShare(network?: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "BOAI Community", url: url() })
        return
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
      }
    }
    const copied = await copy()
    if (network)
      setNotice(
        tr(
          `${
            copied ? "Đã sao chép liên kết. " : url() + " — "
          }Dán liên kết vào ${network} để chia sẻ. Trên điện thoại, chọn ${network} trong bảng chia sẻ nếu có.`,
          `${
            copied ? "Link copied. " : url() + " — "
          }Paste the link into ${network}. On mobile, select ${network} in the share sheet when available.`,
        ),
      )
  }
  return (
    <section
      aria-label={tr("Chia sẻ bài viết", "Share post")}
      className="mx-5 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">
          {tr("Lan tỏa câu chuyện", "Pass the story on")}
        </h3>
        <button
          onClick={onClose}
          aria-label={tr("Đóng chia sẻ", "Close sharing")}
        >
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          onClick={() =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--white)] p-3"
        >
          <Globe2 size={16} />
          Facebook
        </button>
        <button
          onClick={() => void nativeShare("Zalo")}
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--white)] p-3"
        >
          <Share2 size={16} />
          Zalo
        </button>
        <button
          onClick={() => void copy()}
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--white)] p-3"
        >
          <Copy size={16} />
          {tr("Sao chép link", "Copy link")}
        </button>
        <button
          onClick={() => void nativeShare()}
          className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--white)] p-3"
        >
          <ExternalLink size={16} />
          {tr("Ứng dụng khác", "More apps")}
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">
        {tr(
          "Zalo dùng bảng chia sẻ của thiết bị; nếu không hỗ trợ, hãy sao chép rồi dán liên kết vào ứng dụng.",
          "Zalo uses your device's share sheet; otherwise, copy and paste the link into the app.",
        )}
      </p>
      {notice && (
        <p
          role="status"
          className="mt-2 break-all rounded-lg bg-[var(--soft-blue)] p-3 text-xs text-[var(--lime)]"
        >
          {notice}
        </p>
      )}
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold">
          <Repeat2 size={15} />
          {tr("Chia sẻ lên bài viết của tôi", "Repost to my feed")}
        </h4>
        {signedIn ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError("")
              start(async () => {
                try {
                  const result = await repostCommunityPost(postID, text)
                  if (!result.ok) {
                    setError(result.error ?? tr("Không thể chia sẻ.", "Couldn't share."))
                    return
                  }
                  setRepostedID(result.id ?? null)
                  setText("")
                  setNotice(
                    tr(
                      "Đã đăng lại công khai trên bảng tin cộng đồng.",
                      "Reposted publicly to the community feed.",
                    ),
                  )
                  await onRefresh()
                } catch {
                  setError(
                    tr(
                      "Kết nối bị gián đoạn. Vui lòng thử lại.",
                      "Connection interrupted. Please retry.",
                    ),
                  )
                }
              })
            }}
          >
            <textarea
              aria-label={tr("Lời nhắn khi chia sẻ", "Repost commentary")}
              placeholder={tr(
                "Thêm suy nghĩ của bạn (không bắt buộc)…",
                "Add your thoughts (optional)…",
              )}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={3000}
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--white)] p-3 text-xs outline-none focus:border-[#1677ff]"
            />
            {!!text.trim() && text.trim().length < 5 && (
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {tr(
                  "Lời nhắn cần ít nhất 5 ký tự, hoặc để trống.",
                  "Use at least 5 characters, or leave the message blank.",
                )}
              </p>
            )}
            <button
              disabled={pending || (!!text.trim() && text.trim().length < 5)}
              className="mt-2 rounded-lg bg-[#1677ff] px-4 py-2.5 text-white! disabled:opacity-50"
            >
              {pending
                ? tr("Đang đăng lại…", "Reposting…")
                : tr("Đăng lại công khai", "Repost publicly")}
            </button>
          </form>
        ) : (
          <Link
            href="/dang-nhap"
            className="text-xs font-bold text-[var(--lime)]"
          >
            {tr("Đăng nhập để đăng lại", "Sign in to repost")}
          </Link>
        )}
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
        {repostedID && (
          <Link
            href={`/cong-dong?post=${encodeURIComponent(repostedID)}`}
            className="mt-3 block text-xs font-bold text-[var(--lime)]"
          >
            {tr("Xem bài viết tôi vừa chia sẻ", "View my repost")}{" "}
            <ExternalLink size={12} className="inline" />
          </Link>
        )}
      </div>
    </section>
  )
}
