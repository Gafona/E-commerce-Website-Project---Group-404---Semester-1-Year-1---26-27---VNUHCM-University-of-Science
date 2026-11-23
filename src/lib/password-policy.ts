/** Password rules shared by sign-up-adjacent forms (reset, change) on client and server. */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
/** Lifetime of an emailed reset link. */
export const RESET_LINK_MINUTES = 60
/** Reset emails allowed per address per hour. */
export const RESET_REQUESTS_PER_HOUR = 3
export const RESET_LIMIT_STATUS = 429

/** [vi, en] explanation when a new password breaks the rules, otherwise null. */
export function passwordIssue(password: string): readonly [string, string] | null {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    return ["Mật khẩu mới phải có từ 8 đến 128 ký tự.", "The new password must be 8 to 128 characters."]
  if (!/\p{L}/u.test(password) || !/\d/.test(password))
    return ["Mật khẩu mới cần có cả chữ cái và chữ số.", "The new password needs both letters and numbers."]
  return null
}

/** Payload reset tokens are random hex strings; reject anything else before touching the database. */
export function looksLikeResetToken(token: string) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token)
}
