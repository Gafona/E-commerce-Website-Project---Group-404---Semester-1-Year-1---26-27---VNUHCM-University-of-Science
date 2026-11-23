import "server-only"
import type { Payload } from "payload"
import { DISCOUNT_CODE_PATTERN, normalizeDiscountCode } from "../collections/DiscountCodes"

export type DiscountLookup =
  | { ok: true; code: string; percent: number }
  | { ok: false; reason: "invalid" | "missing" | "inactive" }

/** Checks a buyer-typed code against the admin's list (server-side, bypassing staff-only access). */
export async function lookupDiscountCode(payload: Payload, raw: unknown): Promise<DiscountLookup> {
  const code = normalizeDiscountCode(raw)
  if (!DISCOUNT_CODE_PATTERN.test(code)) return { ok: false, reason: "invalid" }
  const { docs } = await payload.find({
    collection: "discount-codes",
    where: { code: { equals: code } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { code: true, percent: true, active: true },
  })
  const found = docs[0]
  if (!found) return { ok: false, reason: "missing" }
  if (!found.active) return { ok: false, reason: "inactive" }
  const percent = Math.round(Number(found.percent))
  if (!(percent >= 1 && percent <= 100)) return { ok: false, reason: "inactive" }
  return { ok: true, code: found.code, percent }
}

/** Buyer-facing message for a failed lookup, as [vi, en]. */
export const DISCOUNT_ERRORS: Record<Exclude<DiscountLookup, { ok: true }>["reason"], readonly [string, string]> = {
  invalid: ["Mã không tồn tại", "This code doesn't exist"],
  missing: ["Mã không tồn tại", "This code doesn't exist"],
  inactive: ["Mã đã tắt", "This code is no longer active"],
}

export const discountAmount = (subtotal: number, percent: number) => Math.round((Math.max(0, subtotal) * percent) / 100)
