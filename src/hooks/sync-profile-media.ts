import type { CollectionAfterChangeHook } from "payload"
import { revalidatePath } from "next/cache"

const idOf = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value && typeof value === "object" && "id" in value) return String((value as { id: string | number }).id)
  return ""
}

/**
 * The account (`users`) is the single source of truth for a member's name,
 * avatar and cover. The public community profile mirrors those fields, so every
 * change path (account page, admin, seeds) is copied here with system access.
 */
export const syncProfileMedia: CollectionAfterChangeHook = async ({ doc, previousDoc, req, context, operation }) => {
  if (operation !== "update" || context?.skipProfileSync) return doc
  const changes: Record<string, string | null> = {}
  for (const field of ["avatar", "cover"] as const) {
    const next = idOf(doc[field])
    if (next !== idOf(previousDoc?.[field])) changes[field] = next || null
  }
  if (doc.name && doc.name !== previousDoc?.name) changes.name = doc.name
  if (!Object.keys(changes).length) return doc
  try {
    const { docs } = await req.payload.find({
      collection: "community-profiles",
      where: { account: { equals: doc.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { demo: true },
      req,
    })
    const profile = docs[0]
    if (!profile || profile.demo) return doc
    await req.payload.update({
      collection: "community-profiles",
      id: profile.id,
      data: changes,
      overrideAccess: true,
      context: { skipProfileSync: true },
      req,
    })
    try {
      revalidatePath(`/nguoi-dung/${profile.id}`)
      revalidatePath("/cong-dong")
    } catch {
      // Outside a Next.js request (CLI/seed) there is nothing to revalidate.
    }
  } catch (error) {
    console.error("syncProfileMedia failed", error)
  }
  return doc
}
