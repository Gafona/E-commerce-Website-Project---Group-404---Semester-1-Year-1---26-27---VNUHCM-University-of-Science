"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellOff, Check, CheckCheck, ChevronRight, Loader2, LogIn, SlidersHorizontal, Trash2, X } from "lucide-react"
import type { NotificationFeed, NotificationFilter, NotificationPrefs, NotificationView } from "@/lib/notification-view"
import {
  clearReadNotificationsAction,
  deleteNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationsSeenAction,
  updateNotificationPrefsAction,
} from "../notification-actions"
import { useShop } from "../components/ShopProvider"
import { liveFeed } from "@/lib/live-feed"
import { connectCommunityMember } from "../cong-dong/social-actions"
import { CATEGORY_LABEL, NotificationIcon, relativeTime } from "../components/notification-ui"

const FILTERS: { key: NotificationFilter; vi: string; en: string }[] = [
  { key: "all", vi: "Tất cả", en: "All" },
  { key: "unread", vi: "Chưa đọc", en: "Unread" },
  { key: "shop", vi: "Cửa hàng", en: "Shops" },
  { key: "order", vi: "Đơn hàng", en: "Orders" },
  { key: "community", vi: "Cộng đồng", en: "Community" },
  { key: "event", vi: "Sự kiện", en: "Events" },
  { key: "account", vi: "Tài khoản", en: "Account" },
]

const PREFS: { key: keyof NotificationPrefs; vi: [string, string]; en: [string, string] }[] = [
  { key: "following", vi: ["Shop & người tôi theo dõi", "Sản phẩm, bài viết và sự kiện mới."], en: ["Shops & people I follow", "New products, posts and events."] },
  { key: "community", vi: ["Tương tác cộng đồng", "Bình luận, trả lời, lượt theo dõi, lời mời kết bạn."], en: ["Community activity", "Comments, replies, followers, friend requests."] },
  { key: "orders", vi: ["Đơn hàng", "Xác nhận, giao hàng, hủy và thanh toán."], en: ["Orders", "Confirmation, shipping, cancellation, payment."] },
  { key: "promotions", vi: ["Sự kiện & khuyến mãi BOAI", "Chiến dịch giảm giá toàn trang."], en: ["BOAI events & deals", "Site-wide sale campaigns."] },
]

function dayGroup(iso: string, lang: "vi" | "en") {
  const date = new Date(iso)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (date.getTime() >= start) return lang === "vi" ? "Hôm nay" : "Today"
  if (date.getTime() >= start - 86_400_000) return lang === "vi" ? "Hôm qua" : "Yesterday"
  if (date.getTime() >= start - 6 * 86_400_000) return lang === "vi" ? "Tuần này" : "This week"
  return lang === "vi" ? "Trước đó" : "Earlier"
}

