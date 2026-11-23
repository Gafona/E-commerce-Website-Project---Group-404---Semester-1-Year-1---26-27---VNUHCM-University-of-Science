"use server"

import type { Where } from "payload"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getLiveAnnouncements } from "@/lib/announcements"
import {
  DEFAULT_PREFS,
  type NotificationFeed,
  type NotificationFilter,
  type NotificationPrefs,
  type NotificationView,
} from "@/lib/notification-view"
import type { Notification } from "@/payload-types"

const WINDOW_DAYS = 60
const PAGE_SIZE = 20
const FILTERS = new Set<NotificationFilter>(["all", "unread", "shop", "community", "order", "event", "account", "system"])
const cleanId = (value: unknown) => (typeof value === "string" && /^[\w-]{1,64}$/.test(value) ? value : null)
const since = () => new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

type SessionUser = NonNullable<Awaited<ReturnType<typeof appAuth.currentUser>>>

const prefsOf = (user: SessionUser | null): NotificationPrefs => ({
  ...DEFAULT_PREFS,
  ...Object.fromEntries(
    Object.entries(user?.notificationPrefs ?? {}).filter(([, value]) => typeof value === "boolean"),
  ),
})

/** Broadcasts count as unread only when newer than the last time the bell was opened. */
const broadcastThreshold = (user: SessionUser) => {
  const seen = user.notificationsSeenAt ? new Date(user.notificationsSeenAt).getTime() : 0
  const joined = new Date(user.createdAt).getTime()
  return new Date(Math.max(seen, joined)).toISOString()
}

const toView = (doc: Notification, threshold: string | null): NotificationView => {
  const broadcastDoc = doc.audience !== "user"
  const image = doc.image && typeof doc.image === "object" ? doc.image : null
  return {
    id: String(doc.id),
    category: doc.category,
    kind: doc.kind ?? "",
    title: doc.title,
    message: doc.message ?? null,
    href: doc.href ?? null,
    actorName: doc.actorName ?? null,
    imageUrl: image?.url ?? null,
    at: doc.createdAt,
    unread: broadcastDoc ? (threshold ? doc.createdAt > threshold : false) : !doc.readAt,
    broadcast: broadcastDoc,
  }
}

function scopeWhere(user: SessionUser | null, filter: NotificationFilter, prefs: NotificationPrefs): Where {
  const and: Where[] = [{ createdAt: { greater_than: since() } }]
  // Promotions off hides BOAI campaign broadcasts but keeps personal event results.
  if (!prefs.promotions) and.push({ or: [{ audience: { equals: "user" } }, { category: { not_equals: "event" } }] })
  if (filter !== "all" && filter !== "unread") and.push({ category: { equals: filter } })
  if (filter === "unread" && user) {
    and.push({
      or: [
        { and: [{ audience: { equals: "user" } }, { readAt: { exists: false } }] },
        { and: [{ audience: { not_equals: "user" } }, { createdAt: { greater_than: broadcastThreshold(user) } }] },
      ],
    })
  }
  return { and }
}

async function announcementViews(threshold: string | null, filter: NotificationFilter): Promise<NotificationView[]> {
  if (!["all", "unread", "system"].includes(filter)) return []
  const live = await getLiveAnnouncements()
  return live
    .map((item) => ({
      id: `announcement-${item.id}`,
      category: "system" as const,
      kind: "announcement",
      title: item.title,
      message: item.message,
      href: item.ctaHref,
      actorName: "BOAI",
      imageUrl: item.imageUrl,
      at: item.version,
      unread: threshold ? item.version > threshold : false,
      broadcast: true,
    }))
    .filter((item) => filter !== "unread" || item.unread)
}

export async function loadNotificationsAction(input?: { filter?: string; page?: number }): Promise<NotificationFeed> {
  const filter = FILTERS.has(input?.filter as NotificationFilter) ? (input!.filter as NotificationFilter) : "all"
  const page = Math.min(Math.max(Math.floor(Number(input?.page) || 1), 1), 50)
  try {
    const [payload, user] = await Promise.all([getPayloadClient(), appAuth.currentUser()])
    const prefs = prefsOf(user)
    const threshold = user ? broadcastThreshold(user) : null
    if (!user && filter === "unread") return { signedIn: false, items: [], unread: 0, hasMore: false, prefs: null }
    const scoped = { overrideAccess: false, ...(user ? { user } : {}) } as const
    const result = await payload.find({
      collection: "notifications",
      where: scopeWhere(user, filter, prefs),
      sort: "-createdAt",
      limit: PAGE_SIZE,
      page,
      depth: 1,
      ...scoped,
    })
    let items = result.docs.map((doc) => toView(doc, threshold))
    if (page === 1) {
      items = [...items, ...(await announcementViews(threshold, filter))].sort((a, b) => b.at.localeCompare(a.at))
    }
    let unread = 0
    if (user) {
      const counted = await payload.count({ collection: "notifications", where: scopeWhere(user, "unread", prefs), ...scoped })
      unread = counted.totalDocs + (await announcementViews(threshold, "unread")).length
    }
    return { signedIn: Boolean(user), items, unread, hasMore: result.hasNextPage, prefs: user ? prefs : null }
  } catch (error) {
    console.error("Could not load notifications", error)
    return { signedIn: false, items: [], unread: 0, hasMore: false, prefs: null }
  }
}

