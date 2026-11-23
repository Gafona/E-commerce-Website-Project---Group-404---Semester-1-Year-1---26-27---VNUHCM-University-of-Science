"use client"

import { useEffect, useRef, useState } from "react"
import { MIN_PRODUCT_PRICE } from "@/lib/pricing"
import { useShop } from "../../components/ShopProvider"

const money = new Intl.NumberFormat("vi-VN")

/**
 * Selling price + struck-through price with the shared rule: price ≥ 10.000₫
 * and the old price, when filled in, strictly higher. Invalid values block
 * submission in the browser; the server repeats the same check.
 */
export function PriceFields({
  defaultPrice,
  defaultOldPrice,
  compact = false,
}: {
  defaultPrice?: number | null
  defaultOldPrice?: number | null
  compact?: boolean
}) {
  const { tr } = useShop()
  const [price, setPrice] = useState(defaultPrice ? String(defaultPrice) : "")
  const [oldPrice, setOldPrice] = useState(defaultOldPrice ? String(defaultOldPrice) : "")
  const priceRef = useRef<HTMLInputElement>(null)
  const oldRef = useRef<HTMLInputElement>(null)
  const priceValue = Number(price)
  const oldValue = oldPrice.trim() ? Number(oldPrice) : null
  const priceProblem =
    price.trim() && (!Number.isFinite(priceValue) || priceValue < MIN_PRODUCT_PRICE)
      ? tr(`Giá bán tối thiểu là ${money.format(MIN_PRODUCT_PRICE)}₫.`, `The selling price must be at least ${money.format(MIN_PRODUCT_PRICE)}₫.`)
      : ""
  const oldProblem =
    oldValue !== null && Number.isFinite(priceValue) && priceValue > 0 && oldValue <= priceValue
      ? tr("Giá gạch phải cao hơn giá bán. Bỏ trống nếu không giảm giá.", "The struck-through price must be higher than the selling price. Leave it empty when there is no discount.")
      : ""

  useEffect(() => {
    priceRef.current?.setCustomValidity(priceProblem)
    oldRef.current?.setCustomValidity(oldProblem)
  }, [priceProblem, oldProblem])

  const discount = oldValue && !oldProblem && priceValue > 0 ? Math.round((1 - priceValue / oldValue) * 100) : 0

  return (
    <>
      <label>
        {tr("Giá bán")} (₫) *
        <input
          ref={priceRef}
          name="price"
          type="number"
          inputMode="numeric"
          min={MIN_PRODUCT_PRICE}
          step="1"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-invalid={!!priceProblem}
        />
        {!compact && priceProblem && <small className="text-[11px] font-semibold text-[var(--sale)]">{priceProblem}</small>}
      </label>
      <label>
        {tr("Giá gạch – giá trước khi giảm", "Struck-through price (before discount)")} (₫)
        <input
          ref={oldRef}
          name="oldPrice"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={oldPrice}
          onChange={(event) => setOldPrice(event.target.value)}
          aria-invalid={!!oldProblem}
          placeholder={tr("Bỏ trống nếu không giảm giá", "Leave empty if not discounted")}
        />
        {!compact &&
          (oldProblem ? (
            <small className="text-[11px] font-semibold text-[var(--sale)]">{oldProblem}</small>
          ) : (
            <small className="text-[11px] text-[var(--muted)]">
              {discount > 0
                ? tr(`Khách thấy giá gạch và nhãn −${discount}%.`, `Shoppers see the old price and a −${discount}% label.`)
                : tr("Không phải giá nhập hay giá vốn. Chỉ điền khi đang bán thấp hơn giá này.", "Not your cost price. Only fill it in when selling below this price.")}
            </small>
          ))}
      </label>
      {compact && (priceProblem || oldProblem) && (
        <small className="basis-full text-[11px] font-semibold text-[var(--sale)]">{priceProblem || oldProblem}</small>
      )}
    </>
  )
}