export function NotificationCenter() {
  const { tr, lang, notify } = useShop()
  const router = useRouter()
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [feed, setFeed] = useState<NotificationFeed | null>(null)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pending, start] = useTransition()

  const load = useCallback(async (nextFilter: NotificationFilter) => {
    setFeed(null)
    setPage(1)
    const next = await liveFeed<NotificationFeed>("notifications", { filter: nextFilter }).catch(() => null)
    setFeed(next ?? { signedIn: false, items: [], unread: 0, hasMore: false, prefs: null })
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  // Visiting the center clears the badge for shared announcements.
  useEffect(() => {
    markNotificationsSeenAction().catch(() => undefined)
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    const next = await liveFeed<NotificationFeed>("notifications", { filter, page: page + 1 }).catch(() => null)
    setLoadingMore(false)
    if (!next) return
    setPage(page + 1)
    setFeed((current) => (current ? { ...current, hasMore: next.hasMore, items: [...current.items, ...next.items] } : next))
  }

  const patchItem = (id: string, change: Partial<NotificationView> | null) =>
    setFeed((current) =>
      current
        ? {
            ...current,
            items: change ? current.items.map((item) => (item.id === id ? { ...item, ...change } : item)) : current.items.filter((item) => item.id !== id),
          }
        : current,
    )

  const openItem = (item: NotificationView) => {
    if (item.unread && !item.broadcast) {
      patchItem(item.id, { unread: false })
      setFeed((current) => (current ? { ...current, unread: Math.max(0, current.unread - 1) } : current))
      markNotificationReadAction(item.id).catch(() => undefined)
    }
    if (!item.href) return
    if (item.href.startsWith("http")) window.open(item.href, "_blank", "noopener,noreferrer")
    else router.push(item.href)
  }

  const remove = (item: NotificationView) =>
    start(async () => {
      const res = await deleteNotificationAction(item.id).catch(() => null)
      if (res?.ok) patchItem(item.id, null)
      else notify(res?.error ?? tr("Không thể xóa thông báo.", "Could not delete notification."))
    })

  const markAll = () =>
    start(async () => {
      const res = await markAllNotificationsReadAction().catch(() => null)
      if (!res?.ok) return notify(res?.error ?? tr("Không thể cập nhật.", "Could not update."))
      setFeed((current) => (current ? { ...current, unread: 0, items: current.items.map((item) => ({ ...item, unread: false })) } : current))
      if (filter === "unread") load("unread")
    })

  const clearRead = () =>
    start(async () => {
      if (!window.confirm(tr("Xóa tất cả thông báo đã đọc?", "Delete all read notifications?"))) return
      const res = await clearReadNotificationsAction().catch(() => null)
      if (res?.ok) load(filter)
      else notify(res?.error ?? tr("Không thể xóa.", "Could not delete."))
    })

  const togglePref = (key: keyof NotificationPrefs) => {
    if (!feed?.prefs) return
    const prefs = { ...feed.prefs, [key]: !feed.prefs[key] }
    setFeed({ ...feed, prefs })
    updateNotificationPrefsAction({ [key]: prefs[key] })
      .then((res) => {
        if (!res.ok) throw new Error(res.error)
        notify(tr("Đã lưu tùy chọn thông báo", "Notification preferences saved"))
      })
      .catch(() => {
        setFeed((current) => (current?.prefs ? { ...current, prefs: { ...current.prefs, [key]: !prefs[key] } } : current))
        notify(tr("Không thể lưu tùy chọn.", "Could not save preferences."))
      })
  }

  const groups: { label: string; items: NotificationView[] }[] = []
  for (const item of feed?.items ?? []) {
    const label = dayGroup(item.at, lang)
    const group = groups.at(-1)
    if (group?.label === label) group.items.push(item)
    else groups.push({ label, items: [item] })
  }

  return (
    <div className="page-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-14">
      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-extrabold tracking-[0.16em] text-[var(--muted)] uppercase">{tr("Trung tâm", "Center")}</p>
            <h1 className="m-0 mt-1 font-[family-name:var(--display)] text-[clamp(44px,6vw,72px)] leading-[0.9] font-black uppercase">{tr("Thông báo", "Notifications")}</h1>
            {feed?.signedIn && (
              <p className="m-0 mt-3 text-[14px] text-[var(--muted)]">
                {feed.unread ? tr(`Bạn có ${feed.unread} thông báo chưa đọc.`, `You have ${feed.unread} unread notifications.`) : tr("Bạn đã xem hết thông báo.", "You're all caught up.")}
              </p>
            )}
          </div>
          {feed?.signedIn && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={markAll} disabled={pending || !feed.unread} className="inline-flex min-h-11 items-center gap-2 bg-[#071a33] px-4 text-[12px] font-extrabold tracking-wide text-white uppercase transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
                <CheckCheck size={16} /> {tr("Đánh dấu đã đọc", "Mark all read")}
              </button>
              <button type="button" onClick={clearRead} disabled={pending} className="inline-flex min-h-11 items-center gap-2 border border-[var(--line)] bg-[var(--white)] px-4 text-[12px] font-extrabold tracking-wide uppercase transition hover:border-[#071a33] disabled:opacity-40">
                <Trash2 size={15} /> {tr("Xóa đã đọc", "Clear read")}
              </button>
            </div>
          )}
        </div>

        <div className="-mx-1 mt-7 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={tr("Lọc thông báo", "Filter notifications")}>
          {FILTERS.filter((f) => feed?.signedIn || ["all", "event"].includes(f.key)).map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-10 shrink-0 border px-4 text-[12px] font-bold transition ${filter === f.key ? "border-[#071a33] bg-[#071a33] text-white" : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#071a33]"}`}
            >
              {tr(f.vi, f.en)}
              {f.key === "unread" && feed?.unread ? <span className="ml-1.5 bg-[#f04438] px-1.5 py-px text-[10px] text-white">{feed.unread}</span> : null}
            </button>
          ))}
        </div>

        <div className="mt-5 border border-[var(--line)] bg-[var(--white)]">
          {!feed ? (
            <div className="grid place-items-center py-20 text-[var(--muted)]">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : groups.length ? (
            groups.map((group) => (
              <div key={group.label}>
                <h2 className="m-0 border-b border-[var(--line)] bg-[var(--paper)] px-5 py-2 text-[11px] font-extrabold tracking-[0.14em] text-[var(--muted)] uppercase">{group.label}</h2>
                <ul className="m-0 list-none p-0">
                  {group.items.map((item) => (
                    <li key={item.id} className={`group relative flex items-start gap-4 border-b border-[var(--line)] px-5 py-4 transition last:border-b-0 hover:bg-[var(--soft-blue)] ${item.unread ? "bg-[var(--soft-blue)]" : ""}`}>
                      {item.unread && <i className="absolute top-0 bottom-0 left-0 w-[3px] bg-[#1677ff]" aria-hidden />}
                      <NotificationIcon item={item} size="lg" />
                      <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => openItem(item)} className="block w-full text-left">
                        <span className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                          <b className="font-extrabold tracking-wide uppercase">{tr(...CATEGORY_LABEL[item.category])}</b>
                          <span aria-hidden>·</span>
                          <time dateTime={item.at}>{relativeTime(item.at, lang)}</time>
                          {item.unread && <span className="bg-[#1677ff] px-1.5 py-px text-[10px] font-bold text-white">{tr("Mới", "New")}</span>}
                        </span>
                        <b className={`mt-1 block text-[15px] leading-[1.35] ${item.unread ? "font-extrabold" : "font-semibold"}`}>{item.title}</b>
                        {item.message && <span className="mt-1 block text-[13px] leading-[1.55] whitespace-pre-line text-[var(--muted)]">{item.message}</span>}
                        {item.href && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#0b5ed7]">
                            {tr("Xem chi tiết", "View details")} <ChevronRight size={14} />
                          </span>
                        )}
                      </button>
                      {item.kind === "follow-request" && (
                        <FollowRequestActions
                          item={item}
                          onDone={(message) => {
                            patchItem(item.id, { kind: "follow-request-done", message, unread: false })
                            if (item.unread) {
                              setFeed((current) => (current ? { ...current, unread: Math.max(0, current.unread - 1) } : current))
                              markNotificationReadAction(item.id).catch(() => undefined)
                            }
                          }}
                        />
                      )}
                      </div>
                      {!item.broadcast && (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          disabled={pending}
                          className="grid size-9 shrink-0 place-items-center text-[var(--muted)] opacity-100 transition hover:bg-[#fdecec] hover:text-[#a42626] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={tr("Xóa thông báo", "Delete notification")}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="grid justify-items-center gap-3 px-8 py-20 text-center">
              <span className="grid size-14 place-items-center bg-[var(--soft-blue)] text-[#0b5ed7]">
                <BellOff size={24} />
              </span>
              <b className="text-[16px]">{filter === "unread" ? tr("Không còn thông báo chưa đọc", "No unread notifications") : tr("Chưa có thông báo nào", "No notifications yet")}</b>
              <p className="m-0 max-w-[380px] text-[13px] leading-6 text-[var(--muted)]">
                {tr("Theo dõi shop và thành viên trong Cộng đồng để nhận sản phẩm, bài viết và sự kiện mới của họ.", "Follow shops and members in the Community to get their new products, posts and events.")}
              </p>
              <Link href="/cong-dong" className="mt-1 inline-flex min-h-11 items-center gap-2 bg-[#1677ff] px-5 text-[12px] font-extrabold tracking-wide text-white uppercase transition hover:bg-[#0b5ed7]">
                {tr("Khám phá cộng đồng", "Explore community")} <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </div>
        {feed?.hasMore && (
          <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--line)] bg-[var(--white)] text-[12px] font-extrabold tracking-wide uppercase transition hover:border-[#071a33] disabled:opacity-60">
            {loadingMore && <Loader2 size={15} className="animate-spin" />} {tr("Xem thêm", "Load more")}
          </button>
        )}
      </section>

      <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        {feed && !feed.signedIn ? (
          <div className="bg-[#071a33] p-6 text-white">
            <LogIn size={22} className="text-[#69b6ff]" />
            <h2 className="m-0 mt-4 font-[family-name:var(--display)] text-[30px] leading-none font-black uppercase">{tr("Không bỏ lỡ điều gì", "Never miss a thing")}</h2>
            <p className="m-0 mt-3 text-[13px] leading-6 text-white/75">
              {tr("Đăng nhập để nhận cập nhật đơn hàng, sản phẩm mới từ shop bạn theo dõi và phản hồi trong cộng đồng.", "Sign in to get order updates, new products from shops you follow and community replies.")}
            </p>
            <Link href="/dang-nhap" className="mt-5 inline-flex min-h-11 items-center gap-2 bg-[#1677ff] px-5 text-[12px] font-extrabold tracking-wide uppercase transition hover:bg-[#0b5ed7]">
              {tr("Đăng nhập", "Sign in")} <ChevronRight size={15} />
            </Link>
          </div>
        ) : feed?.prefs ? (
          <div className="border border-[var(--line)] bg-[var(--white)]">
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-5 py-4">
              <SlidersHorizontal size={16} />
              <h2 className="m-0 text-[13px] font-extrabold tracking-wide uppercase">{tr("Nhận thông báo về", "Notify me about")}</h2>
            </div>
            <ul className="m-0 list-none p-0">
              {PREFS.map(({ key, vi, en }) => {
                const on = feed.prefs![key]
                const [label, hint] = lang === "vi" ? vi : en
                return (
                  <li key={key} className="border-b border-[var(--line)] last:border-b-0">
                    <label className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4">
                      <span>
                        <b className="block text-[13px]">{label}</b>
                        <small className="mt-0.5 block text-[12px] leading-5 text-[var(--muted)]">{hint}</small>
                      </span>
                      <input type="checkbox" role="switch" checked={on} onChange={() => togglePref(key)} className="peer sr-only" />
                      <span aria-hidden className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#1677ff] ${on ? "bg-[#1677ff]" : "bg-[#c9d2de]"}`}>
                        <i className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
            <p className="m-0 border-t border-[var(--line)] bg-[var(--paper)] px-5 py-3 text-[11px] leading-5 text-[var(--muted)]">
              {tr("Thông báo về tài khoản và cửa hàng (khóa, kháng cáo, duyệt) luôn được gửi.", "Account and shop notices (suspensions, appeals, approvals) are always sent.")}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

/** Approve/decline a private-profile follow request without leaving the list. */
function FollowRequestActions({ item, onDone }: { item: NotificationView; onDone: (message: string) => void }) {
  const { tr } = useShop()
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  const profileId = item.href?.match(/^\/nguoi-dung\/([\w-]{1,100})/)?.[1]
  if (!profileId) return null
  const respond = (accept: boolean) =>
    start(async () => {
      setError("")
      const res = await connectCommunityMember(profileId, accept ? "accept-follow" : "decline-follow").catch(() => null)
      if (!res?.ok) {
        setError(res?.error ?? tr("Không thể cập nhật. Thử lại nhé.", "Couldn't update. Please retry."))
        return
      }
      onDone(
        accept
          ? tr("Đã chấp nhận. Họ giờ có thể xem bài viết và story của bạn.", "Accepted. They can now see your posts and stories.")
          : tr("Đã từ chối yêu cầu theo dõi.", "Follow request declined."),
      )
    })
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(true)}
        className="inline-flex min-h-9 items-center gap-1.5 bg-[#1677ff] px-4 text-[12px] font-extrabold text-white transition hover:bg-[#0b5ed7] disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tr("Chấp nhận", "Accept")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(false)}
        className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--line)] bg-[var(--white)] px-4 text-[12px] font-bold transition hover:border-[#071a33] disabled:opacity-50"
      >
        <X size={14} /> {tr("Từ chối", "Decline")}
      </button>
      {error && <span role="alert" className="text-[12px] text-red-600">{error}</span>}
    </div>
  )
}
