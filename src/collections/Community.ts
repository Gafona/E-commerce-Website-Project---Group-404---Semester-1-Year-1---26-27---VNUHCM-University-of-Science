import { MAX_POST_IMAGES, POST_IMAGE_TYPES } from "../lib/community-media"
import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
} from "payload"
import {
  cleanCommunityText,
  communityLikeKey,
  parseCommunityPost,
  parseCommentReaction,
} from "../lib/community-rules"
import { isPostingBanned, isStaff, POSTING_BANNED_MESSAGE } from "../access/roles"
import { hiddenProfileIds, visibleAuthorWhere } from "../lib/community-privacy"
import { ensureAuthorProfile } from "../lib/community-author"
import { missingResultMessage, ownerDnaShare } from "../lib/dna-snapshot"
import { cleanupPost, deleteWhere, idsWhere } from "../hooks/cleanup"
import {
  notifyCommentChanges,
  notifyCommentRemoval,
  notifyPostChanges,
  notifyPostRemoval,
} from "../hooks/community-notifications"
import { isDnaShareKind, isDnaSport } from "../lib/sportdna-share"

const admin: Access = ({ req }) => isStaff(req.user)
const member: Access = ({ req }) =>
  req.user?.collection === "users" || req.user?.collection === "admins"
const owner: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { author: { equals: req.user.id } }
}
const adminField: FieldAccess = ({ req }) => isStaff(req.user)

const readAuthor: FieldAccess = ({ req, doc }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  // Payload checks field permissions without a document before validating
  // ownership filters. On actual reads, reveal only the viewer's own identity.
  if (!doc) return true
  const author = typeof doc.author === "object" ? doc.author?.id : doc.author
  return author === req.user.id
}

const identityFields = (): CollectionConfig["fields"] => [
  {
    name: "author",
    type: "relationship",
    relationTo: "users",
    required: true,
    index: true,
    access: { read: readAuthor, update: adminField },
    admin: { readOnly: true },
  },
  {
    name: "authorName",
    type: "text",
    required: true,
    access: { create: adminField, update: adminField },
    admin: { readOnly: true },
  },
  {
    name: "authorProfile",
    type: "relationship",
    relationTo: "community-profiles",
    access: { create: adminField, update: adminField },
    admin: { readOnly: true },
  },
]

const setIdentity: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (!data) return data
  if (req.user?.collection === "users") {
    data.author = operation === "create" ? req.user.id : originalDoc.author
    data.authorName =
      operation === "create" ? req.user.name : originalDoc.authorName
  }
  const author = data.author ?? originalDoc?.author
  const authorID = typeof author === "object" ? author?.id : author
  if (typeof authorID === "string") {
    // Trusted identity lookup (created from the account when missing); never
    // return private account data to the browser.
    const profile = await ensureAuthorProfile(req, authorID)
    data.authorProfile = profile?.id ?? null
    if (profile) data.authorName = profile.name
  }
  return data
}

// Banned members may still remove their own content; they can't publish or edit it.
const enforcePostingBan: CollectionBeforeValidateHook = ({ data, req, operation }) => {
  const writesContent = operation === "create" || data?.content !== undefined
  if (writesContent && isPostingBanned(req.user)) throw new Error(POSTING_BANNED_MESSAGE)
  return data
}

// Shared SportDNA result cards are server snapshots: the client only picks kind + sport.
const snapshotAchievement: CollectionBeforeValidateHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  if (!data) return data
  if (operation === "update") {
    if (!isStaff(req.user)) {
      if (originalDoc?.achievement) data.achievement = originalDoc.achievement
      else delete data.achievement
    }
    return data
  }
  const requested = data.achievement as { kind?: unknown; sport?: unknown } | null | undefined
  if (!requested || !isDnaShareKind(requested.kind)) {
    delete data.achievement
    return data
  }
  if (!isDnaSport(requested.sport)) throw new Error("Môn thể thao không hợp lệ.")
  const authorID = typeof data.author === "object" ? data.author?.id : data.author
  if (typeof authorID !== "string") throw new Error("Không xác định được tác giả.")
  const snapshot = await ownerDnaShare(req, authorID, requested.kind, requested.sport)
  if (!snapshot) throw new Error(missingResultMessage(requested.kind))
  data.achievement = snapshot
  return data
}

const requireVisiblePost: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (!data) return data
  const id = operation === "create" ? data.post : originalDoc.post
  if (!id || typeof id !== "string") throw new Error("Bài viết không hợp lệ.")
  const post = await req.payload.findByID({
    collection: "community-posts",
    id,
    depth: 0,
    overrideAccess: false,
    user: req.user,
  })
  if (post.visibility !== "visible")
    throw new Error("Bài viết không còn công khai.")
  data.post = id
  return data
}

