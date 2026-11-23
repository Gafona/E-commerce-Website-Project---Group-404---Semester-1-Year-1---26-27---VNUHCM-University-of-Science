import "server-only"
import type { Where } from "payload"
import type { CommunityProfile, User } from "@/payload-types"
import { findByField, getPayloadClient } from "./payload"
import { communityDisplayText } from "./community-rules"
import {
  communityDisplayId,
  normalizeCommunityHandle,
} from "./community-identity"
import { acceptedFollowWhere } from "./community-privacy"
import { communityFollowCounts } from "./community-directory"

export type FollowState = "none" | "pending" | "accepted"

export type ProfilePerson = {
  id: string
  name: string
  displayId: string
  avatar: string | null
  kind: string
  visibility: "public" | "private"
}

const mediaUrl = (value: unknown) =>
  value && typeof value === "object" && "url" in value
    ? ((value as { url?: string | null }).url ?? null)
    : null

const idOf = (value: unknown) =>
  value && typeof value === "object" && "id" in value
    ? String((value as { id: string }).id)
    : value
      ? String(value)
      : ""

const toPerson = (profile: CommunityProfile): ProfilePerson => ({
  id: profile.id,
  name: profile.name,
  displayId: communityDisplayId(profile.id, profile.handle),
  avatar: mediaUrl(profile.avatar),
  kind: profile.kind,
  visibility: profile.visibility === "private" ? "private" : "public",
})

/** Accepts `@handle`, `handle`, or the immutable profile id. */
export async function resolveCommunityProfile(param: string) {
  let raw = param
  try {
    raw = decodeURIComponent(param)
  } catch {
    // Keep the raw segment when it is not valid percent-encoding.
  }
  raw = raw.trim().slice(0, 120)
  if (!raw) return null
  const handle = normalizeCommunityHandle(raw)
  if (/^[a-z][a-z0-9._]{2,23}$/.test(handle)) {
    const byHandle = await findByField("community-profiles", "handle", handle, {
      depth: 1,
    })
    if (byHandle) return byHandle
  }
  const id = raw.replace(/^boai-/i, "")
  if (!/^[\w-]{1,100}$/.test(id)) return null
  const payload = await getPayloadClient()
  return payload
    .findByID({
      collection: "community-profiles",
      id,
      depth: 1,
      overrideAccess: false,
    })
    .catch(() => null)
}

/** Everything the public profile page needs for this viewer. */
export async function readCommunityProfilePage(
  profile: CommunityProfile,
  viewer: User | null,
) {
  const payload = await getPayloadClient()
  const viewerProfile = viewer
    ? (
        await payload.find({
          collection: "community-profiles",
          where: { account: { equals: viewer.id } },
          depth: 0,
          limit: 1,
          select: { name: true },
          overrideAccess: false,
          user: viewer,
        })
      ).docs[0] ?? null
    : null
  const own = viewerProfile?.id === profile.id
  const pairWhere = (source: string, target: string): Where => ({
    and: [
      { sourceProfile: { equals: source } },
      { targetProfile: { equals: target } },
    ],
  })
  const [counts, mine, theirs, friendship] = await Promise.all([
    communityFollowCounts(profile.id),
    viewerProfile && !own
      ? payload.find({
          collection: "community-follows",
          where: pairWhere(viewerProfile.id, profile.id),
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user: viewer!,
        })
      : null,
    viewerProfile && !own
      ? payload.find({
          collection: "community-follows",
          where: pairWhere(profile.id, viewerProfile.id),
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user: viewer!,
        })
      : null,
    viewerProfile && !own
      ? payload.find({
          collection: "community-friendships",
          where: {
            or: [
              pairWhere(viewerProfile.id, profile.id),
              pairWhere(profile.id, viewerProfile.id),
            ],
          },
          depth: 0,
          limit: 1,
          overrideAccess: false,
          user: viewer!,
        })
      : null,
  ])
  const stateOf = (doc?: { status?: string | null }): FollowState =>
    !doc ? "none" : doc.status === "pending" ? "pending" : "accepted"
  const following = stateOf(mine?.docs[0])
  const followsYou = stateOf(theirs?.docs[0])
  const friend = friendship?.docs[0]
  const visibility: "public" | "private" =
    profile.visibility === "private" ? "private" : "public"
  const canView = own || visibility === "public" || following === "accepted"
  return {
    profile: {
      id: profile.id,
      name: profile.name,
      handle: profile.handle ?? null,
      displayId: communityDisplayId(profile.id, profile.handle),
      bio: communityDisplayText(profile.bio),
      kind: profile.kind,
      sport: profile.sport,
      demo: !!profile.demo,
      visibility,
      avatar: mediaUrl(profile.avatar),
      cover: mediaUrl(profile.cover),
    },
    counts,
    relation: {
      signedIn: !!viewer,
      own,
      following,
      followsYou,
      friend: friend
        ? {
            accepted: friend.status === "accepted",
            incoming: idOf(friend.targetProfile) === viewerProfile?.id,
          }
        : null,
    },
    canView,
  }
}

/** Accepted followers of, or accounts followed by, a profile. */
export async function readFollowList(
  profileId: string,
  direction: "followers" | "following",
  viewer: User | null,
  limit = 60,
) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: "community-follows",
    where: {
      and: [
        direction === "followers"
          ? { targetProfile: { equals: profileId } }
          : { sourceProfile: { equals: profileId } },
        acceptedFollowWhere,
      ],
    },
    sort: "-createdAt",
    depth: 2,
    limit,
    overrideAccess: false,
    ...(viewer ? { user: viewer } : {}),
  })
  return {
    people: result.docs.flatMap((follow) => {
      const person =
        direction === "followers" ? follow.sourceProfile : follow.targetProfile
      return person && typeof person === "object" ? [toPerson(person)] : []
    }),
    total: result.totalDocs,
  }
}

/** Pending requests waiting for the signed-in owner's approval. */
export async function readFollowRequests(profileId: string, viewer: User) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: "community-follows",
    where: {
      and: [
        { targetProfile: { equals: profileId } },
        { status: { equals: "pending" } },
      ],
    },
    sort: "-createdAt",
    depth: 2,
    limit: 50,
    overrideAccess: false,
    user: viewer,
  })
  return result.docs.flatMap((follow) =>
    follow.sourceProfile && typeof follow.sourceProfile === "object"
      ? [toPerson(follow.sourceProfile)]
      : [],
  )
}
