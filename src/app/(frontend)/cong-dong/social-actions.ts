"use server"

/** Public follow counts; friend requests are returned only to their participants. */

import sharp from "sharp"
import { findCommunityMembers } from "@/lib/community-directory"
import { communityPublicId } from "@/lib/community-identity"
import { toStoryMusicTrack } from "@/lib/story-music"
import {
  MAX_STORY_VIDEO,
  STORY_VIDEO_TYPES,
  validStoryVideo,
} from "@/lib/community-media"
import { appAuth } from "@/lib/app-auth"
import { ensureCommunityProfile as ensureProfile } from "@/lib/community-profile"
import { getPayloadClient } from "@/lib/payload"
import {
  cleanCommunityText,
  communityDisplayText,
  communityPage,
} from "@/lib/community-rules"
import type { User } from "@/payload-types"
import type { Where } from "payload"
import { getTr } from "@/lib/i18n-server"
import { hit } from "@/lib/rate-limit"
import { STORY_REACTIONS, type StoryReaction } from "@/collections/CommunitySocial"

const idOf = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
      ? String(value.id)
      : null
export async function loadCommunityStories(page = 1) {
  try {
    const user = await appAuth.currentUser()
    const result = await (await getPayloadClient()).find({
      collection: "community-stories",
      sort: "-createdAt",
      page: communityPage(page),
      limit: 30,
      depth: 2,
      overrideAccess: false,
      user,
    })
    // Viewers see their own reaction; authors see views and reactions on their stories.
    const payload = await getPayloadClient()
    const ownIds = user ? result.docs.filter((s) => idOf(s.author) === user.id).map((s) => s.id) : []
    const otherIds = result.docs.map((s) => s.id).filter((id) => !ownIds.includes(id))
    const none = { docs: [] as { story?: unknown; reaction?: string | null }[] }
    const [mine, ownReactions, ownViews] = user
      ? await Promise.all([
          otherIds.length
            ? payload.find({ collection: "community-story-reactions", where: { and: [{ author: { equals: user.id } }, { story: { in: otherIds } }] }, depth: 0, pagination: false, overrideAccess: false, user, select: { story: true, reaction: true } })
            : none,
          ownIds.length
            ? payload.find({ collection: "community-story-reactions", where: { story: { in: ownIds } }, depth: 0, pagination: false, overrideAccess: false, user, select: { story: true, reaction: true } })
            : none,
          ownIds.length
            ? payload.find({ collection: "community-story-views", where: { story: { in: ownIds } }, depth: 0, pagination: false, overrideAccess: false, user, select: { story: true } })
            : none,
        ])
      : [none, none, none]
    const myReaction = new Map(mine.docs.map((r) => [idOf(r.story), (r.reaction ?? null) as StoryReaction | null]))
    const statsFor = (id: string) => {
      const reactions = { heart: 0, like: 0, support: 0 } as Record<StoryReaction, number>
      for (const r of ownReactions.docs) if (idOf(r.story) === id && r.reaction && r.reaction in reactions) reactions[r.reaction as StoryReaction]++
      return { views: ownViews.docs.filter((v) => idOf(v.story) === id).length, reactions }
    }
    return {
      ok: true as const,
      hasNextPage: result.hasNextPage,
      stories: result.docs.map((s) => ({
        id: s.id,
        authorName: s.authorName,
        profileID: idOf(s.authorProfile),
        content: communityDisplayText(s.content ?? ""),
        theme: s.theme ?? "ocean",
        image:
          s.image && typeof s.image === "object" ? (s.image.url ?? null) : null,
        video:
          s.video && typeof s.video === "object" ? (s.video.url ?? null) : null,
        music:
          s.music && typeof s.music === "object"
            ? toStoryMusicTrack(s.music)
            : null,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        own: !!user && idOf(s.author) === user.id,
        myReaction: myReaction.get(s.id) ?? null,
        stats: ownIds.includes(s.id) ? statsFor(s.id) : null,
      })),
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải story. Vui lòng thử lại.",
    }
  }
}

