import "server-only"
import { cache } from "react"
import { getPayloadClient } from "./payload"
import { readDnaShare, type DnaShareCard } from "./sportdna-share"

export type PublicPost = { id: string; authorName: string; content: string; sport: string | null; image: string | null; achievement: DnaShareCard | null }

/**
 * A community post as an anonymous visitor (or a link-preview crawler) may see
 * it: only visible posts whose author is public, through the collection rules.
 */
export const loadPublicPost = cache(async (id: string): Promise<PublicPost | null> => {
  if (!/^[\w-]{1,100}$/.test(id)) return null
  const payload = await getPayloadClient()
  const { docs } = await payload
    .find({ collection: "community-posts", where: { and: [{ id: { equals: id } }, { visibility: { equals: "visible" } }] }, limit: 1, depth: 1, overrideAccess: false })
    .catch(() => ({ docs: [] }))
  const post = docs[0]
  if (!post) return null
  const first = (post.images ?? []).find((image) => typeof image === "object" && image?.url)
  return {
    id: String(post.id),
    authorName: post.authorName || "Thành viên BOAI",
    content: (post.content ?? "").replace(/\s+/g, " ").trim(),
    sport: post.sport ?? null,
    image: first && typeof first === "object" ? (first.url ?? null) : null,
    achievement: readDnaShare(post.achievement),
  }
})
