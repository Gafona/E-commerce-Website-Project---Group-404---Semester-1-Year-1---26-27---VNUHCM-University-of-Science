"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GitCompare, Heart, Minus, Plus, ShoppingBag, Zap } from "lucide-react"
import { cartLineKey, useShop } from "./ShopProvider"
import { useProductVariant } from "./ProductVariantProvider"
import { STRINGING_FEE } from "@/lib/vouchers"
import { sizeOptionsFor } from "@/lib/product-size"

const money = new Intl.NumberFormat("vi-VN")

export function ProductPurchase({
  product,
  linkedColors = [],
  sizeHint = false,
}: {
  product: { id: string; slug: string; name: string; brand: string; sport: string; price: number; image: string; stock: number; category: string; colors: { name: string; hex: string }[] }
  /** Same model listed separately in other colors; each opens that listing. */
  linkedColors?: { name: string; hex: string; href: string }[]
  /** Opened from a quick-buy button (`?chon=size`): highlight the size picker. */
  sizeHint?: boolean
}) {
  const shop = useShop()
  const variant = useProductVariant()
  const { tr } = shop
  const router = useRouter()
  const isRacket = product.sport === "badminton" && /vợt/i.test(product.category)
  const sizes = sizeOptionsFor(product.category)
  const [localColor, setLocalColor] = useState(product.colors[0]?.name)
  const color = variant?.selectedColor ?? localColor
  const [size, setSize] = useState<string>()
  const [qty, setQty] = useState(1)
  const [stringing, setStringing] = useState(false)
  const [error, setError] = useState(sizeHint && sizes.length ? tr("Vui lòng chọn kích thước.", "Please choose a size.") : "")
  const sizeRef = useRef<HTMLDivElement>(null)
  const soldOut = product.stock <= 0
  // In-stock items are capped by stock; sold-out items can still be pre-ordered.
  const maxQty = soldOut ? 20 : Math.max(1, Math.min(20, product.stock))
  const liked = shop.favorites.includes(product.slug)
  const compared = shop.compare.includes(product.slug)

  useEffect(() => {
    if (sizeHint && sizes.length) sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    // Only on first render from a quick-buy link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const line = () => ({ id: product.id, slug: product.slug, name: product.name, brand: product.brand, sport: product.sport, price: product.price + (stringing ? STRINGING_FEE : 0), image: variant?.images[0]?.url ?? product.image, color, size, stringing, quantity: qty })
  const validate = () => {
    if (sizes.length && !size) {
      setError(tr("Vui lòng chọn kích thước.", "Please choose a size."))
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      return false
    }
    setError("")
    return true
  }
  const add = () => {
    if (!validate()) return false
    shop.add(line())
    return true
  }
  const buyNow = () => {
    if (!validate()) return
    const existing = shop.findLine(line())
    if (existing) {
      // Same colour, size and stringing already in the cart: use the quantity chosen here.
      if (existing.quantity !== qty) {
        shop.setQuantity(existing.key, qty)
        shop.notify(tr(`Đã cập nhật số lượng trong giỏ thành ${qty}, chuyển sang thanh toán`, `Cart quantity updated to ${qty}, going to checkout`))
      } else {
        shop.notify(tr(`Sản phẩm đã có trong giỏ (số lượng ${qty}), chuyển sang thanh toán`, `Already in your cart (quantity ${qty}), going to checkout`))
      }
      shop.setSelected(existing.key, true)
      router.push("/thanh-toan")
      return
    }
    const result = shop.add(line())
    if (result.status === "added") {
      shop.setSelected(cartLineKey(line()), true)
      router.push("/thanh-toan")
    }
  }

  return (
    <>
      {product.colors.length + linkedColors.length > 0 && (
        <div className="detail-option">
          <span>{tr("Màu sắc")}: <b>{color ? tr(color) : ""}</b></span>
          <div>
            {product.colors.map((c) => (
              <button key={c.name} aria-pressed={c.name === color} className={c.name === color ? "selected" : ""} onClick={() => variant ? variant.setSelectedColor(c.name) : setLocalColor(c.name)}>
                <i style={{ background: c.hex }} />{tr(c.name)}
              </button>
            ))}
            {linkedColors.map((c) => (
              <Link key={c.href} href={c.href} className="color-link" title={tr(`Xem màu ${c.name}`, `View ${c.name}`)}>
                <i style={{ background: c.hex }} />{tr(c.name)}
              </Link>
            ))}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div className={`detail-option ${error && !size ? "rounded-sm outline-2 outline-offset-4 outline-[var(--sale)]" : ""}`} id="size-picker" ref={sizeRef}>
          <span>{tr("Kích thước")}{size ? <>: <b>{size}</b></> : null}</span>
          <div role="group" aria-label={tr("Chọn kích thước", "Choose a size")}>
            {sizes.map((s) => <button key={s} aria-pressed={s === size} className={s === size ? "selected" : ""} onClick={() => { setSize(s); setError("") }}>{s}</button>)}
          </div>
        </div>
      )}
      {isRacket && (
        <label className="stringing-option"><input type="checkbox" checked={stringing} onChange={(e) => setStringing(e.target.checked)} /><span><b>{tr("Đan cước tại BOAI", "Stringing by BOAI")}</b><small>{tr("Cước BG65, căng 10–11kg theo yêu cầu", "BG65 string, 10–11kg tension on request")} · +{money.format(STRINGING_FEE)}₫</small></span></label>
      )}
      <div className="detail-option"><span>{tr("Số lượng")}</span><div className="qty-control"><button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label={tr("Giảm")}><Minus size={14} /></button><b>{qty}</b><button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label={tr("Tăng")}><Plus size={14} /></button></div></div>
      {!soldOut && qty >= maxQty && product.stock <= 20 && <p className="hint m-0">{tr(`Chỉ còn ${product.stock} sản phẩm.`, `Only ${product.stock} left.`)}</p>}
      {error && <p className="form-error">{error}</p>}
      <div className="detail-actions">
        <button className="boai-button primary" onClick={add}><ShoppingBag size={18} /> {tr(soldOut ? "Đặt trước" : "Thêm vào giỏ")}</button>
        <button className="boai-button dark" onClick={buyNow}><Zap size={17} /> {tr("Mua ngay", "Buy now")}</button>
        <button className={`detail-heart ${liked ? "liked" : ""}`} onClick={() => shop.toggleFavorite(product.slug)} aria-label={tr("Yêu thích")}><Heart size={20} fill={liked ? "currentColor" : "none"} /></button>
        <button className={`detail-heart ${compared ? "liked" : ""}`} onClick={() => shop.toggleCompare(product.slug)} aria-label={tr("So sánh")} title={tr("So sánh")}><GitCompare size={20} /></button>
      </div>
    </>
  )
}
