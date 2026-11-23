"use client"

import { ArrowUpDown, ChevronDown } from "lucide-react"
import { SORT_OPTIONS, type SortKey } from "@/lib/catalog-filters"
import { useShop } from "../ShopProvider"

/**
 * The one sort control for the home catalogue and /tim-kiem. "Phù hợp nhất"
 * uses SportDNA fit when the shopper has a profile, otherwise the default
 * order; the hint under the control says which one is active.
 */
export function SortSelect({
  value,
  onChange,
  fitActive,
}: {
  value: SortKey
  onChange: (value: SortKey) => void
  /** True when "Phù hợp nhất" can use SportDNA fit scores. */
  fitActive: boolean
}) {
  const { tr } = useShop()
  const hint =
    value === "relevance"
      ? fitActive
        ? tr("Theo độ phù hợp SportDNA của bạn", "By your SportDNA fit")
        : tr("Theo thứ tự mặc định · làm bài SportDNA để sắp theo độ phù hợp", "Default order · take SportDNA to sort by fit")
      : ""
  return (
    <div className="grid gap-1">
      <label className="sort-select">
        <ArrowUpDown size={16} aria-hidden />
        <span className="sr-only">{tr("Sắp xếp", "Sort")}</span>
        <select value={value} onChange={(event) => onChange(event.target.value as SortKey)} aria-describedby={hint ? "catalog-sort-hint" : undefined}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {tr(option.vi, option.en)}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden />
      </label>
      {hint && (
        <small id="catalog-sort-hint" className="max-w-[260px] text-[10px] leading-4 text-[var(--muted)]">
          {hint}
        </small>
      )}
    </div>
  )
}