/** Unread badge only (no list), for the shared live summary poll. */
export async function countUnreadNotificationsAction(): Promise<number> {
  try {
    const [payload, user] = await Promise.all([getPayloadClient(), appAuth.currentUser()])
    if (!user) return 0
    const prefs = prefsOf(user)
    const threshold = broadcastThreshold(user)
    const counted = await payload.count({ collection: "notifications", where: scopeWhere(user, "unread", prefs), overrideAccess: false, user })
    return counted.totalDocs + (await announcementViews(threshold, "unread")).length
  } catch {
    return 0
  }
}

export type NotificationResult = { ok: boolean; error?: string }

async function withUser<T>(run: (user: SessionUser, payload: Awaited<ReturnType<typeof getPayloadClient>>) => Promise<T>) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập." } as NotificationResult
  try {
    await run(user, await getPayloadClient())
    return { ok: true } as NotificationResult
  } catch (error) {
    console.error("Notification update failed", error)
    return { ok: false, error: "Không thể cập nhật thông báo. Vui lòng thử lại." } as NotificationResult
  }
}

/** Opening the bell clears the badge for shared announcements and events. */
export async function markNotificationsSeenAction() {
  return withUser((user, payload) =>
    payload.update({
      collection: "users",
      id: user.id,
      data: { notificationsSeenAt: new Date().toISOString() },
      overrideAccess: false,
      user,
      depth: 0,
    }),
  )
}

export async function markNotificationReadAction(id: string) {
  const clean = cleanId(id)
  if (!clean) return { ok: false, error: "Thông báo không hợp lệ." } as NotificationResult
  return withUser((user, payload) =>
    payload.update({
      collection: "notifications",
      where: { and: [{ id: { equals: clean } }, { recipient: { equals: user.id } }, { readAt: { exists: false } }] },
      data: { readAt: new Date().toISOString() },
      overrideAccess: false,
      user,
      depth: 0,
    }),
  )
}

export async function markAllNotificationsReadAction() {
  return withUser(async (user, payload) => {
    const now = new Date().toISOString()
    await payload.update({
      collection: "notifications",
      where: { and: [{ recipient: { equals: user.id } }, { readAt: { exists: false } }] },
      data: { readAt: now },
      overrideAccess: false,
      user,
      depth: 0,
    })
    await payload.update({ collection: "users", id: user.id, data: { notificationsSeenAt: now }, overrideAccess: false, user, depth: 0 })
  })
}

export async function deleteNotificationAction(id: string) {
  const clean = cleanId(id)
  if (!clean) return { ok: false, error: "Thông báo không hợp lệ." } as NotificationResult
  return withUser((user, payload) =>
    payload.delete({
      collection: "notifications",
      where: { and: [{ id: { equals: clean } }, { recipient: { equals: user.id } }] },
      overrideAccess: false,
      user,
    }),
  )
}

export async function clearReadNotificationsAction() {
  return withUser((user, payload) =>
    payload.delete({
      collection: "notifications",
      where: { and: [{ recipient: { equals: user.id } }, { readAt: { exists: true } }] },
      overrideAccess: false,
      user,
    }),
  )
}

export async function updateNotificationPrefsAction(input: Partial<NotificationPrefs>) {
  const prefs: Partial<NotificationPrefs> = {}
  for (const key of ["following", "community", "orders", "messages", "promotions"] as const) {
    if (typeof input?.[key] === "boolean") prefs[key] = input[key]
  }
  return withUser((user, payload) =>
    payload.update({
      collection: "users",
      id: user.id,
      data: { notificationPrefs: { ...prefsOf(user), ...prefs } },
      overrideAccess: false,
      user,
      depth: 0,
    }),
  )
}
