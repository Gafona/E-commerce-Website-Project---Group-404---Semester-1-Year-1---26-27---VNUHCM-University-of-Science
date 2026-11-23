"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CornerDownRight, MessageCircle, Store, Trash2 } from "lucide-react"
import { deleteCommentAction, postCommentAction } from "../san-pham/comment-actions"
import { useShop } from "./ShopProvider"

export type CommentView = {
  id: string
  parentId: string | null
  authorId: string
  authorName: string
  body: string
  isSeller: boolean
  createdAt: string
}

function Composer({
  productId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
  compact,
}: {
  productId: string
  parentId?: string
  placeholder: string
  autoFocus?: boolean
  onDone?: () => void
  compact?: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [body, setBody] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    start(async () => {
      const res = await postCommentAction({ productId, body, parentId })
      if (!res.ok) return setError(res.error)
      setBody("")
      onDone?.()
      router.refresh()
    })
  }
  return (
    <form onSubmit={submit} className="grid gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={compact ? 2 : 3}
        maxLength={1000}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-y border border-[var(--line)] bg-[var(--white)] p-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--lime)]"
      />
      {error && <p className="form-error !m-0">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        <span className="mr-auto text-[11px] text-[var(--muted)]">{body.length}/1000</span>
        {onDone && (
          <button type="button" onClick={onDone} className="cursor-pointer border-0 bg-transparent text-xs font-bold text-[var(--muted)]">
            {tr("Hủy", "Cancel")}
          </button>
        )}
        <button className="boai-button primary !min-h-9 !px-4" disabled={pending || body.trim().length < 2}>
          {pending ? tr("Đang gửi...", "Posting...") : parentId ? tr("Trả lời", "Reply") : tr("Gửi bình luận", "Post comment")}
        </button>
      </div>
    </form>
  )
}

export function ProductComments({
  productId,
  comments,
  currentUserId,
  canModerate = false,
}: {
  productId: string
  comments: CommentView[]
  currentUserId: string | null
  /** Storefront moderators may delete any comment. */
  canModerate?: boolean
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()
  const [error, setError] = useState("")
  const roots = comments.filter((c) => !c.parentId)
  const replies = (id: string) => comments.filter((c) => c.parentId === id)
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(tr("vi-VN", "en-GB"), { day: "2-digit", month: "2-digit", year: "numeric" })

  const remove = (id: string) => {
    if (!confirm(tr("Xóa bình luận này cùng các trả lời?", "Delete this comment and its replies?"))) return
    startDelete(async () => {
      const res = await deleteCommentAction(id)
      if (!res.ok) return setError(res.error)
      router.refresh()
    })
  }

  const Item = ({ c, reply }: { c: CommentView; reply?: boolean }) => (
    <div className={`flex gap-3 ${reply ? "pt-3" : ""}`}>
      <span
        className={`grid shrink-0 place-items-center rounded-full font-extrabold text-white ${reply ? "h-8 w-8 text-xs" : "h-9 w-9"} ${
          c.isSeller ? "bg-[var(--orange)]" : "bg-[var(--lime)]"
        }`}
      >
        {c.isSeller ? <Store size={reply ? 14 : 16} /> : c.authorName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <b className="text-[13px]">{c.authorName}</b>
          {c.isSeller && (
            <span className="bg-[var(--orange)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-white">
              {tr("Người bán", "Seller")}
            </span>
          )}
          <small className="text-[11px] text-[var(--muted)]">{date(c.createdAt)}</small>
        </div>
        <p className="m-0 mt-1 whitespace-pre-line break-words text-sm leading-relaxed">{c.body}</p>
        <div className="mt-1.5 flex gap-4">
          {currentUserId && !reply && (
            <button
              type="button"
              onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-bold text-[var(--lime-dark)]"
            >
              <CornerDownRight size={12} /> {tr("Trả lời", "Reply")}
            </button>
          )}
          {(canModerate || currentUserId === c.authorId) && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => remove(c.id)}
              className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--sale)]"
            >
              <Trash2 size={12} /> {tr("Xóa", "Delete")}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid gap-5">
      {currentUserId ? (
        <div className="form-card">
          <Composer
            productId={productId}
            placeholder={tr(
              "Đặt câu hỏi về kích cỡ, chất liệu, cách dùng... hoặc chia sẻ ý kiến của bạn",
              "Ask about size, material, usage... or share your thoughts",
            )}
          />
        </div>
      ) : (
        <p className="hint !m-0">
          <Link href="/dang-nhap">{tr("Đăng nhập", "Sign in")}</Link>{" "}
          {tr("để đặt câu hỏi hoặc tham gia bình luận.", "to ask a question or join the discussion.")}
        </p>
      )}
      {error && <p className="form-error !m-0">{error}</p>}
      {roots.length ? (
        <div className="grid">
          {roots.map((c) => (
            <article key={c.id} className="border-t border-[var(--line)] py-4">
              <Item c={c} />
              {(replies(c.id).length > 0 || replyTo === c.id) && (
                <div className="ml-12 mt-1 border-l-2 border-[var(--line)] pl-4">
                  {replies(c.id).map((r) => (
                    <Item key={r.id} c={r} reply />
                  ))}
                  {replyTo === c.id && (
                    <div className="pt-3">
                      <Composer
                        productId={productId}
                        parentId={c.id}
                        compact
                        autoFocus
                        placeholder={tr(`Trả lời ${c.authorName}...`, `Reply to ${c.authorName}...`)}
                        onDone={() => setReplyTo(null)}
                      />
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
          <MessageCircle size={20} />
          {tr("Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!", "No comments yet. Be the first to ask!")}
        </div>
      )}
    </div>
  )
}
