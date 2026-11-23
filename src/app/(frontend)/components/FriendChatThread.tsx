"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { Loader2, LockKeyhole, Send } from "lucide-react"
import { loadCommunityMessages, sendCommunityMessage } from "../cong-dong/social-actions"
import { communityProfileHref } from "@/lib/community-identity"
import { useShop } from "./ShopProvider"

type Message = Extract<Awaited<ReturnType<typeof loadCommunityMessages>>, { ok: true }>["messages"][number]

const merge = (old: Message[], next: Message[]) =>
  [...new Map([...old, ...next].map((m) => [m.id, m])).values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )

/**
 * Private member-to-member chat inside the unified inbox. It refreshes when the
 * shared inbox poll reports a newer message (`version`), never on its own timer.
 */
export function FriendChatThread({
  conversationId,
  version,
  profileId,
  onRead,
  onSent,
  className = "",
}: {
  conversationId: string
  version?: string
  profileId?: string | null
  onRead?: () => void
  onSent?: (text: string, at: string) => void
  className?: string
}) {
  const { tr, lang } = useShop()
  const [messages, setMessages] = useState<Message[]>([])
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const end = useRef<HTMLDivElement>(null)
  const live = useRef(conversationId)
  live.current = conversationId

  const load = useCallback(
    async (nextPage = 1) => {
      const id = conversationId
      try {
        const r = await loadCommunityMessages(id, nextPage)
        if (live.current !== id) return
        if (!r.ok) {
          setError(r.error)
          return
        }
        setError("")
        setMessages((old) => merge(nextPage === 1 && old.length === 0 ? [] : old, r.messages))
        if (nextPage > 1) setPage(nextPage)
        setMore((old) => (nextPage > 1 ? r.hasNextPage : old || r.hasNextPage))
        if (nextPage === 1) onRead?.()
      } catch {
        if (live.current === id) setError(tr("Không thể tải tin nhắn. Hãy thử lại.", "Couldn't load messages. Please retry."))
      } finally {
        if (live.current === id) setLoading(false)
      }
    },
    [conversationId, onRead, tr],
  )

  useEffect(() => {
    setMessages([])
    setPage(1)
    setMore(false)
    setLoading(true)
    void load(1)
    // Only when switching conversations; newer messages arrive through `version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const seen = useRef(version)
  useEffect(() => {
    if (!version || version === seen.current) return
    seen.current = version
    void load(1)
  }, [version, load])

  const newest = messages.at(-1)?.id
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [newest])

  const send = () => {
    const draft = text.trim()
    if (!draft || pending) return
    setError("")
    start(async () => {
      const r = await sendCommunityMessage(conversationId, draft).catch(() => ({ ok: false as const, error: tr("Mất kết nối.", "Connection lost.") }))
      if (!r.ok) {
        setError(r.error)
        return
      }
      setText("")
      await load(1)
      onSent?.(draft, new Date().toISOString())
    })
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--white)] px-4 py-2 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <LockKeyhole size={11} /> {tr("Hội thoại riêng tư giữa hai thành viên", "Private conversation between two members")}
        </span>
        {profileId && (
          <Link href={communityProfileHref(profileId)} className="font-bold text-[var(--lime-dark)] hover:underline">
            {tr("Xem trang cá nhân", "View profile")}
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {more && (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => load(page + 1))}
            className="mx-auto block border border-[var(--line)] bg-[var(--white)] px-3 py-1.5 text-[11px] font-bold text-[var(--lime-dark)]"
          >
            {tr("Tin nhắn trước", "Older messages")}
          </button>
        )}
        {loading ? (
          <div className="grid place-items-center py-8 text-[var(--muted)]">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !messages.length && !error ? (
          <p className="m-0 py-8 text-center text-xs text-[var(--muted)]">{tr("Gửi lời chào để bắt đầu câu chuyện.", "Say hello to start the conversation.")}</p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.own ? "items-end" : "items-start"}`}>
            <p
              className={`m-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 break-words whitespace-pre-wrap ${
                m.own ? "rounded-br-sm bg-[#1677ff] text-white" : "rounded-bl-sm border border-[var(--line)] bg-[var(--white)] text-[var(--ink)]"
              }`}
            >
              {m.content}
            </p>
            <time dateTime={m.createdAt} className="text-[10px] text-[var(--muted)]">
              {time(m.createdAt)}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="border-t border-[var(--line)] bg-[var(--white)] p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        {error && <p className="m-0 mb-2 text-xs font-semibold text-[var(--sale)]">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send()
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={tr("Nhập tin nhắn…", "Type a message…")}
            aria-label={tr("Nội dung tin nhắn", "Message")}
            className="max-h-28 min-h-11 flex-1 resize-none border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[#1677ff]"
          />
          <button
            className="grid size-11 shrink-0 place-items-center bg-[#1677ff] text-white transition hover:brightness-110 disabled:opacity-50"
            disabled={pending || !text.trim()}
            aria-label={tr("Gửi", "Send")}
          >
            {pending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </form>
    </div>
  )
}
