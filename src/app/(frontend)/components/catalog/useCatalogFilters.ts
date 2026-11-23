"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  EMPTY_FILTERS,
  catalogFacets,
  filtersToParams,
  matchesFilters,
  sortCatalog,
  type CatalogFilters,
  type CatalogProduct,
} from "@/lib/catalog-filters"
import { fitFor, toDnaProduct } from "@/lib/sportdna"
import type { Product } from "@/payload-types"
import { useSportDnaContext } from "../MatchBadge"

/**
 * Filter state for a product list. With `syncUrl`, every change is written to
 * the address bar (replaceState, no reload) so the link can be shared.
 */
export function useCatalogFilters<T extends CatalogProduct>(
  products: T[],
  { initial = EMPTY_FILTERS, syncUrl = false }: { initial?: CatalogFilters; syncUrl?: boolean } = {},
) {
  const [filters, setFilters] = useState<CatalogFilters>(initial)
  const { profiles, preferences, runs, ready } = useSportDnaContext()

  // SportDNA fit for products that support it (rackets, football boots, balls with specs).
  const fit = useMemo(() => {
    const map = new Map<string, number>()
    if (!ready) return map
    for (const product of products) {
      const result = fitFor(profiles, toDnaProduct(product as unknown as Product), preferences, runs)
      if (result) map.set(String(product.id), result.hardFail ? -1 : result.score)
    }
    return map
  }, [products, profiles, preferences, runs, ready])

  const results = useMemo(
    () => sortCatalog(products.filter((product) => matchesFilters(product, filters)), filters.sort, fit),
    [products, filters, fit],
  )
  const facets = useMemo(() => catalogFacets(products, filters), [products, filters])

  const update = useCallback((patch: Partial<CatalogFilters>) => setFilters((current) => ({ ...current, ...patch })), [])
  const reset = useCallback(
    () => setFilters((current) => ({ ...EMPTY_FILTERS, sport: current.sport, sort: current.sort })),
    [],
  )

  const first = useRef(true)
  useEffect(() => {
    if (!syncUrl) return
    if (first.current) {
      first.current = false
      return
    }
    const current = new URLSearchParams(window.location.search)
    const next = filtersToParams(filters, current).toString()
    if (next === current.toString()) return
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`)
  }, [filters, syncUrl])

  return { filters, setFilters, update, reset, results, facets, fitActive: fit.size > 0 }
}

export type CatalogState<T extends CatalogProduct> = ReturnType<typeof useCatalogFilters<T>>
