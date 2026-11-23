"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { deleteReviewAction } from "../shop-actions"
import { useShop } from "./ShopProvider"

export function ReviewDeleteButton({ id, moderator }: { id: string; moderator: boolean }) {
  const { tr } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const ask = moderator
            ? tr("Xóa đánh giá này khỏi sản phẩm?", "Remove this review from the product?")
            : tr("Xóa đánh giá của bạn?", "Delete your review?")
          if (!window.confirm(ask)) return
          setError("")
          start(async () => {
            const res = await deleteReviewAction(id)
            if (!res.ok) return setError(res.error)
            router.refresh()
          })
        }}
        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--sale)] disabled:cursor-wait"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        {moderator ? tr("Xóa (quản trị)", "Delete (moderator)") : tr("Xóa", "Delete")}
      </button>
      {error && <small role="alert" className="text-[11px] text-[var(--sale)]">{error}</small>}
    </span>
  )
}
