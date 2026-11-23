"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react"
import { useShop } from "../components/ShopProvider"

const money = new Intl.NumberFormat("vi-VN")

export function CartView() {
  const shop = useShop()
  const { tr } = shop
  const selected = shop.checkoutLines
  const subtotal = selected.reduce((s, l) => s + l.price * l.quantity, 0)
  const selectedCount = selected.reduce((s, l) => s + l.quantity, 0)
  const allSelected = shop.cart.length > 0 && selected.length === shop.cart.length

  if (!shop.ready) {
    return (
      <section className="page-shell flow-page" aria-busy="true">
        <div className="eyebrow">{tr("GIỎ HÀNG", "CART")}</div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" role="status" aria-label={tr("Đang tải giỏ hàng", "Loading your cart")}>
          <div className="h-48 animate-pulse border border-[var(--line)] bg-[var(--white)]" />
          <div className="h-48 animate-pulse border border-[var(--line)] bg-[var(--white)]" />
        </div>
      </section>
    )
  }

  if (!shop.cart.length) {
    return (
      <section className="page-shell flow-page">
        <div className="empty-state"><ShoppingBag size={30} /><h3>{tr("Giỏ hàng đang trống", "Your cart is empty")}</h3><p>{tr("Khám phá trang bị phù hợp với lối chơi của bạn.", "Discover gear that fits your game.")}</p><Link className="boai-button primary" href="/tim-kiem">{tr("Mua sắm ngay")} <ArrowRight size={17} /></Link></div>
      </section>
    )
  }

  return (
    <section className="page-shell flow-page">
      <div className="eyebrow">{tr("GIỎ HÀNG", "CART")}</div>
      <h1 className="flow-title">{shop.count} {tr("sản phẩm", "items")}</h1>
      <div className="flow-grid">
        <div className="line-list">
          <label className="flex cursor-pointer items-center gap-3 border border-[var(--line)] bg-[var(--white)] px-4 py-3 text-sm font-bold">
            <input
              type="checkbox"
              className="size-4 accent-[var(--lime)]"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selected.length > 0 && !allSelected
              }}
              onChange={(event) => shop.setAllSelected(event.target.checked)}
            />
            {tr("Chọn tất cả", "Select all")}
            <span className="ml-auto text-xs font-semibold text-[var(--muted)]">
              {tr(`Đã chọn ${selected.length}/${shop.cart.length}`, `${selected.length}/${shop.cart.length} selected`)}
            </span>
          </label>
          {shop.cart.map((l) => {
            const ticked = shop.isSelected(l.key)
            return (
              <div className={`line-item ${ticked ? "" : "opacity-60"}`} key={l.key}>
                <div className="flex-row! items-start! gap-3!">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-[var(--lime)]"
                    checked={ticked}
                    onChange={(event) => shop.setSelected(l.key, event.target.checked)}
                    aria-label={tr(`Chọn ${l.name} để thanh toán`, `Select ${l.name} for checkout`)}
                  />
                  <Link href={`/san-pham/${l.slug}`}>{l.image && <Image src={l.image} alt="" width={96} height={110} />}</Link>
                </div>
                <div>
                  <small>{l.brand}</small>
                  <Link href={`/san-pham/${l.slug}`}><b>{l.name}</b></Link>
                  <span>{[l.color, l.size && `Size ${l.size}`, l.stringing && tr("Có đan cước", "Strung")].filter(Boolean).join(" · ")}</span>
                  <div className="qty-control"><button onClick={() => shop.setQuantity(l.key, l.quantity - 1)} aria-label={tr("Giảm")}><Minus size={13} /></button><b>{l.quantity}</b><button onClick={() => shop.setQuantity(l.key, l.quantity + 1)} aria-label={tr("Tăng")}><Plus size={13} /></button></div>
                </div>
                <div className="line-right"><button onClick={() => shop.remove(l.key)} aria-label={tr("Xóa")}><X size={16} /></button><strong>{money.format(l.price * l.quantity)}₫</strong></div>
              </div>
            )
          })}
        </div>
        <aside className="summary-card">
          <h3>{tr("Tóm tắt", "Summary")}</h3>
          <div><span>{tr("Vận chuyển")}</span><b className="text-right">{tr("Phí ship tính ở bước thanh toán", "Shipping is calculated at checkout")}</b></div>
          <div className="summary-total">
            <span>{tr(`Tạm tính (${selectedCount} sản phẩm đã chọn)`, `Subtotal (${selectedCount} selected)`)}</span>
            <b>{money.format(subtotal)}₫</b>
          </div>
          {selected.length ? (
            <Link className="boai-button primary full" href="/thanh-toan">{tr("Tiến hành thanh toán", "Proceed to checkout")} <ArrowRight size={17} /></Link>
          ) : (
            <>
              <button type="button" className="boai-button primary full" disabled aria-describedby="cart-select-hint">{tr("Tiến hành thanh toán", "Proceed to checkout")} <ArrowRight size={17} /></button>
              <p id="cart-select-hint" className="hint m-0">{tr("Chọn ít nhất 1 sản phẩm để thanh toán.", "Select at least 1 item to check out.")}</p>
            </>
          )}
          <Link className="text-link" href="/tim-kiem">{tr("Tiếp tục mua sắm", "Continue shopping")}</Link>
        </aside>
      </div>
    </section>
  )
}
