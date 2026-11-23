import "server-only"
import { cache } from "react"
import { getPayloadClient } from "@/lib/payload"
import { resolveContent, type ResolvedContent } from "@/lib/site-content-schema"

/** Editable website copy, read once per request. */
export const getSiteContent = cache(async (): Promise<ResolvedContent> => {
  try {
    const payload = await getPayloadClient()
    const doc = await payload.findGlobal({ slug: "site-content", depth: 0, overrideAccess: false })
    return resolveContent(doc)
  } catch (error) {
    // Missing copy must never take the storefront down.
    console.error("Could not load site content", error)
    return resolveContent(null)
  }
})
