import type { PayloadRequest, Where } from "payload"

type Slug = Parameters<PayloadRequest["payload"]["delete"]>[0]["collection"]

// System cleanup inside the same transaction as the parent delete.
export const deleteWhere = (
  req: PayloadRequest,
  collection: Slug,
  where: Where,
) =>
  req.payload.delete({ collection, where, overrideAccess: true, req, depth: 0 })

export const idsWhere = async (
  req: PayloadRequest,
  collection: Slug,
  where: Where,
) => {
  const ids: (string | number)[] = []
  let page = 1
  for (;;) {
    const res = await req.payload.find({
      collection,
      where,
      depth: 0,
      limit: 500,
      page,
      pagination: true,
      select: {},
      overrideAccess: true,
      req,
    })
    ids.push(...res.docs.map((doc) => doc.id))
    if (!res.hasNextPage) return ids
    page++
  }
}

/** Removes everything that depends on a community post before it is deleted. */
export async function cleanupPost(
  req: PayloadRequest,
  postId: string | number,
) {
  req.context.cascading = true
  const commentIds = await idsWhere(req, "community-comments", {
    post: { equals: postId },
  })
  if (commentIds.length) {
    await deleteWhere(req, "community-comment-reactions", {
      comment: { in: commentIds },
    })
    await deleteWhere(req, "community-comments", { id: { in: commentIds } })
  }
  await deleteWhere(req, "community-likes", { post: { equals: postId } })
  await deleteWhere(req, "community-demo-shares", { post: { equals: postId } })
}

/** Removes an account's owned records so required relationships never dangle. */
export async function cleanupAccount(
  req: PayloadRequest,
  userId: string | number,
) {
  req.context.cascading = true
  const author = { author: { equals: userId } }
  const member: Where = {
    or: [{ memberA: { equals: userId } }, { memberB: { equals: userId } }],
  }

  for (const postId of await idsWhere(req, "community-posts", author)) {
    await cleanupPost(req, postId)
  }
  await deleteWhere(req, "community-posts", author)
  const commentIds = await idsWhere(req, "community-comments", author)
  if (commentIds.length) {
    await deleteWhere(req, "community-comment-reactions", {
      comment: { in: commentIds },
    })
    await deleteWhere(req, "community-comments", { id: { in: commentIds } })
  }
  await deleteWhere(req, "community-comment-reactions", author)
  await deleteWhere(req, "community-likes", author)
  await deleteWhere(req, "community-demo-shares", author)
  await deleteWhere(req, "community-story-reactions", { or: [author, { storyOwner: { equals: userId } }] })
  await deleteWhere(req, "community-story-views", { or: [{ viewer: { equals: userId } }, { storyOwner: { equals: userId } }] })
  await deleteWhere(req, "community-stories", author)
  await deleteWhere(req, "community-messages", member)
  await deleteWhere(req, "community-conversations", member)
  const connection: Where = {
    or: [{ author: { equals: userId } }, { recipient: { equals: userId } }],
  }
  await deleteWhere(req, "community-follows", connection)
  await deleteWhere(req, "community-friendships", connection)
  await deleteWhere(req, "community-profiles", { account: { equals: userId } })

  await deleteWhere(req, "event-registrations", { seller: { equals: userId } })
  await deleteWhere(req, "authenticity-codes", { seller: { equals: userId } })
  const productIds = await idsWhere(req, "products", {
    seller: { equals: userId },
  })
  // Paid homepage bookings belong to the shop's products.
  await deleteWhere(req, "recommendation-requests", { seller: { equals: userId } })
  if (productIds.length) {
    await deleteWhere(req, "reviews", { product: { in: productIds } })
    await deleteWhere(req, "product-comments", { product: { in: productIds } })
    await deleteWhere(req, "products", { id: { in: productIds } })
  }
  await deleteWhere(req, "reviews", author)
  await deleteWhere(req, "product-comments", author)
  await deleteWhere(req, "jersey-designs", { owner: { equals: userId } })
  await deleteWhere(req, "sport-assessments", { owner: { equals: userId } })
  // Personal SportDNA history (every attempt) and practice runs go with the account.
  await deleteWhere(req, "sportdna-results", { owner: { equals: userId } })
  await deleteWhere(req, "sport-test-runs", { owner: { equals: userId } })
  // Public result links stop working with the account.
  await deleteWhere(req, "dna-shares", { owner: { equals: userId } })
  await deleteWhere(req, "user-achievements", { owner: { equals: userId } })
  await deleteWhere(req, "notifications", { recipient: { equals: userId } })
}
