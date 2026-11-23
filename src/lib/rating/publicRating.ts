import type { User } from "@/payload-types"
import { getPayloadClient } from "../payload"
import { resolveRatingTier } from "./ratingConfig"

// Hàm server trả đúng các trường được phép. Không bao giờ trả deviceId/possibleAlt.

export type PublicRating = {
  name: string
  mr: number
  tier: ReturnType<typeof resolveRatingTier>
}

/** Chỉ trả dữ liệu khi người chơi bật isPublic. */
export async function getPublicRating(userId: string): Promise<PublicRating | null> {
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "rating-profiles",
    where: { and: [{ user: { equals: userId } }, { isPublic: { equals: true } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
    select: { user: true, mr: true, isPublic: true },
  })
  const doc = found.docs[0]
  if (!doc) return null
  const user = typeof doc.user === "object" && doc.user ? doc.user : null
  const mr = Math.round(Number(doc.mr ?? 1000))
  return { name: user?.name ?? "Người chơi", mr, tier: resolveRatingTier(mr) }
}

/** Hồ sơ và lịch sử MR của chính người đang đăng nhập (đi qua access control). */
export async function getMyRatingHistory(user: User, limit = 20) {
  const payload = await getPayloadClient()
  const [profiles, history] = await Promise.all([
    payload.find({
      collection: "rating-profiles",
      where: { user: { equals: user.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
      select: { mr: true, matchesPlayed: true, isPublic: true },
    }),
    payload.find({
      collection: "match-rating-history",
      where: { player: { equals: user.id } },
      sort: "-createdAt",
      limit,
      depth: 1,
      overrideAccess: false,
      user,
      select: { event: true, mrBefore: true, mrAfter: true, delta: true, reason: true, createdAt: true },
    }),
  ])
  const profile = profiles.docs[0]
  const mr = Math.round(Number(profile?.mr ?? 1000))
  return {
    mr,
    tier: resolveRatingTier(mr),
    matchesPlayed: Number(profile?.matchesPlayed ?? 0),
    isPublic: Boolean(profile?.isPublic),
    history: history.docs.map((row) => {
      const event = typeof row.event === "object" && row.event ? row.event : null
      return {
        id: String(row.id),
        eventName: event?.name ?? null,
        isDemo: Boolean(event?.isDemo),
        delta: Number(row.delta),
        mrAfter: Number(row.mrAfter),
        reason: row.reason,
        createdAt: row.createdAt,
      }
    }),
  }
}
