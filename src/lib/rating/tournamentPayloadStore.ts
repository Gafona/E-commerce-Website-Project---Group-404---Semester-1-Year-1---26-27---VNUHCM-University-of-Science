import type { PayloadRequest } from "payload"
import { calculateAchievementPoints, type AchievementInput } from "../sportdna"
import type { MatchResult, MatchType } from "./ratingEngine"
import { ledgerBackedMethods, type LedgerIO, type TournamentStore } from "./tournamentClose"
import { toMatchResult, type HistoryReason, type TournamentMatchInput } from "./tournamentProcessing"

// Adapter Payload cho closeTournament. Mọi thao tác truyền `req` để dùng chung
// transaction của lần đóng giải (nếu adapter DB hỗ trợ transaction).
const SYSTEM = { ratingSystem: true }

const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "object") {
    const v = value as { id?: unknown; value?: unknown }
    if (v.value !== undefined) return idOf(v.value)
    return v.id === undefined ? null : String(v.id)
  }
  return String(value)
}
const ids = (value: unknown) =>
  (Array.isArray(value) ? value : []).map(idOf).filter((v): v is string => Boolean(v))

type MatchDoc = {
  id: string
  playedAt: string
  teamA?: unknown
  teamB?: unknown
  scoreA?: number | null
  scoreB?: number | null
  phase?: string | null
  isWalkover?: boolean | null
  isDisputed?: boolean | null
  isVoided?: boolean | null
  isApproved?: boolean | null
  approvedBy?: unknown
  confirmedBy?: unknown
}

const toInput = (m: MatchDoc): TournamentMatchInput => ({
  id: String(m.id),
  playedAt: m.playedAt,
  teamA: ids(m.teamA),
  teamB: ids(m.teamB),
  scoreA: typeof m.scoreA === "number" ? m.scoreA : null,
  scoreB: typeof m.scoreB === "number" ? m.scoreB : null,
  phase: m.phase === "group" || m.phase === "knockout" ? m.phase : "none",
  isWalkover: Boolean(m.isWalkover),
  isDisputed: Boolean(m.isDisputed),
  isVoided: Boolean(m.isVoided),
  isApproved: Boolean(m.isApproved && m.approvedBy),
  confirmedBy: ids(m.confirmedBy),
})

