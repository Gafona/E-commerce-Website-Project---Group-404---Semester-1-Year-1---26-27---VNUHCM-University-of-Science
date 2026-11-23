import { loadInboxAction } from "../../../inbox-actions"
import { loadNotificationsAction } from "../../../notification-actions"
import { loadAnnouncementsAction } from "../../../announcement-actions"
import { loadSportDnaContextAction } from "../../../sportdna/actions"

/**
 * Read-only live data (polls and first-load state). Served as GET so it runs in
 * parallel: Server Actions are dispatched one at a time per tab, and polling
 * through them queued every click (checkout, saves) behind slow reads.
 */
export const dynamic = "force-dynamic"

const headers = { "Cache-Control": "private, no-store" }
const FILTERS = new Set(["all", "unread", "shop", "community", "order", "event", "account", "system"])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ feed: string }> },
) {
  const { feed } = await params
  const query = new URL(request.url).searchParams
  try {
    switch (feed) {
      case "inbox":
        return Response.json(await loadInboxAction(), { headers })
      case "notifications": {
        const filter = query.get("filter") ?? "all"
        const page = Math.min(50, Math.max(1, Math.floor(Number(query.get("page") ?? 1)) || 1))
        return Response.json(await loadNotificationsAction({ filter: FILTERS.has(filter) ? filter : "all", page }), { headers })
      }
      case "announcements":
        return Response.json(await loadAnnouncementsAction(), { headers })
      case "sportdna":
        return Response.json(await loadSportDnaContextAction(), { headers })
      default:
        return Response.json({ error: "Unknown feed" }, { status: 404, headers })
    }
  } catch (error) {
    console.error(`live feed ${feed} failed`, error)
    return Response.json({ error: "Live data is temporarily unavailable" }, { status: 503, headers })
  }
}
