"use server"
// Bound rapid repeat submissions without limiting legitimate discussion.
// Newest first, with an explicit reply quote even when its parent is on another page.

import { isAppAdmin } from "@/access/roles"
import type { Where } from "payload"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { readCommunityFeed } from "@/lib/community"
import sharp from "sharp"
import type { User } from "@/payload-types"
import { MAX_POST_IMAGE_BYTES, MAX_POST_IMAGES, POST_IMAGE_TYPES } from "@/lib/community-media"
import { isDnaShareKind, isDnaSport } from "@/lib/sportdna-share"
import {
  cleanCommunityText,
  communityDisplayText,
  communityPage,
  parseCommunityPost,
  COMMENT_REACTIONS,
  parseCommentReaction,
} from "@/lib/community-rules"

type Result = {
  ok: boolean
  error?: string
  id?: string
}

export async function communitySession() {
  const user = await appAuth.currentUser()
  if (!user)
    return { viewer: null, liked: [] as string[], owned: [] as string[] }
  const payload = await getPayloadClient()
  const [likes, posts, ownProfile] = await Promise.all([
    payload.find({
      collection: "community-likes",
      where: { author: { equals: user.id } },
      depth: 0,
      limit: 1000,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: "community-posts",
      where: { author: { equals: user.id } },
      depth: 0,
      limit: 1000,
      overrideAccess: false,
      user,
    }),
    // Public profile mirrors the account photo; used for the composer and sidebar avatar.
    payload.find({
      collection: "community-profiles",
      where: { account: { equals: user.id } },
      depth: 1,
      limit: 1,
      select: { avatar: true },
      overrideAccess: false,
      user,
    }),
  ])
  const avatar = ownProfile.docs[0]?.avatar
  return {
    viewer: {
      avatar: avatar && typeof avatar === "object" ? (avatar.url ?? null) : null,
      name: user.name,
      moderator: isAppAdmin(user),
      seller:
        user.sellerStatus ===
        "approved",
    },
    liked: likes.docs.flatMap((like) => {
      const id =
        typeof like.post ===
        "string"
          ? like.post
          : like.post?.id
      return id ? [id] : []
    }),
    owned: posts.docs.map((post) => post.id),
  }
}

export async function loadCommunityFeed(options: {
  sport?: string
  topic?: string
  query?: string
  page?: number
  post?: string
  member?: string
}) {
  try {
    // The viewer decides which private profiles' posts are visible.
    const user = await appAuth.currentUser()
    return { ok: true as const, feed: await readCommunityFeed(options, user ?? undefined) }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải bảng tin. Vui lòng thử lại.",
    }
  }
}

/** Timeline for the signed-in member's own profile page. */
export async function loadMyProfileFeed(page = 1) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập." }
  try {
    return {
      ok: true as const,
      feed: await readCommunityFeed({ author: user.id, page }, user),
    }
  } catch {
    return { ok: false as const, error: "Không thể tải bài viết. Vui lòng thử lại." }
  }
}

/** Validates and re-encodes post photos, returning new Media IDs owned by the author. */
async function uploadPostImages(files: File[], user: User) {
  const payload = await getPayloadClient()
  const ids: string[] = []
  for (const file of files) {
    if (!POST_IMAGE_TYPES.includes(file.type) || file.size > MAX_POST_IMAGE_BYTES)
      throw new Error("Ảnh phải là JPG/PNG/WebP, tối đa 5 MB mỗi ảnh.")
    const data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
      .catch(() => {
        throw new Error("Ảnh không hợp lệ hoặc bị lỗi.")
      })
    const media = await payload.create({
      collection: "media",
      data: { alt: `Ảnh bài viết của ${user.name}` },
      file: { data, mimetype: "image/jpeg", name: `post-${crypto.randomUUID()}.jpg`, size: data.length },
      context: { communityUpload: true },
      overrideAccess: false,
      user,
    })
    ids.push(String(media.id))
  }
  return ids
}

async function discardImages(ids: string[], user: User) {
  const payload = await getPayloadClient()
  for (const id of ids) await payload.delete({ collection: "media", id, overrideAccess: false, user }).catch(() => {})
}

