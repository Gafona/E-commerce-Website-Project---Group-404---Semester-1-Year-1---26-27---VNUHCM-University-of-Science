import { clientIp, hit } from "@/lib/rate-limit"
import { detectProvince } from "@/lib/provinces"
import { toPoint } from "@/lib/shipping"

/**
 * Address search proxy (OpenStreetMap Nominatim) for exact shipping points.
 * Called only when the visitor presses "Định vị", never per keystroke, and
 * kept within Nominatim's policy: identifying User-Agent, at most one
 * upstream request per second for the whole server, and a 24-hour cache.
 */
export const dynamic = "force-dynamic"

type Suggestion = { label: string; lat: number; lng: number; province: string | null }
type NominatimHit = { display_name?: string; lat?: string; lon?: string; address?: Record<string, string> }

const CACHE_MS = 24 * 60 * 60_000
const cache = new Map<string, { at: number; results: Suggestion[] }>()
let nextSlot = 0

const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 200)
  if (q.length < 6) return Response.json({ results: [], error: "short" }, { status: 400, headers })
  if (!hit(`geocode:${await clientIp()}`, 20, 10 * 60_000).ok) return Response.json({ results: [], error: "limit" }, { status: 429, headers })
  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_MS) return Response.json({ results: cached.results }, { headers })

  try {
    let results: Suggestion[] = []
    // Post-2025 addresses no longer have districts in OpenStreetMap: retry without them, then street + province.
    for (const candidate of fallbackQueries(q)) {
      const outcome = await search(candidate)
      if (outcome === "busy") return Response.json({ results: [], error: "busy" }, { status: 503, headers })
      results = outcome
      if (results.length) break
    }
    // Empty answers are not cached, so a reworded or retried search still reaches the map service.
    if (results.length) cache.set(key, { at: Date.now(), results })
    if (cache.size > 2000) for (const old of [...cache.keys()].slice(0, 500)) cache.delete(old)
    return Response.json({ results }, { headers })
  } catch (error) {
    console.error("address lookup failed", error)
    return Response.json({ results: [], error: "unavailable" }, { status: 502, headers })
  }
}

const DISTRICT = /^(quận|quan|huyện|huyen|thị xã|thi xa|q\.|h\.|tx\.)\s*/i

function fallbackQueries(q: string) {
  const parts = q.split(",").map((part) => part.trim()).filter(Boolean)
  const noDistrict = parts.filter((part) => !DISTRICT.test(part))
  const list = [q, noDistrict.join(", ")]
  if (parts.length > 2) list.push([parts[0], parts[parts.length - 1]].join(", "))
  return [...new Set(list.filter((item) => item.length >= 6))]
}

/** One Nominatim search, queued so the whole server sends at most one request per second. */
async function search(query: string): Promise<Suggestion[] | "busy"> {
  const wait = Math.max(0, nextSlot - Date.now())
  if (wait > 3000) return "busy"
  nextSlot = Math.max(Date.now(), nextSlot) + 1100
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=vn&addressdetails=1&limit=5&accept-language=vi&q=${encodeURIComponent(query)}`
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const response = await fetch(url, {
    headers: { "User-Agent": `BOAI-Shop/1.0 (address lookup for shipping${site ? `; ${site}` : ""})`, "Accept-Language": "vi" },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Nominatim ${response.status}`)
  const hits = (await response.json()) as NominatimHit[]
  return (Array.isArray(hits) ? hits : []).flatMap((item) => {
    const point = toPoint(item.lat, item.lon)
    if (!point || !item.display_name) return []
    const address = item.address ?? {}
    const province = detectProvince([address.state, address.province, address.city, item.display_name].filter(Boolean).join(", "))
    return [{ label: item.display_name.slice(0, 200), lat: point.lat, lng: point.lng, province: province?.code ?? null }]
  })
}
