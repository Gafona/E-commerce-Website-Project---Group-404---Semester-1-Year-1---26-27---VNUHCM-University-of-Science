"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Bell, BellOff, Loader2, MessageCircle, PenSquare, Search, X } from "lucide-react"
import { loadShopThreadAction, type ChatThreadView } from "../shop-chat-actions"
import { openCommunityConversation, searchCommunityContacts } from "../cong-dong/social-actions"
import { CommunityAvatar, communityName } from "../cong-dong/CommunityAvatar"
import { useInbox } from "./ChatDock"
import { FriendChatThread } from "./FriendChatThread"
import { ShopChatThread } from "./ShopChatThread"
import { InboxAvatar, InboxRow, filterInbox, inboxFilters, inboxRoleLabel, type InboxFilter } from "./inbox-ui"
import { useShop } from "./ShopProvider"

type Contact = Extract<Awaited<ReturnType<typeof searchCommunityContacts>>, { ok: true }>["contacts"][number]

const TAB_PARAM: Record<string, InboxFilter> = { shop: "shop", "ban-be": "friends", custom: "custom", "khach-cua-shop": "selling", "mua-hang": "buying" }
const PARAM_OF: Partial<Record<InboxFilter, string>> = { shop: "shop", friends: "ban-be", custom: "custom", selling: "khach-cua-shop", buying: "mua-hang" }

/**
 * The one inbox: shop chats (buying and selling), friend chats and custom-kit
 * threads. Reads the shared inbox state, so the floating bubble and this page
 * always agree on unread counts.
 */
