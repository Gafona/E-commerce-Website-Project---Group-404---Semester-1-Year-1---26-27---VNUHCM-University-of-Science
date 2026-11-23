import "server-only"
import { createHash } from "node:crypto"
import { cookies } from "next/headers"

/**
 * Guests prove access to an order with its code + phone once (POST form), then
 * keep a hashed proof in an httpOnly cookie. The phone number never travels in
 * URLs, history, referrers or analytics, and the server re-checks every view.
 */
const COOKIE = "boai-order-access"
const OPTIONS = { httpOnly: true, sameSite: "none", secure: true, partitioned: true, path: "/", maxAge: 60 * 60 * 24 * 30 } as const

const proof = (code: string, phone: string) => createHash("sha256").update(`${code.toUpperCase()}:${phone.replace(/\s/g, "")}`).digest("hex").slice(0, 32)

type Entry = { c: string; h: string }

async function read(): Promise<Entry[]> {
  try {
    const raw = (await cookies()).get(COOKIE)?.value
    const list = raw ? (JSON.parse(raw) as Entry[]) : []
    return Array.isArray(list) ? list.filter((e) => typeof e?.c === "string" && typeof e?.h === "string").slice(-10) : []
  } catch {
    return []
  }
}

/** Remember that this browser proved access to the order (call only after verifying code + phone). */
export async function rememberOrderAccess(code: string, phone: string) {
  const list = (await read()).filter((e) => e.c !== code.toUpperCase())
  list.push({ c: code.toUpperCase(), h: proof(code, phone) })
  ;(await cookies()).set(COOKIE, JSON.stringify(list.slice(-10)), OPTIONS)
}

/** True when the browser holds a valid proof for this order's code and phone. */
export async function hasOrderAccess(order: { code: string; phone: string }) {
  const entry = (await read()).find((e) => e.c === order.code.toUpperCase())
  return !!entry && entry.h === proof(order.code, order.phone)
}
