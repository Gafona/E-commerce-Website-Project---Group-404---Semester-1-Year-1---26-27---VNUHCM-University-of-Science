import "server-only"
import type { Where } from "payload"
import type { CommunityProfile, User } from "@/payload-types"
import { readDnaShare, type DnaShareCard } from "./sportdna-share"
import { getPayloadClient } from "./payload"
import { communityDisplayId } from "./community-identity"
import {
  communityDisplayText,
  communityPage,
  COMMUNITY_TOPICS,
} from "./community-rules"

export type CommunityProduct = {
  id: string
  slug: string
  name: string
  image: string | null
  price: number
}
export type CommunityComment = {
  id: string
  content: string
  authorName: string
  createdAt: string
}
export type CommunityPost = {
  id: string
  content: string
  sport: string
  topic: string
  authorName: string
  /** Live public identity of the author (name and photo come from the profile, not the stored snapshot). */
  profile: CommunityAuthor | null
  createdAt: string
  updatedAt: string
  product: CommunityProduct | null
  likes: number
  comments: number
  shares: number
  sharedPost: {
    id: string
    authorName: string
    profile: CommunityAuthor | null
    content: string
    images: CommunityPostImage[]
  } | null
  isRepost: boolean
  achievement: DnaShareCard | null
  images: CommunityPostImage[]
}
export type CommunityPostImage = { id: string; url: string; width: number; height: number }
export type CommunityAuthor = {
  id: string
  name: string
  kind: string
  demo: boolean
  visibility: "public" | "private"
  /** Public avatar URL (mirrors the account photo), null when not set. */
  avatar: string | null
}

/** Render-ready author identity from a populated community profile. */
export const toCommunityAuthor = (value: unknown): CommunityAuthor | null => {
  if (!value || typeof value !== "object" || !("id" in value)) return null
  const profile = value as { id: string; name?: string | null; kind?: string | null; demo?: boolean | null; visibility?: string | null; avatar?: unknown }
  return {
    id: String(profile.id),
    name: communityDisplayText(profile.name ?? ""),
    kind: profile.kind ?? "person",
    demo: !!profile.demo,
    visibility: profile.visibility === "private" ? "private" : "public",
    avatar: profile.avatar && typeof profile.avatar === "object" && "url" in profile.avatar ? ((profile.avatar as { url?: string | null }).url ?? null) : null,
  }
}

/** Public, render-ready fields of populated post photos (skips missing uploads). */
const readPostImages = (value: unknown): CommunityPostImage[] =>
  (Array.isArray(value) ? value : []).flatMap((image) =>
    image && typeof image === "object" && typeof image.url === "string"
      ? [{ id: String(image.id), url: image.url, width: Number(image.width) || 1200, height: Number(image.height) || 1200 }]
      : [],
  )
export type CommunityFeed = {
  posts: CommunityPost[]
  hasNextPage: boolean
  page: number
  totalDocs: number
}
export type CommunityMember = {
  id: string
  publicId: string
  /** Custom ID chosen in Settings (without the leading @). */
  handle: string | null
  visibility: "public" | "private"
  name: string
  bio: string
  kind: string
  sport: string
  demo: boolean
  posts: number
  avatar: string | null
  cover: string | null
}

/** Public profile fields every member card needs. */
export const MEMBER_SELECT = {
  name: true,
  handle: true,
  visibility: true,
  bio: true,
  kind: true,
  sport: true,
  demo: true,
  avatar: true,
  cover: true,
} as const

export async function readCommunityMembers(
  selectedMember?: string,
): Promise<CommunityMember[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: "community-profiles",
    limit: 100,
    sort: "createdAt",
    depth: 1,
    overrideAccess: false,
    select: MEMBER_SELECT,
  })
  const profiles = [...result.docs]
  if (selectedMember && !profiles.some((p) => p.id === selectedMember)) {
    const selected = await payload
      .findByID({
        collection: "community-profiles",
        id: selectedMember,
        depth: 1,
        overrideAccess: false,
      })
      .catch(() => null)
    if (selected) profiles.push(selected)
  }
  return Promise.all(profiles.map((profile) => toCommunityMember(profile)))
}

type MemberProfile = Pick<
  CommunityProfile,
  "id" | "name" | "bio" | "kind" | "sport" | "demo" | "avatar" | "cover"
> &
  Partial<Pick<CommunityProfile, "handle" | "visibility">>

