/**
 * Small in-memory sliding-window limiter for abuse-prone actions (logins,
 * lookups, emails). Best effort per server instance; collection rules remain
 * the real security boundary. Free of Next.js imports so Payload collection
 * hooks (also loaded by the Payload CLI) can share it.
 */
const buckets = new Map<string, number[]>()

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((at) => now - at < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return { ok: false as const, retryAfterMs: windowMs - (now - recent[0]) }
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 5000) {
    // Drop the oldest keys so a flood of distinct keys cannot grow memory without bound.
    for (const k of [...buckets.keys()].slice(0, 1000)) buckets.delete(k)
  }
  return { ok: true as const, retryAfterMs: 0 }
}
