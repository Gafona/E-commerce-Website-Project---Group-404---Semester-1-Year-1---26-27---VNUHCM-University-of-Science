"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Undo2 } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { withdrawRegistrationAction } from "./actions"

export function WithdrawRegistrationButton({ id }: { id: string }) {
  const router = useRouter()
  const { tr } = useShop()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div className="grid justify-items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className="sc-icon flex items-center gap-1"
        onClick={() => {
          if (!window.confirm(tr("Rút toàn bộ sản phẩm của shop khỏi sự kiện này? Lịch sử và số đã bán vẫn được giữ.", "Withdraw all your products from this event? History and sold counts are kept."))) return
          setError("")
          startTransition(async () => {
            const result = await withdrawRegistrationAction(id)
            if (!result.ok) {
              setError(result.error ?? tr("Không thể rút đăng ký.", "Could not withdraw."))
              return
            }
            router.refresh()
          })
        }}
      >
        <Undo2 size={15} /> {pending ? tr("Đang rút", "Withdrawing") : tr("Rút toàn bộ", "Withdraw all")}
      </button>
      {error && <small className="text-red-700">{error}</small>}
    </div>
  )
}
