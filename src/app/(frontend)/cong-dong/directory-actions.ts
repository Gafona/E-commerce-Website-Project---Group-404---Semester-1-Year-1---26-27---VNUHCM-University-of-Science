"use server"

import { appAuth } from "@/lib/app-auth"
import {
  findCommunityMembers,
  suggestCommunityMembers,
} from "@/lib/community-directory"

export async function searchCommunityMembers(query: string, page = 1) {
  if (
    typeof query !== "string" ||
    query.length > 100 ||
    typeof page !== "number" ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 1000
  )
    return { ok: false as const, error: "Tên hoặc ID tìm kiếm không hợp lệ." }
  try {
    return {
      ok: true as const,
      ...(await findCommunityMembers(query.trim(), page)),
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tìm thành viên. Vui lòng thử lại.",
    }
  }
}

/** New random "people you may know" cards, skipping the ones on screen. */
export async function refreshSuggestedMembers(exclude: string[] = []) {
  if (
    !Array.isArray(exclude) ||
    exclude.length > 50 ||
    exclude.some((id) => typeof id !== "string" || !/^[\w-]{1,100}$/.test(id))
  )
    return { ok: false as const, error: "Yêu cầu không hợp lệ." }
  try {
    const user = await appAuth.currentUser()
    return {
      ok: true as const,
      ...(await suggestCommunityMembers(user, 4, exclude)),
    }
  } catch {
    return {
      ok: false as const,
      error: "Không thể tải gợi ý. Vui lòng thử lại.",
    }
  }
}
