"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, BellOff, CheckCheck, ChevronRight, Loader2, LogIn, X } from "lucide-react"
import type { NotificationFeed, NotificationView } from "@/lib/notification-view"
import { liveFeed } from "@/lib/live-feed"
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationsSeenAction,
} from "../notification-actions"
import { useShop } from "./ShopProvider"
import { useInbox } from "./ChatDock"
import { NotificationIcon, relativeTime } from "./notification-ui"

const GUEST_SEEN_KEY = "boai-notifications-seen"

const guestSeen = () => {
  try {
    return localStorage.getItem(GUEST_SEEN_KEY) ?? ""
  } catch {
    return ""
  }
}

export function NotificationBell() {
  const { tr, lang, notify } = useShop()
  const router = useRouter()
  const pathname = usePathname()
  const [feed, setFeed] = useState<NotificationFeed | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"all" | "unread">("all")
  const [busy, setBusy] = useState(false)
  const [guestSince, setGuestSince] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const known = useRef<Set<string> | null>(null)

  const refresh = useCallback(async () => {
    const next = await liveFeed<NotificationFeed>("notifications", { filter: "all" }).catch(() => null)
    if (!next) return
    // Surface fresh personal notifications as a toast while browsing.
    if (known.current) {
      const fresh = next.items.find((item) => item.unread && !item.broadcast && !known.current!.has(item.id))
      if (fresh) notify(fresh.title)
    }
    known.current = new Set(next.items.map((item) => item.id))
    setFeed(next)
  }, [notify])

  // No timer of its own: the shared inbox poll reports the unread badge, and the
  // list reloads only when that count changes (or when the bell is opened).
  const { notifications: unreadFromPoll, signedIn: pollSignedIn } = useInbox()
  useEffect(() => {
    setGuestSince(guestSeen())
  }, [])
  useEffect(() => {
    if (pollSignedIn === null) return
    void refresh()
  }, [refresh, unreadFromPoll, pollSignedIn])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false)
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  const signedIn = Boolean(feed?.signedIn)
  const items = (feed?.items ?? []).map((item) =>
    signedIn ? item : { ...item, unread: !guestSince || item.at > guestSince },
  )
  const badge = signedIn ? feed?.unread ?? 0 : items.filter((item) => item.unread).length
  const visible = tab === "unread" ? items.filter((item) => item.unread) : items

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (!next) return
    void refresh()
    if (!signedIn) {
      const now = new Date().toISOString()
      try {
        localStorage.setItem(GUEST_SEEN_KEY, now)
      } catch {}
      return
    }
    const sharedUnread = items.filter((item) => item.broadcast && item.unread).length
    if (sharedUnread) {
      markNotificationsSeenAction().catch(() => undefined)
      setFeed((current) => (current ? { ...current, unread: Math.max(0, current.unread - sharedUnread) } : current))
    }
  }

  const openItem = (item: NotificationView) => {
    if (signedIn && item.unread && !item.broadcast) {
      setFeed((current) =>
        current
          ? {
              ...current,
              unread: Math.max(0, current.unread - 1),
              items: current.items.map((entry) => (entry.id === item.id ? { ...entry, unread: false } : entry)),
            }
          : current,
      )
      markNotificationReadAction(item.id).catch(() => undefined)
    }
    setOpen(false)
    if (item.href) {
      if (item.href.startsWith("http")) window.open(item.href, "_blank", "noopener,noreferrer")
      else router.push(item.href)
    }
  }

  const markAll = async () => {
    setBusy(true)
    const res = await markAllNotificationsReadAction().catch(() => null)
    setBusy(false)
    if (res?.ok) {
      setFeed((current) =>
        current ? { ...current, unread: 0, items: current.items.map((item) => ({ ...item, unread: false })) } : current,
      )
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-button relative"
        aria-label={badge ? tr(`Thông báo, ${badge} chưa đọc`, `Notifications, ${badge} unread`) : tr("Thông báo", "Notifications")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <Bell size={19} />
        {badge > 0 && (
          <b className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[var(--white)] bg-[#f04438] px-1 text-[9px] leading-none font-extrabold text-white">
            {badge > 99 ? "99+" : badge}
          </b>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={tr("Thông báo", "Notifications")}
          className="fixed top-[100px] right-3 left-3 z-[90] flex max-h-[min(640px,calc(100vh-96px))] flex-col border border-[var(--line)] bg-[var(--white)] text-[var(--ink)] shadow-[0_24px_64px_rgba(7,26,51,.2)] sm:absolute sm:top-[calc(100%+10px)] sm:right-0 sm:left-auto sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 pt-4 pb-3">
            <div>
              <h2 className="m-0 font-[family-name:var(--display)] text-[26px] leading-none font-black uppercase">{tr("Thông báo", "Notifications")}</h2>
              <p className="m-0 mt-1 text-[12px] text-[var(--muted)]">
                {badge ? tr(`${badge} thông báo chưa đọc`, `${badge} unread`) : tr("Bạn đã xem hết thông báo", "You're all caught up")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {signedIn && badge > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={busy}
                  className="inline-flex min-h-9 items-center gap-1.5 px-2.5 text-[12px] font-bold text-[#0b5ed7] transition hover:bg-[var(--soft-blue)] disabled:opacity-60"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={15} />}
                  {tr("Đọc hết", "Mark all read")}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label={tr("Đóng", "Close")} className="grid size-9 place-items-center text-[var(--muted)] transition hover:text-[var(--ink)]">
                <X size={18} />
              </button>
            </div>
          </div>

          {signedIn && (
            <div className="flex gap-1 border-b border-[var(--line)] px-4 py-2" role="tablist">
              {(["all", "unread"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`min-h-8 px-3 text-[12px] font-bold transition ${tab === key ? "bg-[#071a33] text-white" : "text-[var(--muted)] hover:bg-[var(--soft-blue)] hover:text-[var(--ink)]"}`}
                >
                  {key === "all" ? tr("Tất cả", "All") : tr("Chưa đọc", "Unread")}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!feed ? (
              <div className="grid place-items-center py-12 text-[var(--muted)]">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : visible.length ? (
              <ul className="m-0 list-none p-0">
                {visible.slice(0, 12).map((item) => (
                  <li key={item.id} className="border-b border-[var(--line)] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={`group relative flex w-full gap-3 px-5 py-3.5 text-left transition hover:bg-[var(--soft-blue)] ${item.unread ? "bg-[var(--soft-blue)]" : ""}`}
                    >
                      <NotificationIcon item={item} />
                      <span className="min-w-0 flex-1">
                        <b className={`block text-[13px] leading-[1.35] ${item.unread ? "font-extrabold" : "font-semibold"}`}>{item.title}</b>
                        {item.message && <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[1.45] text-[var(--muted)]">{item.message}</span>}
                        <small className={`mt-1 block text-[11px] ${item.unread ? "font-bold text-[#0b5ed7]" : "text-[var(--muted)]"}`}>{relativeTime(item.at, lang)}</small>
                      </span>
                      {item.unread && <i className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#1677ff]" aria-label={tr("Chưa đọc", "Unread")} />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid justify-items-center gap-2 px-8 py-12 text-center">
                <span className="grid size-12 place-items-center bg-[var(--soft-blue)] text-[#0b5ed7]">
                  <BellOff size={20} />
                </span>
                <b className="text-[14px]">{tab === "unread" ? tr("Không còn thông báo chưa đọc", "No unread notifications") : tr("Chưa có thông báo", "No notifications yet")}</b>
                <p className="m-0 text-[12px] leading-5 text-[var(--muted)]">
                  {tr("Đơn hàng, cửa hàng, cộng đồng và sự kiện mới sẽ xuất hiện tại đây.", "Orders, shops, community activity and new events will appear here.")}
                </p>
              </div>
            )}
          </div>

          {signedIn ? (
            <Link href="/thong-bao" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center gap-1 border-t border-[var(--line)] text-[12px] font-extrabold tracking-wide text-[var(--ink)] uppercase transition hover:bg-[var(--soft-blue)]">
              {tr("Xem tất cả thông báo", "See all notifications")} <ChevronRight size={15} />
            </Link>
          ) : (
            <Link href="/dang-nhap" onClick={() => setOpen(false)} className="flex items-center gap-3 border-t border-[var(--line)] bg-[#071a33] px-5 py-3.5 text-white transition hover:bg-black">
              <LogIn size={17} className="shrink-0" />
              <span className="text-[12px] leading-5">
                <b className="block">{tr("Đăng nhập để nhận thông báo riêng", "Sign in for personal alerts")}</b>
                <span className="opacity-75">{tr("Đơn hàng, shop bạn theo dõi và hoạt động cộng đồng.", "Orders, shops you follow and community activity.")}</span>
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
