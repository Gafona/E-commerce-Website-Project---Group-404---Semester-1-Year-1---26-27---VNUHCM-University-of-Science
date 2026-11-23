"use client"

import { useEffect, useRef, useState } from "react"
import { ALL_FIXED_SPEC_LABELS } from "@/lib/product-specs"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  GitCompare,
  Heart,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react"
import type { ProductLite } from "@/lib/product-lite"
import { useShop } from "./ShopProvider"
import { useSportDnaContext } from "./MatchBadge"
import { useQuickAdd, type QuickProduct } from "./useQuickAdd"
import { fitFor } from "@/lib/sportdna"
import { fitEligible } from "@/lib/fit-eligibility"
import { ProductImage } from "./ProductImage"
import { RatingLine } from "./RatingLine"
import { loadProductsBySlugsAction, searchCompareProductsAction } from "../product-list-actions"

/** Loads exactly the saved slugs from the server (no catalogue-size cap). */
function useSavedProducts(slugs: string[]) {
  const [items, setItems] = useState<ProductLite[]>([])
  const [loading, setLoading] = useState(true)
  const key = slugs.join("|")
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadProductsBySlugsAction(key ? key.split("|") : [])
      .then((found) => {
        if (!cancelled) setItems(found)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])
  return { items, loading }
}

const money = new Intl.NumberFormat("vi-VN")

const liteToQuick = (p: ProductLite): QuickProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  sport: p.sport,
  price: p.price,
  image: p.image,
  category: p.category,
  color: p.defaultColor,
})

