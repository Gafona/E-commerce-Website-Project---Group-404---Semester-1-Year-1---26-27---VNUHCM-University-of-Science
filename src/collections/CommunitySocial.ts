import type { Access, CollectionConfig, FieldAccess, PayloadRequest, Where } from "payload"
import { notifyUsers } from "../lib/notifications"
import { cleanCommunityText } from "../lib/community-rules"
import {
  CHAT_BANNED_MESSAGE,
  isChatBanned,
  isPostingBanned,
  isStaff,
  POSTING_BANNED_MESSAGE,
} from "../access/roles"
import { hiddenProfileIds, visibleAuthorWhere } from "../lib/community-privacy"

const member: Access = ({ req }) => req.user?.collection === "users"
const deny = () => false
const serverField: FieldAccess = () => false
const idOf = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
      ? String(value.id)
      : null
const owner: Access = ({ req }) =>
  isStaff(req.user)
    ? true
    : req.user?.collection === "users"
      ? { author: { equals: req.user.id } }
      : false
const participants: Access = ({ req }) => {
  if (req.user?.collection !== "users") return false
  const where: Where = {
    or: [
      { memberA: { equals: req.user.id } },
      { memberB: { equals: req.user.id } },
    ],
  }
  return where
}
const privateMembers = (): CollectionConfig["fields"] => [
  {
    name: "memberA",
    type: "relationship",
    relationTo: "users",
    required: true,
    index: true,
    access: { create: serverField, update: serverField },
  },
  {
    name: "memberB",
    type: "relationship",
    relationTo: "users",
    required: true,
    index: true,
    access: { create: serverField, update: serverField },
  },
]

export const STORY_REACTIONS = ["heart", "like", "support"] as const
export type StoryReaction = (typeof STORY_REACTIONS)[number]
const STORY_REACTION_LABEL: Record<StoryReaction, string> = { heart: "thả tim", like: "thích", support: "ủng hộ" }