export async function writeCommunityPost(form: FormData): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập để đăng bài." }
  try {
    const data = parseCommunityPost({
      content: form.get("content"),
      sport: form.get("sport"),
      topic: form.get("topic"),
      product: form.get("product"),
    })
    const payload = await getPayloadClient()
    const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0)
    const keep = form.getAll("keepImages").map((value) => cleanCommunityText(value, 100)).filter(Boolean)
    if (files.length + keep.length > MAX_POST_IMAGES)
      return { ok: false, error: `Mỗi bài viết tối đa ${MAX_POST_IMAGES} ảnh.` }
    const id = form.get("id")
    if (id) {
      const postId = cleanCommunityText(id, 100)
      const current = await payload.findByID({ collection: "community-posts", id: postId, depth: 0, overrideAccess: false, user })
      const before = (current.images ?? []).map((image) => String(typeof image === "object" ? image.id : image))
      // Only photos already on this post can be kept; the collection re-checks ownership.
      // Forms that don't manage photos (no imagesField) leave existing photos untouched.
      const managesImages = form.get("imagesField") === "1"
      const kept = managesImages ? keep.filter((imageId) => before.includes(imageId)) : before
      const uploaded = await uploadPostImages(files, user)
      await payload
        .update({
          collection: "community-posts",
          id: postId,
          data: { ...data, images: [...kept, ...uploaded] },
          overrideAccess: false,
          user,
        })
        .catch(async (error) => {
          await discardImages(uploaded, user)
          throw error
        })
      // Remove photos the author took off the post.
      for (const removed of before.filter((imageId) => !kept.includes(imageId)))
        await payload.delete({ collection: "media", id: removed, overrideAccess: false, user }).catch(() => {})
      return { ok: true, id: postId }
    }
    const recent = await payload.count({
      collection: "community-posts",
      where: {
        and: [
          { author: { equals: user.id } },
          {
            createdAt: {
              greater_than: new Date(
                Date.now() -
                  60_000,
              ).toISOString(),
            },
          },
        ],
      },
      overrideAccess: false,
      user,
    })
    if (
      recent.totalDocs >=
      3
    )
      return { ok: false, error: "Bạn đăng hơi nhanh. Vui lòng chờ một phút." }
    const images = await uploadPostImages(files, user)
    const post = await payload
      .create({
      collection: "community-posts",
      data: {
        ...data,
        images,
        sharedPost: form.get("sharedPost")
          ? cleanCommunityText(form.get("sharedPost"), 100)
          : null,
        // Values are recomputed by the collection hook; only the choice is sent.
        ...(isDnaShareKind(form.get("achievementKind")) &&
        isDnaSport(form.get("achievementSport"))
          ? {
              achievement: {
                kind: form.get("achievementKind") as "elo" | "radar",
                sport: form.get("achievementSport") as "badminton" | "football",
              },
            }
          : {}),
        author: user.id,
        authorName: user.name,
        visibility: "visible",
      },
      overrideAccess: false,
      user,
    })
      .catch(async (error) => {
        await discardImages(images, user)
        throw error
      })
    return { ok: true, id: post.id }
  } catch (error) {
    const message =
      error instanceof
      Error
        ? error.message
        : ""
    return {
      ok: false,
      error: /ký tự|hợp lệ|độ dài|Chỉ shop đã được duyệt|ELO|Mạng nhện|Ảnh|ảnh/.test(message)
        ? message
        : "Không thể lưu bài viết. Kiểm tra nội dung và quyền sở hữu rồi thử lại.",
    }
  }
}

/** Permanently deletes the viewer's own post (with its comments, likes and photos). */
export async function deleteCommunityPost(id: string): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập." }
  if (typeof id !== "string" || !/^[\w-]{1,100}$/.test(id))
    return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await getPayloadClient()).delete({
      collection: "community-posts",
      id,
      overrideAccess: false,
      user,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: "Không thể xóa bài viết này. Có thể bài đã bị xóa trước đó." }
  }
}

export async function removeCommunityPost(id: string): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập." }
  try {
    await (await getPayloadClient()).update({
      collection: "community-posts",
      id: cleanCommunityText(id, 100),
      data: { visibility: "removed" },
      overrideAccess: false,
      user,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: "Không thể gỡ bài viết này." }
  }
}

