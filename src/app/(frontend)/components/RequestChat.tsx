"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useInbox } from "./ChatDock"
import { ShopChatThread } from "./ShopChatThread"
import { useShop } from "./ShopProvider"
import { openRequestChatAction, type ChatThreadView } from "../shop-chat-actions"

/**
 * Customer–shop thread opened from a custom-jersey request (either side). Messages are
 * tagged with the request and appear in /tin-nhan and the chat bubble too.
 */
export function RequestChat({ requestId, height = "h-[360px]" }: { requestId: string; height?: string }) {
  const { tr } = useShop()
  const inbox = useInbox()
  const [thread, setThread] = useState<ChatThreadView | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    let live = true
    openRequestChatAction(requestId)
      .then((r) => {
        if (!live) return
        if (r.ok) setThread(r.thread)
        else setError(r.error)
      })
      .catch(() => live && setError(tr("Không thể mở khung trao đổi.", "Couldn't open the conversation.")))
    return () => {
      live = false
    }
  }, [requestId, tr])
  const key = thread?.conversationId ? `shop:${thread.conversationId}` : null
  useEffect(() => {
    if (!key) return
    inbox.setActive(key)
    inbox.markRead(key)
    return () => inbox.setActive(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const onThread = useCallback(
    (next: ChatThreadView) => {
      setThread(next)
      const last = next.messages.at(-1)
      if (last?.mine && next.conversationId) inbox.noteSent(`shop:${next.conversationId}`, last.body, last.createdAt)
    },
    [inbox],
  )
  if (error) return <p className="m-0 p-4 text-xs text-[var(--sale)]">{error}</p>
  if (!thread)
    return (
      <div className="grid h-40 place-items-center text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    )
  return (
    <ShopChatThread
      thread={thread}
      customRequestId={requestId}
      version={key ? inbox.items.find((item) => item.key === key)?.lastMessageAt : undefined}
      onThread={onThread}
      className={`${height} bg-[var(--paper)]`}
    />
  )
}

