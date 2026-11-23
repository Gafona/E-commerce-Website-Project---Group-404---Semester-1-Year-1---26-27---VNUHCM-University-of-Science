/** Accepts only same-site relative paths for post-login redirects. */
export function safeNextPath(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || raw.length > 300) return null
  return raw
}

/**
 * Falls back to the same-site page the visitor came from, so plain "Sign in"
 * links return people to where they were. Auth pages themselves are skipped.
 */
export function nextFromReferer(referer: string | null, host: string | null): string | null {
  if (!referer || !host) return null
  try {
    const url = new URL(referer)
    if (url.host !== host) return null
    const path = url.pathname + url.search
    if (/^\/(dang-nhap|dang-ky|quen-mat-khau|dat-lai-mat-khau)(\/|\?|$)/.test(path)) return null
    return safeNextPath(path)
  } catch {
    return null
  }
}
