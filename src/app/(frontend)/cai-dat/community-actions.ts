"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { ensureCommunityProfile } from "@/lib/community-profile"
import {
  communityDisplayId,
  communityHandleError,
  normalizeCommunityHandle,
} from "@/lib/community-identity"
import { pendingFollowWhere } from "@/lib/community-privacy"

export type CommunityIdentityResult =
  | {
      ok: true
      handle: string | null
      visibility: "public" | "private"
      publicId: string
      approved: number
    }
  | { ok: false; error: string; field?: "handle" | "visibility" }

/** Saves the member's custom @ID and public/private mode. */
export async function updateCommunityIdentity(input: {
  handle?: unknown
  visibility?: unknown
}): Promise<CommunityIdentityResult> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập để đổi cài đặt." }
  if (!input || typeof input !== "object")
    return { ok: false, error: "Yêu cầu không hợp lệ." }
  const handle = normalizeCommunityHandle(input.handle)
  if (typeof input.handle !== "string" || input.handle.length > 40)
    return { ok: false, field: "handle", error: "ID tùy chỉnh không hợp lệ." }
  if (handle) {
    const invalid = communityHandleError(handle)
    if (invalid) return { ok: false, field: "handle", error: invalid }
  }
  if (input.visibility !== "public" && input.visibility !== "private")
    return { ok: false, field: "visibility", error: "Chế độ hiển thị không hợp lệ." }
  const visibility = input.visibility
  try {
    const payload = await getPayloadClient()
    const own = await ensureCommunityProfile(user)
    const saved = await payload.update({
      collection: "community-profiles",
      id: own.id,
      data: { handle: handle || null, visibility },
      depth: 0,
      overrideAccess: false,
      user,
    })
    // Going public lets everyone see the profile, so waiting requests are approved.
    let approved = 0
    if (visibility === "public") {
      const waiting = await payload.find({
        collection: "community-follows",
        where: {
          and: [{ targetProfile: { equals: own.id } }, pendingFollowWhere],
        },
        depth: 0,
        limit: 500,
        pagination: false,
        overrideAccess: false,
        user,
      })
      for (const request of waiting.docs) {
        await payload.update({
          collection: "community-follows",
          id: request.id,
          data: { status: "accepted" },
          overrideAccess: false,
          user,
        })
        approved++
      }
    }
    return {
      ok: true,
      handle: saved.handle ?? null,
      visibility: saved.visibility === "private" ? "private" : "public",
      publicId: communityDisplayId(saved.id, saved.handle),
      approved,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return /ID/.test(message)
      ? { ok: false, field: "handle", error: message.replace(/^.*?: /, "") }
      : { ok: false, error: "Không thể lưu cài đặt cộng đồng. Vui lòng thử lại." }
  }
}