export const CommunityStories: CollectionConfig = {
  slug: "community-stories",
  labels: { singular: "Story", plural: "Story cộng đồng" },
  admin: { group: "BOAI Community", useAsTitle: "authorName" },
  access: {
    create: member,
    read: async ({ req }) => {
      const hidden = await hiddenProfileIds(req.payload, req.user, req)
      const where: Where = {
        and: [
          { expiresAt: { greater_than: new Date().toISOString() } },
          { visibility: { equals: "visible" } },
          ...visibleAuthorWhere(hidden),
        ],
      }
      return where
    },
    update: deny,
    delete: owner,
  },
  hooks: {
    afterDelete: [
      async ({ id, req }) => {
        // Reactions and views belong to the story; remove them with it.
        for (const collection of ["community-story-reactions", "community-story-views"] as const) {
          await req.payload
            .delete({ collection, where: { story: { equals: id } }, overrideAccess: true, req, depth: 0 })
            .catch((error) => console.error(`story ${collection} cleanup failed`, error))
        }
      },
    ],
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data || operation !== "create" || req.user?.collection !== "users")
          throw new Error("Vui lòng đăng nhập để đăng story.")
        if (isPostingBanned(req.user)) throw new Error(POSTING_BANNED_MESSAGE)
        const recent = await req.payload.count({
          collection: "community-stories",
          where: {
            and: [
              { author: { equals: req.user.id } },
              {
                createdAt: {
                  greater_than: new Date(Date.now() - 3600_000).toISOString(),
                },
              },
            ],
          },
          overrideAccess: false,
          user: req.user,
          req,
        })
        if (recent.totalDocs >= 10)
          throw new Error(
            "Bạn đã đăng 10 story trong một giờ. Vui lòng thử lại sau.",
          )
        data.author = req.user.id
        data.authorName = req.user.name
        const profiles = await req.payload.find({
          collection: "community-profiles",
          where: { account: { equals: req.user.id } },
          limit: 1,
          depth: 0,
          overrideAccess: false,
          user: req.user,
          req,
        })
        data.authorProfile = profiles.docs[0]?.id ?? null
        data.expiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString()
        data.visibility = "visible"
        data.content = data.content ? cleanCommunityText(data.content, 500) : ""
        if (!data.content && !data.image && !data.video)
          throw new Error("Story cần nội dung, ảnh hoặc video.")
        if (data.image && data.video)
          throw new Error("Mỗi story chỉ chứa một ảnh hoặc một video.")
        if (!["ocean", "sunset", "forest"].includes(data.theme))
          data.theme = "ocean"
        if (data.image) {
          const image = await req.payload.findByID({
            collection: "media",
            id: cleanCommunityText(data.image, 100),
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          if (
            idOf(image.communityOwner) !== req.user.id ||
            !["image/jpeg", "image/png", "image/webp"].includes(
              image.mimeType ?? "",
            )
          )
            throw new Error("Ảnh story không hợp lệ hoặc không thuộc về bạn.")
        }
        if (data.video) {
          const video = await req.payload.findByID({
            collection: "media",
            id: idOf(data.video)!,
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          if (
            idOf(video.communityOwner) !== req.user.id ||
            !["video/mp4", "video/webm"].includes(video.mimeType ?? "") ||
            (video.filesize ?? 0) > 30 * 1024 * 1024
          )
            throw new Error("Video story không hợp lệ hoặc không thuộc về bạn.")
        }
        if (data.music) {
          const music = await req.payload.findByID({
            collection: "story-music",
            id: idOf(data.music)!,
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          if (!music.active) throw new Error("Bản nhạc không còn khả dụng.")
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      access: {
        create: serverField,
        update: serverField,
        read: ({ req }) => req.user?.collection === "users",
      },
    },
    {
      name: "authorName",
      type: "text",
      required: true,
      access: { create: serverField, update: serverField },
    },
    {
      name: "authorProfile",
      type: "relationship",
      relationTo: "community-profiles",
      access: { create: serverField, update: serverField },
    },
    { name: "content", type: "textarea", maxLength: 500 },
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "video",
      type: "upload",
      relationTo: "media",
      filterOptions: { mimeType: { in: ["video/mp4", "video/webm"] } },
    },
    { name: "music", type: "relationship", relationTo: "story-music" },
    {
      name: "theme",
      type: "select",
      defaultValue: "ocean",
      options: ["ocean", "sunset", "forest"],
    },
    {
      name: "expiresAt",
      type: "date",
      required: true,
      index: true,
      access: { create: serverField, update: serverField },
    },
    {
      name: "visibility",
      type: "select",
      defaultValue: "visible",
      options: ["visible", "removed"],
      access: { create: serverField, update: serverField },
    },
  ],
}

export const CommunityConversations: CollectionConfig = {
  slug: "community-conversations",
  labels: { singular: "Cuộc trò chuyện", plural: "Trò chuyện riêng" },
  admin: { group: "BOAI Community", useAsTitle: "nameB" },
  access: {
    create: member,
    read: participants,
    update: participants,
    delete: deny,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data || req.user?.collection !== "users")
          throw new Error("Vui lòng đăng nhập.")
        if (operation === "create" && isChatBanned(req.user))
          throw new Error(CHAT_BANNED_MESSAGE)
        if (operation === "update") {
          // Read receipts only clear the viewer's unread counter.
          if (req.context?.communityReadState) return data
          if (!req.context?.communityMessageActivity)
            throw new Error("Không thể thay đổi thành viên cuộc trò chuyện.")
          data.lastMessageAt = new Date().toISOString()
          return data
        }
        // Trusted identity resolution from a public profile, never a client-supplied account.
        const profile = await req.payload.findByID({
          collection: "community-profiles",
          id: cleanCommunityText(data.recipientProfile, 100),
          depth: 0,
          select: { account: true, name: true },
          overrideAccess: false,
          user: req.user,
          req,
        })
        const recipient = idOf(profile.account)
        if (!recipient || recipient === req.user.id)
          throw new Error("Hãy chọn một thành viên khác để trò chuyện.")
        data.memberA = req.user.id
        data.memberB = recipient
        data.nameA = req.user.name
        data.nameB = profile.name
        data.key = JSON.stringify([req.user.id, recipient].sort())
        data.lastMessageAt = new Date().toISOString()
        return data
      },
    ],
  },
  fields: [
    ...privateMembers(),
    {
      name: "recipientProfile",
      type: "relationship",
      relationTo: "community-profiles",
      required: true,
      access: { update: serverField },
    },
    {
      name: "nameA",
      type: "text",
      required: true,
      access: { create: serverField, update: serverField },
    },
    {
      name: "nameB",
      type: "text",
      required: true,
      access: { create: serverField, update: serverField },
    },
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      access: { create: serverField, update: serverField, read: serverField },
    },
    {
      name: "lastMessageAt",
      type: "date",
      index: true,
      access: { create: serverField, update: serverField },
    },
    { name: "lastMessage", type: "text", maxLength: 160, access: { create: serverField, update: serverField } },
    { name: "lastSender", type: "relationship", relationTo: "users", access: { create: serverField, update: serverField } },
    // Unread counters per member (A/B as stored in memberA/memberB).
    { name: "unreadA", type: "number", defaultValue: 0, min: 0, access: { create: serverField, update: serverField } },
    { name: "unreadB", type: "number", defaultValue: 0, min: 0, access: { create: serverField, update: serverField } },
  ],
}

