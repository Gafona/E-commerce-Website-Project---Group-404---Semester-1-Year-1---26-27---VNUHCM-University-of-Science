import type { CollectionAfterChangeHook, CollectionBeforeDeleteHook } from "payload"
import { isStaff } from "../access/roles"
import { excerpt, notifyFollowers, notifyUsers, relId } from "../lib/notifications"
import { communityProfileHref } from "../lib/community-identity"

const actorName = (req: Parameters<CollectionAfterChangeHook>[0]["req"], fallback?: string | null) =>
  (req.user?.collection === "users" ? req.user.name : null) || fallback || "Một thành viên"

const reasonOf = (context: Record<string, unknown>) =>
  typeof context.moderationReason === "string" && context.moderationReason.trim()
    ? ` Lý do: ${context.moderationReason.trim()}`
    : ""

/** New posts reach followers; moderator hide/restore reaches the author. */
export const notifyPostChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const author = relId(doc.author)
  const href = `/cong-dong?post=${encodeURIComponent(String(doc.id))}#bang-tin`
  if (operation === "create" && doc.visibility === "visible") {
    const name = doc.authorName || actorName(req)
    await notifyFollowers(req, author, {
      category: "community",
      kind: "follow-post",
      title: doc.topic === "offer" ? `${name} vừa đăng ưu đãi mới` : `${name} vừa đăng bài mới`,
      message: excerpt(doc.content),
      href,
      actorName: name,
    })
    return doc
  }
  if (operation === "update" && isStaff(req.user) && previousDoc?.visibility !== doc.visibility) {
    if (doc.visibility === "hidden") {
      await notifyUsers(req, [author], {
        category: "community",
        kind: "post-hidden",
        title: "Bài viết của bạn đã bị ẩn",
        message: `“${excerpt(doc.content, 70)}” vi phạm tiêu chuẩn cộng đồng.${reasonOf(req.context)}`,
        href: "/cong-dong",
      })
    } else if (doc.visibility === "visible" && previousDoc?.visibility === "hidden") {
      await notifyUsers(req, [author], {
        category: "community",
        kind: "post-restored",
        title: "Bài viết của bạn đã được khôi phục",
        message: excerpt(doc.content),
        href,
      })
    }
  }
  return doc
}

export const notifyPostRemoval: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (!isStaff(req.user) || req.context.cascading) return
  const post = await req.payload
    .findByID({ collection: "community-posts", id, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  const author = relId(post?.author)
  if (!post || !author || (req.user?.collection === "users" && author === String(req.user.id))) return
  await notifyUsers(req, [author], {
    category: "community",
    kind: "post-removed",
    title: "Bài viết của bạn đã bị xóa",
    message: `Quản trị viên đã xóa bài “${excerpt(post.content, 70)}”.${reasonOf(req.context)}`,
    href: "/cong-dong",
  })
}

export const notifyCommentChanges: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create") return doc
  const commenter = relId(doc.author)
  const name = doc.authorName || actorName(req)
  const postId = relId(doc.post)
  const href = `/cong-dong?post=${encodeURIComponent(postId)}#bang-tin`
  const post = await req.payload
    .findByID({ collection: "community-posts", id: postId, depth: 0, overrideAccess: true, select: { author: true }, req })
    .catch(() => null)
  const postAuthor = relId(post?.author)
  let parentAuthor = ""
  if (doc.parent) {
    const parent = await req.payload
      .findByID({ collection: "community-comments", id: relId(doc.parent), depth: 0, overrideAccess: true, select: { author: true }, req })
      .catch(() => null)
    parentAuthor = relId(parent?.author)
    await notifyUsers(
      req,
      [parentAuthor],
      { category: "community", kind: "comment-reply", title: `${name} đã trả lời bình luận của bạn`, message: excerpt(doc.content), href, actorName: name },
      { pref: "community", exclude: [commenter] },
    )
  }
  await notifyUsers(
    req,
    [postAuthor],
    { category: "community", kind: "post-comment", title: `${name} đã bình luận về bài viết của bạn`, message: excerpt(doc.content), href, actorName: name },
    { pref: "community", exclude: [commenter, parentAuthor] },
  )
  return doc
}

export const notifyCommentRemoval: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (!isStaff(req.user) || req.context.cascading) return
  const comment = await req.payload
    .findByID({ collection: "community-comments", id, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  const author = relId(comment?.author)
  if (!comment || !author || (req.user?.collection === "users" && author === String(req.user.id))) return
  await notifyUsers(req, [author], {
    category: "community",
    kind: "comment-removed",
    title: "Bình luận của bạn đã bị xóa",
    message: `Quản trị viên đã xóa bình luận “${excerpt(comment.content, 70)}”.${reasonOf(req.context)}`,
    href: "/cong-dong",
  })
}

/** Follows, follow requests (private profiles) and friend requests. */
export const notifyConnection = (friendship: boolean): CollectionAfterChangeHook => async ({ doc, previousDoc, operation, req }) => {
  const profiles = await req.payload
    .find({
      collection: "community-profiles",
      where: { id: { in: [relId(doc.sourceProfile), relId(doc.targetProfile)].filter(Boolean) } },
      depth: 0,
      limit: 2,
      overrideAccess: true,
      select: { name: true },
      req,
    })
    .catch(() => ({ docs: [] as { id: string | number; name?: string }[] }))
  const nameOf = (profile: unknown) => profiles.docs.find((p) => String(p.id) === relId(profile))?.name || "Một thành viên"
  const source = nameOf(doc.sourceProfile)
  const target = nameOf(doc.targetProfile)
  const sourceHref = communityProfileHref(relId(doc.sourceProfile))
  const targetHref = communityProfileHref(relId(doc.targetProfile))
  if (operation === "create") {
    await notifyUsers(
      req,
      [doc.recipient],
      friendship
        ? { category: "community", kind: "friend-request", title: `${source} đã gửi lời mời kết bạn`, message: "Xem và phản hồi lời mời trong mục Thành viên.", href: "/cong-dong#thanh-vien", actorName: source }
        : doc.status === "pending"
          ? { category: "community", kind: "follow-request", title: `${source} muốn theo dõi bạn`, message: "Tài khoản của bạn đang riêng tư. Chấp nhận để họ xem bài viết và story của bạn.", href: sourceHref, actorName: source }
          : { category: "community", kind: "new-follower", title: `${source} đã bắt đầu theo dõi bạn`, message: "Bài viết và sản phẩm mới của bạn sẽ được gửi tới họ.", href: sourceHref, actorName: source },
      // Approval requests must always arrive, or a private member could never accept them.
      friendship || doc.status !== "pending" ? { pref: "community" } : {},
    )
  } else if (previousDoc?.status === "pending" && doc.status === "accepted") {
    await notifyUsers(
      req,
      [doc.author],
      friendship
        ? { category: "community", kind: "friend-accepted", title: `${target} đã chấp nhận lời mời kết bạn`, href: targetHref, actorName: target }
        : { category: "community", kind: "follow-accepted", title: `${target} đã chấp nhận yêu cầu theo dõi`, message: "Giờ bạn có thể xem bài viết và story của họ.", href: targetHref, actorName: target },
      { pref: "community" },
    )
  }
  return doc
}
