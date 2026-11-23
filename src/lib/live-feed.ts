/** Client helper for /api/live/<feed> (parallel GET reads; see that route). */
export async function liveFeed<T>(
  feed: "inbox" | "notifications" | "announcements" | "sportdna",
  params?: Record<string, string | number>,
): Promise<T> {
  const qs = params
    ? `?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`
    : ""
  const res = await fetch(`/api/live/${feed}${qs}`, {
    cache: "no-store",
    credentials: "same-origin",
  })
  if (!res.ok) throw new Error(`live feed ${feed} failed: ${res.status}`)
  return (await res.json()) as T
}
