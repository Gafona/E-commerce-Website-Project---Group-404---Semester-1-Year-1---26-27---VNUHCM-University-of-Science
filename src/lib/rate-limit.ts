import "server-only"
import { headers } from "next/headers"

export { hit } from "./rate-limit-core"

/** Caller IP from the proxy headers (falls back to a shared bucket). */
export async function clientIp() {
  const h = await headers()
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64)
}