export async function createCommunityStory(form: FormData) {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false as const, error: "Vui lòng đăng nhập để đăng story." }
  try {
    const content = form.get("content")
      ? cleanCommunityText(form.get("content"), 500)
      : ""
    const theme = cleanCommunityText(form.get("theme") ?? "ocean", 20)
    if (theme !== "ocean" && theme !== "sunset" && theme !== "forest")
      throw new Error("Màu story không hợp lệ.")
    const file = form.get("image")
    const hasFile = file instanceof File && file.size > 0
    const isVideo = hasFile && STORY_VIDEO_TYPES.includes(file.type)
    if (!content && !hasFile)
      throw new Error("Story cần nội dung, ảnh hoặc video.")
    if (
      hasFile &&
      (isVideo
        ? file.size > MAX_STORY_VIDEO
        : file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    )
      throw new Error("Ảnh tối đa 5 MB; video MP4/WebM tối đa 30 MB.")
    const music =
      typeof form.get("music") === "string"
        ? String(form.get("music")).trim()
        : ""
    const payload = await getPayloadClient()
    const recent = await payload.count({
      collection: "community-stories",
      where: {
        and: [
          { author: { equals: user.id } },
          {
            createdAt: {
              greater_than: new Date(Date.now() - 3600_000).toISOString(),
            },
          },
        ],
      },
      overrideAccess: false,
      user,
    })
    if (recent.totalDocs >= 10)
      throw new Error(
        "Bạn đã đăng 10 story trong một giờ. Vui lòng thử lại sau.",
      )
    let image: string | null = null
    if (hasFile) {
      const raw = Buffer.from(await file.arrayBuffer())
      if (isVideo && !validStoryVideo(raw, file.type))
        throw new Error("Video không hợp lệ.")
      const data = isVideo
        ? raw
        : await sharp(raw, { limitInputPixels: 30_000_000 })
            .rotate()
            .resize(1600, 2400, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer()
      const media = await payload.create({
        collection: "media",
        data: { alt: `Story của ${user.name}` },
        file: {
          data,
          mimetype: isVideo ? file.type : "image/jpeg",
          name: `story-${crypto.randomUUID()}.${
            isVideo ? (file.type === "video/mp4" ? "mp4" : "webm") : "jpg"
          }`,
          size: data.length,
        },
        context: { communityUpload: true },
        overrideAccess: false,
        user,
      })
      image = media.id
    }
    await ensureProfile(user)
    const story = await payload.create({
      collection: "community-stories",
      data: {
        content,
        theme,
        image: isVideo ? null : image,
        video: isVideo ? image : null,
        music: music || null,
        author: user.id,
        authorName: user.name,
        expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      },
      overrideAccess: false,
      user,
    })
    return { ok: true as const, id: story.id }
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error &&
        /story|Ảnh|Video|video|nhạc|ký tự|hợp lệ|hồ sơ/.test(error.message)
          ? error.message
          : "Không thể đăng story. Kiểm tra ảnh và thử lại.",
    }
  }
}