export const CommunityPosts: CollectionConfig = {
  slug: "community-posts",
  labels: { singular: "Bài viết cộng đồng", plural: "Bài viết cộng đồng" },
  admin: {
    group: "BOAI Community",
    useAsTitle: "content",
    defaultColumns: ["authorName", "sport", "topic", "visibility", "createdAt"],
  },
  access: {
    create: member,
    // Private profiles share posts only with themselves and accepted followers.
    read: async ({ req }) => {
      if (isStaff(req.user)) return true
      const hidden = await hiddenProfileIds(req.payload, req.user, req)
      return {
        and: [{ visibility: { equals: "visible" } }, ...visibleAuthorWhere(hidden)],
      }
    },
    update: owner,
    // Authors may delete their own posts outright; moderators any post.
    delete: owner,
  },
  hooks: {
    beforeDelete: [notifyPostRemoval, ({ id, req }) => cleanupPost(req, id)],
    afterDelete: [
      // Post photos are uploads made for this post only; don't leave them orphaned.
      async ({ doc, req }) => {
        const ids = (Array.isArray(doc?.images) ? doc.images : [])
          .map((image: unknown) => (image && typeof image === "object" && "id" in image ? (image as { id: unknown }).id : image))
          .filter((id: unknown): id is string | number => typeof id === "string" || typeof id === "number")
        for (const id of ids)
          await req.payload
            .delete({ collection: "media", id, overrideAccess: true, req })
            .catch(() => null)
        return doc
      },
    ],
    afterChange: [notifyPostChanges],
    beforeValidate: [
      enforcePostingBan,
      setIdentity,
      snapshotAchievement,
      async ({ data, originalDoc, req, operation }) => {
        if (!data) return data
        // Moderation updates (hide/restore) skip author-facing publishing rules.
        if (operation === "update" && isStaff(req.user)) return data
        const input = parseCommunityPost({ ...originalDoc, ...data })
        Object.assign(data, input)
        if (
          req.user?.collection === "users" &&
          input.topic === "offer" &&
          req.user.sellerStatus !== "approved"
        ) {
          throw new Error(
            "Chỉ shop đã được duyệt mới có thể đăng bài chào sản phẩm.",
          )
        }
        if (req.user?.collection === "users" && operation === "create")
          data.visibility = "visible"
        if (
          req.user?.collection === "users" &&
          originalDoc?.visibility === "hidden"
        )
          throw new Error("Bài viết đã được quản trị viên ẩn.")
        // Post photos must be images uploaded by the author themselves.
        const imageIds = (Array.isArray(data.images) ? data.images : [])
          .map((value: unknown) => (value && typeof value === "object" && "id" in value ? (value as { id: unknown }).id : value))
          .filter(Boolean)
          .map(String)
        if (imageIds.length > MAX_POST_IMAGES)
          throw new Error(`Mỗi bài viết tối đa ${MAX_POST_IMAGES} ảnh.`)
        // Only newly attached photos need the ownership check; photos already on
        // the post were checked when they were added (system re-saves keep them).
        const existingImages = new Set(
          (Array.isArray(originalDoc?.images) ? originalDoc.images : [])
            .map((value: unknown) => (value && typeof value === "object" && "id" in value ? (value as { id: unknown }).id : value))
            .filter(Boolean)
            .map(String),
        )
        for (const imageId of imageIds.filter((id: string) => !existingImages.has(id))) {
          const media = await req.payload
            .findByID({ collection: "media", id: imageId, depth: 0, overrideAccess: true, req })
            .catch(() => null)
          const ownerId = media?.communityOwner && typeof media.communityOwner === "object" ? media.communityOwner.id : media?.communityOwner
          if (!media || String(ownerId) !== String(req.user?.id) || !POST_IMAGE_TYPES.includes(media.mimeType ?? ""))
            throw new Error("Ảnh bài viết không hợp lệ hoặc không thuộc về bạn.")
        }
        if (Array.isArray(data.images)) data.images = imageIds
        if (input.product) {
          await req.payload.findByID({
            collection: "products",
            id: input.product,
            depth: 0,
            overrideAccess: false,
            user: req.user,
          })
        }
        // A repost keeps its original source; never allow chains or cycles.
        const sharedPost =
          operation === "create" ? data.sharedPost : originalDoc?.sharedPost
        data.sharedPost = sharedPost ?? null
        if (sharedPost) {
          const sourceID =
            typeof sharedPost === "object" ? sharedPost.id : sharedPost
          const source = await req.payload.findByID({
            collection: "community-posts",
            id: sourceID,
            depth: 1,
            overrideAccess: false,
            user: req.user,
          })
          if (
            source.visibility !== "visible" ||
            source.sharedPost
          ) {
            throw new Error("Bài viết gốc không còn hợp lệ để chia sẻ.")
          }
        }
        return data
      },
    ],
  },
  fields: [
    ...identityFields(),
    {
      name: "content",
      type: "textarea",
      required: true,
      minLength: 5,
      maxLength: 3000,
    },
    {
      name: "images",
      label: "Ảnh",
      type: "upload",
      relationTo: "media",
      hasMany: true,
      maxRows: MAX_POST_IMAGES,
      filterOptions: { mimeType: { in: POST_IMAGE_TYPES } },
    },
    {
      name: "sport",
      type: "select",
      required: true,
      defaultValue: "all",
      options: [
        { label: "Tất cả", value: "all" },
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
      ],
    },
    {
      name: "topic",
      type: "select",
      required: true,
      defaultValue: "experience",
      options: [
        { label: "Chia sẻ trải nghiệm", value: "experience" },
        { label: "Hỏi cộng đồng", value: "question" },
        { label: "Đánh giá sản phẩm", value: "review" },
        { label: "Mẹo chọn đồ", value: "tips" },
        { label: "Shop chào sản phẩm", value: "offer" },
        { label: "Tìm mua sản phẩm", value: "wanted" },
      ],
    },
    { name: "product", type: "relationship", relationTo: "products" },
    {
      name: "achievement",
      label: "Kết quả SportDNA được chia sẻ",
      type: "group",
      admin: {
        readOnly: true,
        description: "Ảnh chụp ELO / mạng nhện do hệ thống tính tại thời điểm đăng.",
      },
      fields: [
        {
          name: "kind",
          type: "select",
          options: [
            { label: "Điểm ELO", value: "elo" },
            { label: "Mạng nhện", value: "radar" },
          ],
        },
        {
          name: "sport",
          type: "select",
          options: [
            { label: "Cầu lông", value: "badminton" },
            { label: "Bóng đá", value: "football" },
          ],
        },
        { name: "stats", type: "json" },
        { name: "axes", type: "json" },
      ],
    },
    {
      name: "sharedPost",
      label: "Bài viết gốc",
      type: "relationship",
      relationTo: "community-posts",
      access: { update: () => false },
    },
    {
      name: "visibility",
      type: "select",
      required: true,
      defaultValue: "visible",
      options: [
        { label: "Công khai", value: "visible" },
        { label: "Tác giả đã gỡ", value: "removed" },
        { label: "Quản trị viên đã ẩn", value: "hidden" },
      ],
      access: {
        create: adminField,
        update: ({ req, siblingData }) =>
          isStaff(req.user) ||
          (req.user?.collection === "users" &&
            siblingData?.visibility === "removed"),
      },
    },
  ],
}

