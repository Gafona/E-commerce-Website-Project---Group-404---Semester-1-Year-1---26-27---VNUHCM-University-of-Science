import "server-only"
import { connection } from "next/server"
import { getPayloadClient } from "@/lib/payload"
import type { SiteImagePlacement } from "@/lib/site-image-placements"

export type SiteImageView = {
  url: string
  alt: string
  objectPosition: string
  credit: { author: string; url: string | null } | null
}

/**
 * Picks one random active photo for each requested slot on every request.
 * Slots without photos are omitted so callers can render a graceful fallback.
 */
export async function getSiteImages<P extends SiteImagePlacement>(
  placements: readonly P[],
): Promise<Partial<Record<P, SiteImageView>>> {
  await connection()
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: "site-images",
      depth: 1,
      limit: 200,
      pagination: false,
      overrideAccess: false,
      where: { and: [{ active: { equals: true } }, { placements: { in: [...placements] } }] },
    })
    const out: Partial<Record<P, SiteImageView>> = {}
    for (const placement of placements) {
      const pool = docs.flatMap((doc) => {
        const media = typeof doc.image === "object" ? doc.image : null
        if (!media?.url || !doc.placements?.includes(placement)) return []
        return [
          {
            url: media.url,
            alt: media.alt || doc.title,
            objectPosition: `${media.focalX ?? 50}% ${media.focalY ?? 50}%`,
            credit: doc.credit?.author
              ? { author: doc.credit.author, url: doc.credit.sourceUrl || null }
              : null,
          },
        ]
      })
      if (pool.length) out[placement] = pool[Math.floor(Math.random() * pool.length)]
    }
    return out
  } catch (error) {
    console.error("Could not load site images", error)
    return {}
  }
}