/** Toggle a reaction on someone else's story (heart, like, support); null removes it. */
export async function reactToStoryAction(storyId: string, reaction: string | null) {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: tr("Vui lòng đăng nhập để thả cảm xúc.", "Sign in to react.") }
  const id = cleanCommunityText(storyId, 100)
  const next = reaction && (STORY_REACTIONS as readonly string[]).includes(reaction) ? (reaction as StoryReaction) : null
  if (!id || (reaction && !next)) return { ok: false as const, error: tr("Cảm xúc không hợp lệ.", "Invalid reaction.") }
  if (!hit(`story-react:${user.id}`, 60, 60_000).ok) return { ok: false as const, error: tr("Bạn thao tác quá nhanh, thử lại sau ít giây.", "Too fast; try again in a few seconds.") }
  const payload = await getPayloadClient()
  try {
    const { docs } = await payload.find({
      collection: "community-story-reactions",
      where: { and: [{ story: { equals: id } }, { author: { equals: user.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const current = docs[0]
    if (!next) {
      if (current) await payload.delete({ collection: "community-story-reactions", id: current.id, overrideAccess: false, user })
      return { ok: true as const, reaction: null }
    }
    if (current) {
      if (current.reaction !== next) await payload.update({ collection: "community-story-reactions", id: current.id, data: { reaction: next }, overrideAccess: false, user })
    } else {
      // Story owner, author and key are set by the collection hook.
      await payload.create({ collection: "community-story-reactions", data: { story: id, reaction: next } as never, overrideAccess: false, user })
    }
    return { ok: true as const, reaction: next }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return { ok: false as const, error: /[À-ỹ]/.test(message) && message.length < 160 ? message : tr("Không thể thả cảm xúc. Vui lòng thử lại.", "Couldn't react. Please try again.") }
  }
}

/** Records that the signed-in member opened someone else's story (once per story). */
export async function markStoryViewedAction(storyId: string) {
  const user = await appAuth.currentUser()
  if (!user || !hit(`story-view:${user.id}`, 120, 60_000).ok) return
  const id = cleanCommunityText(storyId, 100)
  if (!id) return
  const payload = await getPayloadClient()
  try {
    const seen = await payload.count({
      collection: "community-story-views",
      where: { and: [{ story: { equals: id } }, { viewer: { equals: user.id } }] },
      overrideAccess: false,
      user,
    })
    if (!seen.totalDocs) await payload.create({ collection: "community-story-views", data: { story: id } as never, overrideAccess: false, user })
  } catch {
    // Own stories and expired stories are refused by the collection; nothing to record.
  }
}

export async function deleteCommunityStory(id: string) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập." }
  try {
    await (await getPayloadClient()).delete({
      collection: "community-stories",
      id: cleanCommunityText(id, 100),
      overrideAccess: false,
      user,
    })
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: "Bạn chỉ có thể gỡ story của mình." }
  }
}

export async function openCommunityConversation(profileID: string) {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false as const, error: "Vui lòng đăng nhập để nhắn tin." }
  try {
    const payload = await getPayloadClient()
    const profile = await payload.findByID({
      collection: "community-profiles",
      id: cleanCommunityText(profileID, 100),
      depth: 0,
      overrideAccess: false,
      user,
    })
    const recipient = idOf(profile.account)
    if (!recipient || recipient === user.id)
      throw new Error("Hãy chọn một thành viên khác.")
    const where: Where = {
      or: [
        {
          and: [
            { memberA: { equals: user.id } },
            { memberB: { equals: recipient } },
          ],
        },
        {
          and: [
            { memberA: { equals: recipient } },
            { memberB: { equals: user.id } },
          ],
        },
      ],
    }
    const existing = await payload.find({
      collection: "community-conversations",
      where,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (existing.docs[0]) return { ok: true as const, id: existing.docs[0].id }
    await ensureProfile(user)
    try {
      const conversation = await payload.create({
        collection: "community-conversations",
        data: {
          recipientProfile: profile.id,
          memberA: user.id,
          memberB: recipient,
          nameA: user.name,
          nameB: profile.name,
          key: JSON.stringify([user.id, recipient].sort()),
        },
        overrideAccess: false,
        user,
      })
      return { ok: true as const, id: conversation.id }
    } catch {
      const retry = await payload.find({
        collection: "community-conversations",
        where,
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user,
      })
      if (!retry.docs[0]) throw new Error("Không thể tạo cuộc trò chuyện.")
      return { ok: true as const, id: retry.docs[0].id }
    }
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error && /thành viên/.test(error.message)
          ? error.message
          : "Không thể mở cuộc trò chuyện. Vui lòng thử lại.",
    }
  }
}

export async function searchCommunityContacts(query: string, page = 1) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập." }
  try {
    if (typeof query !== "string" || query.length > 100)
      throw new Error("Từ khóa không hợp lệ.")
    const payload = await getPayloadClient()
    const own = await payload.find({
      collection: "community-profiles",
      where: { account: { equals: user.id } },
      depth: 0,
      limit: 1,
      overrideAccess: false,
      user,
    })
    const result = await findCommunityMembers(
      query,
      communityPage(page),
      own.docs[0]?.id,
    )
    return {
      ok: true as const,
      contacts: result.members.map((p) => ({
        id: p.id,
        publicId: p.publicId,
        name: p.name,
        shop: p.kind === "shop",
      })),
      hasNextPage: result.hasNextPage,
    }
  } catch {
    return { ok: false as const, error: "Không thể tìm thành viên." }
  }
}

export async function joinCommunityDirectory() {
  const user = await appAuth.currentUser()
  if (!user)
    return {
      ok: false as const,
      error: "Vui lòng đăng nhập để tạo hồ sơ cộng đồng.",
    }
  try {
    const profile = await ensureProfile(user)
    return {
      ok: true as const,
      id: profile.id,
      publicId: communityPublicId(profile.id),
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tạo hồ sơ cộng đồng. Vui lòng thử lại.",
    }
  }
}

export async function loadCommunityInbox(page = 1) {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false as const, error: "Vui lòng đăng nhập để xem tin nhắn." }
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: "community-conversations",
      sort: ["-lastMessageAt", "-createdAt"],
      limit: 30,
      page: communityPage(page),
      depth: 0,
      overrideAccess: false,
      user,
    })
    const conversations = await Promise.all(
      result.docs.map(async (c) => {
        const last = await payload.find({
          collection: "community-messages",
          where: { conversation: { equals: c.id } },
          sort: "-createdAt",
          limit: 1,
          depth: 0,
          overrideAccess: false,
          user,
        })
        return {
          id: c.id,
          name: idOf(c.memberA) === user.id ? c.nameB : c.nameA,
          preview: last.docs[0]?.content ?? "",
          updatedAt: last.docs[0]?.createdAt ?? c.createdAt,
        }
      }),
    )
    conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return { ok: true as const, conversations, hasNextPage: result.hasNextPage }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải hộp thư. Vui lòng thử lại.",
    }
  }
}