export function SavedLists({ mode }: { mode: "favorites" | "compare" }) {
  const shop = useShop()
  const { tr } = shop
  const quick = useQuickAdd()
  const addLite = (p: ProductLite) => quick.add(liteToQuick(p))
  const saved = useSavedProducts(mode === "favorites" ? shop.favorites : [])

  if (mode === "favorites") {
    const list = saved.items.filter((p) => shop.favorites.includes(p.slug))
    return (
      <section className="page-shell flow-page">
        <div className="eyebrow">
          {tr("BỘ SƯU TẬP CỦA BẠN", "YOUR COLLECTION")}
        </div>
        <h1 className="flow-title">
          {tr("Yêu thích")} ({list.length})
        </h1>
        {shop.ready && !saved.loading && !list.length ? (
          <div className="empty-state">
            <Heart size={28} />
            <h3>{tr("Chưa có sản phẩm yêu thích", "No saved products yet")}</h3>
            <p>
              {tr(
                "Bấm biểu tượng trái tim trên sản phẩm để lưu lại.",
                "Tap the heart on any product to save it.",
              )}
            </p>
            <Link className="boai-button primary" href="/tim-kiem">
              {tr("Khám phá")} <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {list.map((p) => (
              <article className="product-card" key={p.id}>
                <div className="product-image-wrap">
                  <Link href={`/san-pham/${p.slug}`}>
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 720px) 50vw, 25vw"
                    />
                  </Link>
                  <button
                    className="heart-button liked"
                    onClick={() => shop.toggleFavorite(p.slug)}
                    aria-label={tr("Bỏ yêu thích", "Remove from wishlist")}
                  >
                    <Heart size={19} fill="currentColor" />
                  </button>
                  <button className="quick-add" onClick={() => addLite(p)}>
                    {tr("Thêm vào giỏ")} <ShoppingBag size={16} />
                  </button>
                </div>
                <div className="product-info">
                  <div className="product-meta">
                    <span>{p.brand}</span>
                    <span>
                      {tr(p.sport === "football" ? "Bóng đá" : "Cầu lông")}
                    </span>
                  </div>
                  <Link href={`/san-pham/${p.slug}`}>
                    <h3>{p.name}</h3>
                  </Link>
                  <div className="product-bottom">
                    <div className="price">
                      <b>{money.format(p.price)}₫</b>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  return <CompareList />
}

function CompareList() {
  const shop = useShop()
  const { tr } = shop
  const quick = useQuickAdd()
  const addLite = (product: ProductLite) => quick.add(liteToQuick(product))
  const { items: products } = useSavedProducts(shop.compare)
  const [sport, setSport] = useState("football")
  const sportChosen = useRef(false)
  // Follow the sport of the saved products until the visitor picks one.
  useEffect(() => {
    if (!sportChosen.current && products[0]) setSport(products[0].sport)
  }, [products])
  const [queries, setQueries] = useState(["", ""])
  const [categories, setCategories] = useState(["", ""])
  const [openFilter, setOpenFilter] = useState<number | null>(null)
  const { profiles, preferences, runs } = useSportDnaContext()
  const fitFull = (p: ProductLite) => fitFor(profiles, p, preferences, runs)
  // Excluded products (e.g. wrong studs for your surface) have no percentage.
  const fit = (p: ProductLite) => {
    const f = fitFull(p)
    return f && !f.hardFail ? f.score : null
  }
  const chosen = shop.compare
    .map((slug) => products.find((product) => product.slug === slug))
    .filter(
      (product): product is ProductLite => !!product && product.sport === sport,
    )
  // Picker suggestions come from a server search over the whole catalogue of this sport.
  const [suggest, setSuggest] = useState<ProductLite[][]>([[], []])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const chosenKey = chosen.map((p) => p.slug).join("|")
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      void Promise.all(
        [0, 1].map((slot) =>
          searchCompareProductsAction({
            sport,
            query: queries[slot],
            category: categories[slot],
            exclude: chosenKey.split("|").filter((slug, index) => slug && index !== slot),
          }),
        ),
      )
        .then((results) => {
          if (cancelled) return
          setSuggest(results.map((r) => r.items.slice(0, 5)))
          setCategoryOptions(results[0]?.categories ?? [])
        })
        .catch(() => {})
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sport, queries, categories, chosenKey])
  const labels = [
    ...new Set(chosen.flatMap((p) => p.specs.map((s) => s.label))),
  ]
    .filter((label) => !["Thương hiệu", "Danh mục", "Môn thể thao"].includes(label))
    .sort((a, b) => {
      const ai = ALL_FIXED_SPEC_LABELS.indexOf(a)
      const bi = ALL_FIXED_SPEC_LABELS.indexOf(b)
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
    })
  type CompareRow = readonly [string, (
    product: ProductLite,
  ) => React.ReactNode, ((product: ProductLite) => number | null) | undefined]
  const rows: CompareRow[] = [
    [
      tr("Giá bán", "Price"),
      (p) => <b>{money.format(p.price)}₫</b>,
      (p) => p.price,
    ],
    [tr("Thương hiệu"), (p) => p.brand, undefined],
    [tr("Loại", "Category"), (p) => p.category, undefined],
    [
      tr("Đánh giá", "Rating"),
      (p) => (
        <RatingLine average={p.rating} count={p.reviews} tr={tr} className="inline-flex items-center gap-1" />
      ),
      (p) => p.rating,
    ],
    [
      tr("Độ phù hợp SportDNA", "SportDNA match"),
      (p) =>
        !fitEligible(p) ? (
          <span className="text-[11px] text-[var(--muted)]">{tr("Không áp dụng cho loại sản phẩm này", "Not applicable to this product type")}</span>
        ) : fitFull(p)?.hardFail ? (
          <b className="text-red-700">{tr("Không phù hợp", "Not suitable")}</b>
        ) : fit(p) === null ? (
          <Link href={`/sportdna/kiem-tra/${p.sport === "football" ? "bong-da" : "cau-long"}`} className="font-bold text-[var(--lime-dark)] underline">
            {tr("Làm bài test để xem độ phù hợp", "Take the test to see your fit")}
          </Link>
        ) : (
          `${fit(p)}%`
        ),
      (p) => fit(p) ?? -1,
    ],
    [
      tr("Lý do phù hợp / không phù hợp", "Why it fits or not"),
      (p) => {
        const f = fitFull(p)
        if (!f) return <span className="text-[11px] text-[var(--muted)]">{tr("Chưa có", "None yet")}</span>
        const reasons = f.reasons ?? [...f.cons.map((vi) => ({ good: false, vi, en: vi })), ...f.pros.map((vi) => ({ good: true, vi, en: vi }))]
        return (
          <ul className="m-0 grid list-none gap-1 p-0 text-left text-[11px] leading-snug">
            {reasons.slice(0, 3).map((r) => (
              <li key={r.vi} className={`flex gap-1 ${r.good ? "text-emerald-700" : "text-red-700"}`}>
                {r.good ? <Check size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                <span>{tr(r.vi, r.en)}</span>
              </li>
            ))}
          </ul>
        )
      },
      undefined,
    ],
    [
      tr("Tồn kho", "Stock"),
      (p) =>
        p.stock > 0
          ? tr(`Còn ${p.stock}`, `${p.stock} left`)
          : tr("Hết hàng — đặt trước", "Sold out — pre-order"),
      (p) => p.stock,
    ],
  ]
  const numericValue = (value?: string) => {
    if (!value) return null
    const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/)
    return match ? Number(match[0]) : null
  }
  const relationFor = (left: number | null, right: number | null) => {
    if (left === null || right === null) return null
    return left === right ? "=" : left > right ? ">" : "<"
  }
  const valueTone = (side: "left" | "right", relation: string | null) => {
    if (!relation || relation === "=") return ""
    const greater =
      (relation === ">" && side === "left") ||
      (relation === "<" && side === "right")
    return greater ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
  }
  const changeSport = (nextSport: string) => {
    shop.compare.forEach((slug) => shop.toggleCompare(slug))
    sportChosen.current = true
    setSport(nextSport)
    setQueries(["", ""])
    setCategories(["", ""])
    setOpenFilter(null)
  }
  const pickProduct = (slot: number, product: ProductLite) => {
    const current = chosen[slot]
    if (current?.slug === product.slug) {
      shop.toggleCompare(product.slug)
      return
    }
    // Replace this slot in place so the other slot never moves.
    shop.setCompareSlot(slot, product.slug)
    setQueries((values) =>
      values.map((value, index) => (index === slot ? "" : value)),
    )
  }
  const productPicker = (slot: number) => {
    const selected = chosen[slot]
    const other = chosen[slot === 0 ? 1 : 0]
    const suggestions = suggest[slot] ?? []

    return (
      <section
        className="min-w-0 overflow-hidden bg-[var(--white)] shadow-sm ring-1 ring-[var(--line)]"
        aria-label={`${tr("Sản phẩm", "Product")} ${slot + 1}`}
      >
        <div className="flex items-center justify-between gap-3 bg-[var(--dark)] p-4 text-white sm:px-5">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[var(--blue)]">
              {tr("Lựa chọn", "Selection")} {slot + 1}
            </span>
            <h2 className="m-0 mt-1 font-[family-name:var(--display)] text-2xl font-black uppercase">
              {tr("Chọn sản phẩm", "Choose product")}
            </h2>
          </div>
          <span
            className={`grid size-10 place-items-center border ${
              selected
                ? "border-[var(--lime)] bg-[var(--lime)]"
                : "border-white/20 bg-white/10"
            }`}
          >
            {selected ? (
              <Check size={20} />
            ) : (
              <strong className="font-[family-name:var(--display)] text-xl">
                {slot + 1}
              </strong>
            )}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {selected && (
            <div className="mb-4 grid grid-cols-[6rem_1fr_auto] items-center gap-4 border-l-4 border-[var(--lime)] bg-[var(--paper)] p-3">
              <span className="relative aspect-square overflow-hidden bg-[var(--white)] shadow-sm">
                <ProductImage
                  src={selected.image}
                  alt={selected.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <small className="block truncate font-extrabold uppercase tracking-wide text-[var(--muted)]">
                  {selected.brand} · {tr(selected.category)}
                </small>
                <strong className="mt-1 block text-base leading-snug">
                  {selected.name}
                </strong>
                <span className="mt-2 block text-sm font-extrabold text-[var(--lime-dark)]">
                  {money.format(selected.price)}₫
                </span>
              </span>
              <button
                type="button"
                onClick={() => shop.toggleCompare(selected.slug)}
                className="grid size-9 place-items-center border border-[var(--line)] bg-[var(--white)] transition-colors hover:border-red-300 hover:text-red-600"
                aria-label={tr("Bỏ sản phẩm", "Remove product")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="relative z-20">
            <div className="flex bg-[var(--white)] shadow-sm ring-1 ring-[var(--line)] focus-within:ring-2 focus-within:ring-[var(--lime)]">
              <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
                <Search size={17} className="shrink-0 text-[var(--muted)]" />
                <input
                  value={queries[slot]}
                  onChange={(event) =>
                    setQueries((values) =>
                      values.map((value, index) =>
                        index === slot ? event.target.value : value,
                      ),
                    )
                  }
                  placeholder={tr(
                    "Nhập tên, hãng, loại...",
                    "Search name, brand, category...",
                  )}
                  className="h-12 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setOpenFilter(openFilter === slot ? null : slot)}
                className={`flex h-12 items-center gap-2 border-0 border-l border-[var(--line)] px-3 text-xs font-extrabold uppercase ${
                  categories[slot]
                    ? "bg-[var(--lime)] !text-white"
                    : "bg-[var(--paper)] text-[var(--ink)]"
                }`}
                aria-expanded={openFilter === slot}
              >
                <SlidersHorizontal size={16} />
                {tr("Lọc", "Filter")}
              </button>
            </div>
            {openFilter === slot && (
              <div className="absolute left-0 right-0 top-full z-10 border border-t-0 border-[var(--line)] bg-[var(--white)] p-3 shadow-lg">
                <span className="mb-2 block text-xs font-extrabold uppercase text-[var(--muted)]">
                  {tr("Lọc theo loại", "Filter by category")}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCategories((values) =>
                        values.map((value, index) =>
                          index === slot ? "" : value,
                        ),
                      )
                    }
                    className={`border px-3 py-2 text-xs font-bold ${
                      !categories[slot]
                        ? "border-[var(--dark)] bg-[var(--dark)] !text-white"
                        : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)]"
                    }`}
                  >
                    {tr("Tất cả", "All")}
                  </button>
                  {categoryOptions.map((category) => (
                    <button
                      type="button"
                      key={category}
                      onClick={() =>
                        setCategories((values) =>
                          values.map((value, index) =>
                            index === slot ? category : value,
                          ),
                        )
                      }
                      className={`border px-3 py-2 text-xs font-bold ${
                        categories[slot] === category
                          ? "border-[var(--dark)] bg-[var(--dark)] !text-white"
                          : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)]"
                      }`}
                    >
                      {tr(category)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="mt-4 grid max-h-96 gap-2 overflow-y-auto pr-1"
            role="listbox"
            aria-label={tr("Gợi ý sản phẩm", "Product suggestions")}
          >
            {suggestions.map((product) => {
              const active = selected?.slug === product.slug
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  key={product.slug}
                  onClick={() => pickProduct(slot, product)}
                  className={`group grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 border p-2 text-left transition-all ${
                    active
                      ? "border-[var(--lime)] bg-[var(--paper)] shadow-[inset_3px_0_0_var(--lime)]"
                      : "border-transparent bg-[var(--paper)] hover:border-[var(--lime)] hover:bg-[var(--white)] hover:shadow-sm"
                  }`}
                >
                  <span className="relative aspect-square overflow-hidden bg-[var(--paper)]">
                    <ProductImage
                      src={product.image}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </span>
                  <span className="min-w-0">
                    <small className="block truncate font-bold uppercase text-[var(--muted)]">
                      {product.brand} · {tr(product.category)}
                    </small>
                    <strong className="mt-1 block line-clamp-2 text-xs leading-snug">
                      {product.name}
                    </strong>
                  </span>
                  <span className="text-right text-xs font-extrabold">
                    {money.format(product.price)}₫
                  </span>
                </button>
              )
            })}
            {!suggestions.length && (
              <p className="m-0 border border-dashed border-[var(--line)] bg-[var(--paper)] p-5 text-center text-xs text-[var(--muted)]">
                {tr(
                  "Không tìm thấy sản phẩm phù hợp.",
                  "No matching products found.",
                )}
              </p>
            )}
          </div>
        </div>
      </section>
    )
  }

  const relation =
    chosen.length < 2
      ? null
      : chosen[0].price === chosen[1].price
        ? "="
        : chosen[0].price > chosen[1].price
          ? ">"
          : "<"
  const relationColor =
    relation === ">"
      ? "text-green-600"
      : relation === "<"
        ? "text-red-600"
        : "text-[var(--muted)]"

  return (
    <section className="page-shell flow-page">
      <div className="eyebrow">{tr("SO SÁNH", "COMPARE")}</div>
      <h1 className="flow-title">
        {tr("So sánh sản phẩm", "Compare products")}
      </h1>
      <p className="hint">
        {tr(
          "Chọn môn thể thao, sau đó tìm và chọn hai sản phẩm để đối chiếu.",
          "Choose a sport, then search and select two products to compare.",
        )}
      </p>

      <label className="mb-5 block max-w-md">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-[var(--muted)]">
          {tr("Môn thể thao", "Sport")}
        </span>
        <span className="relative flex h-12 items-center border border-[var(--line)] bg-[var(--white)]">
          <select
            value={sport}
            onChange={(event) => changeSport(event.target.value)}
            className="h-full w-full appearance-none border-0 bg-transparent px-4 text-sm font-extrabold uppercase outline-none"
          >
            <option value="football">{tr("Bóng đá", "Football")}</option>
            <option value="badminton">{tr("Cầu lông", "Badminton")}</option>
          </select>
          <ChevronDown
            size={17}
            className="pointer-events-none absolute right-4"
          />
        </span>
      </label>

      <div className="mb-8 grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)]">
        {productPicker(0)}
        <div className="flex min-h-28 flex-col items-center justify-center border border-[var(--line)] bg-[var(--dark)] px-4 text-center text-white">
          <span className="text-xs font-extrabold uppercase tracking-widest text-white/60">
            {tr("Theo giá bán", "By price")}
          </span>
          <strong
            className={`my-2 font-[family-name:var(--display)] text-6xl leading-none ${relationColor}`}
          >
            {relation ?? "—"}
          </strong>
          <span className="text-xs text-white/60">
            {relation
              ? `${money.format(Math.abs(chosen[0].price - chosen[1].price))}₫`
              : tr("Chọn đủ 2 sản phẩm", "Select 2 products")}
          </span>
        </div>
        {productPicker(1)}
      </div>
      {chosen.length === 0 ? (
        <div className="empty-state">
          <GitCompare size={28} />
          <h3>{tr("Chưa chọn sản phẩm", "No products selected")}</h3>
          <p>
            {tr(
              "Chọn 2 sản phẩm để xem khác biệt về giá, thông số, hiệu năng.",
              "Pick 2 products to compare price, specs and performance.",
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[var(--line)] bg-[var(--white)]">
          <div className="grid min-w-3xl grid-cols-[10rem_minmax(0,1fr)_4rem_minmax(0,1fr)] border-b border-[var(--line)] bg-[var(--dark)] text-white">
            <span className="p-4 text-xs font-extrabold uppercase tracking-widest text-white/50">
              {tr("Tiêu chí", "Metric")}
            </span>
            {chosen[0] ? (
              <div className="p-4">
                <strong className="block text-sm">{chosen[0].name}</strong>
                <button
                  className="mt-2 border-0 bg-transparent p-0 text-xs font-bold uppercase text-[var(--blue)]"
                  onClick={() => addLite(chosen[0])}
                >
                  {tr("Thêm vào giỏ", "Add to cart")}
                </button>
              </div>
            ) : (
              <span />
            )}
            <span className="grid place-items-center font-[family-name:var(--display)] text-xl text-white/50">
              VS
            </span>
            {chosen[1] ? (
              <div className="p-4">
                <strong className="block text-sm">{chosen[1].name}</strong>
                <button
                  className="mt-2 border-0 bg-transparent p-0 text-xs font-bold uppercase text-[var(--blue)]"
                  onClick={() => addLite(chosen[1])}
                >
                  {tr("Thêm vào giỏ", "Add to cart")}
                </button>
              </div>
            ) : (
              <span />
            )}
          </div>
          {rows.map(([label, render, compare]) => {
            const relation =
              chosen.length === 2 && compare
                ? relationFor(compare(chosen[0]), compare(chosen[1]))
                : null
            return (
              <div
                className="grid min-w-3xl grid-cols-[10rem_minmax(0,1fr)_4rem_minmax(0,1fr)] border-b border-[var(--line)] last:border-b-0"
                key={label}
              >
                <span className="bg-[var(--paper)] p-4 text-xs font-extrabold uppercase text-[var(--muted)]">
                  {tr(label)}
                </span>
                <div
                  className={`flex items-center p-4 text-sm font-bold ${valueTone("left", relation)}`}
                >
                  {chosen[0] ? render(chosen[0]) : "—"}
                </div>
                <strong
                  className={`grid place-items-center border-x border-[var(--line)] font-[family-name:var(--display)] text-2xl ${
                    relation === ">"
                      ? "text-green-600"
                      : relation === "<"
                        ? "text-red-600"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {relation ?? "·"}
                </strong>
                <div
                  className={`flex items-center p-4 text-sm font-bold ${valueTone("right", relation)}`}
                >
                  {chosen[1] ? render(chosen[1]) : "—"}
                </div>
              </div>
            )
          })}
          {labels.map((label) => {
            const leftValue = chosen[0]?.specs.find(
              (spec) => spec.label === label,
            )?.value
            const rightValue = chosen[1]?.specs.find(
              (spec) => spec.label === label,
            )?.value
            const relation = relationFor(
              numericValue(leftValue),
              numericValue(rightValue),
            )
            return (
              <div
                className="grid min-w-3xl grid-cols-[10rem_minmax(0,1fr)_4rem_minmax(0,1fr)] border-b border-[var(--line)] last:border-b-0"
                key={label}
              >
                <span className="bg-[var(--paper)] p-4 text-xs font-extrabold uppercase text-[var(--muted)]">
                  {label}
                </span>
                <div
                  className={`p-4 text-sm font-bold ${valueTone("left", relation)}`}
                >
                  {leftValue ?? "—"}
                </div>
                <strong
                  className={`grid place-items-center border-x border-[var(--line)] font-[family-name:var(--display)] text-2xl ${
                    relation === ">"
                      ? "text-green-600"
                      : relation === "<"
                        ? "text-red-600"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {relation ?? "·"}
                </strong>
                <div
                  className={`p-4 text-sm font-bold ${valueTone("right", relation)}`}
                >
                  {rightValue ?? "—"}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
