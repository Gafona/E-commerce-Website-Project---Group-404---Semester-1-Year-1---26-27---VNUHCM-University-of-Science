"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BadgeCheck, History, Search, X } from "lucide-react"

import {
  matchesSearch,
  matchesShop,
  type SearchItem,
  type ShopSearchItem,
} from "@/lib/search"
import { useShop } from "./ShopProvider"
import { useSiteContent } from "./SiteContentProvider"
import { signalAccountStateChange } from "@/lib/browser-state"

export type { SearchItem, ShopSearchItem }

const money = new Intl.NumberFormat("vi-VN")
const HISTORY_KEY = "boai-search-history"

export function SearchBox({
  items,
  shops = [],
  defaultValue = "",
  className = "",
}: {
  items: SearchItem[]
  shops?: ShopSearchItem[]
  defaultValue?: string
  className?: string
}) {
  const router = useRouter()
  const trending = useSiteContent().lines("commerce.trending")
  const [query, setQuery] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [history, setHistory] = useState<string[]>([])
  const { tr } = useShop()

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]")) } catch {}
  }, [])
  const saveHistory = (next: string[]) => {
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    signalAccountStateChange()
  }
  const go = (value: string) => {
    saveHistory([value, ...history.filter((h) => h.toLowerCase() !== value.toLowerCase())].slice(0, 6))
    setOpen(false)
    router.push(`/tim-kiem?q=${encodeURIComponent(value)}`)
  }

  const suggestions = useMemo(
    () => (query.trim() ? items.filter((item) => matchesSearch(item, query)).slice(0, 5) : []),
    [items, query],
  )
  const shopSuggestions = useMemo(
    () => (query.trim() ? shops.filter((shop) => matchesShop(shop, query)).slice(0, 3) : []),
    [shops, query],
  )

  const submit = () => {
    const value = query.trim()
    if (value) go(value)
  }

  return (
    <form
      className={`search-box ${className}`}
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        if (active >= 0 && suggestions[active]) {
          router.push(`/san-pham/${suggestions[active].slug}`)
        } else submit()
      }}
    >
      <label className="search">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setActive((i) => Math.min(i + 1, suggestions.length - 1))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setActive((i) => Math.max(i - 1, -1))
            } else if (event.key === "Escape") setOpen(false)
          }}
          placeholder={tr("Tìm giày, vợt, áo đấu...", "Search boots, rackets, jerseys...")}
          aria-label={tr("Tìm kiếm sản phẩm", "Search products")}
        />
      </label>
      {open && !query.trim() && (
        <div className="suggest-panel">
          {history.length > 0 && (
            <>
              <small className="suggest-head">{tr("Tìm kiếm gần đây", "Recent searches")} <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => saveHistory([])}>{tr("Xóa", "Clear")}</button></small>
              {history.map((h) => (
                <div className="history-row" key={h}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(h); go(h) }}><History size={14} /> {h}</button>
                  <button type="button" aria-label={tr("Xóa")} onMouseDown={(e) => e.preventDefault()} onClick={() => saveHistory(history.filter((x) => x !== h))}><X size={13} /></button>
                </div>
              ))}
            </>
          )}
          {trending.length > 0 && (
            <>
              <small>{tr("Xu hướng tìm kiếm", "Trending searches")}</small>
              <div className="trend-chips">{trending.map((t) => <button type="button" key={t} onMouseDown={(e) => e.preventDefault()} onClick={() => { setQuery(t); go(t) }}>{t}</button>)}</div>
            </>
          )}
        </div>
      )}
      {open && query.trim() && (
        <div className="suggest-panel">
          {shopSuggestions.length > 0 && (
            <>
              <small>{tr("Cửa hàng", "Shops")}</small>
              {shopSuggestions.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/cua-hang/${shop.id}`}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <span className="relative grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--lime-dark)] text-sm font-black text-white">
                    {shop.avatar ? (
                      <Image src={shop.avatar} alt="" fill sizes="42px" className="object-cover" />
                    ) : (
                      shop.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span>
                    <b className="inline-flex items-center gap-1">
                      {shop.name} <BadgeCheck size={13} className="text-[var(--lime-dark)]" />
                    </b>
                    <em>{tr(`${shop.productCount} sản phẩm`, `${shop.productCount} products`)}</em>
                  </span>
                  <strong>{tr("Xem shop", "Visit")}</strong>
                </Link>
              ))}
            </>
          )}
          {suggestions.length ? (
            <>
              <small>{tr("Gợi ý sản phẩm", "Suggested products")}</small>
              {suggestions.map((item, index) => (
                <Link
                  key={item.slug}
                  href={`/san-pham/${item.slug}`}
                  className={index === active ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {item.image && <Image src={item.image} alt="" width={42} height={42} />}
                  <span><b>{item.name}</b><em>{item.brand} · {tr(item.category)}</em></span>
                  <strong>{money.format(item.price)}₫</strong>
                </Link>
              ))}
            </>
          ) : shopSuggestions.length ? null : (
            <p>{tr("Không có gợi ý cho", "No suggestions for")} “{query}”</p>
          )}
          <button type="submit" onMouseDown={(event) => event.preventDefault()}>
            {tr("Xem tất cả kết quả cho", "See all results for")} “{query}” <ArrowRight size={15} />
          </button>
        </div>
      )}
    </form>
  )
}