export async function loadCommunityMessages(conversationID: string, page = 1) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập." }
  try {
    const payload = await getPayloadClient()
    const id = cleanCommunityText(conversationID, 100)
    const conversation = await payload.findByID({
      collection: "community-conversations",
      id,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const result = await payload.find({
      collection: "community-messages",
      where: { conversation: { equals: id } },
      sort: "-createdAt",
      limit: 40,
      page: communityPage(page),
      depth: 0,
      overrideAccess: false,
      user,
    })
    // Opening the thread clears the viewer's unread counter (shared by the bubble and /tin-nhan).
    const iAmA = idOf(conversation.memberA) === user.id
    const unread = iAmA ? conversation.unreadA : conversation.unreadB
    if (page === 1 && unread) {
      await payload
        .update({
          collection: "community-conversations",
          id,
          data: iAmA ? { unreadA: 0 } : { unreadB: 0 },
          context: { communityReadState: true },
          overrideAccess: true,
          user,
        })
        .catch(() => undefined)
    }
    return {
      ok: true as const,
      name:
        idOf(conversation.memberA) === user.id
          ? conversation.nameB
          : conversation.nameA,
      hasNextPage: result.hasNextPage,
      messages: result.docs
        .map((m) => ({
          id: m.id,
          content: m.content,
          senderName: m.senderName,
          own: idOf(m.sender) === user.id,
          createdAt: m.createdAt,
        }))
        .reverse(),
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải tin nhắn hoặc bạn không có quyền truy cập.",
    }
  }
}

export async function sendCommunityMessage(
  conversationID: string,
  content: string,
) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, error: "Vui lòng đăng nhập." }
  try {
    const payload = await getPayloadClient()
    const text = cleanCommunityText(content, 2000)
    const recent = await payload.count({
      collection: "community-messages",
      where: {
        and: [
          { sender: { equals: user.id } },
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
    if (recent.totalDocs >= 30)
      return {
        ok: false as const,
        error: "Bạn gửi quá nhanh. Vui lòng đợi một phút.",
      }
    await payload.create({
      collection: "community-messages",
      data: {
        conversation: cleanCommunityText(conversationID, 100),
        content: text,
        sender: user.id,
        senderName: user.name,
        memberA: user.id,
        memberB: user.id,
      },
      overrideAccess: false,
      user,
    })
    return { ok: true as const }
  } catch {
    return { ok: false as const, error: "Không thể gửi tin nhắn. Hãy thử lại." }
  }
}

export async function loadStoryMusic() {
  try {
    const { docs } = await (await getPayloadClient()).find({
      collection: "story-music",
      where: { active: { equals: true } },
      limit: 100,
      depth: 1,
      sort: "title",
      overrideAccess: false,
    })
    return {
      ok: true as const,
      tracks: docs.flatMap((m) => {
        const track = toStoryMusicTrack(m)
        return track ? [track] : []
      }),
    }
  } catch {
    return { ok: false as const, error: "Không thể tải thư viện nhạc." }
  }
}
/** Who the viewer follows (accepted or waiting), for follow buttons on posts. */
export async function loadMyFollowing() {
  const user = await appAuth.currentUser()
  if (!user) return { signedIn: false as const, own: null, following: [] as { target: string; pending: boolean }[] }
  try {
    const payload = await getPayloadClient()
    const [own, follows] = await Promise.all([
      payload.find({
        collection: "community-profiles",
        where: { account: { equals: user.id } },
        depth: 0,
        limit: 1,
        select: { name: true },
        overrideAccess: false,
        user,
      }),
      payload.find({
        collection: "community-follows",
        where: { author: { equals: user.id } },
        depth: 0,
        limit: 2000,
        pagination: false,
        select: { targetProfile: true, status: true },
        overrideAccess: false,
        user,
      }),
    ])
    return {
      signedIn: true as const,
      own: own.docs[0]?.id ?? null,
      following: follows.docs.flatMap((doc) => {
        const target = idOf(doc.targetProfile)
        return target ? [{ target, pending: doc.status === "pending" }] : []
      }),
    }
  } catch {
    return { signedIn: true as const, own: null, following: [] as { target: string; pending: boolean }[] }
  }
}

export async function loadCommunityConnections() {
  try {
    const user = await appAuth.currentUser()
    const payload = await getPayloadClient()
    const own = user
      ? await payload.find({
          collection: "community-profiles",
          where: { account: { equals: user.id } },
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user,
        })
      : null
    const follows: {
      id: string
      source: string
      target: string
      /** Waiting for a private profile to approve. */
      pending: boolean
    }[] = []
    let page = 1,
      more = true
    while (more) {
      const result = await payload.find({
        collection: "community-follows",
        depth: 0,
        limit: 500,
        page,
        overrideAccess: false,
        user,
      })
      follows.push(
        ...result.docs.map((d) => ({
          id: d.id,
          source: idOf(d.sourceProfile)!,
          target: idOf(d.targetProfile)!,
          pending: d.status === "pending",
        })),
      )
      more = result.hasNextPage
      page++
    }
    const friends: {
      id: string
      source: string
      target: string
      accepted: boolean
    }[] = []
    if (user) {
      page = 1
      more = true
      while (more) {
        const result = await payload.find({
          collection: "community-friendships",
          depth: 0,
          limit: 500,
          page,
          overrideAccess: false,
          user,
          where: {
            or: [
              { author: { equals: user.id } },
              { recipient: { equals: user.id } },
            ],
          },
        })
        friends.push(
          ...result.docs.map((d) => ({
            id: d.id,
            source: idOf(d.sourceProfile)!,
            target: idOf(d.targetProfile)!,
            accepted: d.status === "accepted",
          })),
        )
        more = result.hasNextPage
        page++
      }
    }
    return {
      ok: true as const,
      signedIn: !!user,
      own: own?.docs[0]?.id ?? null,
      follows,
      friends,
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải kết nối. Vui lòng thử lại.",
    }
  }
}

const CONNECT_ACTIONS = [
  "follow",
  "request",
  "accept",
  "remove-friend",
  "unfollow",
  "accept-follow",
  "decline-follow",
] as const
export type ConnectAction = (typeof CONNECT_ACTIONS)[number]

export async function connectCommunityMember(
  profileID: string,
  action: ConnectAction,
) {
  const user = await appAuth.currentUser()
  if (!user)
    return { ok: false as const, error: "Vui lòng đăng nhập để kết nối." }
  if (
    !CONNECT_ACTIONS.includes(action) ||
    typeof profileID !== "string" ||
    !/^[\w-]{1,100}$/.test(profileID)
  )
    return { ok: false as const, error: "Yêu cầu không hợp lệ." }
  try {
    const payload = await getPayloadClient()
    const own = await ensureProfile(user)
    if (own.id === profileID)
      return {
        ok: false as const,
        error: "Bạn không thể kết nối với chính mình.",
      }
    // Approving/declining a follow request (or removing a follower) acts on
    // the follow *they* created towards the viewer's profile.
    if (action === "accept-follow" || action === "decline-follow") {
      const incoming = (
        await payload.find({
          collection: "community-follows",
          where: {
            and: [
              { sourceProfile: { equals: profileID } },
              { targetProfile: { equals: own.id } },
            ],
          },
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user,
        })
      ).docs[0]
      if (!incoming)
        throw new Error("Yêu cầu theo dõi này không còn tồn tại.")
      if (action === "accept-follow") {
        if (incoming.status === "pending")
          await payload.update({
            collection: "community-follows",
            id: incoming.id,
            data: { status: "accepted" },
            overrideAccess: false,
            user,
          })
      } else
        await payload.delete({
          collection: "community-follows",
          id: incoming.id,
          overrideAccess: false,
          user,
        })
      return { ok: true as const }
    }
    const follow = action === "follow" || action === "unfollow"
    const collection = follow ? "community-follows" : "community-friendships"
    const where: Where = follow
      ? {
          and: [
            { sourceProfile: { equals: own.id } },
            { targetProfile: { equals: profileID } },
          ],
        }
      : {
          or: [
            {
              and: [
                { sourceProfile: { equals: own.id } },
                { targetProfile: { equals: profileID } },
              ],
            },
            {
              and: [
                { sourceProfile: { equals: profileID } },
                { targetProfile: { equals: own.id } },
              ],
            },
          ],
        }
    const existing = (
      await payload.find({
        collection,
        where,
        depth: 0,
        limit: 1,
        overrideAccess: false,
        user,
      })
    ).docs[0]
    if (action === "follow" || action === "request") {
      if (!existing)
        await payload.create({
          collection,
          data: { targetProfile: profileID } as never,
          overrideAccess: false,
          user,
        })
    } else if (action === "accept") {
      if (!existing || collection !== "community-friendships")
        throw new Error("Không tìm thấy lời mời.")
      await payload.update({
        collection: "community-friendships",
        id: existing.id,
        data: { status: "accepted" },
        overrideAccess: false,
        user,
      })
    } else if (existing)
      await payload.delete({
        collection,
        id: existing.id,
        overrideAccess: false,
        user,
      })
    return { ok: true as const }
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error &&
        /thành viên|chấp nhận|chính mình|theo dõi/.test(error.message)
          ? error.message
          : "Không thể cập nhật kết nối. Vui lòng thử lại.",
    }
  }
}
