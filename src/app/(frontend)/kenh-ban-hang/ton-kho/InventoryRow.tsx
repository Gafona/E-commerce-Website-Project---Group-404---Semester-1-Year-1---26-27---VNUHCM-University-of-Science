"use client"

import { useActionState } from "react"
import { updateProductAction, type SellerState } from "../actions"
import { useShop } from "../../components/ShopProvider"
import { PriceFields } from "../san-pham/PriceFields"

/** One inventory row: price, struck-through price and stock with inline errors. */
export function InventoryRow({ id, price, oldPrice, stock }: { id: string; price: number; oldPrice: number | null; stock: number }) {
  const { tr } = useShop()
  const [state, action, pending] = useActionState<SellerState, FormData>(updateProductAction, { ok: false })
  return (
    <form action={action} className="sc-inline flex-wrap">
      <input type="hidden" name="id" value={id} />
      <PriceFields defaultPrice={price} defaultOldPrice={oldPrice} compact />
      <label>
        {tr("Tồn kho")}
        <input name="stock" type="number" min="0" step="1" defaultValue={stock} required />
      </label>
      <button className="boai-button" disabled={pending}>
        {pending ? tr("Đang lưu...", "Saving...") : tr("Lưu", "Save")}
      </button>
      {state.error && <small className="basis-full text-[11px] font-semibold text-[var(--sale)]" role="alert">{state.error}</small>}
      {state.ok && state.message && <small className="basis-full text-[11px] font-semibold text-[var(--lime-dark)]" role="status">{state.message}</small>}
    </form>
  )
}
