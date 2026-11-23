"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { LANG_COOKIE, makeTr, translate, type Lang, type TKey, type Tr } from "@/lib/i18n"
import { ACCOUNT_STATE_EVENT, claimBrowserData } from "@/lib/browser-state"
import { saveAccountStateAction, type loadAccountStateAction } from "../account-state-actions"
import { cartPricesAction } from "../product-list-actions"
import { STRINGING_FEE } from "@/lib/vouchers"

type AccountState = Awaited<ReturnType<typeof loadAccountStateAction>>

export type Theme = "light" | "dark"

export type CartLine = {
  key: string
  id: string
  slug: string
  name: string
  brand: string
  sport: string
  price: number
  image: string
  quantity: number
  color?: string
  size?: string
  stringing?: boolean
}

export type AddResult = {
  /** "merged" = the line was already in the cart; "full" = it is already at the 20-item cap. */
  status: "added" | "merged" | "full"
  quantity: number
}

export type CartLineInput = Omit<CartLine, "key" | "quantity"> & { quantity?: number }

/** Cart line identity: the same product, colour, size and stringing choice. */
export const cartLineKey = (line: Pick<CartLine, "id" | "color" | "size" | "stringing">) =>
  [line.id, line.color, line.size, line.stringing ? "s" : ""].join("|")

const MAX_LINE_QUANTITY = 20

type Shop = {
  ready: boolean
  cart: CartLine[]
  favorites: string[]
  compare: string[]
  count: number
  add: (line: CartLineInput, options?: { silent?: boolean }) => AddResult
  /** Current cart line for these options, if any (reads the latest state, not the last render). */
  findLine: (line: Pick<CartLine, "id" | "color" | "size" | "stringing">) => CartLine | undefined
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  /** Removes several lines at once (e.g. the ones just ordered). */
  removeMany: (keys: string[]) => void
  clear: () => void
  /** Lines ticked for checkout (new lines are ticked by default). */
  checkoutLines: CartLine[]
  isSelected: (key: string) => boolean
  setSelected: (key: string, selected: boolean) => void
  setAllSelected: (selected: boolean) => void
  toggleFavorite: (slug: string) => void
  toggleCompare: (slug: string) => void
  /** Put a product into compare slot 0 or 1 without moving the other slot. */
  setCompareSlot: (slot: number, slug: string) => void
  notify: (text: string) => void
  lang: Lang
  setLang: (lang: Lang) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  t: (key: TKey) => string
  tr: Tr
}

const ShopContext = createContext<Shop | null>(null)
const STORE_KEY = "boai-shop-v1"
const LANG_KEY = LANG_COOKIE
const THEME_KEY = "boai-theme"
const HISTORY_KEY = "boai-search-history"
/** Cart lines the shopper unticked; everything else goes to checkout. */
export const DESELECTED_KEY = "boai-cart-deselected"

/** What the server stores for this account; used to skip no-op saves. */
const stateKey = (cart: CartLine[], favorites: string[], compare: string[], theme: string, lang: string) =>
  JSON.stringify([cart.map((l) => [l.id, l.quantity, l.color ?? "", l.size ?? "", !!l.stringing]), favorites, compare, theme, lang])

const mergeCart = (...groups: CartLine[][]) => {
  const merged = new Map<string, CartLine>()
  for (const group of groups) for (const row of group) {
    if (!row?.key || !row.id) continue
    const current = merged.get(row.key)
    merged.set(row.key, current ? { ...current, ...row, quantity: Math.min(20, Math.max(current.quantity, row.quantity)) } : row)
  }
  return [...merged.values()].slice(0, 50)
}

