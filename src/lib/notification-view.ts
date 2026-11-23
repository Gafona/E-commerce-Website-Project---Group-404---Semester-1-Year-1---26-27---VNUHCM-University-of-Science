export type NotificationCategory = "shop" | "community" | "order" | "event" | "account" | "system"

export type NotificationView = {
  id: string
  category: NotificationCategory
  kind: string
  title: string
  message: string | null
  href: string | null
  actorName: string | null
  imageUrl: string | null
  at: string
  unread: boolean
  /** Shared with every visitor/seller; cannot be deleted individually. */
  broadcast: boolean
}

export type NotificationPrefs = {
  following: boolean
  community: boolean
  orders: boolean
  /** Chat pop-ups and browser alerts; unread counts always stay. */
  messages: boolean
  promotions: boolean
}

export type NotificationFilter = "all" | "unread" | NotificationCategory

export type NotificationFeed = {
  signedIn: boolean
  items: NotificationView[]
  unread: number
  hasMore: boolean
  prefs: NotificationPrefs | null
}

export const DEFAULT_PREFS: NotificationPrefs = { following: true, community: true, orders: true, messages: true, promotions: true }
