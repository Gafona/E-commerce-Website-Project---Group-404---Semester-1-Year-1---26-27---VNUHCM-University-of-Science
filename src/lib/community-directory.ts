import "server-only"
import type { User } from "@/payload-types"
import { getPayloadClient } from "./payload"
import { communityPage } from "./community-rules"
import { matchesCommunityIdentity } from "./community-identity"
import { acceptedFollowWhere } from "./community-privacy"
import {
  MEMBER_SELECT,
  toCommunityMember,
  type CommunityMember,
} from "./community"

const PAGE_SIZE = 24

/** Lightweight scan of every public profile (names/handles only). */
async function scanDirectory() {
  const payload = await getPayloadClient()
  const out: { id: string; name: string; handle?: string | null }[] = []
  let nextPage = 1
  let hasMore = true
  while (hasMore) {
    const result = await payload.find({
      collection: "community-profiles",
      depth: 0,
      limit: 200,
      page: nextPage,
      sort: ["name", "id"],
      select: { name: true, handle: true },
      overrideAccess: false,
    })
    out.push(...result.docs)
    hasMore = result.hasNextPage
    nextPage++
  }
  return out
}

/** Hydrate card data for the given ids, preserving their order. */
async function hydrate(ids: string[], viewer?: User | null) {
  if (!ids.length) return [] as CommunityMember[]
  const payload = await getPayloadClient()
  const selected = await payload.find({
    collection: "community-profiles",
    where: { id: { in: ids } },
    depth: 1,
    limit: ids.length,
    overrideAccess: false,
    select: MEMBER_SELECT,
  })
  const members = await Promise.all(
    selected.docs.map((profile) => toCommunityMember(profile, viewer)),
  )
  return members.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
}

/**
 * Search the whole public directory, not just the first cards downloaded by the
 * page. Scan only names/IDs/handles for accent folding; fetch media/counts for
 * this page. No account, email, phone or private user record is returned.
 */
export async function findCommunityMembers(
  query: string,
  page = 1,
  excludeProfile?: string,
) {
  const ids = (await scanDirectory())
    .filter(
      (profile) =>
        profile.id !== excludeProfile &&
        matchesCommunityIdentity(profile, query),
    )
    .map((profile) => profile.id)
  const safePage = communityPage(page)
  const selectedIds = ids.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )
  return {
    members: await hydrate(selectedIds),
    page: safePage,
    totalDocs: ids.length,
    hasNextPage: safePage * PAGE_SIZE < ids.length,
  }
}

/** Own profile id plus every profile the viewer already follows or requested. */
async function knownProfiles(viewer?: User | null) {
  if (!viewer) return new Set<string>()
  const payload = await getPayloadClient()
  const [own, follows] = await Promise.all([
    payload.find({
      collection: "community-profiles",
      where: { account: { equals: viewer.id } },
      depth: 0,
      limit: 1,
      select: { name: true },
      overrideAccess: false,
      user: viewer,
    }),
    payload.find({
      collection: "community-follows",
      where: { author: { equals: viewer.id } },
      depth: 0,
      limit: 2000,
      pagination: false,
      select: { targetProfile: true },
      overrideAccess: false,
      user: viewer,
    }),
  ])
  const known = new Set<string>(own.docs.map((doc) => doc.id))
  for (const follow of follows.docs) {
    const target =
      typeof follow.targetProfile === "object"
        ? follow.targetProfile?.id
        : follow.targetProfile
    if (target) known.add(String(target))
  }
  return known
}

/**
 * A fresh random sample of people the viewer does not follow yet. `exclude`
 * skips the cards currently on screen so "Refresh" shows new faces whenever
 * the directory is large enough.
 */
export async function suggestCommunityMembers(
  viewer?: User | null,
  count = 4,
  exclude: string[] = [],
) {
  const [directory, known] = await Promise.all([
    scanDirectory(),
    knownProfiles(viewer),
  ])
  const pool = directory.map((p) => p.id).filter((id) => !known.has(id))
  const skipped = new Set(exclude)
  const fresh = pool.filter((id) => !skipped.has(id))
  const source = fresh.length >= Math.min(count, pool.length) ? fresh : pool
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return {
    members: await hydrate(shuffled.slice(0, count), viewer),
    total: pool.length,
  }
}

/** Accepted follower / following counts for a public profile. */
export async function communityFollowCounts(profileId: string) {
  const payload = await getPayloadClient()
  const [followers, following] = await Promise.all([
    payload.count({
      collection: "community-follows",
      where: { and: [{ targetProfile: { equals: profileId } }, acceptedFollowWhere] },
      overrideAccess: false,
    }),
    payload.count({
      collection: "community-follows",
      where: { and: [{ sourceProfile: { equals: profileId } }, acceptedFollowWhere] },
      overrideAccess: false,
    }),
  ])
  return { followers: followers.totalDocs, following: following.totalDocs }
}