export const CommunityMessages: CollectionConfig = {
  slug: "community-messages",
  labels: { singular: "Tin nhắn", plural: "Tin nhắn riêng" },
  admin: { group: "BOAI Community", useAsTitle: "senderName" },
  access: { create: member, read: participants, update: deny, delete: deny },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data || req.user?.collection !== "users")
          throw new Error("Vui lòng đăng nhập.")
        if (isChatBanned(req.user)) throw new Error(CHAT_BANNED_MESSAGE)
        const conversation = await req.payload.findByID({
          collection: "community-conversations",
          id: cleanCommunityText(data.conversation, 100),
          depth: 0,
          overrideAccess: false,
          user: req.user,
          req,
        })
        const a = idOf(conversation.memberA)
        const b = idOf(conversation.memberB)
        if (a !== req.user.id && b !== req.user.id)
          throw new Error("Bạn không thuộc cuộc trò chuyện này.")
        data.memberA = a
        data.memberB = b
        data.sender = req.user.id
        data.senderName = req.user.name
        data.content = cleanCommunityText(data.content, 2000)
        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== "create") return
        const conversation = idOf(doc.conversation)
        if (!conversation) return
        try {
          const current = await req.payload.findByID({
            collection: "community-conversations",
            id: conversation,
            depth: 0,
            overrideAccess: true,
            req,
          })
          const fromA = idOf(current.memberA) === idOf(doc.sender)
          await req.payload.update({
            collection: "community-conversations",
            id: conversation,
            data: {
              lastMessage: String(doc.content ?? "").replace(/\s+/g, " ").slice(0, 160),
              lastSender: idOf(doc.sender),
              unreadA: fromA ? 0 : Number(current.unreadA ?? 0) + 1,
              unreadB: fromA ? Number(current.unreadB ?? 0) + 1 : 0,
            },
            context: { communityMessageActivity: true },
            overrideAccess: true,
            req,
          })
        } catch {
          // The message is already saved; do not turn a metadata failure into a duplicate send.
          console.warn(
            "Community conversation activity could not be refreshed.",
          )
        }
      },
    ],
  },
  fields: [
    ...privateMembers(),
    {
      name: "conversation",
      type: "relationship",
      relationTo: "community-conversations",
      required: true,
      index: true,
    },
    {
      name: "sender",
      type: "relationship",
      relationTo: "users",
      required: true,
      access: { create: serverField, update: serverField },
    },
    {
      name: "senderName",
      type: "text",
      required: true,
      access: { create: serverField, update: serverField },
    },
    { name: "content", type: "textarea", required: true, maxLength: 2000 },
  ],
}

const viewerOrOwner: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  const where: Where = {
    or: [{ author: { equals: req.user.id } }, { storyOwner: { equals: req.user.id } }],
  }
  return where
}

/** Story the viewer can see (expired, removed and private stories are rejected by its read access). */
async function visibleStory(req: PayloadRequest, id: unknown) {
  const storyId = idOf(id)
  if (!storyId || req.user?.collection !== "users") return null
  return req.payload
    .findByID({ collection: "community-stories", id: storyId, depth: 0, overrideAccess: false, user: req.user, req })
    .catch(() => null)
}