export function ShopProvider({ children, initialLang = "vi" }: { children: React.ReactNode; initialLang?: Lang }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [cart, setCart] = useState<CartLine[]>([])
  const [deselected, setDeselected] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [compare, setCompare] = useState<string[]>([])
  const [toast, setToast] = useState("")
  const [lang, setLangState] = useState<Lang>(initialLang)
  const [theme, setThemeState] = useState<Theme>("light")
  const storageKey = useRef(STORE_KEY)
  const authenticated = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedKey = useRef("")
  // Latest cart, updated synchronously on every add so two quick clicks never read stale state.
  const cartRef = useRef<CartLine[]>([])
  cartRef.current = cart

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // null = the account could not be checked; the visitor is treated as a guest for now.
      const remote: AccountState | null = await fetch("/api/account-state", { cache: "no-store", credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
      if (cancelled) return
      // Data this browser kept for a different account is wiped before anything is merged.
      if (remote?.authenticated) claimBrowserData(remote.userId)
      let guest: { cart?: CartLine[]; favorites?: string[]; compare?: string[] } = {}
      try { guest = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") } catch {}
      let nextCart = guest.cart ?? []
      let nextFavorites = guest.favorites ?? []
      let nextCompare = guest.compare ?? []
      let nextTheme: Theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : localStorage.getItem(THEME_KEY) === "light" ? "light" : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      let nextLang: Lang = localStorage.getItem(LANG_KEY) === "en" ? "en" : localStorage.getItem(LANG_KEY) === "vi" ? "vi" : initialLang
      if (remote?.authenticated) {
        authenticated.current = true
        storageKey.current = `${STORE_KEY}:${remote.userId}`
        let scoped: typeof guest = {}
        try { scoped = JSON.parse(localStorage.getItem(storageKey.current) ?? "{}") } catch {}
        nextCart = mergeCart(remote.state.cart, scoped.cart ?? [], guest.cart ?? [])
        nextFavorites = [...new Set([...remote.state.favorites, ...(scoped.favorites ?? []), ...(guest.favorites ?? [])])].slice(0, 100)
        nextCompare = [...new Set([...remote.state.compare, ...(scoped.compare ?? []), ...(guest.compare ?? [])])].slice(-2)
        nextTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? remote.state.theme
        nextLang = (localStorage.getItem(LANG_KEY) as Lang | null) ?? remote.state.language
        savedKey.current = stateKey(remote.state.cart, remote.state.favorites, remote.state.compare, remote.state.theme, remote.state.language)
        const localHistory = (() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as string[] } catch { return [] } })()
        localStorage.setItem(HISTORY_KEY, JSON.stringify([...new Set([...localHistory, ...remote.state.searchHistory])].slice(0, 10)))
        localStorage.removeItem(STORE_KEY)
      }
      // Keep anything the visitor added while the saved cart was still loading.
      setCart((added) => mergeCart(nextCart, added))
      setFavorites((added) => [...new Set([...nextFavorites, ...added])].slice(0, 100))
      setCompare((added) => [...new Set([...nextCompare, ...added])].slice(-2))
      setThemeState(nextTheme); setLangState(nextLang)
      try {
        const saved = JSON.parse(localStorage.getItem(DESELECTED_KEY) ?? "[]")
        if (Array.isArray(saved)) setDeselected(saved.map(String).slice(0, 50))
      } catch {}
      // A language/theme saved on the account (another device) also becomes this browser's choice.
      if (remote?.authenticated) {
        document.cookie = `${THEME_KEY}=${nextTheme}; path=/; max-age=31536000; samesite=lax`
        if (nextLang !== initialLang) {
          document.cookie = `${LANG_KEY}=${nextLang}; path=/; max-age=31536000; samesite=lax`
          router.refresh()
        }
      }
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(storageKey.current, JSON.stringify({ cart, favorites, compare }))
    if (!authenticated.current) return
    // Loading the account must not immediately write the same state back.
    const key = stateKey(cart, favorites, compare, theme, lang)
    if (key === savedKey.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      let searchHistory: string[] = []
      try { searchHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") } catch {}
      savedKey.current = key
      // SportDNA results are stored separately (assessments/test runs); never resend stale legacy profiles.
      void saveAccountStateAction({ cart, favorites, compare, theme, language: lang, searchHistory })
    }, 650)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [ready, cart, favorites, compare, theme, lang])

  useEffect(() => {
    if (!ready || !authenticated.current) return
    const sync = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        let searchHistory: string[] = []
        try { searchHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") } catch {}
        void saveAccountStateAction({ cart, favorites, compare, theme, language: lang, searchHistory })
      }, 300)
    }
    window.addEventListener(ACCOUNT_STATE_EVENT, sync)
    return () => window.removeEventListener(ACCOUNT_STATE_EVENT, sync)
  }, [cart, compare, favorites, lang, ready, theme])

  // Cart lines keep the price from when they were added; refresh them from the
  // server so the cart, checkout and the order show the product page's price.
  const cartIds = [...new Set(cart.map((line) => line.id))].sort().join(",")
  useEffect(() => {
    if (!ready || !cartIds) return
    let cancelled = false
    cartPricesAction(cartIds.split(","))
      .then((prices) => {
        if (cancelled) return
        setCart((current) => {
          let changed = false
          const next = current.map((line) => {
            const base = prices[line.id]
            if (typeof base !== "number") return line
            const price = base + (line.stringing && line.sport === "badminton" ? STRINGING_FEE : 0)
            if (price === line.price) return line
            changed = true
            return { ...line, price }
          })
          if (!changed) return current
          cartRef.current = next
          return next
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [ready, cartIds])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // Keep the untick list in step with the cart and remembered across reloads.
  useEffect(() => {
    if (!ready) return
    const keys = new Set(cart.map((line) => line.key))
    const kept = deselected.filter((key) => keys.has(key))
    if (kept.length !== deselected.length) {
      setDeselected(kept)
      return
    }
    try {
      localStorage.setItem(DESELECTED_KEY, JSON.stringify(kept))
    } catch {}
  }, [ready, cart, deselected])

  useEffect(() => {
    if (!ready) return
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [ready, theme])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(LANG_KEY, next)
    document.cookie = `${LANG_KEY}=${next}; path=/; max-age=31536000; samesite=lax`
    // Server-rendered pages read the cookie, so re-render them in the new language.
    router.refresh()
  }, [router])

  const notify = useCallback((text: string) => {
    setToast(text)
    // A newer toast restarts the timer instead of being cut short by the previous one.
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(""), 2600)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    localStorage.setItem(THEME_KEY, next)
    // Server-rendered pages read this cookie so a reload paints the chosen theme immediately.
    document.cookie = `${THEME_KEY}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
  }, [])

  const tr = useMemo(() => makeTr(lang), [lang])

  const value = useMemo<Shop>(() => ({
    ready,
    cart,
    favorites,
    compare,
    count: cart.reduce((s, l) => s + l.quantity, 0),
    add: (line, options) => {
      const key = cartLineKey(line)
      const current = cartRef.current
      const found = current.find((l) => l.key === key)
      const want = Math.max(1, Math.floor(line.quantity ?? 1))
      let result: AddResult
      let next: CartLine[]
      if (found && found.quantity >= MAX_LINE_QUANTITY) {
        result = { status: "full", quantity: found.quantity }
        next = current
      } else if (found) {
        const quantity = Math.min(MAX_LINE_QUANTITY, found.quantity + want)
        result = { status: "merged", quantity }
        next = current.map((l) => (l.key === key ? { ...l, quantity } : l))
      } else {
        const quantity = Math.min(MAX_LINE_QUANTITY, want)
        result = { status: "added", quantity }
        next = [...current, { ...line, key, quantity }]
      }
      cartRef.current = next
      if (next !== current) setCart(next)
      if (!options?.silent)
        notify(
          result.status === "added"
            ? tr(`Đã thêm ${line.name} vào giỏ`, `Added ${line.name} to cart`)
            : result.status === "merged"
              ? tr(`${line.name} đã có trong giỏ, số lượng: ${result.quantity}`, `${line.name} is already in your cart, quantity: ${result.quantity}`)
              : tr(`${line.name} đã đạt tối đa ${MAX_LINE_QUANTITY} sản phẩm trong giỏ`, `${line.name} is already at the ${MAX_LINE_QUANTITY}-item limit`),
        )
      return result
    },
    findLine: (line) => cartRef.current.find((l) => l.key === cartLineKey(line)),
    setQuantity: (key, quantity) =>
      setCart((cur) => (cartRef.current = cur.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(MAX_LINE_QUANTITY, quantity)) } : l)))),
    remove: (key) => setCart((cur) => (cartRef.current = cur.filter((l) => l.key !== key))),
    removeMany: (keys) => {
      const drop = new Set(keys)
      setCart((cur) => (cartRef.current = cur.filter((l) => !drop.has(l.key))))
    },
    checkoutLines: cart.filter((line) => !deselected.includes(line.key)),
    isSelected: (key) => !deselected.includes(key),
    setSelected: (key, selected) =>
      setDeselected((cur) => (selected ? cur.filter((k) => k !== key) : cur.includes(key) ? cur : [...cur, key])),
    setAllSelected: (selected) => setDeselected(selected ? [] : cartRef.current.map((line) => line.key)),
    clear: () => {
      cartRef.current = []
      setCart([])
    },
    toggleFavorite: (slug) => {
      notify(favorites.includes(slug) ? tr("Đã bỏ khỏi yêu thích", "Removed from wishlist") : tr("Đã thêm vào yêu thích", "Added to wishlist"))
      setFavorites((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]))
    },
    setCompareSlot: (slot, slug) => {
      setCompare((cur) => {
        const next = cur.filter((s) => s !== slug)
        if (slot < next.length) next[slot] = slug
        else next.push(slug)
        return next.slice(0, 2)
      })
    },
    toggleCompare: (slug) => {
      if (!compare.includes(slug)) notify(compare.length >= 2 ? tr("Đã thay sản phẩm so sánh cũ nhất", "Replaced the oldest compared product") : tr("Đã thêm vào so sánh", "Added to compare"))
      setCompare((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug].slice(-2)))
    },
    notify,
    lang,
    setLang,
    theme,
    setTheme,
    t: (key) => translate(lang, key),
    tr,
  }), [ready, cart, deselected, favorites, compare, notify, lang, setLang, theme, setTheme, tr])

  return (
    <ShopContext.Provider value={value}>
      {children}
      {toast && <div className="toast" role="status" aria-live="polite"><Check size={17} /> {toast}</div>}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error("useShop must be used inside ShopProvider")
  return ctx
}
