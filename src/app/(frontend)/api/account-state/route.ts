import { loadAccountStateAction } from "../../account-state-actions"

// Per-account cart/favorites snapshot. A GET route (not a Server Action) so it
// loads in parallel instead of waiting in the client's sequential action queue.
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return Response.json(await loadAccountStateAction(), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch {
    // A failed check is not a sign-out: the client shows a guest view and leaves stored data alone.
    return Response.json(
      { authenticated: false },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    )
  }
}