export const CommunityStoryReactions: CollectionConfig = {
  slug: "community-story-reactions",
  labels: { singular: "Cảm xúc story", plural: "Cảm xúc story" },
  admin: { group: "BOAI Community", useAsTitle: "authorName", defaultColumns: ["authorName", "reaction", "story", "createdAt"] },
  access: {
    create: member,
    read: viewerOrOwner,
    update: owner,
    delete: owner,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (!data || req.user?.collection !== "users") throw new Error("Vui lòng đăng nhập.")
        if (!STORY_REACTIONS.includes(data.reaction)) throw new Error("Cảm xúc không hợp lệ.")
        // Server fields are locked by field access; only the reaction itself can change.
        if (operation === "update") return data
        const story = await visibleStory(req, data.story)
        if (!story) throw new Error("Story không còn khả dụng.")
        const ownerId = idOf(story.author)
        if (ownerId === String(req.user.id)) throw new Error("Bạn không thể thả cảm xúc cho story của mình.")
        data.story = story.id
        data.author = req.user.id
        data.authorName = req.user.name
        data.storyOwner = ownerId
        data.key = `${story.id}:${req.user.id}`
        const profiles = await req.payload.find({
          collection: "community-profiles",
          where: { account: { equals: req.user.id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        data.authorProfile = profiles.docs[0]?.id ?? null
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (previousDoc?.reaction === doc.reaction) return doc
        const reaction = STORY_REACTION_LABEL[doc.reaction as StoryReaction] ?? "thả cảm xúc"
        await notifyUsers(
          req,
          [doc.storyOwner],
          {
            category: "community",
            kind: "story-reaction",
            title: `${doc.authorName} đã ${reaction} story của bạn`,
            href: "/cong-dong",
            actorName: doc.authorName,
            dedupeKey: `story-reaction:${idOf(doc.story)}:${idOf(doc.author)}:${doc.reaction}`,
          },
          { pref: "community", exclude: [doc.author] },
        )
        return doc
      },
    ],
  },
  fields: [
    { name: "story", type: "relationship", relationTo: "community-stories", required: true, index: true, access: { update: serverField } },
    { name: "author", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "authorName", type: "text", required: true, access: { create: serverField, update: serverField } },
    { name: "authorProfile", type: "relationship", relationTo: "community-profiles", access: { create: serverField, update: serverField } },
    { name: "storyOwner", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "reaction", type: "select", required: true, options: [...STORY_REACTIONS] },
    { name: "key", type: "text", required: true, unique: true, access: { create: serverField, update: serverField, read: serverField } },
  ],
}

export const CommunityStoryViews: CollectionConfig = {
  slug: "community-story-views",
  labels: { singular: "Lượt xem story", plural: "Lượt xem story" },
  admin: { group: "BOAI Community", useAsTitle: "viewerName", defaultColumns: ["viewerName", "story", "createdAt"] },
  access: {
    create: member,
    read: ({ req }) => {
      if (isStaff(req.user)) return true
      if (req.user?.collection !== "users") return false
      const where: Where = { or: [{ viewer: { equals: req.user.id } }, { storyOwner: { equals: req.user.id } }] }
      return where
    },
    update: deny,
    delete: deny,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data || req.user?.collection !== "users") throw new Error("Vui lòng đăng nhập.")
        const story = await visibleStory(req, data.story)
        if (!story) throw new Error("Story không còn khả dụng.")
        const ownerId = idOf(story.author)
        if (ownerId === String(req.user.id)) throw new Error("Không ghi lượt xem story của chính bạn.")
        data.story = story.id
        data.viewer = req.user.id
        data.viewerName = req.user.name
        data.storyOwner = ownerId
        data.key = `${story.id}:${req.user.id}`
        const profiles = await req.payload.find({
          collection: "community-profiles",
          where: { account: { equals: req.user.id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        data.viewerProfile = profiles.docs[0]?.id ?? null
        return data
      },
    ],
  },
  fields: [
    { name: "story", type: "relationship", relationTo: "community-stories", required: true, index: true },
    { name: "viewer", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "viewerName", type: "text", required: true, access: { create: serverField, update: serverField } },
    { name: "viewerProfile", type: "relationship", relationTo: "community-profiles", access: { create: serverField, update: serverField } },
    { name: "storyOwner", type: "relationship", relationTo: "users", required: true, index: true, access: { create: serverField, update: serverField } },
    { name: "key", type: "text", required: true, unique: true, access: { create: serverField, update: serverField, read: serverField } },
  ],
}
