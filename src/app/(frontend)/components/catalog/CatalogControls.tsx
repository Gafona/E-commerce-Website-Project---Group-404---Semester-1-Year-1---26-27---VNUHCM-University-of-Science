"use client"

import { useEffect, useRef, useState } from "react"
import { Check, SlidersHorizontal, X } from "lucide-react"
import {
  PRICE_PRESETS,
  activeFilterCount,
  type CatalogFacets,
  type CatalogFilters,
  type SportFilter,
} from "@/lib/catalog-filters"
import { productTypeLabel } from "@/lib/product-types"
import { useShop } from "../ShopProvider"
import { SortSelect } from "./SortSelect"

const money = new Intl.NumberFormat("vi-VN")
const short = (value: number) => (value >= 1_000_000 ? `${String(value / 1_000_000).replace(".", ",")} triệu` : `${Math.round(value / 1000)}K`)

/**
 * Compact catalogue toolbar shared by the home page and /tim-kiem: sport tabs,
 * a "Loại" chip row, one "Bộ lọc" button (popover on desktop, bottom sheet on
 * phones), the shared sort control, and removable chips for active filters.
 */
export function CatalogControls({
  filters,
  facets,
  resultCount,
  update,
  reset,
  fitActive,
  showSportTabs = true,
}: {
  filters: CatalogFilters
  facets: CatalogFacets
  resultCount: number
  update: (patch: Partial<CatalogFilters>) => void
  reset: () => void
  fitActive: boolean
  showSportTabs?: boolean
}) {
  const { tr } = useShop()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const [priceFrom, setPriceFrom] = useState(filters.priceMin === null ? "" : String(filters.priceMin))
  const [priceTo, setPriceTo] = useState(filters.priceMax === null ? "" : String(filters.priceMax))
  const count = activeFilterCount(filters)

  // Inputs follow external changes (chip removal, reset, presets).
  useEffect(() => {
    setPriceFrom(filters.priceMin === null ? "" : String(filters.priceMin))
    setPriceTo(filters.priceMax === null ? "" : String(filters.priceMax))
  }, [filters.priceMin, filters.priceMax])

  useEffect(() => {
    if (!open) return
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    const outside = (event: MouseEvent) => {
      // The phone bottom sheet has its own backdrop; only the desktop popover closes on outside clicks.
      if (window.matchMedia("(max-width:720px)").matches) return
      if (!anchor.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", esc)
    document.addEventListener("mousedown", outside)
    return () => {
      document.removeEventListener("keydown", esc)
      document.removeEventListener("mousedown", outside)
    }
  }, [open])

  const fromValue = priceFrom.trim() ? Number(priceFrom) : null
  const toValue = priceTo.trim() ? Number(priceTo) : null
  const priceError =
    (fromValue !== null && (!Number.isFinite(fromValue) || fromValue < 0)) || (toValue !== null && (!Number.isFinite(toValue) || toValue < 0))
      ? tr("Giá phải là số từ 0 trở lên.", "Prices must be numbers from 0.")
      : fromValue !== null && toValue !== null && fromValue > toValue
        ? tr("Giá “từ” phải nhỏ hơn hoặc bằng giá “đến”.", "“From” must be lower than or equal to “to”.")
        : ""
  const applyPrice = (from: string, to: string) => {
    const min = from.trim() ? Math.round(Number(from)) : null
    const max = to.trim() ? Math.round(Number(to)) : null
    if ((min !== null && !(min >= 0)) || (max !== null && !(max >= 0)) || (min !== null && max !== null && min > max)) return
    update({ priceMin: min, priceMax: max })
  }
  const toggle = (key: "brands" | "sizes" | "colors", value: string) =>
    update({ [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value] })

  const priceLabel =
    filters.priceMin !== null && filters.priceMax !== null
      ? `${short(filters.priceMin)} – ${short(filters.priceMax)}`
      : filters.priceMin !== null
        ? tr(`Từ ${short(filters.priceMin)}`, `From ${short(filters.priceMin)}`)
        : filters.priceMax !== null
          ? tr(`Đến ${short(filters.priceMax)}`, `Up to ${short(filters.priceMax)}`)
          : ""
  const chips = [
    filters.type !== "all" && {
      key: "type",
      label: tr(productTypeLabel(filters.type)?.vi ?? filters.type, productTypeLabel(filters.type)?.en ?? filters.type),
      clear: () => update({ type: "all" }),
    },
    ...filters.brands.map((brand) => ({ key: `brand:${brand}`, label: brand, clear: () => toggle("brands", brand) })),
    priceLabel && { key: "price", label: priceLabel, clear: () => update({ priceMin: null, priceMax: null }) },
    ...filters.sizes.map((size) => ({ key: `size:${size}`, label: `Size ${size}`, clear: () => toggle("sizes", size) })),
    ...filters.colors.map((color) => ({ key: `color:${color}`, label: tr(color), clear: () => toggle("colors", color) })),
    filters.inStock && { key: "stock", label: tr("Còn hàng", "In stock"), clear: () => update({ inStock: false }) },
    filters.onSale && { key: "sale", label: tr("Đang giảm giá", "On sale"), clear: () => update({ onSale: false }) },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  const visibleBrands = facets.brands.filter((b) => b.count > 0 || filters.brands.includes(b.name))
  const visibleSizes = facets.sizes.filter((s) => s.count > 0 || filters.sizes.includes(s.size))
  const visibleColors = facets.colors.filter((c) => c.count > 0 || filters.colors.includes(c.name))

  return (
    <>
      <div className="catalog-toolbar">
        {showSportTabs ? (
          <div className="sport-tabs" role="tablist" aria-label={tr("Môn thể thao", "Sport")}>
            {(
              [
                ["all", tr("Tất cả")],
                ["football", tr("Bóng đá")],
                ["badminton", tr("Cầu lông")],
              ] as [SportFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filters.sport === value}
                className={filters.sport === value ? "active" : ""}
                onClick={() => update({ sport: value })}
              >
                {label} <small className="ml-1 opacity-60">{facets.sports[value]}</small>
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="catalog-actions">
          <SortSelect value={filters.sort} onChange={(sort) => update({ sort })} fitActive={fitActive} />
          <div className="catalog-filter-anchor" ref={anchor}>
            <button
              type="button"
              className={`filter-button ${open ? "open" : ""}`}
              aria-expanded={open}
              aria-controls="catalog-filter-panel"
              onClick={() => setOpen(!open)}
            >
              <SlidersHorizontal size={17} /> {tr("Bộ lọc", "Filters")}
              {count > 0 && <span>{count}</span>}
            </button>
            {open && (
              <>
                <div className="filter-backdrop" onClick={() => setOpen(false)} aria-hidden />
                <div id="catalog-filter-panel" className="filter-panel popover" role="dialog" aria-label={tr("Bộ lọc", "Filters")}>
                  <div className="filter-panel-head">
                    <b>{tr("Bộ lọc", "Filters")}</b>
                    <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={tr("Đóng bộ lọc", "Close filters")}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="filter-panel-body">
                    <fieldset>
                      <legend>{tr("Thương hiệu", "Brand")}</legend>
                      {visibleBrands.length ? (
                        <div className="filter-chips">
                          {visibleBrands.map((brand) => {
                            const active = filters.brands.includes(brand.name)
                            return (
                              <button key={brand.name} type="button" className={`filter-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => toggle("brands", brand.name)}>
                                {active && <Check size={14} aria-hidden />}
                                {brand.name}
                                <small>{brand.count}</small>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="m-0 text-xs text-[var(--muted)]">{tr("Không có thương hiệu nào với bộ lọc hiện tại.", "No brands match the current filters.")}</p>
                      )}
                    </fieldset>
                    <fieldset>
                      <legend>{tr("Khoảng giá", "Price range")} (₫)</legend>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1000"
                          value={priceFrom}
                          placeholder={tr("Từ", "From")}
                          aria-label={tr("Giá từ", "Price from")}
                          className="h-11 w-full min-w-0 border border-[var(--line)] bg-[var(--white)] px-3 text-sm text-[var(--ink)]"
                          onChange={(event) => {
                            setPriceFrom(event.target.value)
                            applyPrice(event.target.value, priceTo)
                          }}
                        />
                        <span className="text-[var(--muted)]">–</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1000"
                          value={priceTo}
                          placeholder={tr("Đến", "To")}
                          aria-label={tr("Giá đến", "Price to")}
                          className="h-11 w-full min-w-0 border border-[var(--line)] bg-[var(--white)] px-3 text-sm text-[var(--ink)]"
                          onChange={(event) => {
                            setPriceTo(event.target.value)
                            applyPrice(priceFrom, event.target.value)
                          }}
                        />
                      </div>
                      {priceError && <p className="m-0 mt-2 text-[11px] font-semibold text-[var(--sale)]" role="alert">{priceError}</p>}
                      <div className="filter-chips mt-3">
                        {PRICE_PRESETS.map((preset) => {
                          const active = filters.priceMin === preset.min && filters.priceMax === preset.max
                          return (
                            <button
                              key={preset.vi}
                              type="button"
                              className={`filter-chip ${active ? "active" : ""}`}
                              aria-pressed={active}
                              onClick={() => update(active ? { priceMin: null, priceMax: null } : { priceMin: preset.min, priceMax: preset.max })}
                            >
                              {tr(preset.vi, preset.en)}
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{tr("Size", "Size")}</legend>
                      {visibleSizes.length ? (
                        <div className="filter-chips">
                          {visibleSizes.map((item) => {
                            const active = filters.sizes.includes(item.size)
                            return (
                              <button key={item.size} type="button" className={`filter-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => toggle("sizes", item.size)}>
                                {item.size}
                                <small>{item.count}</small>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="m-0 text-xs text-[var(--muted)]">{tr("Size chỉ áp dụng cho giày và quần áo.", "Sizes apply to shoes and apparel only.")}</p>
                      )}
                    </fieldset>
                    <fieldset>
                      <legend>{tr("Màu sắc")}</legend>
                      {visibleColors.length ? (
                        <div className="filter-chips">
                          {visibleColors.map((color) => {
                            const active = filters.colors.includes(color.name)
                            return (
                              <button key={color.name} type="button" className={`filter-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => toggle("colors", color.name)}>
                                <i style={{ background: color.hex }} aria-hidden />
                                {tr(color.name)}
                                <small>{color.count}</small>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="m-0 text-xs text-[var(--muted)]">{tr("Không có màu nào với bộ lọc hiện tại.", "No colours match the current filters.")}</p>
                      )}
                    </fieldset>
                    <fieldset>
                      <legend>{tr("Tình trạng", "Availability")}</legend>
                      <div className="filter-chips">
                        <button type="button" className={`filter-chip ${filters.inStock ? "active" : ""}`} aria-pressed={filters.inStock} onClick={() => update({ inStock: !filters.inStock })}>
                          {filters.inStock && <Check size={15} aria-hidden />} {tr("Chỉ hiện còn hàng", "In stock only")}
                        </button>
                        <button type="button" className={`filter-chip ${filters.onSale ? "active" : ""}`} aria-pressed={filters.onSale} onClick={() => update({ onSale: !filters.onSale })}>
                          {filters.onSale && <Check size={15} aria-hidden />} {tr("Đang giảm giá", "On sale")}
                        </button>
                      </div>
                    </fieldset>
                  </div>
                  <div className="filter-panel-foot">
                    <button type="button" className="boai-button" onClick={reset} disabled={!count}>
                      {tr("Xóa bộ lọc", "Clear filters")}
                    </button>
                    <button type="button" className="boai-button dark" onClick={() => setOpen(false)}>
                      {tr(`Xem ${resultCount} sản phẩm`, `Show ${resultCount} products`)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex min-w-0">
        <div className="filter-chips scroll" role="group" aria-label={tr("Loại sản phẩm", "Product type")}>
          <span className="rail-label self-center">{tr("Loại", "Type")}</span>
          <button type="button" className={`filter-chip ${filters.type === "all" ? "active" : ""}`} aria-pressed={filters.type === "all"} onClick={() => update({ type: "all" })}>
            {tr("Tất cả loại", "All types")}
            <small>{facets.typeTotal}</small>
          </button>
          {facets.types.map((type) => {
            const active = filters.type === type.id
            if (!type.count && !active) return null
            return (
              <button key={type.id} type="button" className={`filter-chip ${active ? "active" : ""}`} aria-pressed={active} onClick={() => update({ type: active ? "all" : type.id })}>
                {tr(type.vi, type.en)}
                <small>{type.count}</small>
              </button>
            )
          })}
        </div>
      </div>

      <div className="active-filters" aria-live="polite">
        {chips.map((chip) => (
          <button key={chip.key} type="button" className="active-filter" onClick={chip.clear} aria-label={tr(`Bỏ lọc ${chip.label}`, `Remove ${chip.label}`)}>
            {chip.label} <X size={14} aria-hidden />
          </button>
        ))}
        {chips.length > 0 && (
          <button type="button" className="clear-filters" onClick={reset}>
            {tr("Xóa tất cả", "Clear all")}
          </button>
        )}
        <span className="ml-auto text-xs font-bold text-[var(--muted)]">
          {tr(`${money.format(resultCount)} sản phẩm phù hợp`, `${money.format(resultCount)} matching products`)}
        </span>
      </div>
    </>
  )
}
