import "server-only"
import { cache } from "react"
import { getPayloadClient } from "./payload"
import { readDnaShare, type DnaShareCard } from "./sportdna-share"

export type PublicDnaShare = { id: string; card: DnaShareCard; createdAt: string; name: string | null; avatar: string | null }

/**
 * A live SportDNA share link. Read anonymously through the collection's access
 * rule (revoked links never come back); the sharer's name and photo are added
 * only while their community profile is public, checked at view time.
 */
export const loadPublicDnaShare = cache(async (id: string): Promise<PublicDnaShare | null> => {
  if (!/^[\w-]{1,64}$/.test(id)) return null
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: "dna-shares", id, depth: 0, overrideAccess: false }).catch(() => null)
  const card = doc?.active ? readDnaShare(doc.card) : null
  if (!doc || !card) return null
  // Trusted lookup of the sharer (hidden from the public API) to decide what identity to show.
  const owned = await payload.findByID({ collection: "dna-shares", id, depth: 0, overrideAccess: true, select: { owner: true } }).catch(() => null)
  const ownerId = owned ? (typeof owned.owner === "object" && owned.owner ? owned.owner.id : owned.owner) : null
  let name: string | null = null
  let avatar: string | null = null
  if (ownerId) {
    const { docs } = await payload.find({
      collection: "community-profiles",
      where: { account: { equals: ownerId } },
      limit: 1,
      depth: 1,
      overrideAccess: true,
      select: { name: true, visibility: true, avatar: true },
    })
    const profile = docs[0]
    if (profile?.visibility === "public") {
      name = profile.name?.trim() || null
      avatar = typeof profile.avatar === "object" && profile.avatar ? (profile.avatar.url ?? null) : null
    }
  }
  return { id: String(doc.id), card, createdAt: doc.createdAt, name, avatar }
})

/** The headline number of a card: its first ELO with a value. */
export const headlineStat = (card: DnaShareCard) => card.stats.find((stat) => stat.value !== null) ?? null
