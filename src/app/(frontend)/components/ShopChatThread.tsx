"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { Loader2, Paperclip, Send, Shirt, X } from "lucide-react"
import {
  loadShopThreadAction,
  sendShopMessageAction,
  type ChatCustomView,
  type ChatProductView,
  type ChatThreadView,
} from "../shop-chat-actions"
import { useShop } from "./ShopProvider"

function CustomChip({ custom, tone, role }: { custom: ChatCustomView; tone: "mine" | "theirs"; role: "buyer" | "seller" }) {
  const { tr } = useShop()
  return (
    <Link
      href={role === "seller" ? "/kenh-ban-hang/custom-ao" : `/custom-ao?yeu-cau=${custom.id}`}
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-bold transition hover:opacity-90 ${
        tone === "mine" ? "border-white/30 bg-white/15 text-white" : "border-[var(--line)] bg-[var(--white)] text-[var(--lime-dark)]"
      }`}
    >
      <Shirt size={12} /> {tr(`Yêu cầu custom #${custom.code}`, `Custom request #${custom.code}`)}
    </Link>
  )
}

function ProductChip({
  product,
  tone,
}: {
  product: ChatProductView
  tone: "mine" | "theirs" | "draft"
}) {
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className={`flex items-center gap-2.5 border p-1.5 pr-3 text-left transition hover:opacity-90 ${
        tone === "mine"
          ? "border-white/30 bg-white/15 text-white"
          : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)]"
      }`}
    >
      <span className="relative block size-10 shrink-0 overflow-hidden bg-[var(--soft-blue)]">
        {product.image && (
          <Image src={product.image} alt={product.name} fill sizes="40px" className="object-cover" />
        )}
      </span>
      <span className="line-clamp-2 text-[11px] leading-4 font-semibold">{product.name}</span>
    </Link>
  )
}

/**
 * One buyer–shop conversation. Creates the conversation on the first message.
 * New messages arrive through the shared inbox poll (`version` changes), so the
 * thread never runs a timer of its own.
 */
