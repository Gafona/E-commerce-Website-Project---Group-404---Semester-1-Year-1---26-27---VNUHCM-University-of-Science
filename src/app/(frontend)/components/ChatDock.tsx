"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft, Bell, BellOff, Inbox, Loader2, LogIn, MessageCircle, Minus, Store, X } from "lucide-react"
import { ACCOUNT_STATE_EVENT } from "@/lib/browser-state"
import { liveFeed } from "@/lib/live-feed"
import { loadShopThreadAction, openShopChatAction, type ChatProductView, type ChatThreadView, type OpenShopChatResult } from "../shop-chat-actions"
import { setChatAlertsAction, type InboxItem, type InboxSummary } from "../inbox-actions"
import { ShopAvatar } from "./ShopAvatar"
import { ShopChatThread } from "./ShopChatThread"
import { FriendChatThread } from "./FriendChatThread"
import { InboxRow, filterInbox, inboxFilters, type InboxFilter } from "./inbox-ui"
import { useShop } from "./ShopProvider"

export type PageShop = {
  shopId: string
  shopName: string
  avatarUrl: string | null
  product: ChatProductView | null
}

type Signed = Extract<InboxSummary, { signedIn: true }>

export type InboxApi = {
  /** null until the first poll answers. */
  signedIn: boolean | null
  userId: string | null
  isSeller: boolean
  items: InboxItem[]
  /** Conversations with unread messages (all kinds). */
  unreadConversations: number
  /** Unread bell notifications, from the same poll. */
  notifications: number
  /** Chat pop-ups and browser alerts; unread counts stay either way. */
  alerts: boolean
  setAlerts: (on: boolean) => void
  refresh: () => Promise<void>
  /** Optimistically clear a conversation's unread count everywhere. */
  markRead: (key: string) => void
  /** Conversation open in a page (e.g. /tin-nhan); no pop-up is shown for it. */
  setActive: (key: string | null) => void
  /** Reflect a message just sent from any view. */
  noteSent: (key: string, text: string, at: string) => void
  /** Open a conversation in the floating dock. */
  openConversation: (key: string) => void
  /** Registers the shop a product/shop page offers chat for; returns the cleanup. */
  registerShop: (shop: PageShop) => () => void
  openShop: () => void
}

const InboxContext = createContext<InboxApi | null>(null)

export function useInbox() {
  const value = useContext(InboxContext)
  if (!value) throw new Error("useInbox must be used inside ChatDockProvider")
  return value
}
/** Kept for existing callers (product/shop pages). */
export const useChatDock = useInbox

type View = { kind: "list" } | { kind: "thread"; key: string } | { kind: "shop" }

// One adaptive poll for chat, unread counts and the bell badge.
const ACTIVE_POLL_MS = 8_000
const IDLE_POLL_MS = 30_000
const AWAY_POLL_MS = 60_000
const IDLE_AFTER_MS = 2 * 60_000
const AWAY_AFTER_MS = 5 * 60_000
const NOTIFIED_KEY = "boai-chat-notified"
// Floating chat bubble: draggable, snaps to the nearest side, remembers its spot.
const BUBBLE_KEY = "boai-chat-bubble"
const BUBBLE = 60
const EDGE = 16
const TOP_SAFE = 84
/** Routes that are themselves the inbox: no floating bubble there. */
const INBOX_ROUTES = ["/tin-nhan", "/kenh-ban-hang/tin-nhan"]
type BubblePos = { side: "left" | "right"; y: number }
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

