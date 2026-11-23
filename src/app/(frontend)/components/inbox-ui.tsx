"use client"

import Image from "next/image"
import { Shirt, Store, UsersRound } from "lucide-react"
import type { InboxItem } from "../inbox-actions"
import type { Tr } from "@/lib/i18n"

export type InboxFilter = "all" | "shop" | "buying" | "selling" | "friends" | "custom"

export const filterInbox = (items: InboxItem[], filter: InboxFilter) =>
  items.filter((item) =>
    filter === "all"
      ? true
      : filter === "shop"
        ? item.kind === "shop"
        : filter === "buying"
          ? item.role === "buyer"
          : filter === "selling"
            ? item.role === "seller"
            : filter === "friends"
              ? item.kind === "friend"
              : !!item.custom,
  )

export function inboxFilters(tr: Tr, isSeller: boolean, compact = false): { key: InboxFilter; label: string }[] {
  return [
    { key: "all", label: tr("Tất cả", "All") },
    ...(isSeller && compact
      ? [
          { key: "buying" as const, label: tr("Tôi mua hàng", "My purchases") },
          { key: "selling" as const, label: tr("Khách của shop", "Shop customers") },
        ]
      : [{ key: "shop" as const, label: tr("Shop", "Shops") }]),
    { key: "friends", label: tr("Bạn bè", "Friends") },
    { key: "custom", label: tr("Custom áo", "Custom kits") },
  ]
}

export function inboxWhen(iso: string, lang: string) {
  const date = new Date(iso)
  const today = new Date().toDateString() === date.toDateString()
  return date.toLocaleString(lang === "en" ? "en-GB" : "vi-VN", today ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit" })
}

/** Small label explaining what kind of conversation a row is. */
export function inboxRoleLabel(item: InboxItem, tr: Tr) {
  if (item.kind === "friend") return tr("Bạn bè", "Friend")
  if (item.custom) return tr(`Custom áo #${item.custom.code}`, `Custom kit #${item.custom.code}`)
  return item.role === "seller" ? tr("Khách hỏi shop bạn", "Your customer") : tr("Shop", "Shop")
}

export function InboxAvatar({ item, size = 40 }: { item: InboxItem; size?: number }) {
  const image = item.avatarUrl ?? item.product?.image ?? null
  const Icon = item.kind === "friend" ? UsersRound : item.custom ? Shirt : Store
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden font-[family-name:var(--display)] text-base font-extrabold text-white ${
        item.kind === "friend" ? "rounded-full bg-[#1677ff]" : "bg-[var(--lime-dark)]"
      }`}
      style={{ width: size, height: size }}
    >
      {image ? (
        <Image src={image} alt={item.title} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        item.title.slice(0, 1).toUpperCase() || <Icon size={size / 2.4} />
      )}
    </span>
  )
}

export function InboxRow({
  item,
  active,
  lang,
  tr,
  onOpen,
  dense = false,
}: {
  item: InboxItem
  active?: boolean
  lang: string
  tr: Tr
  onOpen: () => void
  dense?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-start gap-3 border-b border-[var(--line)] px-4 ${dense ? "py-3" : "py-3.5"} text-left transition hover:bg-[var(--soft-blue)] ${
        active ? "bg-[var(--soft-blue)]" : item.unread ? "bg-[var(--soft-blue)]/50" : ""
      }`}
    >
      <InboxAvatar item={item} size={dense ? 40 : 44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <b className="truncate text-[13px]">{item.title}</b>
          <small className="shrink-0 text-[10px] text-[var(--muted)]">{inboxWhen(item.lastMessageAt, lang)}</small>
        </span>
        <small className="block truncate text-[10px] font-semibold text-[var(--lime-dark)]">
          {inboxRoleLabel(item, tr)}
          {item.product && !item.custom ? ` · ${item.product.name}` : ""}
        </small>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={`line-clamp-1 flex-1 text-xs ${item.unread ? "font-bold text-[var(--ink)]" : "text-[var(--muted)]"}`}>
            {item.lastFromMe ? `${tr("Bạn", "You")}: ` : ""}
            {item.lastMessage || tr("Bắt đầu trò chuyện", "Start the conversation")}
          </span>
          {item.unread > 0 && (
            <b className="grid min-w-5 place-items-center rounded-full bg-[var(--sale)] px-1.5 text-[10px] text-white">{item.unread > 99 ? "99+" : item.unread}</b>
          )}
        </span>
      </span>
    </button>
  )
}