export function ShopChatThread({
  thread: initial,
  product,
  customRequestId,
  version,
  onThread,
  className = "",
}: {
  thread: ChatThreadView
  /** Product the buyer is looking at; offered as an attachment. */
  product?: ChatProductView | null
  /** Custom-jersey request this thread is opened from; every message is tagged with it. */
  customRequestId?: string | null
  /** Latest message time reported by the inbox poll; a change reloads the thread. */
  version?: string
  onThread?: (thread: ChatThreadView) => void
  className?: string
}) {
  const { tr, lang } = useShop()
  const [thread, setThread] = useState(initial)
  const [text, setText] = useState("")
  const [attach, setAttach] = useState(Boolean(product) && initial.messages.length === 0)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const end = useRef<HTMLDivElement>(null)
  const idRef = useRef(initial.conversationId)

  useEffect(() => {
    setThread(initial)
    idRef.current = initial.conversationId
  }, [initial])

  const apply = useCallback(
    (next: ChatThreadView) => {
      idRef.current = next.conversationId
      setThread(next)
      onThread?.(next)
    },
    [onThread],
  )

  const seen = useRef(version)
  useEffect(() => {
    if (!version || version === seen.current) return
    seen.current = version
    const id = idRef.current
    if (!id) return
    // Already showing this message (e.g. our own send)?
    if (thread.messages.at(-1)?.createdAt === version) return
    void loadShopThreadAction(id)
      .then((result) => {
        if (result.ok && idRef.current === id) apply(result.thread)
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, apply])

  const newest = thread.messages.at(-1)?.id
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [newest])

  const send = (body: string) => {
    const message = body.trim()
    if (!message || pending) return
    setError("")
    start(async () => {
      const result = await sendShopMessageAction({
        body: message,
        conversationId: thread.conversationId,
        shopId: thread.shopId,
        productId: attach && product ? product.id : null,
        customRequestId: customRequestId ?? null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setText("")
      setAttach(false)
      apply(result.thread)
    })
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-GB" : "vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    })

  const suggestions =
    customRequestId
      ? thread.role === "buyer"
        ? [
            tr("Shop có thể giảm giá khi đặt số lượng lớn không?", "Can you discount a larger order?"),
            tr("Bao lâu thì may xong ạ?", "How long will production take?"),
            tr("Mình muốn sửa lại màu in.", "I'd like to change the print colour."),
          ]
        : [
            tr("Shop đã nhận mẫu, sẽ báo giá sớm.", "We received your design and will quote soon."),
            tr("Bạn xác nhận lại size từng áo giúp shop nhé.", "Please confirm the size of each shirt."),
          ]
      : thread.role === "buyer"
      ? [
          tr("Sản phẩm này còn hàng không shop?", "Is this item in stock?"),
          tr("Shop tư vấn size giúp mình nhé.", "Could you help me pick a size?"),
          tr("Bao lâu thì nhận được hàng ạ?", "How long does delivery take?"),
        ]
      : []

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {thread.messages.length === 0 && (
          <div className="grid place-items-center gap-3 py-6 text-center">
            <p className="m-0 max-w-64 text-xs leading-5 text-[var(--muted)]">
              {thread.role === "buyer"
                ? tr(
                    "Hỏi shop về tình trạng hàng, size, màu hoặc thời gian giao. Shop sẽ trả lời ngay trong khung chat này.",
                    "Ask about stock, sizes, colours or delivery. The shop replies right here.",
                  )
                : tr("Chưa có tin nhắn.", "No messages yet.")}
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={pending}
                    onClick={() => send(item)}
                    className="border border-[var(--line)] bg-[var(--white)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--lime-dark)] transition hover:border-[var(--lime)]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {thread.messages.map((message) => (
          <div key={message.id} className={`flex flex-col gap-1 ${message.mine ? "items-end" : "items-start"}`}>
            {message.product && (
              <div className="max-w-[85%]">
                <ProductChip product={message.product} tone={message.mine ? "mine" : "theirs"} />
              </div>
            )}
            {message.custom && <CustomChip custom={message.custom} tone={message.mine ? "mine" : "theirs"} role={thread.role} />}
            <p
              className={`m-0 max-w-[85%] px-3.5 py-2.5 text-[13px] leading-5 break-words whitespace-pre-wrap ${
                message.mine
                  ? "bg-[var(--lime)] text-white"
                  : "border border-[var(--line)] bg-[var(--soft-blue)] text-[var(--ink)]"
              }`}
            >
              {message.body}
            </p>
            <small className="text-[10px] text-[var(--muted)]">
              {message.mine
                ? tr("Bạn", "You")
                : message.role === "seller"
                  ? tr("Shop", "Shop")
                  : message.senderName}{" "}
              · {time(message.createdAt)}
            </small>
          </div>
        ))}
        <div ref={end} />
      </div>

      <form
        className="border-t border-[var(--line)] bg-[var(--white)] p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send(text)
        }}
      >
        {product && thread.role === "buyer" && (
          attach ? (
            <div className="mb-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <ProductChip product={product} tone="draft" />
              </div>
              <button
                type="button"
                onClick={() => setAttach(false)}
                className="p-1 text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label={tr("Bỏ đính kèm sản phẩm", "Remove product attachment")}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAttach(true)}
              className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--lime-dark)]"
            >
              <Paperclip size={13} /> {tr("Đính kèm sản phẩm đang xem", "Attach this product")}
            </button>
          )
        )}
        {error && <p className="m-0 mb-2 text-xs font-semibold text-[var(--sale)]">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send(text)
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={tr("Nhập tin nhắn…", "Type a message…")}
            aria-label={tr("Nội dung tin nhắn", "Message")}
            className="max-h-28 min-h-11 flex-1 resize-none border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--lime)]"
          />
          <button
            className="grid size-11 shrink-0 place-items-center bg-[var(--lime)] text-white transition hover:bg-[var(--lime-dark)] disabled:opacity-50"
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