export async function toggleCommunityLike(id: string): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false, error: "Vui lòng đăng nhập để thích bài viết." }
  try {
    const post = cleanCommunityText(id, 100)
    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: "community-likes",
      where: {
        and: [{ post: { equals: post } }, { author: { equals: user.id } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (existing.docs[0]) {
      await payload.delete({
        collection: "community-likes",
        id: existing.docs[0].id,
        overrideAccess: false,
        user,
      })
    } else {
      await payload.create({
        collection: "community-likes",
        data: {
          post,
          author: user.id,
          authorName: user.name,
          key: `${post}:${user.id}`,
        },
        overrideAccess: false,
        user,
      })
    }
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: "Không thể cập nhật lượt thích. Vui lòng tải lại bài viết.",
    }
  }
}

export async function loadCommunityComments(post: string, page = 1) {
  try {
    const user = await appAuth.currentUser()
    const payload = await getPayloadClient()
    const where: Where = { post: { equals: cleanCommunityText(post, 100) } }
    const result = await payload.find({
      collection: "community-comments",
      where,
      page: communityPage(page),
      sort: "-createdAt",
      limit: 20,
      depth: 1,
      overrideAccess: false,
      user,
    })
    // Author avatars come from the public community profile (comments store authorProfile).
    const profileIds = [...new Set(result.docs.map((c) => (c.authorProfile && typeof c.authorProfile === "object" ? c.authorProfile.id : c.authorProfile)).filter(Boolean).map(String))]
    const avatars = new Map<string, string | null>()
    if (profileIds.length) {
      const profiles = await payload.find({
        collection: "community-profiles",
        where: { id: { in: profileIds } },
        depth: 1,
        limit: profileIds.length,
        select: { avatar: true },
        overrideAccess: false,
      })
      for (const p of profiles.docs) avatars.set(String(p.id), p.avatar && typeof p.avatar === "object" ? (p.avatar.url ?? null) : null)
    }
    const own = user
      ? await payload.find({
          collection: "community-comments",
          where: { and: [where, { author: { equals: user.id } }] },
          depth: 0,
          limit: 1000,
          overrideAccess: false,
          user,
        })
      : null
    const ownIds = new Set(own?.docs.map((comment) => comment.id) ?? [])
    let reactionWarning = ""
    const allReactions: { comment: string; reaction: string; mine: boolean }[] = []
    try {
      let reactionPage = 1
      let more = result.docs.length > 0
      while (more) {
        const rows = await payload.find({
          collection: "community-comment-reactions",
          where: { comment: { in: result.docs.map((comment) => comment.id) } },
          depth: 0, limit: 1000, page: reactionPage, overrideAccess: false, user,
        })
        for (const row of rows.docs) {
          const comment = typeof row.comment === "object" ? row.comment?.id : row.comment
          const author = typeof row.author === "object" ? row.author?.id : row.author
          if (comment) allReactions.push({ comment, reaction: row.reaction, mine: !!user && author === user.id })
        }
        more = rows.hasNextPage
        reactionPage++
      }
    } catch {
      reactionWarning = "Bình luận đã tải, nhưng chưa thể đồng bộ cảm xúc. Hãy thử lại."
    }
    return {
      ok: true as const,
      hasNextPage: result.hasNextPage,
      warning: reactionWarning,
      comments: await Promise.all(
        result.docs.map(async (comment) => {
          const parent =
            comment.parent && typeof comment.parent === "object"
              ? comment.parent
              : null
          const reactions = COMMENT_REACTIONS.map((type) => {
            const rows = allReactions.filter((row) => row.comment === comment.id && row.reaction === type)
            return { type, count: rows.length, active: rows.some((row) => row.mine) }
          })
          const profileId = comment.authorProfile && typeof comment.authorProfile === "object" ? String(comment.authorProfile.id) : comment.authorProfile ? String(comment.authorProfile) : null
          return {
            id: comment.id,
            content: communityDisplayText(comment.content),
            authorName: comment.authorName,
            authorProfileId: profileId,
            authorAvatar: profileId ? (avatars.get(profileId) ?? null) : null,
            createdAt: comment.createdAt,
            own: ownIds.has(comment.id),
            parent: parent
              ? {
                  id: parent.id,
                  authorName: parent.authorName,
                  content: communityDisplayText(parent.content),
                }
              : null,
            reactions,
          }
        }),
      ),
    }
  } catch {
    return { ok: false as const, error: "Không thể tải bình luận." }
  }
}

export async function writeCommunityComment(
  post: string,
  content: string,
  parent?: string,
): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập để bình luận." }
  try {
    const payload = await getPayloadClient()
    const text = cleanCommunityText(content, 1000)
    const recent = await payload.count({
      collection: "community-comments",
      where: {
        and: [
          { author: { equals: user.id } },
          {
            createdAt: {
              greater_than: new Date(Date.now() - 60_000).toISOString(),
            },
          },
        ],
      },
      overrideAccess: false,
      user,
    })
    if (recent.totalDocs >= 10)
      return {
        ok: false,
        error: "Vui lòng đợi một phút trước khi bình luận tiếp.",
      }
    await payload.create({
      collection: "community-comments",
      data: {
        post: cleanCommunityText(post, 100),
        content: text,
        parent: parent ? cleanCommunityText(parent, 100) : null,
        author: user.id,
        authorName: user.name,
      },
      overrideAccess: false,
      user,
    })
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: "Không thể gửi bình luận. Bài viết có thể đã được gỡ.",
    }
  }
}

