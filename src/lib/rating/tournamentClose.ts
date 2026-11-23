// Điều phối đóng giải (E7): khóa idempotent → xử lý lô → ghi kết quả.
// Lưu trữ đi qua interface để test được không cần DB thật.
import type { MatchResult, MatchType, PlayerState } from "./ratingEngine.ts"
import {
  deriveStateFromLedger,
  processTournament,
  type HistoryRow,
  type LedgerRow,
  type LedgerState,
  type TournamentMatchInput,
} from "./tournamentProcessing.ts"

// Hằng GIẢ ĐỊNH nằm ở ratingConfig.ts (E1b); export lại để nơi dùng cũ không phải đổi.
import { FARM_WINDOW_DAYS } from "./ratingConfig.ts"
export { FARM_WINDOW_DAYS }

export type ClosableEvent = {
  id: string
  matchType: MatchType
  isDemo: boolean
}

export interface TournamentStore {
  /** Ghi có điều kiện: chỉ trả true khi processingLock chưa bật và processedAt chưa có. */
  claim(eventId: string): Promise<boolean>
  getEvent(eventId: string): Promise<ClosableEvent>
  getMatches(eventId: string): Promise<TournamentMatchInput[]>
  getPriorMatches(
    playerIds: string[],
    from: Date,
    to: Date,
    excludeEventId: string,
  ): Promise<MatchResult[]>
  /** Trạng thái MR trước giải. Store theo ledger bỏ qua các dòng của chính giải này. */
  getProfiles(
    playerIds: string[],
    excludeEventId?: string,
  ): Promise<Record<string, PlayerState>>
  saveResults(
    eventId: string,
    history: HistoryRow[],
    profiles: Record<string, PlayerState>,
  ): Promise<void>
  /** Bản ghi AP cho giải chính thức. Không ảnh hưởng MR. */
  recordAchievements?(eventId: string): Promise<void>
  markProcessed(eventId: string, at: Date): Promise<void>
  release(eventId: string): Promise<void>
}

export type CloseResult =
  | { status: "already_processed" }
  | {
      status: "processed"
      history: HistoryRow[]
      totals: Record<string, number>
      skipped: string[]
      demo: boolean
    }

export async function closeTournament(
  store: TournamentStore,
  eventId: string,
  now: Date = new Date(),
): Promise<CloseResult> {
  if (!(await store.claim(eventId))) return { status: "already_processed" }
  try {
    const event = await store.getEvent(eventId)
    if (event.isDemo) {
      // Dữ liệu minh họa không được tạo MR thật.
      await store.markProcessed(eventId, now)
      return { status: "processed", history: [], totals: {}, skipped: [], demo: true }
    }
    const matches = await store.getMatches(eventId)
    const players = [...new Set(matches.flatMap((m) => [...m.teamA, ...m.teamB]))]
    const earliest = matches.length
      ? Math.min(...matches.map((m) => new Date(m.playedAt).getTime()))
      : now.getTime()
    const prior = await store.getPriorMatches(
      players,
      new Date(earliest - FARM_WINDOW_DAYS * 86400000),
      now,
      eventId,
    )
    const profiles = await store.getProfiles(players, eventId)
    const result = processTournament({
      eventId,
      matchType: event.matchType,
      matches,
      profiles,
      priorMatches: prior,
    })
    await store.saveResults(eventId, result.history, result.profiles)
    if (event.matchType === "official") await store.recordAchievements?.(eventId)
    await store.markProcessed(eventId, now)
    return { status: "processed", ...result, demo: false }
  } catch (error) {
    await store.release(eventId)
    throw error
  }
}

// ---------- Ledger là nguồn sự thật (E7b) ----------

/** Thao tác lưu trữ tối thiểu để chạy theo ledger. Payload và test cùng dùng. */
export interface LedgerIO {
  loadLedger(playerIds: string[]): Promise<LedgerRow[]>
  /** deviceId chỉ dùng nội bộ cho engine; không bao giờ trả ra client. */
  loadDevices(playerIds: string[]): Promise<Record<string, string | undefined>>
  existingKeys(eventId: string): Promise<Set<string>>
  writeRow(eventId: string, row: HistoryRow): Promise<void>
  saveProfile(playerId: string, state: LedgerState): Promise<void>
}

/**
 * getProfiles/saveResults theo ledger:
 * - Trạng thái trước giải = ledger trừ các dòng của giải đang đóng, nên lần đóng
 *   lại sau lỗi tính ra đúng các dòng như lần đầu.
 * - Dòng có idempotencyKey đã tồn tại thì bỏ qua, không ghi và không tính lại.
 * - Hồ sơ không bị cộng dồn: ghi xong lịch sử mới tính lại toàn bộ từ ledger.
 */
export function ledgerBackedMethods(
  io: LedgerIO,
): Pick<TournamentStore, "getProfiles" | "saveResults"> {
  return {
    async getProfiles(playerIds, excludeEventId) {
      if (!playerIds.length) return {}
      const [rows, devices] = await Promise.all([
        io.loadLedger(playerIds),
        io.loadDevices(playerIds),
      ])
      const derived = deriveStateFromLedger(rows, playerIds, excludeEventId)
      return Object.fromEntries(
        playerIds.map((id) => [
          id,
          { id, ...derived[id], ...(devices[id] ? { deviceId: devices[id] } : {}) },
        ]),
      )
    },

    async saveResults(eventId, history) {
      const written = await io.existingKeys(eventId)
      for (const row of history) {
        if (written.has(row.idempotencyKey)) continue
        await io.writeRow(eventId, row)
        written.add(row.idempotencyKey)
      }
      const players = [...new Set(history.map((r) => r.player))]
      if (!players.length) return
      const derived = deriveStateFromLedger(await io.loadLedger(players), players)
      for (const player of players) await io.saveProfile(player, derived[player])
    },
  }
}