export function createPayloadTournamentStore(req: PayloadRequest): TournamentStore {
  const { payload } = req
  type ProfileRef = { id: string; deviceId?: string | null; possibleAlt?: boolean | null }
  const profileRefs: Record<string, ProfileRef> = {}

  const loadProfileRefs = async (playerIds: string[]) => {
    const missing = playerIds.filter((id) => !profileRefs[id])
    if (!missing.length) return
    const found = await payload.find({
      collection: "rating-profiles",
      where: { user: { in: missing } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      req,
    })
    for (const doc of found.docs) {
      const user = idOf(doc.user)
      if (user) profileRefs[user] = { id: String(doc.id), deviceId: doc.deviceId, possibleAlt: doc.possibleAlt }
    }
  }

  const keyExists = async (key: string) => {
    const found = await payload.find({
      collection: "match-rating-history",
      where: { idempotencyKey: { equals: key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    return found.totalDocs > 0
  }

  const ledgerIO: LedgerIO = {
    async loadLedger(playerIds) {
      if (!playerIds.length) return []
      const found = await payload.find({
        collection: "match-rating-history",
        where: { player: { in: playerIds } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      return found.docs.map((doc) => ({
        player: idOf(doc.player) ?? "",
        eventId: idOf(doc.event),
        matchId: idOf(doc.match),
        reason: doc.reason as HistoryReason,
        delta: Number(doc.delta ?? 0),
        occurredAt: doc.occurredAt ?? null,
        order: new Date(doc.createdAt).getTime(),
      }))
    },

    async loadDevices(playerIds) {
      await loadProfileRefs(playerIds)
      return Object.fromEntries(playerIds.map((id) => [id, profileRefs[id]?.deviceId ?? undefined]))
    },

    async existingKeys(eventId) {
      const found = await payload.find({
        collection: "match-rating-history",
        where: { event: { equals: eventId } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      return new Set(found.docs.map((doc) => doc.idempotencyKey).filter((k): k is string => Boolean(k)))
    },

    async writeRow(eventId, row) {
      try {
        await payload.create({
          collection: "match-rating-history",
          data: {
            player: row.player,
            event: eventId,
            match: row.matchId,
            mrBefore: row.mrBefore,
            mrAfter: row.mrAfter,
            delta: row.delta,
            kMatch: row.kMatch,
            reason: row.reason,
            idempotencyKey: row.idempotencyKey,
            occurredAt: row.occurredAt || null,
          },
          overrideAccess: true,
          req,
          context: SYSTEM,
        })
      } catch (error) {
        // Ràng buộc unique là lớp chặn cuối khi hai lần đóng chạy chồng nhau.
        if (await keyExists(row.idempotencyKey)) return
        throw error
      }
    },

    async saveProfile(user, state) {
      await loadProfileRefs([user])
      const ref = profileRefs[user]
      const data = { mr: state.mr, matchesPlayed: state.matchesPlayed, mrGainFirst10: state.mrGainFirst10 }
      if (ref) {
        // Gửi lại deviceId/possibleAlt hiện có: hook flagPossibleAlt của rating-profiles
        // sẽ xóa cờ possibleAlt nếu lần cập nhật không kèm deviceId.
        const keep = ref.deviceId ? { deviceId: ref.deviceId, possibleAlt: Boolean(ref.possibleAlt) } : {}
        await payload.update({ collection: "rating-profiles", id: ref.id, data: { ...data, ...keep }, overrideAccess: true, req, context: SYSTEM })
      } else {
        const doc = await payload.create({ collection: "rating-profiles", data: { user, ...data, isPublic: false }, overrideAccess: true, req, context: SYSTEM })
        profileRefs[user] = { id: String(doc.id) }
      }
    },
  }

  return {
    async claim(eventId) {
      // Ghi có điều kiện: chỉ cập nhật khi chưa khóa và chưa xử lý.
      const result = await payload.update({
        collection: "tournament-events",
        where: {
          and: [
            { id: { equals: eventId } },
            { processingLock: { not_equals: true } },
            { processedAt: { exists: false } },
          ],
        },
        data: { processingLock: true },
        overrideAccess: true,
        req,
        context: SYSTEM,
      })
      return result.docs.length === 1
    },

    async getEvent(eventId) {
      const event = await payload.findByID({ collection: "tournament-events", id: eventId, depth: 0, overrideAccess: true, req })
      return { id: String(event.id), matchType: event.matchType as MatchType, isDemo: Boolean(event.isDemo) }
    },

    async getMatches(eventId) {
      const found = await payload.find({
        collection: "tournament-matches",
        where: { event: { equals: eventId } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      return found.docs.map((m) => toInput(m as MatchDoc))
    },

    async getPriorMatches(playerIds, from, to, excludeEventId) {
      if (!playerIds.length) return []
      const found = await payload.find({
        collection: "tournament-matches",
        where: {
          and: [
            { event: { not_equals: excludeEventId } },
            { "event.status": { equals: "closed_processed" } },
            { playedAt: { greater_than_equal: from.toISOString() } },
            { playedAt: { less_than: to.toISOString() } },
            { or: [{ teamA: { in: playerIds } }, { teamB: { in: playerIds } }] },
          ],
        },
        pagination: false,
        depth: 1,
        overrideAccess: true,
        req,
      })
      const out: MatchResult[] = []
      for (const doc of found.docs) {
        const event = doc.event as { matchType?: string } | string
        const type = typeof event === "object" ? (event.matchType as MatchType) : undefined
        if (!type) continue
        out.push(toMatchResult(toInput(doc as MatchDoc), type))
      }
      return out
    },

    ...ledgerBackedMethods(ledgerIO),

    async recordAchievements(eventId) {
      const event = await payload.findByID({ collection: "tournament-events", id: eventId, depth: 0, overrideAccess: true, req })
      const level = event.competitionLevel as AchievementInput["level"] | null | undefined
      if (!level) return // Thiếu cấp giải: không sinh AP (báo trong báo cáo E7).
      const [results, registrations] = await Promise.all([
        payload.find({ collection: "tournament-results", where: { event: { equals: eventId } }, pagination: false, depth: 0, overrideAccess: true, req }),
        payload.find({
          collection: "tournament-registrations",
          where: { and: [{ event: { equals: eventId } }, { status: { equals: "approved" } }] },
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        }),
      ])
      const fieldSize = registrations.docs.length
      const daysAgo = Math.max(0, (Date.now() - new Date(event.startDate).getTime()) / 86400000)
      // Hook của user-achievements đặt lại trạng thái khi req.user là tài khoản app.
      // Bản ghi do hệ thống sinh nên dùng req không gắn người dùng, vẫn giữ transaction.
      const systemReq = { ...req, user: null } as PayloadRequest
      for (const result of results.docs) {
        const player = idOf(result.player)
        const rank = Number(result.finalRank)
        if (!player || !rank || !fieldSize || rank > fieldSize) continue
        const fingerprint = `tournament:${eventId}:${player}`
        const existing = await payload.find({
          collection: "user-achievements",
          where: { eventFingerprint: { equals: fingerprint } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (existing.totalDocs) continue
        await payload.create({
          collection: "user-achievements",
          data: {
            owner: player,
            eventName: String(event.name).slice(0, 120),
            sport: "badminton",
            rank,
            fieldSize,
            participation: 1,
            eventDate: event.startDate,
            claimedLevel: level,
            evidenceUrl: `/admin/collections/tournament-events/${eventId}`,
            eventFingerprint: fingerprint,
            verificationStatus: "verified",
            officialPoints: calculateAchievementPoints({ rank, fieldSize, level, participation: 1, daysAgo }),
          },
          overrideAccess: true,
          req: systemReq,
          context: SYSTEM,
        })
      }
    },

    async markProcessed(eventId, at) {
      await payload.update({
        collection: "tournament-events",
        id: eventId,
        data: { processedAt: at.toISOString(), processingLock: false },
        overrideAccess: true,
        req,
        context: SYSTEM,
      })
    },

    async release(eventId) {
      await payload.update({
        collection: "tournament-events",
        id: eventId,
        data: { processingLock: false },
        overrideAccess: true,
        req,
        context: SYSTEM,
      })
    },
  }
}