export const CommunityComments: CollectionConfig = {
  slug: "community-comments",
  labels: { singular: "Bình luận", plural: "Bình luận cộng đồng" },
  admin: {
    group: "BOAI Community",
    useAsTitle: "content",
    defaultColumns: ["authorName", "content", "createdAt"],
  },
  access: {
    create: member,
    read: ({ req }) =>
      isStaff(req.user)
        ? true
        : { "post.visibility": { equals: "visible" } },
    update: owner,
    delete: owner,
  },
  hooks: {
    afterChange: [notifyCommentChanges],
    beforeDelete: [
      notifyCommentRemoval,
      async ({ id, req }) => {
        if (req.context.cascading) return
        const replies = await idsWhere(req, "community-comments", { parent: { equals: id } })
        const ids = [id, ...replies]
        await deleteWhere(req, "community-comment-reactions", { comment: { in: ids } })
        if (replies.length) await deleteWhere(req, "community-comments", { id: { in: replies } })
      },
    ],
    beforeValidate: [
      enforcePostingBan,
      setIdentity,
      requireVisiblePost,
      ({ data }) => {
        if (data?.content !== undefined)
          data.content = cleanCommunityText(data.content, 1000)
        return data
      },
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data
        const parent =
          operation === "create" ? data.parent : originalDoc?.parent
        data.parent = parent ?? null
        if (parent) {
          const id = typeof parent === "object" ? parent.id : parent
          const comment = await req.payload.findByID({
            collection: "community-comments",
            id,
            depth: 0,
            overrideAccess: false,
            user: req.user,
          })
          const post =
            typeof comment.post === "object" ? comment.post?.id : comment.post
          if (post !== data.post)
            throw new Error("Chỉ có thể trả lời bình luận trong cùng bài viết.")
        }
        return data
      },
    ],
  },
  fields: [
    ...identityFields(),
    {
      name: "post",
      type: "relationship",
      relationTo: "community-posts",
      required: true,
      index: true,
      access: { update: adminField },
    },
    { name: "content", type: "textarea", required: true, maxLength: 1000 },
    {
      name: "parent",
      label: "Trả lời bình luận",
      type: "relationship",
      relationTo: "community-comments",
      index: true,
      access: { update: () => false },
    },
  ],
}

