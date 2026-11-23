// Vòng đời giải đấu (E7). Thuần TS, không phụ thuộc DB.

export const TOURNAMENT_STATUSES = [
  "draft",
  "registration_open",
  "in_progress",
  "pending_approval",
  "closed_processed",
  "cancelled",
] as const

export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number]

const NEXT: Record<TournamentStatus, TournamentStatus | null> = {
  draft: "registration_open",
  registration_open: "in_progress",
  in_progress: "pending_approval",
  pending_approval: "closed_processed",
  closed_processed: null,
  cancelled: null,
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string }

export const isTournamentStatus = (value: unknown): value is TournamentStatus =>
  typeof value === "string" &&
  (TOURNAMENT_STATUSES as readonly string[]).includes(value)

/** Kiểm một lần chuyển trạng thái. Giữ nguyên trạng thái luôn hợp lệ (không phải chuyển). */
export function checkTransition(
  from: TournamentStatus,
  to: TournamentStatus,
  actor: { isAdmin: boolean },
): TransitionCheck {
  if (from === to) return { ok: true }
  if (to === "cancelled") {
    return from === "closed_processed"
      ? { ok: false, reason: "Giải đã xử lý rating, không thể hủy." }
      : { ok: true }
  }
  if (NEXT[from] !== to)
    return {
      ok: false,
      reason: `Không thể chuyển trạng thái từ "${from}" sang "${to}".`,
    }
  if (to === "closed_processed" && !actor.isAdmin)
    return { ok: false, reason: "Chỉ admin được đóng và xử lý giải." }
  return { ok: true }
}
