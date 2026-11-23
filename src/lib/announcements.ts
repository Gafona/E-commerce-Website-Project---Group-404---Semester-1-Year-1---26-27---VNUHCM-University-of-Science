import "server-only"
import { getPayloadClient } from "@/lib/payload"

export type LiveAnnouncement = {
  id: string
  version: string
  title: string
  message: string
  displayType: "popup" | "banner"
  scope: "home" | "all"
  theme: "brand" | "dark" | "sale" | "light"
  ctaLabel: string | null
  ctaHref: string | null
  imageUrl: string | null
  imageAlt: string
}

export const isLiveNow = (doc: { startAt?: string | null; endAt?: string | null }, now = Date.now()) =>
  (!doc.startAt || new Date(doc.startAt).getTime() <= now) &&
  (!doc.endAt || new Date(doc.endAt).getTime() > now)

/** Switched-on announcements whose schedule window includes this request. */
export async function getLiveAnnouncements(): Promise<LiveAnnouncement[]> {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: "site-announcements",
      overrideAccess: false,
      depth: 1,
      limit: 20,
      sort: "-updatedAt",
      where: { active: { equals: true } },
    })
    return docs.filter((doc) => isLiveNow(doc)).map((doc) => {
      const image = doc.image && typeof doc.image === "object" ? doc.image : null
      return {
        id: String(doc.id),
        version: doc.updatedAt,
        title: doc.title,
        message: doc.message,
        displayType: doc.displayType,
        scope: doc.scope,
        theme: doc.theme,
        ctaLabel: doc.ctaLabel || null,
        ctaHref: doc.ctaHref || null,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt ?? doc.title,
      }
    })
  } catch (error) {
    // A broken announcement must never take the storefront down.
    console.error("Could not load site announcements", error)
    return []
  }
}
