"use client"

import { useEffect, useState } from "react"
import { Search, ShoppingBag, X } from "lucide-react"
import { searchCommunityProducts } from "./actions"
import { useShop } from "../components/ShopProvider"

export function ProductSearch({
  value,
  name,
  sport,
  onSelect,
}: {
  value: string
  name: string
  sport: string
  onSelect: (id: string, name: string) => void
}) {
  const { tr } = useShop()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{
    id: string
    name: string
  }[]>([])
  const [status, setStatus] = useState("")
  useEffect(() => {
    let active = true
    setResults([])
    if (!query.trim()) {
      setStatus("")
      return
    }
    setStatus(tr("Đang tìm…", "Searching…"))
    const timer = setTimeout(async () => {
      try {
        const result = await searchCommunityProducts(
          query.trim().slice(0, 100),
          sport,
        )
        if (!active) return
        if (result.ok) {
          setResults(result.products)
          setStatus(
            result.products.length
              ? ""
              : tr("Không tìm thấy sản phẩm phù hợp.", "No matching products."),
          )
        } else setStatus(result.error)
      } catch {
        if (active)
          setStatus(
            tr(
              "Không thể tìm sản phẩm. Hãy thử lại.",
              "Unable to search. Please retry.",
            ),
          )
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, sport, tr])
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
      <label className="flex items-center gap-2 text-[var(--muted)]">
        <Search size={16} />
        <input
          type="search"
          aria-label={tr("Tìm kiếm sản phẩm", "Search products")}
          placeholder={tr(
            "Tìm sản phẩm theo tên để gắn vào bài viết…",
            "Search gear by name to add to your post…",
          )}
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent py-1 text-xs outline-none"
        />
      </label>
      {value && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-[var(--soft-blue)] p-2 text-xs text-[var(--lime)]">
          <ShoppingBag size={15} />
          <span className="flex-1">{name}</span>
          <button
            type="button"
            aria-label={tr("Bỏ sản phẩm", "Remove product")}
            onClick={() => onSelect("", "")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {status && (
        <p role="status" className="mt-2 text-xs text-[var(--muted)]">
          {status}
        </p>
      )}
      {results.length > 0 && (
        <ul
          aria-label={tr("Kết quả tìm sản phẩm", "Product search results")}
          className="mt-2 max-h-60 overflow-y-auto border-t border-[var(--line)] pt-1"
        >
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg p-2.5 text-left hover:bg-[var(--white)]"
                onClick={() => {
                  onSelect(p.id, p.name)
                  setQuery("")
                  setResults([])
                }}
              >
                <ShoppingBag
                  size={14}
                  className="shrink-0 text-[var(--lime)]"
                />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
