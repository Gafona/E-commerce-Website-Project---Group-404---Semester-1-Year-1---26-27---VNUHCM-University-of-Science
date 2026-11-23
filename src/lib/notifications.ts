import type { PayloadRequest } from "payload"
import type { NotificationCategory } from "../collections/Notifications"
import { acceptedFollowWhere } from "./community-privacy"

type Id = string | number

export type NotifyInput = {
  category: NotificationCategory
  kind: string
  title: string
  message?: string | null
  href?: string | null
  actorName?: string | null
  image?: Id | null
  dedupeKey?: string | null
}

/** Preference toggles a member can switch off. Account & shop moderation always arrives. */
export type NotificationPref = "following" | "community" | "orders" | "messages" | "promotions"

export const relId = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value && typeof value === "object" && "id" in value) return String((value as { id: Id }).id)
  return ""
}

export const excerpt = (text: unknown, max = 90) => {
  const value = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : ""
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

const skip = (req: PayloadRequest) => Boolean(req.context?.skipNotifications)

const clean = (input: NotifyInput) => ({
  category: input.category,
  kind: input.kind.slice(0, 60),
  title: input.title.slice(0, 140),
  message: input.message ? input.message.slice(0, 600) : null,
  href: input.href ? input.href.slice(0, 300) : null,
  actorName: input.actorName ? input.actorName.slice(0, 100) : null,
  image: input.image ?? null,
  dedupeKey: input.dedupeKey ?? null,
})

async function alreadySent(req: PayloadRequest, dedupeKey: string | null | undefined) {
  if (!dedupeKey) return false
  const existing = await req.payload.count({
    collection: "notifications",
    where: { dedupeKey: { equals: dedupeKey } },
    overrideAccess: true,
    req,
  })
  return existing.totalDocs > 0
}

/** Drops recipients who switched this kind of notification off. */
async function filterByPreference(req: PayloadRequest, ids: string[], pref?: NotificationPref) {
  if (!pref || !ids.length) return ids
  const { docs } = await req.payload.find({
    collection: "users",
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { notificationPrefs: true },
    req,
  })
  const muted = new Set(
    docs
      .filter((doc) => (doc.notificationPrefs as Record<string, boolean | null> | undefined)?.[pref] === false)
      .map((doc) => String(doc.id)),
  )
  return ids.filter((id) => !muted.has(id))
}

/**
 * Creates personal notifications. Failures are logged and never break the
 * write that triggered them.
 */
export async function notifyUsers(
  req: PayloadRequest,
  recipients: unknown[],
  input: NotifyInput,
  options: { pref?: NotificationPref; exclude?: unknown[] } = {},
) {
  if (skip(req)) return
  try {
    const excluded = new Set((options.exclude ?? []).map(relId).filter(Boolean))
    const unique = [...new Set(recipients.map(relId).filter((id) => id && !excluded.has(id)))]
    const ids = await filterByPreference(req, unique, options.pref)
    const data = clean(input)
    for (let i = 0; i < ids.length; i += 10) {
      await Promise.all(
        ids.slice(i, i + 10).map((recipient) =>
          req.payload
            .create({
              collection: "notifications",
              data: {
                ...data,
                audience: "user",
                recipient,
                dedupeKey: data.dedupeKey ? `${data.dedupeKey}:${recipient}` : null,
              } as never,
              overrideAccess: true,
              depth: 0,
              req,
            })
            .catch((error) => console.error("notification create failed", error)),
        ),
      )
    }
  } catch (error) {
    console.error("notifyUsers failed", error)
  }
}

/** One shared notification for everyone (or every approved seller). */
export async function broadcast(req: PayloadRequest, audience: "all" | "sellers", input: NotifyInput) {
  if (skip(req)) return
  try {
    if (await alreadySent(req, input.dedupeKey)) return
    await req.payload.create({
      collection: "notifications",
      data: { ...clean(input), audience } as never,
      overrideAccess: true,
      depth: 0,
      req,
    })
  } catch (error) {
    console.error("broadcast notification failed", error)
  }
}

/** Everyone following the given account in BOAI Community. */
export async function followersOf(req: PayloadRequest, accountId: unknown) {
  const id = relId(accountId)
  if (!id) return []
  const { docs } = await req.payload.find({
    collection: "community-follows",
    // Pending requests to private profiles are not followers yet.
    where: { and: [{ recipient: { equals: id } }, acceptedFollowWhere] },
    limit: 2000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { author: true },
    req,
  })
  return docs.map((doc) => relId(doc.author)).filter(Boolean)
}

export async function notifyFollowers(req: PayloadRequest, accountId: unknown, input: NotifyInput) {
  if (skip(req)) return
  try {
    const followers = await followersOf(req, accountId)
    await notifyUsers(req, followers, input, { pref: "following", exclude: [accountId] })
  } catch (error) {
    console.error("notifyFollowers failed", error)
  }
}

/** BOAI moderators (app accounts with the admin role). */
export async function notifyAdmins(req: PayloadRequest, input: NotifyInput) {
  if (skip(req)) return
  try {
    const { docs } = await req.payload.find({
      collection: "users",
      where: { role: { equals: "admin" } },
      limit: 50,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { role: true },
      req,
    })
    await notifyUsers(req, docs.map((doc) => doc.id), input, { exclude: [req.user?.collection === "users" ? req.user.id : ""] })
  } catch (error) {
    console.error("notifyAdmins failed", error)
  }
}

/** Public display name of a shop account. */
export async function shopNameOf(req: PayloadRequest, sellerId: unknown) {
  const id = relId(sellerId)
  if (!id) return "Cửa hàng"
  const user = await req.payload
    .findByID({ collection: "users", id, depth: 0, overrideAccess: true, select: { name: true, seller: { shopName: true } }, req })
    .catch(() => null)
  return user?.seller?.shopName?.trim() || user?.name || "Cửa hàng"
}