function readNotified(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(NOTIFIED_KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}

/** Site-wide inbox: shop chats, friend chats and custom-kit threads with one shared state. */
export function ChatDockProvider({ children }: { children: React.ReactNode }) {
  const { tr, lang } = useShop()
  const router = useRouter()
  const pathname = usePathname()
  const onInboxPage = INBOX_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  const [data, setData] = useState<Signed | null>(null)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [alertsOverride, setAlertsOverride] = useState<boolean | null>(null)
  const [pageShop, setPageShop] = useState<PageShop | null>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>({ kind: "list" })
  const [filter, setFilter] = useState<InboxFilter>("all")
  const [thread, setThread] = useState<ChatThreadView | null>(null)
  const [shopState, setShopState] = useState<OpenShopChatResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<InboxItem | null>(null)
  const [pageActive, setPageActive] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported")
  const [bubble, setBubble] = useState<BubblePos | null>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const lastActivity = useRef(Date.now())
  const hiddenSince = useRef<number | null>(null)

  const alerts = alertsOverride ?? data?.alerts ?? true
  const dockActive = open && view.kind === "thread" ? view.key : open && view.kind === "shop" && thread?.conversationId ? `shop:${thread.conversationId}` : null
  const activeKey = dockActive ?? pageActive

  useEffect(() => {
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    measure()
    let saved: BubblePos | null = null
    try {
      const raw = JSON.parse(localStorage.getItem(BUBBLE_KEY) ?? "null")
      if (raw && (raw.side === "left" || raw.side === "right") && typeof raw.y === "number") saved = raw
    } catch {}
    setBubble(saved ?? { side: "right", y: window.innerHeight - BUBBLE - 24 })
    setPermission("Notification" in window ? Notification.permission : "unsupported")
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const live = useRef({ activeKey, alerts, onInboxPage })
  live.current = { activeKey, alerts, onInboxPage }
  const openConversationRef = useRef<(key: string) => void>(() => {})

  const refresh = useCallback(async () => {
    let result: InboxSummary
    try {
      result = await liveFeed<InboxSummary>("inbox")
    } catch {
      return
    }
    if (!result.ok) return
    if (!result.signedIn) {
      setData(null)
      setSignedIn(false)
      return
    }
    setSignedIn(true)
    const { activeKey: shown, alerts: alertsOn } = live.current
    // The conversation on screen is being read; never count or alert it.
    const items = result.items.map((item) => (item.key === shown ? { ...item, unread: 0 } : item))
    const notified = readNotified()
    const fresh = items.filter((item) => item.unread > 0 && !item.lastFromMe && notified[item.key] !== item.lastMessageAt)
    if (fresh.length) {
      for (const item of fresh) notified[item.key] = item.lastMessageAt
      try {
        sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified))
      } catch {
        // Storage can be unavailable; alerts may then repeat after reload.
      }
      const newest = fresh[0]
      if (alertsOn) {
        setToast(newest)
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          const note = new Notification(
            newest.kind === "friend"
              ? tr(`${newest.title} nhắn cho bạn`, `${newest.title} messaged you`)
              : newest.role === "seller"
                ? tr(`${newest.title} nhắn cho shop của bạn`, `${newest.title} messaged your shop`)
                : tr(`${newest.title} đã trả lời bạn`, `${newest.title} replied to you`),
            { body: newest.lastMessage, tag: `boai-chat-${newest.key}` },
          )
          note.onclick = () => {
            window.focus()
            openConversationRef.current(newest.key)
            note.close()
          }
        }
      }
    }
    setData({ ...result, items })
  }, [tr])

  // Single adaptive loop: fast while the visitor is active, slower when idle or away.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const delay = () => {
      const now = Date.now()
      if (document.visibilityState === "hidden") return now - (hiddenSince.current ?? now) > AWAY_AFTER_MS ? AWAY_POLL_MS : IDLE_POLL_MS
      return now - lastActivity.current > IDLE_AFTER_MS ? IDLE_POLL_MS : ACTIVE_POLL_MS
    }
    const tick = async () => {
      await refresh()
      if (cancelled) return
      timer = setTimeout(tick, delay())
    }
    void tick()
    const touch = () => {
      const wasIdle = Date.now() - lastActivity.current > IDLE_AFTER_MS
      lastActivity.current = Date.now()
      if (wasIdle) {
        clearTimeout(timer)
        void tick()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenSince.current = Date.now()
        return
      }
      hiddenSince.current = null
      lastActivity.current = Date.now()
      clearTimeout(timer)
      void tick()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pointerdown", touch, { passive: true })
    window.addEventListener("keydown", touch)
    window.addEventListener(ACCOUNT_STATE_EVENT, refresh)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pointerdown", touch)
      window.removeEventListener("keydown", touch)
      window.removeEventListener(ACCOUNT_STATE_EVENT, refresh)
    }
  }, [refresh])

  // Sign-in and sign-out navigate, so recheck the session on route changes.
  const firstPath = useRef(true)
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    void refresh()
  }, [pathname, refresh])

  // The inbox page shows conversations itself.
  useEffect(() => {
    if (onInboxPage) setOpen(false)
    if (!onInboxPage) setPageActive(null)
  }, [onInboxPage])

  const items = useMemo(() => data?.items ?? [], [data])
  const unread = items.filter((item) => item.unread > 0).length
  const isOwner = Boolean(data && pageShop && data.userId === pageShop.shopId)
  const chatShop = pageShop && !isOwner ? pageShop : null

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "")
    document.title = unread > 0 ? `(${unread}) ${base}` : base
  }, [unread, pathname])

  useEffect(() => {
    if (!toast || open) return
    const timer = setTimeout(() => setToast(null), 10_000)
    return () => clearTimeout(timer)
  }, [toast, open])

  useEffect(() => {
    if (!open) return
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", esc)
    return () => document.removeEventListener("keydown", esc)
  }, [open])

  const markRead = useCallback(
    (key: string) => {
      const item = data?.items.find((entry) => entry.key === key)
      if (!item?.unread) return
      setData((current) => current && { ...current, items: current.items.map((entry) => (entry.key === key ? { ...entry, unread: 0 } : entry)) })
      // The seller sidebar badge is server-rendered.
      if (item.role === "seller" && pathname.startsWith("/kenh-ban-hang")) router.refresh()
    },
    [data, pathname, router],
  )

  const noteSent = useCallback(
    (key: string, text: string, at: string) => {
      const known = data?.items.some((item) => item.key === key)
      if (!known) {
        void refresh()
        return
      }
      setData(
        (current) =>
          current && {
            ...current,
            items: current.items
              .map((item) => (item.key === key ? { ...item, unread: 0, lastMessage: text, lastMessageAt: at, lastFromMe: true } : item))
              .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
          },
      )
    },
    [data, refresh],
  )

  const openConversation = useCallback(
    async (key: string) => {
      setToast(null)
      if (live.current.onInboxPage) {
        router.push(`${pathname}?hoi-thoai=${encodeURIComponent(key)}`)
        return
      }
      setOpen(true)
      setView({ kind: "thread", key })
      setThread(null)
      setError("")
      if (key.startsWith("friend:")) {
        markRead(key)
        return
      }
      setLoading(true)
      try {
        const result = await loadShopThreadAction(key.slice(5))
        if (!result.ok) setError(result.error)
        else {
          setThread(result.thread)
          markRead(key)
        }
      } catch {
        setError(tr("Không thể tải tin nhắn.", "Could not load messages."))
      } finally {
        setLoading(false)
      }
    },
    [markRead, pathname, router, tr],
  )
  openConversationRef.current = (key) => void openConversation(key)

  const openShopView = useCallback(async () => {
    if (!pageShop) {
      setOpen(true)
      setView({ kind: "list" })
      return
    }
    setOpen(true)
    setToast(null)
    setView({ kind: "shop" })
    setThread(null)
    setShopState(null)
    setError("")
    setLoading(true)
    try {
      const result = await openShopChatAction({ shopId: pageShop.shopId })
      setShopState(result)
      if (result.ok && result.viewer === "buyer") {
        setThread(result.thread)
        if (result.thread.conversationId) markRead(`shop:${result.thread.conversationId}`)
      }
    } catch {
      setShopState({ ok: false, error: tr("Không thể mở khung chat.", "Could not open the chat.") })
    } finally {
      setLoading(false)
    }
  }, [markRead, pageShop, tr])

  const onShopThread = useCallback(
    (next: ChatThreadView) => {
      setThread(next)
      const last = next.messages.at(-1)
      if (!last || !next.conversationId) return
      if (last.mine) noteSent(`shop:${next.conversationId}`, last.body, last.createdAt)
      else markRead(`shop:${next.conversationId}`)
    },
    [markRead, noteSent],
  )

  const setAlerts = useCallback(
    (on: boolean) => {
      setAlertsOverride(on)
      if (on && "Notification" in window && Notification.permission === "default")
        void Notification.requestPermission().then(setPermission)
      void setChatAlertsAction(on).catch(() => setAlertsOverride(!on))
    },
    [],
  )

  // Stable API so page registrations don't re-run on every poll.
  const openShopRef = useRef(openShopView)
  openShopRef.current = openShopView
  const registerShop = useCallback((shop: PageShop) => {
    setPageShop(shop)
    return () => setPageShop((current) => (current === shop ? null : current))
  }, [])
  const openShop = useCallback(() => void openShopRef.current(), [])

  const api = useMemo<InboxApi>(
    () => ({
      signedIn,
      userId: data?.userId ?? null,
      isSeller: !!data?.isSeller,
      items,
      unreadConversations: unread,
      notifications: data?.notifications ?? 0,
      alerts,
      setAlerts,
      refresh,
      markRead,
      setActive: setPageActive,
      noteSent,
      openConversation: (key) => void openConversation(key),
      registerShop,
      openShop,
    }),
    [alerts, data, items, markRead, noteSent, openConversation, openShop, refresh, registerShop, setAlerts, signedIn, unread],
  )

  const visible = !onInboxPage && (Boolean(data) || Boolean(pageShop))
  const side = bubble?.side ?? "right"
  const bubblePoint = dragPoint ?? {
    x: side === "left" ? EDGE : viewport.w - BUBBLE - EDGE,
    y: clamp(bubble?.y ?? 0, TOP_SAFE, viewport.h - BUBBLE - EDGE),
  }
  const toastStyle: React.CSSProperties = onInboxPage
    ? { right: EDGE, bottom: EDGE }
    : {
        [side]: EDGE,
        ...(bubblePoint.y + BUBBLE / 2 > viewport.h / 2 ? { bottom: viewport.h - bubblePoint.y + 12 } : { top: bubblePoint.y + BUBBLE + 12 }),
      }
  const onBubbleDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const { x, y } = bubblePoint
    drag.current = { sx: event.clientX, sy: event.clientY, ox: x, oy: y, x, y, moved: false }
  }
  const onBubbleMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current) return
    const dx = event.clientX - current.sx
    const dy = event.clientY - current.sy
    if (!current.moved && Math.hypot(dx, dy) < 6) return
    current.moved = true
    current.x = clamp(current.ox + dx, EDGE, viewport.w - BUBBLE - EDGE)
    current.y = clamp(current.oy + dy, EDGE, viewport.h - BUBBLE - EDGE)
    setDragPoint({ x: current.x, y: current.y })
  }
  const onBubbleUp = () => {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    suppressClick.current = true
    const next: BubblePos = { side: current.x + BUBBLE / 2 < viewport.w / 2 ? "left" : "right", y: current.y }
    setBubble(next)
    setDragPoint(null)
    try {
      localStorage.setItem(BUBBLE_KEY, JSON.stringify(next))
    } catch {}
  }
  const onBubbleCancel = () => {
    drag.current = null
    setDragPoint(null)
  }
  const shown = filterInbox(items, filter)
  const activeItem = view.kind === "thread" ? items.find((item) => item.key === view.key) : null
  const threadProduct = thread && chatShop && thread.role === "buyer" && thread.shopId === chatShop.shopId ? chatShop.product : null

  const title =
    view.kind === "thread"
      ? (thread?.title ?? activeItem?.title ?? "")
      : view.kind === "shop"
        ? (pageShop?.shopName ?? "")
        : tr("Tin nhắn", "Messages")
  const subtitle =
    view.kind === "thread"
      ? activeItem?.kind === "friend"
        ? tr("Bạn bè trong cộng đồng BOAI", "BOAI community friend")
        : thread?.role === "seller" || activeItem?.role === "seller"
          ? tr("Khách hàng của shop bạn", "Customer of your shop")
          : tr("Người bán trên BOAI", "BOAI seller")
      : view.kind === "shop"
        ? tr("Người bán trên BOAI · trả lời trong khung chat", "BOAI seller · replies here")
        : unread > 0
          ? tr(`${unread} cuộc trò chuyện chưa đọc`, `${unread} unread conversations`)
          : tr("Đã đọc hết", "All caught up")

  const toastLabel = (item: InboxItem) =>
    item.kind === "friend"
      ? tr("Tin nhắn từ bạn bè", "Message from a friend")
      : item.custom
        ? tr("Trao đổi custom áo", "Custom kit message")
        : item.role === "seller"
          ? tr("Khách nhắn cho shop", "New customer message")
          : tr("Shop đã trả lời", "Shop replied")

  return (
    <InboxContext.Provider value={api}>
      {children}
      {toast && !open && (onInboxPage || bubble) && toast.key !== activeKey && (
        <div
          role="status"
          style={toastStyle}
          className="fixed z-[90] w-[min(calc(100vw-2rem),330px)] animate-[announcement-in_.4s_cubic-bezier(.16,1,.3,1)] border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] shadow-[0_18px_50px_rgba(7,26,51,.28)]"
        >
          <button type="button" onClick={() => void openConversation(toast.key)} className="flex w-full items-start gap-3 p-3 pr-9 text-left">
            <span className="grid size-9 shrink-0 place-items-center bg-[var(--lime-dark)] text-white">
              <MessageCircle size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <small className="block text-[10px] font-black tracking-[.12em] text-[var(--lime-dark)] uppercase">{toastLabel(toast)}</small>
              <b className="block truncate text-[13px]">{toast.title}</b>
              <span className="line-clamp-2 text-xs leading-5 text-[var(--muted)]">{toast.lastMessage}</span>
              <span className="mt-1 block text-[11px] font-bold text-[var(--lime-dark)]">{tr("Trả lời ngay", "Reply now")}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="absolute top-2 right-2 p-1 text-[var(--muted)] hover:text-[var(--ink)]"
            aria-label={tr("Ẩn thông báo", "Dismiss")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {visible && (
        <>
          {open ? (
            <section
              role="dialog"
              aria-label={title}
              className={`fixed inset-x-0 bottom-0 z-[90] flex h-[min(80dvh,620px)] flex-col overflow-hidden border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] shadow-[0_24px_70px_rgba(7,26,51,.35)] sm:inset-x-auto sm:bottom-6 sm:w-[390px] ${side === "left" ? "sm:left-6" : "sm:right-6"}`}
            >
              <header className="flex items-center gap-2 bg-[#071a33] px-3 py-3 text-white">
                {view.kind !== "list" && data ? (
                  <button
                    type="button"
                    onClick={() => {
                      setView({ kind: "list" })
                      setThread(null)
                    }}
                    className="p-1.5 text-white/70 hover:text-white"
                    aria-label={tr("Quay lại danh sách", "Back to list")}
                  >
                    <ArrowLeft size={18} />
                  </button>
                ) : null}
                {view.kind === "shop" && pageShop ? (
                  <ShopAvatar name={pageShop.shopName} url={pageShop.avatarUrl} size={34} className="ring-2 ring-white/20" />
                ) : view.kind === "list" ? (
                  <span className="grid size-9 place-items-center bg-white/10">
                    <MessageCircle size={18} className="text-[#7fb2ff]" />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{title}</b>
                  <small className="block truncate text-[10px] text-white/65">{subtitle}</small>
                </div>
                {data && view.kind === "list" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAlerts(!alerts)}
                      className="p-1.5 text-white/70 hover:text-white"
                      aria-pressed={alerts}
                      title={alerts ? tr("Tắt thông báo tin nhắn", "Turn message alerts off") : tr("Bật thông báo tin nhắn", "Turn message alerts on")}
                      aria-label={alerts ? tr("Tắt thông báo tin nhắn", "Turn message alerts off") : tr("Bật thông báo tin nhắn", "Turn message alerts on")}
                    >
                      {alerts ? <Bell size={17} /> : <BellOff size={17} />}
                    </button>
                    <Link href="/tin-nhan" onClick={() => setOpen(false)} className="p-1.5 text-white/70 hover:text-white" title={tr("Mở hộp thư", "Open inbox")} aria-label={tr("Mở hộp thư", "Open inbox")}>
                      <Inbox size={17} />
                    </Link>
                  </>
                )}
                {view.kind === "shop" && pageShop && (
                  <Link href={`/cua-hang/${pageShop.shopId}`} className="p-1.5 text-white/70 hover:text-white" title={tr("Xem trang shop", "Visit shop")}>
                    <Store size={17} />
                  </Link>
                )}
                <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-white/70 hover:text-white" aria-label={tr("Thu nhỏ khung chat", "Minimise chat")}>
                  <Minus size={18} />
                </button>
              </header>

              {view.kind === "list" && data && alerts && permission === "default" && (
                <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--soft-blue)] px-4 py-2.5">
                  <Bell size={16} className="shrink-0 text-[var(--lime-dark)]" />
                  <p className="m-0 flex-1 text-[11px] leading-4 text-[var(--ink)]">
                    {tr("Nhận thông báo cả khi bạn đang ở tab khác.", "Get alerts even when you're in another tab.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void Notification.requestPermission().then(setPermission)}
                    className="shrink-0 text-[11px] font-bold text-[var(--lime-dark)] hover:underline"
                  >
                    {tr("Cho phép", "Allow")}
                  </button>
                </div>
              )}

              {view.kind === "list" ? (
                <>
                  {chatShop && (
                    <button
                      type="button"
                      onClick={() => void openShopView()}
                      className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-left transition hover:bg-[var(--soft-blue)]"
                    >
                      <ShopAvatar name={chatShop.shopName} url={chatShop.avatarUrl} size={38} />
                      <span className="min-w-0 flex-1">
                        <small className="block text-[10px] font-black tracking-[.12em] text-[var(--lime-dark)] uppercase">{tr("Shop bạn đang xem", "Shop you're viewing")}</small>
                        <b className="block truncate text-[13px]">{chatShop.shopName}</b>
                      </span>
                      <span className="boai-button primary shrink-0 px-3 py-1.5 text-xs">{tr("Chat ngay", "Chat now")}</span>
                    </button>
                  )}
                  {data && (
                    <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--line)] px-4 py-2">
                      {inboxFilters(tr, data.isSeller, true).map(({ key, label }) => {
                        const count = filterInbox(items, key).filter((item) => item.unread > 0).length
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            aria-pressed={filter === key}
                            className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold transition ${
                              filter === key ? "bg-[#071a33] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
                            }`}
                          >
                            {label}
                            {count > 0 && <span className="rounded-full bg-[var(--sale)] px-1.5 text-[9px] text-white">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {!data ? (
                    <div className="grid flex-1 place-items-center text-[var(--muted)]">
                      <Loader2 size={22} className="animate-spin" />
                    </div>
                  ) : shown.length === 0 ? (
                    <div className="grid flex-1 content-center justify-items-center gap-2 p-8 text-center">
                      <MessageCircle size={26} className="text-[var(--muted)]" />
                      <b className="text-sm">{tr("Chưa có tin nhắn", "No messages yet")}</b>
                      <p className="m-0 max-w-64 text-xs leading-5 text-[var(--muted)]">
                        {filter === "friends"
                          ? tr("Nhắn tin với thành viên từ trang cộng đồng hoặc hộp thư.", "Message members from the community or your inbox.")
                          : filter === "custom"
                            ? tr("Trao đổi về yêu cầu may áo custom sẽ hiện ở đây.", "Custom kit conversations appear here.")
                            : filter === "selling"
                              ? tr("Khi khách hỏi về sản phẩm, tin nhắn sẽ hiện ở đây.", "Customer questions about your products appear here.")
                              : tr("Bấm “Chat với shop” trên trang sản phẩm để bắt đầu.", "Tap “Chat with shop” on a product page to start.")}
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {shown.map((item) => (
                        <InboxRow key={item.key} item={item} lang={lang} tr={tr} dense onOpen={() => void openConversation(item.key)} />
                      ))}
                    </div>
                  )}
                </>
              ) : loading ? (
                <div className="grid flex-1 place-items-center text-[var(--muted)]">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : view.kind === "thread" ? (
                error ? (
                  <p className="m-0 p-6 text-sm text-[var(--sale)]">{error}</p>
                ) : view.key.startsWith("friend:") ? (
                  <FriendChatThread
                    conversationId={view.key.slice(7)}
                    version={activeItem?.lastMessageAt}
                    profileId={activeItem?.profileId}
                    onRead={() => markRead(view.key)}
                    onSent={(text, at) => noteSent(view.key, text, at)}
                    className="min-h-0 flex-1 bg-[var(--paper)]"
                  />
                ) : thread ? (
                  <ShopChatThread thread={thread} product={threadProduct} version={activeItem?.lastMessageAt} onThread={onShopThread} className="min-h-0 flex-1 bg-[var(--paper)]" />
                ) : null
              ) : !shopState ? null : !shopState.ok ? (
                <div className="grid flex-1 place-items-center gap-3 p-6 text-center">
                  <p className="m-0 text-sm text-[var(--sale)]">{shopState.error}</p>
                  <button type="button" className="boai-button" onClick={() => void openShopView()}>
                    {tr("Thử lại", "Retry")}
                  </button>
                </div>
              ) : shopState.viewer === "guest" ? (
                <div className="grid flex-1 content-center justify-items-center gap-3 p-8 text-center">
                  <span className="grid size-14 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">
                    <MessageCircle size={26} />
                  </span>
                  <b className="text-base">{tr("Đăng nhập để chat với shop", "Sign in to chat with the shop")}</b>
                  <p className="m-0 max-w-64 text-xs leading-5 text-[var(--muted)]">
                    {tr("Tin nhắn được lưu vào tài khoản và bạn sẽ nhận thông báo khi shop trả lời.", "Messages are saved to your account and you'll be notified when the shop replies.")}
                  </p>
                  <Link className="boai-button primary" href="/dang-nhap">
                    <LogIn size={15} /> {tr("Đăng nhập", "Sign in")}
                  </Link>
                </div>
              ) : shopState.viewer === "owner" ? (
                <div className="grid flex-1 content-center justify-items-center gap-3 p-8 text-center">
                  <b className="text-base">{tr("Đây là shop của bạn", "This is your shop")}</b>
                  <p className="m-0 max-w-64 text-xs leading-5 text-[var(--muted)]">
                    {tr("Tin nhắn khách gửi cho shop nằm trong danh sách tin nhắn.", "Customer messages to your shop are in your message list.")}
                  </p>
                  <button
                    type="button"
                    className="boai-button primary"
                    onClick={() => {
                      setFilter("selling")
                      setView({ kind: "list" })
                    }}
                  >
                    {tr("Xem tin nhắn của khách", "View customer messages")}
                  </button>
                </div>
              ) : thread ? (
                <ShopChatThread
                  thread={thread}
                  product={threadProduct}
                  version={thread.conversationId ? items.find((item) => item.key === `shop:${thread.conversationId}`)?.lastMessageAt : undefined}
                  onThread={onShopThread}
                  className="min-h-0 flex-1 bg-[var(--paper)]"
                />
              ) : null}
            </section>
          ) : bubble ? (
            <button
              type="button"
              onPointerDown={onBubbleDown}
              onPointerMove={onBubbleMove}
              onPointerUp={onBubbleUp}
              onPointerCancel={onBubbleCancel}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false
                  return
                }
                setToast(null)
                if (chatShop && unread === 0) void openShopView()
                else {
                  setOpen(true)
                  setView({ kind: "list" })
                }
              }}
              style={{ transform: `translate3d(${bubblePoint.x}px, ${bubblePoint.y}px, 0)` }}
              className={`fixed top-0 left-0 z-[90] grid size-[60px] cursor-grab touch-none place-items-center rounded-full bg-[#071a33] text-white shadow-[0_12px_32px_rgba(7,26,51,.38)] ring-4 ring-white/70 select-none animate-pop-in ${
                dragPoint
                  ? "scale-110 cursor-grabbing shadow-[0_22px_48px_rgba(7,26,51,.45)] transition-[scale,box-shadow]"
                  : "transition-[transform,scale,box-shadow] duration-500 [transition-timing-function:var(--motion-ease-emphasis)] hover:shadow-[0_16px_40px_rgba(7,26,51,.45)]"
              }`}
              title={tr("Tin nhắn · kéo để di chuyển", "Messages · drag to move")}
              aria-label={
                unread > 0
                  ? tr(`Tin nhắn, ${unread} chưa đọc`, `Messages, ${unread} unread`)
                  : chatShop
                    ? tr(`Chat với ${chatShop.shopName}`, `Chat with ${chatShop.shopName}`)
                    : tr("Tin nhắn", "Messages")
              }
            >
              {chatShop && unread === 0 ? (
                <>
                  <ShopAvatar name={chatShop.shopName} url={chatShop.avatarUrl} size={48} className="pointer-events-none rounded-full" />
                  <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full bg-[#38d27a] ring-2 ring-[#071a33]" />
                </>
              ) : (
                <MessageCircle size={26} className="pointer-events-none text-[#7fb2ff]" />
              )}
              {unread > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 size-[22px] rounded-full bg-[var(--sale)] opacity-60 motion-safe:animate-ping" />
                  <b className="absolute -top-1 -right-1 grid size-[22px] place-items-center rounded-full bg-[var(--sale)] text-[10px] text-white ring-2 ring-white">
                    {unread > 9 ? "9+" : unread}
                  </b>
                </>
              )}
            </button>
          ) : null}
        </>
      )}
    </InboxContext.Provider>
  )
}
