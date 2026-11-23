// Xử lý lô rating khi đóng giải (E7). Thuần TS: nhận dữ liệu vào, trả dữ liệu ra.
// Chỉ gọi engine E1, không sửa công thức.
import {
  applyTournamentCap,
  computeMatchDeltas,
  countUniqueOpponents,
  findFarmViolators,
  kFor,
  type MatchResult,
  type MatchType,
  type PlayerState,
} from "./ratingEngine.ts"

export type MatchPhase = "group" | "knockout" | "none"

export type TournamentMatchInput = {
  id: string
  playedAt: string | Date
  teamA: string[]
  teamB: string[]
  scoreA: number | null
  scoreB: number | null
  phase: MatchPhase
  isWalkover: boolean
  isDisputed: boolean
  isVoided: boolean
  /** Admin đã duyệt (approvedBy có giá trị). */
  isApproved: boolean
  /** Người chơi đã xác nhận kết quả (dùng cho giao hữu V1). */
  confirmedBy: string[]
}

export type HistoryReason =
  | "normal"
  | "farm_zero"
  | "growth_cap"
  | "tournament_cap"
  | "reversal"

export type HistoryRow = {
  player: string
  matchId: string | null
  mrBefore: number
  mrAfter: number
  delta: number
  kMatch: number | null
  reason: HistoryReason
  /** `{eventId}:{matchId|cap}:{userId}:{reason}` — chống ghi trùng khi đóng lại giải. */
  idempotencyKey: string
  /** Thời điểm trận (dòng cap: trận cuối của giải). Dùng để sắp lại ledger. */
  occurredAt: string
}

export const historyKey = (
  eventId: string,
  matchId: string | null,
  player: string,
  reason: HistoryReason,
) => `${eventId}:${matchId ?? "cap"}:${player}:${reason}`

export type ProcessInput = {
  eventId: string
  matchType: MatchType
  matches: TournamentMatchInput[]
  /** Trạng thái MR trước giải. Người chưa có hồ sơ được khởi tạo mặc định. */
  profiles: Record<string, PlayerState>
  /** Trận đã xử lý ở các giải khác (để phát hiện farm trong 30 ngày). */
  priorMatches: MatchResult[]
}

export const DEFAULT_MR = 1000

export const newPlayerState = (id: string): PlayerState => ({
  id,
  mr: DEFAULT_MR,
  matchesPlayed: 0,
  mrGainFirst10: 0,
})

const time = (value: string | Date) => new Date(value).getTime()

/** Friendly: admin duyệt, hoặc mỗi đội có ít nhất một người xác nhận. Community/official: bắt buộc admin duyệt. */
export function isMatchCountable(m: TournamentMatchInput, type: MatchType) {
  if (m.isWalkover || m.isDisputed || m.isVoided) return false
  if (m.scoreA === null || m.scoreB === null || m.scoreA === m.scoreB)
    return false
  if (m.isApproved) return true
  if (type !== "friendly") return false
  const confirmed = new Set(m.confirmedBy)
  return (
    m.teamA.some((p) => confirmed.has(p)) &&
    m.teamB.some((p) => confirmed.has(p))
  )
}

