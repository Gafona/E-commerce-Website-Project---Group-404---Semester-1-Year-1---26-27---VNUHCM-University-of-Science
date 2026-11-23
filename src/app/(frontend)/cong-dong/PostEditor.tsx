"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Check, Loader2, X } from "lucide-react"
import type { CommunityPost } from "@/lib/community"
import { useShop } from "../components/ShopProvider"
import { ProductSearch } from "./ProductSearch"
import { usePostImages } from "./usePostImages"
import { writeCommunityPost } from "./actions"
import { topics } from "./topics"

const field =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-sm! outline-none focus:border-[#1677ff]"

/** Edits a post in place, inside its own card, instead of in the top composer. */
export function PostEditor({
  post,
  seller,
  onCancel,
  onSaved,
}: {
  post: CommunityPost
  seller: boolean
  onCancel: () => void
  onSaved: () => Promise<void> | void
}) {
  const { tr } = useShop()
  const [content, setContent] = useState(post.content)
  const [sport, setSport] = useState(post.sport)
  const [topic, setTopic] = useState(post.topic)
  const [product, setProduct] = useState(post.product?.id ?? "")
  const [productName, setProductName] = useState(post.product?.name ?? "")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const photos = usePostImages(setError)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    photos.reset(post.images)
    const el = area.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
    // Seed once with the post being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const save = () => {
    if (content.trim().length < 5) {
      setError(tr("Nội dung cần ít nhất 5 ký tự.", "Write at least 5 characters."))
      return
    }
    setError("")
    start(async () => {
      try {
        const data = new FormData()
        data.set("id", post.id)
        data.set("content", content)
        data.set("sport", sport)
        data.set("topic", topic)
        data.set("product", product)
        photos.appendTo(data)
        const result = await writeCommunityPost(data)
        if (!result.ok) {
          setError(result.error ?? tr("Không thể lưu bài viết.", "Couldn't save the post."))
          return
        }
        await onSaved()
      } catch {
        setError(tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again."))
      }
    })
  }

  return (
    <div
      className="mt-4 rounded-xl border border-[#1677ff]/40 bg-[var(--soft-blue)]/40 p-3"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !pending) onCancel()
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") save()
      }}
    >
      <textarea
        ref={area}
        aria-label={tr("Sửa nội dung bài viết", "Edit post content")}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={3000}
        rows={Math.min(10, Math.max(3, content.split("\n").length + 1))}
        className={`${field} resize-y bg-[var(--white)] leading-6`}
      />
      {photos.previews}
      <div className="my-3 grid grid-cols-2 gap-2">
        <select
          aria-label={tr("Môn thể thao", "Sport")}
          className={`${field} bg-[var(--white)]`}
          value={sport}
          onChange={(event) => {
            setSport(event.target.value)
            setProduct("")
            setProductName("")
          }}
        >
          <option value="all">{tr("Mọi môn", "All sports")}</option>
          <option value="football">{tr("Bóng đá", "Football")}</option>
          <option value="badminton">{tr("Cầu lông", "Badminton")}</option>
        </select>
        <select
          aria-label={tr("Chủ đề bài viết", "Post topic")}
          className={`${field} bg-[var(--white)]`}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          {topics
            .slice(1)
            .filter((t) => t.id !== "offer" || seller || post.topic === "offer")
            .map((t) => (
              <option key={t.id} value={t.id}>
                {tr(t.vi, t.en)}
              </option>
            ))}
        </select>
      </div>
      <ProductSearch
        value={product}
        name={productName}
        sport={sport}
        onSelect={(id, name) => {
          setProduct(id)
          setProductName(name)
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {photos.picker}
          <span className="text-[10px] text-[var(--muted)]">{content.length}/3000 · Esc {tr("để hủy", "to cancel")}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--white)] px-4 py-2 text-xs! font-bold!"
          >
            <X size={13} /> {tr("Hủy", "Cancel")}
          </button>
          <button
            type="button"
            disabled={pending || content.trim().length < 5}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1677ff] px-4 py-2 text-xs! font-bold! text-white! disabled:opacity-50"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {pending ? tr("Đang lưu…", "Saving…") : tr("Lưu thay đổi", "Save changes")}
          </button>
        </div>
      </div>
    </div>
  )
}
