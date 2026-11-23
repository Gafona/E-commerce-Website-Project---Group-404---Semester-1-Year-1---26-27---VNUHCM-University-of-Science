"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { cancelRecommendationAction } from "./actions"

export function CancelRecommendation({ id, code }: { id: string; code: string }) {
  const { tr } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  return (
    <span className="grid justify-items-end gap-1">
      <button
        type="button"
        className="text-link danger inline-flex items-center gap-1"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(tr(`Hủy yêu cầu ${code}?`, `Cancel request ${code}?`))) return
          setError("")
          start(async () => {
            const res = await cancelRecommendationAction(id).catch(() => ({ ok: false, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again.") }))
            if (res.ok) router.refresh()
            else setError(res.error ?? "")
          })
        }}
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} {tr("Hủy yêu cầu", "Cancel request")}
      </button>
      {error && <small role="alert" className="text-[11px] text-[#a42626]">{error}</small>}
    </span>
  )
}