export async function toggleCommentReaction(
  commentID: string,
  value: string,
): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false, error: "Vui lòng đăng nhập để bày tỏ cảm xúc." }
  try {
    const comment = cleanCommunityText(commentID, 100)
    const reaction = parseCommentReaction(value)
    const payload = await getPayloadClient()
    const existing = await payload.find({
      collection: "community-comment-reactions",
      where: {
        and: [
          { comment: { equals: comment } },
          { reaction: { equals: reaction } },
          { author: { equals: user.id } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (existing.docs[0]) {
      await payload.delete({
        collection: "community-comment-reactions",
        id: existing.docs[0].id,
        overrideAccess: false,
        user,
      })
    } else {
      await payload.create({
        collection: "community-comment-reactions",
        data: {
          comment,
          reaction,
          author: user.id,
          authorName: user.name,
          key: `${comment}:${user.id}:${reaction}`,
        },
        overrideAccess: false,
        user,
      })
    }
    return { ok: true }
  } catch {
    return { ok: false, error: "Không thể cập nhật cảm xúc. Hãy thử lại." }
  }
}

export async function repostCommunityPost(
  id: string,
  commentary: string,
): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false, error: "Vui lòng đăng nhập để chia sẻ lên bảng tin." }
  try {
    const payload = await getPayloadClient()
    const source = await payload.findByID({
      collection: "community-posts",
      id: cleanCommunityText(id, 100),
      depth: 0,
      overrideAccess: false,
      user,
    })
    const original =
      typeof source.sharedPost === "object"
        ? source.sharedPost?.id
        : source.sharedPost
    const form = new FormData()
    form.set(
      "content",
      commentary.trim()
        ? cleanCommunityText(commentary, 3000, 5)
        : "Chia sẻ bài viết cùng cộng đồng.",
    )
    form.set("sport", source.sport)
    form.set("topic", "experience")
    form.set("sharedPost", original || source.id)
    return await writeCommunityPost(form)
  } catch {
    return {
      ok: false,
      error:
        "Không thể chia sẻ bài viết. Nội dung cần ít nhất 5 ký tự và bài gốc phải còn công khai.",
    }
  }
}

export async function searchCommunityProducts(query: string, sport: string) {
  try {
    const text = cleanCommunityText(query, 100)
    const filters: Where[] = [{ name: { contains: text } }]
    if (sport === "football" || sport === "badminton")
      filters.push({ sport: { equals: sport } })
    const result = await (await getPayloadClient()).find({
      collection: "products",
      where: { and: filters },
      limit: 8,
      sort: "name",
      depth: 0,
      overrideAccess: false,
      select: { name: true, sport: true },
    })
    return {
      ok: true as const,
      products: result.docs.map((p) => ({
        id: p.id,
        name: p.name,
        sport: p.sport,
      })),
    }
  } catch {
    return { ok: false as const, error: "Không thể tìm sản phẩm. Hãy thử lại." }
  }
}

export async function deleteCommunityComment(id: string): Promise<Result> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập." }
  try {
    await (await getPayloadClient()).delete({
      collection: "community-comments",
      id: cleanCommunityText(id, 100),
      overrideAccess: false,
      user,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: "Bạn không thể xóa bình luận này." }
  }
}
