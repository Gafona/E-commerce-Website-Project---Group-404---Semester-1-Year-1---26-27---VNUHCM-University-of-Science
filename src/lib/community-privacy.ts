import type { PayloadRequest, Where } from "payload"
import { isStaff } from "../access/roles"

type Id = string | number
type Viewer = PayloadRequest["user"] | null | undefined
type PayloadLike = Pick<PayloadRequest["payload"], "find">

/**
 * Follows created before follow approval existed have no status; treat them as
 * accepted. Only an explicit "pending" request is excluded.
 */
export const acceptedFollowWhere: Where = {
  or: [{ status: { exists: false } }, { status: { not_equals: "pending" } }],
}

export const pendingFollowWhere: Where = { status: { equals: "pending" } }

export const isPendingFollow = (doc: { status?: string | null } | null | undefined) =>
  doc?.status === "pending"

/**
 * Private community profiles whose posts and stories the viewer may not see:
 * every private profile except the viewer's own and those the viewer follows
 * with an accepted request.
 */
export async function hiddenProfileIds(
  payload: PayloadLike,
  viewer: Viewer,
  req?: PayloadRequest,
): Promise<string[]> {
  // Sample (demo) profiles and their content are visible to staff only.
  const demo = isStaff(viewer)
    ? []
    : (
        await payload.find({
          collection: "community-profiles",
          where: { demo: { equals: true } },
          pagination: false,
          limit: 5000,
          depth: 0,
          select: {},
          overrideAccess: true,
          ...(req ? { req } : {}),
        })
      ).docs.map((profile) => String(profile.id))
  return [...demo, ...(await hiddenPrivateProfileIds(payload, viewer, req))]
}

async function hiddenPrivateProfileIds(
  payload: PayloadLike,
  viewer: Viewer,
  req?: PayloadRequest,
): Promise<string[]> {
  const { docs: privateProfiles } = await payload.find({
    collection: "community-profiles",
    where: { visibility: { equals: "private" } },
    pagination: false,
    limit: 5000,
    depth: 0,
    select: { account: true },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  if (!privateProfiles.length) return []
  const viewerId = viewer?.collection === "users" ? String(viewer.id) : null
  const accountOf = (value: unknown) =>
    value && typeof value === "object" && "id" in value
      ? String((value as { id: Id }).id)
      : value == null
        ? ""
        : String(value)
  const candidates = privateProfiles
    .filter((profile) => !viewerId || accountOf(profile.account) !== viewerId)
    .map((profile) => String(profile.id))
  if (!viewerId || !candidates.length) return candidates
  const { docs: follows } = await payload.find({
    collection: "community-follows",
    where: {
      and: [
        { author: { equals: viewerId } },
        { targetProfile: { in: candidates } },
        acceptedFollowWhere,
      ],
    },
    pagination: false,
    limit: candidates.length,
    depth: 0,
    select: { targetProfile: true },
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  const allowed = new Set(follows.map((follow) => accountOf(follow.targetProfile)))
  return candidates.filter((id) => !allowed.has(id))
}

/** Where clause that drops content authored by the given hidden profiles. */
export const visibleAuthorWhere = (hidden: string[]): Where[] =>
  hidden.length
    ? [
        {
          or: [
            { authorProfile: { exists: false } },
            { authorProfile: { not_in: hidden } },
          ],
        },
      ]
    : []