export function UnifiedInbox({ defaultFilter = "all" }: { defaultFilter?: InboxFilter }) {
  const { tr, lang } = useShop()
  const inbox = useInbox()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [filter, setFilter] = useState<InboxFilter>(TAB_PARAM[params.get("tab") ?? ""] ?? defaultFilter)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [thread, setThread] = useState<ChatThreadView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [composing, setComposing] = useState(false)
  const [query, setQuery] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pending, start] = useTransition()
  const { setActive, markRead, noteSent, items } = inbox

  const select = useCallback(
    async (key: string) => {
      setActiveKey(key)
      setActive(key)
      setComposing(false)
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
    [markRead, setActive, tr],
  )

  // Deep links: ?hoi-thoai=<key> opens a thread, ?voi=<profile> starts or opens a friend chat.
  const linkKey = params.get("hoi-thoai")
  const withProfile = params.get("voi")
  useEffect(() => {
    if (linkKey && linkKey !== activeKey) void select(linkKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkKey])
  useEffect(() => {
    if (!withProfile) return
    let live = true
    void openCommunityConversation(withProfile).then(async (r) => {
      if (!live) return
      if (!r.ok) {
        setError(r.error)
        return
      }
      setFilter("friends")
      await inbox.refresh()
      if (live) void select(`friend:${r.id}`)
      router.replace(`${pathname}?tab=ban-be`, { scroll: false })
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withProfile])

  useEffect(() => () => setActive(null), [setActive])

  useEffect(() => {
    if (!composing) return
    let live = true
    const timer = setTimeout(async () => {
      const r = await searchCommunityContacts(query).catch(() => null)
      if (live && r?.ok) setContacts(r.contacts)
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [composing, query])

  const changeFilter = (next: InboxFilter) => {
    setFilter(next)
    const param = PARAM_OF[next]
    router.replace(param ? `${pathname}?tab=${param}` : pathname, { scroll: false })
  }

  const shown = filterInbox(items, filter)
  const active = items.find((item) => item.key === activeKey) ?? null
  const filters = useMemo(() => inboxFilters(tr, inbox.isSeller), [tr, inbox.isSeller])
  const shopSub = inbox.isSeller && (filter === "shop" || filter === "buying" || filter === "selling")

  const onShopThread = useCallback(
    (next: ChatThreadView) => {
      setThread(next)
      const last = next.messages.at(-1)
      if (!last || !next.conversationId) return
      const key = `shop:${next.conversationId}`
      if (last.mine) noteSent(key, last.body, last.createdAt)
      else markRead(key)
    },
    [markRead, noteSent],
  )

  if (inbox.signedIn === null)
    return (
      <div className="grid h-[min(76dvh,680px)] min-h-[460px] place-items-center border border-[var(--line)] bg-[var(--white)] text-[var(--muted)]">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="filter-chips scroll" role="tablist" aria-label={tr("Lọc hội thoại", "Filter conversations")}>
          {filters.map(({ key, label }) => {
            const count = filterInbox(items, key).filter((item) => item.unread > 0).length
            const selected = filter === key || (key === "shop" && (filter === "buying" || filter === "selling"))
            return (
              <button key={key} type="button" role="tab" aria-selected={selected} className={`filter-chip ${selected ? "active" : ""}`} onClick={() => changeFilter(key)}>
                {label}
                {count > 0 && <small className="!bg-[var(--sale)] !text-white">{count}</small>}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => inbox.setAlerts(!inbox.alerts)}
          aria-pressed={inbox.alerts}
          className="boai-button gap-2"
          title={tr("Thông báo nổi và thông báo trình duyệt khi có tin nhắn mới. Số tin chưa đọc vẫn luôn hiển thị.", "Pop-ups and browser alerts for new messages. Unread counts always stay visible.")}
        >
          {inbox.alerts ? <Bell size={15} /> : <BellOff size={15} />}
          {inbox.alerts ? tr("Thông báo tin nhắn: Bật", "Message alerts: On") : tr("Thông báo tin nhắn: Tắt", "Message alerts: Off")}
        </button>
      </div>
      {shopSub && (
        <div className="flex gap-1.5 text-[11px] font-bold">
          {(
            [
              ["shop", tr("Tất cả shop", "All shop chats")],
              ["buying", tr("Tôi mua hàng", "My purchases")],
              ["selling", tr("Khách của shop", "Shop customers")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => changeFilter(key)}
              className={`px-2.5 py-1 ${filter === key ? "bg-[#071a33] text-white" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="grid h-[min(76dvh,680px)] min-h-[460px] overflow-hidden border border-[var(--line)] bg-[var(--white)] md:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${activeKey || composing ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-[var(--line)]`}>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <div>
              <b className="text-sm">{tr("Hội thoại", "Conversations")}</b>
              <small className="block text-[10px] text-[var(--muted)]">
                {inbox.unreadConversations
                  ? tr(`${inbox.unreadConversations} cuộc trò chuyện chưa đọc`, `${inbox.unreadConversations} unread`)
                  : tr("Đã đọc hết", "All caught up")}
              </small>
            </div>
            <button
              type="button"
              onClick={() => {
                setComposing(true)
                setActiveKey(null)
                setActive(null)
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--lime-dark)]"
            >
              <PenSquare size={14} /> {tr("Nhắn bạn bè", "Message a friend")}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {shown.length === 0 ? (
              <div className="grid justify-items-center gap-2 p-8 text-center">
                <MessageCircle size={26} className="text-[var(--muted)]" />
                <b className="text-sm">{tr("Chưa có tin nhắn", "No messages yet")}</b>
                <p className="m-0 text-xs leading-5 text-[var(--muted)]">
                  {filter === "friends"
                    ? tr("Chọn “Nhắn bạn bè” để trò chuyện với một thành viên.", "Choose “Message a friend” to chat with a member.")
                    : filter === "custom"
                      ? tr("Gửi mẫu áo cho shop ở trang Custom áo, mọi trao đổi sẽ hiện ở đây.", "Send a design from the Custom kit page; conversations appear here.")
                      : tr("Bấm “Chat với shop” trên trang sản phẩm để bắt đầu.", "Tap “Chat with shop” on a product page to start.")}
                </p>
                {filter === "custom" ? (
                  <Link href="/custom-ao" className="boai-button mt-2">{tr("Thiết kế áo", "Design a kit")}</Link>
                ) : filter !== "friends" ? (
                  <Link href="/tim-kiem" className="boai-button mt-2">{tr("Xem sản phẩm", "Browse products")}</Link>
                ) : null}
              </div>
            ) : (
              shown.map((item) => <InboxRow key={item.key} item={item} active={item.key === activeKey} lang={lang} tr={tr} onOpen={() => void select(item.key)} />)
            )}
          </div>
        </aside>

        <section className={`${activeKey || composing ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
          {composing ? (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
                <button type="button" onClick={() => setComposing(false)} className="p-1 md:hidden" aria-label={tr("Quay lại", "Back")}>
                  <ArrowLeft size={18} />
                </button>
                <b className="flex-1 text-sm">{tr("Nhắn tin với thành viên", "Message a member")}</b>
                <button type="button" onClick={() => setComposing(false)} className="hidden p-1 md:block" aria-label={tr("Đóng", "Close")}>
                  <X size={16} />
                </button>
              </header>
              <div className="border-b border-[var(--line)] p-3">
                <label className="flex items-center gap-2 bg-[var(--paper)] px-3 py-2">
                  <Search size={15} className="text-[var(--muted)]" />
                  <input
                    autoFocus
                    maxLength={100}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={tr("Tìm tên, @id hoặc mã BOAI-…", "Search names, @ids or BOAI-… codes")}
                    aria-label={tr("Tìm thành viên", "Search members")}
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                  />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await openCommunityConversation(c.id)
                        if (!r.ok) {
                          setError(r.error)
                          return
                        }
                        setFilter("friends")
                        await inbox.refresh()
                        await select(`friend:${r.id}`)
                      })
                    }
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--paper)]"
                  >
                    <CommunityAvatar name={c.name} small shop={c.shop} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">{communityName(c.name)}</span>
                      <code className="mt-1 block text-[9px] break-all text-[var(--muted)]">{c.publicId}</code>
                    </span>
                  </button>
                ))}
                {!contacts.length && <p className="p-4 text-xs text-[var(--muted)]">{tr("Không tìm thấy thành viên.", "No members found.")}</p>}
                {error && <p className="px-4 text-xs text-[var(--sale)]">{error}</p>}
              </div>
            </>
          ) : !activeKey ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-[var(--muted)]">
              {tr("Chọn một cuộc trò chuyện để xem tin nhắn.", "Select a conversation to read messages.")}
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveKey(null)
                    setActive(null)
                  }}
                  className="p-1 md:hidden"
                  aria-label={tr("Quay lại", "Back")}
                >
                  <ArrowLeft size={18} />
                </button>
                {active && <InboxAvatar item={active} size={36} />}
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{thread?.title ?? active?.title}</b>
                  <small className="text-[10px] text-[var(--muted)]">{active ? inboxRoleLabel(active, tr) : ""}</small>
                </div>
                {active?.custom && (
                  <Link
                    href={active.role === "seller" ? "/kenh-ban-hang/custom-ao" : `/custom-ao?yeu-cau=${active.custom.id}`}
                    className="boai-button"
                  >
                    {tr("Xem yêu cầu", "View request")}
                  </Link>
                )}
                {thread?.role === "buyer" && !active?.custom && (
                  <Link href={`/cua-hang/${thread.shopId}`} className="boai-button">{tr("Xem shop", "Visit shop")}</Link>
                )}
              </header>
              {activeKey.startsWith("friend:") ? (
                <FriendChatThread
                  key={activeKey}
                  conversationId={activeKey.slice(7)}
                  version={active?.lastMessageAt}
                  profileId={active?.profileId}
                  onRead={() => markRead(activeKey)}
                  onSent={(text, at) => noteSent(activeKey, text, at)}
                  className="min-h-0 flex-1 bg-[var(--paper)]"
                />
              ) : loading ? (
                <div className="grid flex-1 place-items-center text-[var(--muted)]">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              ) : error ? (
                <p className="m-0 p-6 text-sm text-[var(--sale)]">{error}</p>
              ) : thread ? (
                <ShopChatThread
                  thread={thread}
                  version={active?.lastMessageAt}
                  onThread={onShopThread}
                  className="min-h-0 flex-1 bg-[var(--paper)]"
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