export const CommunityCommentReactions: CollectionConfig = {
  slug: "community-comment-reactions",
  labels: { singular: "Cảm xúc bình luận", plural: "Cảm xúc bình luận" },
  admin: {
    group: "BOAI Community",
    defaultColumns: ["authorName", "comment", "reaction"],
  },
  access: {
    create: member,
    read: async ({ req }) => {
      if (isStaff(req.user)) return true
      // The Content API supports one relationship traversal, not comment.post.
      const ids: string[] = []
      let page = 1
      let more = true
      while (more) {
        const comments = await req.payload.find({
          collection: "community-comments", depth: 0, limit: 1000, page,
          select: { createdAt: true }, overrideAccess: false, user: req.user, req,
        })
        ids.push(...comments.docs.map((comment) => comment.id))
        more = comments.hasNextPage
        page++
      }
      return ids.length ? { comment: { in: ids } } : false
    },
    update: () => false,
    delete: owner,
  },
  hooks: {
    beforeValidate: [
      setIdentity,
      async ({ data, req }) => {
        if (!data) return data
        const comment = cleanCommunityText(data.comment, 100)
        const target = await req.payload.findByID({
          collection: "community-comments",
          id: comment,
          depth: 0,
          overrideAccess: false,
          user: req.user,
        })
        const postID =
          typeof target.post === "object" ? target.post?.id : target.post
        if (!postID) throw new Error("Bình luận không còn tồn tại.")
        const post = await req.payload.findByID({
          collection: "community-posts",
          id: postID,
          depth: 0,
          overrideAccess: false,
          user: req.user,
        })
        if (post.visibility !== "visible")
          throw new Error("Bài viết không còn công khai.")
        data.reaction = parseCommentReaction(data.reaction)
        data.key = `${comment}:${data.author}:${data.reaction}`
        return data
      },
    ],
  },
  fields: [
    ...identityFields(),
    {
      name: "comment",
      type: "relationship",
      relationTo: "community-comments",
      required: true,
      index: true,
    },
    {
      name: "reaction",
      type: "select",
      required: true,
      options: [
        { label: "Yêu thích", value: "heart" },
        { label: "Thích", value: "like" },
        { label: "Ủng hộ", value: "support" },
      ],
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      access: { read: adminField, create: adminField, update: adminField },
    },
  ],
}

export const CommunityLikes: CollectionConfig = {
  slug: "community-likes",
  labels: { singular: "Lượt thích", plural: "Lượt thích cộng đồng" },
  admin: {
    group: "BOAI Community",
    defaultColumns: ["authorName", "post", "createdAt"],
  },
  access: {
    create: member,
    read: ({ req }) =>
      isStaff(req.user)
        ? true
        : { "post.visibility": { equals: "visible" } },
    update: () => false,
    delete: owner,
  },
  hooks: {
    beforeValidate: [
      setIdentity,
      requireVisiblePost,
      ({ data }) => {
        if (data?.post && data?.author)
          data.key = communityLikeKey(String(data.post), String(data.author))
        return data
      },
    ],
  },
  fields: [
    ...identityFields(),
    {
      name: "post",
      type: "relationship",
      relationTo: "community-posts",
      required: true,
      index: true,
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      index: true,
      access: { read: adminField, create: adminField, update: adminField },
      admin: { readOnly: true },
    },
  ],
}

// Simulated shares are stored separately and never reported as real link shares.
export const CommunityDemoShares: CollectionConfig = {
  slug: "community-demo-shares",
  labels: { singular: "Chia sẻ minh họa", plural: "Chia sẻ minh họa" },
  admin: {
    group: "BOAI Community",
    defaultColumns: ["authorName", "post", "createdAt"],
  },
  access: {
    read: ({ req }) =>
      isStaff(req.user)
        ? true
        : { "post.visibility": { equals: "visible" } },
    create: admin,
    update: () => false,
    delete: admin,
  },
  hooks: {
    beforeValidate: [
      setIdentity,
      requireVisiblePost,
      async ({ data, req }) => {
        if (!data?.authorProfile)
          throw new Error("Chia sẻ minh họa cần hồ sơ minh họa.")
        const profile = await req.payload.findByID({
          collection: "community-profiles",
          id: data.authorProfile,
          depth: 0,
          overrideAccess: false,
          user: req.user,
          req,
        })
        if (!profile.demo)
          throw new Error("Không thể tạo tương tác mẫu cho hồ sơ thật.")
        data.key = communityLikeKey(String(data.post), String(data.author))
        return data
      },
    ],
  },
  fields: [
    ...identityFields(),
    {
      name: "post",
      type: "relationship",
      relationTo: "community-posts",
      required: true,
      index: true,
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      access: { read: adminField, create: adminField, update: adminField },
    },
  ],
}
