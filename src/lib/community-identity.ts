/**
 * Stable, short display code derived from the public profile, never the account.
 * This is a display alias, not a unique database key: links always use the full
 * profile ID and directory searches may return more than one matching member.
 */
export const communityPublicId = (profileId: string) => {
  let hash = 2166136261
  for (const character of profileId)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0
  return `Boai${String(hash % 1_000_000).padStart(6, "0")}`
}

/** Member-chosen custom ID (shown as @handle); the BOAI-… ID keeps working. */
export const HANDLE_MIN = 3
export const HANDLE_MAX = 24
const HANDLE_RE = /^[a-z][a-z0-9._]{2,23}$/
const RESERVED_HANDLES = new Set([
  "admin",
  "boai",
  "support",
  "help",
  "settings",
  "me",
  "official",
  "moderator",
])

export const normalizeCommunityHandle = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/^@/, "").toLowerCase() : ""

/** Returns a Vietnamese error message, or null when the handle is valid. */
export function communityHandleError(handle: string): string | null {
  if (!HANDLE_RE.test(handle))
    return `ID tùy chỉnh dài ${HANDLE_MIN}–${HANDLE_MAX} ký tự, bắt đầu bằng chữ cái và chỉ gồm chữ thường không dấu, số, dấu chấm hoặc gạch dưới.`
  if (/[._]{2}/.test(handle) || /[._]$/.test(handle))
    return "ID tùy chỉnh không được kết thúc bằng hoặc chứa liên tiếp dấu chấm/gạch dưới."
  if (handle.startsWith("boai") || RESERVED_HANDLES.has(handle))
    return "ID này được hệ thống giữ lại. Hãy chọn ID khác."
  return null
}

/** Show the same short code everywhere; custom handles remain searchable. */
export const communityDisplayId = (profileId: string, _handle?: string | null) =>
  communityPublicId(profileId)

/** Public profile URL; prefer the stable profile id so links survive handle changes. */
export const communityProfileHref = (profileId: string) =>
  `/nguoi-dung/${encodeURIComponent(profileId)}`

export const normalizeMemberSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase("vi")
    .trim()
    .replace(/\s+/g, " ")

export function matchesCommunityIdentity(
  profile: {
    id: string
    name: string
    handle?: string | null
  },
  query: string,
) {
  const q = normalizeMemberSearch(query).replace(/^@/, "")
  if (!q) return true
  if (profile.handle && profile.handle.startsWith(q.replace(/\s+/g, "")))
    return true
  if (q.startsWith("boai-")) {
    // Keep previously copied IDs working without changing stored records.
    return `boai-${profile.id.toLowerCase()}`.startsWith(q)
  }
  if (/^boai\d*$/.test(q))
    return communityPublicId(profile.id).toLowerCase().startsWith(q)
  if (profile.id.toLocaleLowerCase("vi").startsWith(q)) return true
  const name = normalizeMemberSearch(profile.name)
  return q.split(" ").every((word) => name.includes(word))
}
