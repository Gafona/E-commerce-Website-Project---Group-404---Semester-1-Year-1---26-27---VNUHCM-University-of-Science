import "server-only"
import type { User } from "@/payload-types"
import { getPayloadClient } from "./payload"

/** The signed-in member's public community profile, created on first use. */
export async function ensureCommunityProfile(
  user: User & { collection: "users" },
) {
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: "community-profiles",
    where: { account: { equals: user.id } },
    depth: 0,
    limit: 1,
    overrideAccess: false,
    user,
  })
  if (found.docs[0]) return found.docs[0]
  try {
    return await payload.create({
      collection: "community-profiles",
      data: {
        account: user.id,
        name: user.name,
        bio: "Thành viên BOAI Community",
        kind: "person",
        sport: "all",
        demo: false,
      },
      overrideAccess: false,
      user,
    })
  } catch {
    const retry = await payload.find({
      collection: "community-profiles",
      where: { account: { equals: user.id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    if (!retry.docs[0]) throw new Error("Không thể tạo hồ sơ cộng đồng.")
    return retry.docs[0]
  }
}

