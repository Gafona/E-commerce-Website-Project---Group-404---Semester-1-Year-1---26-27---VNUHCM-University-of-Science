"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { relationId } from "@/lib/shops"
import type { User } from "@/payload-types"
import { loadShopInboxAction, type ChatCustomView, type ChatProductView } from "./shop-chat-actions"
import { countUnreadNotificationsAction } from "./notification-actions"

/** One row of the unified inbox: a shop thread (buying or selling) or a friend chat. */
export type InboxItem = {
  key: string
  kind: "shop" | "friend"
  id: string
  role: "buyer" | "seller" | "friend"
  title: string
  avatarUrl: string | null
  lastMessage: string
  lastMessageAt: string
  lastFromMe: boolean
  unread: number
  product: ChatProductView | null
  custom: ChatCustomView | null
  /** Friend's public community profile (friend chats only). */
  profileId: string | null
}

export type InboxSummary =
  | { ok: true; signedIn: false }
  | {
      ok: true
      signedIn: true
      userId: string
      isSeller: boolean
      items: InboxItem[]
      /** Unread bell notifications, so the bell needs no timer of its own. */
      notifications: number
      /** Chat pop-ups and browser alerts on/off (unread counts always stay). */
      alerts: boolean
    }
  | { ok: false; error: string }

type AppUser = User & { collection: "users" }

const mediaUrl = (value: unknown) =>
  value && typeof value === "object" && "url" in value ? ((value as { url?: string | null }).url ?? null) : null

async function friendItems(user: AppUser): Promise<InboxItem[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "community-conversations",
    sort: "-lastMessageAt",
    limit: 60,
    depth: 0,
    overrideAccess: false,
    user,
  })
  if (!docs.length) return []
  const me = String(user.id)
  const others = docs.map((c) => (relationId(c.memberA) === me ? relationId(c.memberB) : relationId(c.memberA)))
  // Public profile of each partner (name + avatar).
  const profiles = await payload.find({
    collection: "community-profiles",
    where: { account: { in: [...new Set(others)] } },
    limit: others.length,
    depth: 1,
    overrideAccess: true,
    select: { account: true, name: true, avatar: true },
  })
  const byAccount = new Map(profiles.docs.map((p) => [relationId(p.account), p]))
  return docs.map((c, i) => {
    const iAmA = relationId(c.memberA) === me
    const profile = byAccount.get(others[i])
    return {
      key: `friend:${c.id}`,
      kind: "friend" as const,
      id: String(c.id),
      role: "friend" as const,
      title: profile?.name ?? (iAmA ? c.nameB : c.nameA),
      avatarUrl: mediaUrl(profile?.avatar),
      lastMessage: c.lastMessage ?? "",
      lastMessageAt: c.lastMessageAt ?? c.updatedAt,
      lastFromMe: !!c.lastSender && relationId(c.lastSender) === me,
      unread: Number((iAmA ? c.unreadA : c.unreadB) ?? 0),
      product: null,
      custom: null,
      profileId: profile ? String(profile.id) : null,
    }
  })
}

/**
 * Everything the chat bubble, the avatar menu, the bell badge and /tin-nhan
 * need, in one read. Polled by a single loop in the browser.
 */
export async function loadInboxAction(): Promise<InboxSummary> {
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user) return { ok: true, signedIn: false }
  const isSeller = user.sellerStatus === "approved"
  try {
    const [buying, selling, friends, notifications] = await Promise.all([
      loadShopInboxAction("buyer"),
      isSeller ? loadShopInboxAction("seller") : null,
      friendItems(user),
      countUnreadNotificationsAction(),
    ])
    const shop = (role: "buyer" | "seller", result: typeof buying | null): InboxItem[] =>
      result?.ok
        ? result.items.map((item) => ({
            key: `shop:${item.id}`,
            kind: "shop" as const,
            id: item.id,
            role,
            title: item.title,
            avatarUrl: item.avatarUrl,
            lastMessage: item.lastMessage,
            lastMessageAt: item.lastMessageAt,
            lastFromMe: item.lastFromMe,
            unread: item.unread,
            product: item.product,
            custom: item.custom,
            profileId: null,
          }))
        : []
    const items = [...shop("buyer", buying), ...shop("seller", selling), ...friends].sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt),
    )
    return {
      ok: true,
      signedIn: true,
      userId: String(user.id),
      isSeller,
      items,
      notifications,
      alerts: user.notificationPrefs?.messages !== false,
    }
  } catch (error) {
    console.error("loadInboxAction failed", error)
    return { ok: false, error: "Không thể tải tin nhắn." }
  }
}

/** Turns chat pop-ups and browser alerts on or off for this account. */
export async function setChatAlertsAction(on: boolean): Promise<{ ok: boolean }> {
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user || typeof on !== "boolean") return { ok: false }
  const payload = await getPayloadClient()
  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: false,
    user,
    depth: 0,
    data: { notificationPrefs: { ...(user.notificationPrefs ?? {}), messages: on } },
    context: { skipProfileSync: true },
  })
  return { ok: true }
}
