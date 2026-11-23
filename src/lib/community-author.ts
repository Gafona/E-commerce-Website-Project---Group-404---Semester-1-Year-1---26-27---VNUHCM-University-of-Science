import type { PayloadRequest } from "payload"

/**
 * The public community profile of an account, created from the account when
 * it does not exist yet. Used whenever a post is saved, so every post (old
 * posts included, the next time they are saved) links to its author's live
 * name and photo. Returns null only when the account no longer exists.
 */
export async function ensureAuthorProfile(req: PayloadRequest, accountId: string): Promise<{ id: string; name: string } | null> {
  if (!accountId) return null
  const found = await req.payload.find({
    collection: "community-profiles",
    where: { account: { equals: accountId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { name: true },
    req,
  })
  if (found.docs[0]) return { id: String(found.docs[0].id), name: found.docs[0].name }
  const account = await req.payload
    .findByID({
      collection: "users",
      id: accountId,
      depth: 0,
      overrideAccess: true,
      select: { name: true, sellerStatus: true, favoriteSport: true, avatar: true, cover: true },
      req,
    })
    .catch(() => null)
  if (!account) return null
  try {
    const created = await req.payload.create({
      collection: "community-profiles",
      data: {
        account: accountId,
        name: account.name,
        bio: "Thành viên BOAI Community",
        kind: account.sellerStatus === "approved" ? "shop" : "person",
        sport: account.favoriteSport ?? "all",
        // Real members are never sample profiles (the field defaults to demo).
        demo: false,
        visibility: "public",
        avatar: account.avatar ?? null,
        cover: account.cover ?? null,
      },
      overrideAccess: true,
      depth: 0,
      req,
    })
    return { id: String(created.id), name: created.name }
  } catch {
    // Another request created it first.
    const retry = await req.payload.find({
      collection: "community-profiles",
      where: { account: { equals: accountId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { name: true },
      req,
    })
    return retry.docs[0] ? { id: String(retry.docs[0].id), name: retry.docs[0].name } : null
  }
}