/** Render-ready public card data; never includes the private account. */
export async function toCommunityMember(
  profile: MemberProfile,
  viewer?: User | null,
): Promise<CommunityMember> {
  const payload = await getPayloadClient()
  const posts = await payload.count({
    collection: "community-posts",
    where: {
      and: [
        { authorProfile: { equals: profile.id } },
        { visibility: { equals: "visible" } },
      ],
    },
    overrideAccess: false,
    ...(viewer ? { user: viewer } : {}),
  })
  return {
    id: profile.id,
    publicId: communityDisplayId(profile.id, profile.handle),
    handle: profile.handle ?? null,
    visibility: profile.visibility === "private" ? "private" : "public",
    name: profile.name,
    bio: communityDisplayText(profile.bio),
    kind: profile.kind,
    sport: profile.sport,
    demo: !!profile.demo,
    posts: posts.totalDocs,
    avatar:
      profile.avatar && typeof profile.avatar === "object"
        ? (profile.avatar.url ?? null)
        : null,
    cover:
      profile.cover && typeof profile.cover === "object"
        ? (profile.cover.url ?? null)
        : null,
  }
}

// A live, operational social feed: no build-time snapshot or time-based cache.
export async function readCommunityFeed(
  options: {
    sport?: string
    topic?: string
    query?: string
    page?: number
    post?: string
    member?: string
    /** Account id; author is owner-readable only, so pass that viewer. */
    author?: string
  } = {},
  viewer?: User,
): Promise<CommunityFeed> {
  const payload = await getPayloadClient()
  const filters: Where[] = [{ visibility: { equals: "visible" } }]
  if (["football", "badminton"].includes(options.sport ?? ""))
    filters.push({ sport: { equals: options.sport } })
  if (
    COMMUNITY_TOPICS.includes(options.topic as typeof COMMUNITY_TOPICS[number])
  )
    filters.push({ topic: { equals: options.topic } })
  if (options.query)
    filters.push({ content: { contains: options.query.slice(0, 100) } })
  if (options.post) filters.push({ id: { equals: options.post.slice(0, 100) } })
  if (options.member)
    filters.push({ authorProfile: { equals: options.member.slice(0, 100) } })
  if (options.author && viewer)
    filters.push({ author: { equals: options.author.slice(0, 100) } })
  const page = communityPage(options.page)
  const result = await payload.find({
    collection: "community-posts",
    where: { and: filters },
    sort: "-createdAt",
    limit: 12,
    page,
    depth: 2,
    overrideAccess: false,
    ...(viewer ? { user: viewer } : {}),
  })
  const posts = await Promise.all(
    result.docs.map(async (post) => {
      const [likes, comments, shares] = await Promise.all([
        payload.count({
          collection: "community-likes",
          where: { post: { equals: post.id } },
          overrideAccess: false,
        }),
        payload.count({
          collection: "community-comments",
          where: { post: { equals: post.id } },
          overrideAccess: false,
        }),
        payload.count({
          collection: "community-posts",
          where: {
            and: [
              { sharedPost: { equals: post.id } },
              { visibility: { equals: "visible" } },
            ],
          },
          overrideAccess: false,
        }),
      ])
      const product =
        post.product && typeof post.product === "object" ? post.product : null
      const profile =
        post.authorProfile && typeof post.authorProfile === "object"
          ? post.authorProfile
          : null
      const source =
        post.sharedPost &&
        typeof post.sharedPost === "object" &&
        post.sharedPost.visibility === "visible"
          ? post.sharedPost
          : null
      // Product image is another relationship level; return only safe public fields.
      let image: string | null = null
      if (product?.image && typeof product.image === "object")
        image = product.image.url ?? null
      return {
        id: post.id,
        content: communityDisplayText(post.content),
        sport: post.sport,
        topic: post.topic,
        authorName: post.authorName,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        profile: toCommunityAuthor(profile),
        product: product
          ? {
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              image,
            }
          : null,
        likes: likes.totalDocs,
        comments: comments.totalDocs,
        shares: shares.totalDocs,
        sharedPost: source
          ? {
              id: source.id,
              authorName: source.authorName,
              profile: toCommunityAuthor(source.authorProfile),
              content: communityDisplayText(source.content),
              images: readPostImages(source.images),
            }
          : null,
        isRepost: !!post.sharedPost,
        achievement: readDnaShare(post.achievement),
        images: readPostImages(post.images),
      }
    }),
  )
  return {
    posts,
    hasNextPage: result.hasNextPage,
    page,
    totalDocs: result.totalDocs,
  }
}