/** Thứ tự xử lý: thời gian thi đấu, rồi id trận. Không phụ thuộc thứ tự lưu trong DB. */
export const sortMatches = (matches: TournamentMatchInput[]) =>
  [...matches].sort(
    (a, b) =>
      time(a.playedAt) - time(b.playedAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )

export const toMatchResult = (
  m: TournamentMatchInput,
  type: MatchType,
): MatchResult => ({
  matchId: m.id,
  matchType: type,
  date: new Date(m.playedAt),
  teamA: m.teamA,
  teamB: m.teamB,
  isVerified: isMatchCountable(m, type),
  isAdminVerified: m.isApproved,
  isWalkover: m.isWalkover,
  isKZero: false,
})

export function processTournament(input: ProcessInput) {
  const { eventId, matchType } = input
  const state: Record<string, PlayerState> = {}
  const start: Record<string, number> = {}
  const gainedFirst10: Record<string, number> = {}
  const stateOf = (id: string) => {
    if (!state[id]) {
      const base = input.profiles[id] ?? newPlayerState(id)
      state[id] = { ...base, id }
      start[id] = state[id].mr
      gainedFirst10[id] = 0
    }
    return state[id]
  }

  const history: HistoryRow[] = []
  const processed: MatchResult[] = []
  const skipped: string[] = []
  const totals: Record<string, number> = {}
  let lastPlayed = ""

  for (const m of sortMatches(input.matches)) {
    if (!isMatchCountable(m, matchType)) {
      skipped.push(m.id)
      continue
    }
    const teamA = m.teamA.map(stateOf)
    const teamB = m.teamB.map(stateOf)
    const current = toMatchResult(m, matchType)
    const violators = findFarmViolators([...input.priorMatches, ...processed], {
      ...current,
      tournamentId: eventId,
      tournamentPhase: m.phase,
    })
    const aWins = (m.scoreA ?? 0) > (m.scoreB ?? 0)
    const deltas = computeMatchDeltas(teamA, teamB, aWins, matchType, violators)
    const uncapped = computeMatchDeltas(teamA, teamB, aWins, matchType, new Set(), Infinity)
    const kMatch = Math.max(...[...teamA, ...teamB].map((p) => kFor(p, matchType)))
    const occurredAt = new Date(m.playedAt).toISOString()
    lastPlayed = occurredAt

    for (const p of [...teamA, ...teamB]) {
      const delta = deltas[p.id]
      const reason: HistoryReason = violators.has(p.id)
        ? "farm_zero"
        : delta !== uncapped[p.id]
          ? "growth_cap"
          : "normal"
      const before = p.mr
      history.push({
        player: p.id,
        matchId: m.id,
        mrBefore: before,
        mrAfter: before + delta,
        delta,
        kMatch,
        reason,
        idempotencyKey: historyKey(eventId, m.id, p.id, reason),
        occurredAt,
      })
      totals[p.id] = (totals[p.id] ?? 0) + delta
      p.mr = before + delta
      if (reason !== "farm_zero") {
        if (p.matchesPlayed < 10 && delta > 0) {
          p.mrGainFirst10 += delta
          gainedFirst10[p.id] += delta
        }
        p.matchesPlayed += 1
      }
    }
    processed.push(current)
  }

  // Trần ±80/giải theo từng người: ghi một dòng điều chỉnh riêng, không sửa dòng trận.
  const capped = applyTournamentCap(totals)
  for (const [id, total] of Object.entries(totals)) {
    const adjustment = capped[id] - total
    if (adjustment === 0) continue
    const p = state[id]
    history.push({
      player: id,
      matchId: null,
      mrBefore: p.mr,
      mrAfter: p.mr + adjustment,
      delta: adjustment,
      kMatch: null,
      reason: "tournament_cap",
      idempotencyKey: historyKey(eventId, null, id, "tournament_cap"),
      occurredAt: lastPlayed,
    })
    p.mr += adjustment
    // Phần tăng bị cắt không được tính vào trần +400 của 10 trận đầu.
    if (adjustment < 0)
      p.mrGainFirst10 -= Math.min(gainedFirst10[id], -adjustment)
  }

  const finalTotals = Object.fromEntries(
    Object.keys(state).map((id) => [id, state[id].mr - start[id]]),
  )
  return { history, profiles: state, totals: finalTotals, skipped }
}

/** Đếm đối thủ khác nhau của một người trong các trận giải, gộp tài khoản cùng deviceId. */
export function uniqueOpponentsInTournament(
  matches: TournamentMatchInput[],
  player: string,
  type: MatchType,
  devices: Record<string, { deviceId?: string }>,
) {
  return countUniqueOpponents(
    matches.map((m) => toMatchResult(m, type)),
    player,
    type,
    devices,
  )
}

// ---------- Tính lại hồ sơ từ ledger (E7b) ----------

/** Một dòng match-rating-history đã lưu, rút gọn cho việc tính lại. */
export type LedgerRow = {
  player: string
  eventId: string | null
  matchId: string | null
  reason: HistoryReason
  delta: number
  occurredAt: string | null
  /** Thứ tự ghi (createdAt, ms). Chỉ dùng để xếp các giải theo thứ tự được xử lý. */
  order: number
}

export type LedgerState = Pick<PlayerState, "mr" | "matchesPlayed" | "mrGainFirst10">

const COUNTED = new Set<HistoryReason>(["normal", "growth_cap"])

/**
 * Trạng thái MR suy ra hoàn toàn từ ledger.
 * - mr = DEFAULT_MR + tổng delta (mọi lý do). Bằng mrAfter của dòng cuối khi
 *   chuỗi ledger liên tục, nhưng không phụ thuộc thứ tự createdAt trùng mili giây.
 * - matchesPlayed/mrGainFirst10: chỉ dòng trận normal/growth_cap (farm_zero không
 *   tính, giống processTournament); xếp theo thứ tự giải được xử lý, rồi
 *   thời điểm trận, rồi id trận (giống sortMatches). Dòng tournament_cap âm trừ
 *   phần tăng 10 trận đầu của chính giải đó.
 */
export function deriveStateFromLedger(
  rows: LedgerRow[],
  playerIds: string[],
  excludeEventId?: string,
): Record<string, LedgerState> {
  const out: Record<string, LedgerState> = {}
  for (const player of playerIds) {
    const mine = rows.filter(
      (r) => r.player === player && (!excludeEventId || r.eventId !== excludeEventId),
    )
    const mr = DEFAULT_MR + mine.reduce((s, r) => s + r.delta, 0)
    const eventOrder = new Map<string, number>()
    for (const r of mine) {
      const key = r.eventId ?? ""
      eventOrder.set(key, Math.min(eventOrder.get(key) ?? Infinity, r.order))
    }
    const counted = mine
      .filter((r) => r.matchId && COUNTED.has(r.reason))
      .sort((a, b) => {
        const ea = a.eventId ?? ""
        const eb = b.eventId ?? ""
        return (
          eventOrder.get(ea)! - eventOrder.get(eb)! ||
          (ea < eb ? -1 : ea > eb ? 1 : 0) ||
          time(a.occurredAt ?? new Date(0)) - time(b.occurredAt ?? new Date(0)) ||
          (a.matchId! < b.matchId! ? -1 : a.matchId! > b.matchId! ? 1 : 0)
        )
      })
    let matchesPlayed = 0
    let gain = 0
    const gainByEvent: Record<string, number> = {}
    for (const r of counted) {
      if (matchesPlayed < 10 && r.delta > 0) {
        gain += r.delta
        gainByEvent[r.eventId ?? ""] = (gainByEvent[r.eventId ?? ""] ?? 0) + r.delta
      }
      matchesPlayed += 1
    }
    for (const r of mine) {
      if (r.reason === "tournament_cap" && r.delta < 0)
        gain -= Math.min(gainByEvent[r.eventId ?? ""] ?? 0, -r.delta)
    }
    out[player] = { mr, matchesPlayed, mrGainFirst10: Math.max(0, gain) }
  }
  return out
}
