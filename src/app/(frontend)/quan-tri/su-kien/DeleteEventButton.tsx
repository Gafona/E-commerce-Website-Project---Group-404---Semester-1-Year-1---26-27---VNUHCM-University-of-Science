"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteEventAction } from "./actions"

export function DeleteEventButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="sc-icon flex items-center gap-1"
        onClick={() => {
          if (!window.confirm(`Xóa sự kiện “${name}”? Thao tác này không thể hoàn tác.`)) return
          setError("")
          startTransition(async () => {
            const result = await deleteEventAction(id)
            if (!result.ok) {
              setError(result.error ?? "Không thể xóa sự kiện.")
              return
            }
            router.refresh()
          })
        }}
      >
        <Trash2 size={15} /> {pending ? "Đang xóa" : "Xóa"}
      </button>
      {error && <small className="mt-1 block text-red-700">{error}</small>}
    </div>
  )
}
