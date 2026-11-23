import type { Access, FieldAccess } from "payload"

type RoleCarrier = {
  collection?: string
  id?: string | number
  role?: string | null
  moderation?: {
    postingBanned?: boolean | null
    chatBanned?: boolean | null
    suspended?: boolean | null
  } | null
}

const asCarrier = (user: unknown): RoleCarrier | null =>
  user && typeof user === "object" ? (user as RoleCarrier) : null

/** App account with the BOAI moderator/admin role (logs in through the storefront). */
export const isAppAdmin = (user: unknown) => {
  const u = asCarrier(user)
  return u?.collection === "users" && u.role === "admin"
}

/** Payload CMS editor (Figma SSO) or an app admin. */
export const isStaff = (user: unknown) =>
  asCarrier(user)?.collection === "admins" || isAppAdmin(user)

export const isPostingBanned = (user: unknown) => {
  const u = asCarrier(user)
  return u?.collection === "users" && !isAppAdmin(u) && Boolean(u.moderation?.postingBanned)
}

export const isChatBanned = (user: unknown) => {
  const u = asCarrier(user)
  return u?.collection === "users" && !isAppAdmin(u) && Boolean(u.moderation?.chatBanned)
}

export const isSuspended = (user: unknown) => Boolean(asCarrier(user)?.moderation?.suspended)

export const staffAccess: Access = ({ req }) => isStaff(req.user)
export const staffField: FieldAccess = ({ req }) => isStaff(req.user)

export const POSTING_BANNED_MESSAGE =
  "Tài khoản của bạn đang bị tạm cấm đăng bài trong cộng đồng."
export const CHAT_BANNED_MESSAGE =
  "Tài khoản của bạn đang bị tạm cấm nhắn tin."
export const SUSPENDED_MESSAGE =
  "Tài khoản này đã bị khóa bởi quản trị viên BOAI."
