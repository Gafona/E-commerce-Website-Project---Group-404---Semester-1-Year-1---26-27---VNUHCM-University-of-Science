import "server-only"
import { getPayloadClient } from "./payload"
import { clientIp, hit } from "./rate-limit"
import { AUTH_CODE_PATTERN, normalizeAuthCode } from "./authenticity"

export type AuthCheck =
  | { state: "limited"; retryMinutes: number }
  | { state: "invalid"; code: string }
  | { state: "revoked"; code: string; productName: string; shopName: string }
  | {
      state: "valid"
      code: string
      productName: string
      productSlug: string | null
      shopName: string
      shopId: string | null
      firstCheckedAt: string
      checkCount: number
    }

/** The same visitor reopening a code within this window is counted once. */
const REPEAT_WINDOW_MS = 30 * 60_000
const seen = new Map<string, number>()

/**
 * Public authenticity check. Per-IP limits stop code guessing: 30 lookups per
 * 10 minutes overall and 8 unknown codes per 10 minutes. Every distinct lookup
 * of a real code is counted (trusted server write).
 */
export async function checkAuthenticityCode(raw: string): Promise<AuthCheck> {
  const code = normalizeAuthCode(raw)
  const ip = await clientIp()
  const overall = hit(`auth-check:${ip}`, 30, 10 * 60_000)
  if (!overall.ok) return { state: "limited", retryMinutes: Math.ceil(overall.retryAfterMs / 60_000) }
  if (!AUTH_CODE_PATTERN.test(code)) return registerMiss(ip, code)

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "authenticity-codes",
    where: { code: { equals: code } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const doc = docs[0]
  if (!doc) return registerMiss(ip, code)
  const product = doc.product && typeof doc.product === "object" ? doc.product : null
  const seller = doc.seller && typeof doc.seller === "object" ? doc.seller : null
  const productName = product?.name ?? "Sản phẩm"
  const shopName = seller?.seller?.shopName?.trim() || seller?.name || "BOAI"
  if (doc.status !== "active") return { state: "revoked", code, productName, shopName }

  const now = new Date().toISOString()
  const key = `${ip}:${code}`
  const last = seen.get(key)
  const repeat = last !== undefined && Date.now() - last < REPEAT_WINDOW_MS
  seen.set(key, Date.now())
  if (seen.size > 5000) for (const k of [...seen.keys()].slice(0, 1000)) seen.delete(k)
  let checkCount = Number(doc.checkCount ?? 0)
  let firstCheckedAt = doc.firstCheckedAt ?? now
  if (!repeat) {
    checkCount += 1
    const updated = await payload
      .update({
        collection: "authenticity-codes",
        id: doc.id,
        data: { checkCount, firstCheckedAt, lastCheckedAt: now },
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    if (updated) {
      checkCount = Number(updated.checkCount ?? checkCount)
      firstCheckedAt = updated.firstCheckedAt ?? firstCheckedAt
    }
  } else if (!checkCount) {
    checkCount = 1
  }
  return {
    state: "valid",
    code,
    productName,
    productSlug: product?.slug ?? null,
    shopName,
    shopId: seller ? String(seller.id) : null,
    firstCheckedAt,
    checkCount,
  }
}

function registerMiss(ip: string, code: string): AuthCheck {
  const miss = hit(`auth-miss:${ip}`, 8, 10 * 60_000)
  if (!miss.ok) return { state: "limited", retryMinutes: Math.ceil(miss.retryAfterMs / 60_000) }
  return { state: "invalid", code }
}
