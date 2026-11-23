// Snapshot of a member's SportDNA result (ELO, tier, 8 standard axes) for the
// community feed and share pages. Always computed on the server from stored
// results, never from client input; old cards are mapped onto today's axes.
import { resolveSkillTier, type DiagnosticProfiles, type SkillResult } from "./sportdna"
import { playerRadar, type DnaSportKey } from "./sportdna-radar"
import { isTestKind, scenarioElo, type RunAnswers, type RunResult, type TestKind, type TestRun } from "./sportdna-runs"
import { AXIS_IDS, AXIS_TEXT, toStandardAxes } from "./sportdna-axes"
import type { CoreResult } from "./sportdna-core"

export type DnaShareKind = "elo" | "radar"
export type DnaShareStat = { label: string; value: number | null; tier: string | null; sub: string }
export type DnaShareAxis = { id: string; label: string; value: number | null }
export type DnaShareCard = {
  kind: DnaShareKind
  sport: DnaSportKey
  stats: DnaShareStat[]
  axes: DnaShareAxis[]
}

export const isDnaShareKind = (v: unknown): v is DnaShareKind => v === "elo" || v === "radar"
export const isDnaSport = (v: unknown): v is DnaSportKey => v === "badminton" || v === "football"

const SPORT_VI: Record<DnaSportKey, string> = { badminton: "cầu lông", football: "bóng đá" }

const isSkillResult = (value: unknown): value is SkillResult => {
  if (!value || typeof value !== "object") return false
  const r = value as Partial<SkillResult>
  return (
    (r.sport === "football" || r.sport === "badminton") &&
    (r.mode === "quick" || r.mode === "deep") &&
    typeof r.overall === "number" &&
    typeof r.answeredAt === "string" &&
    Array.isArray(r.radar)
  )
}

/** Rebuild DiagnosticProfiles / TestRun[] from stored Payload documents (newest first). */
export function profilesFromDocs(
  assessments: { result?: unknown }[],
  runDocs: { runKey: string; test: string; createdAt: string; answers?: unknown; result?: unknown }[],
) {
  const profiles: DiagnosticProfiles = {}
  for (const doc of assessments) {
    if (!isSkillResult(doc.result)) continue
    const { sport, mode } = doc.result
    if (!profiles[sport]?.[mode]) profiles[sport] = { ...profiles[sport], [mode]: doc.result }
  }
  const runs: TestRun[] = runDocs
    .filter((d) => isTestKind(d.test))
    .map((d) => ({
      runKey: d.runKey,
      test: d.test as TestKind,
      at: d.createdAt,
      answers: (d.answers ?? {}) as RunAnswers,
      result: (d.result ?? {}) as RunResult,
    }))
  return { profiles, runs }
}

const standardAxes = (sport: DnaSportKey, values: { id?: string | null; label?: string | null; value: number | null }[]): DnaShareAxis[] =>
  toStandardAxes(sport, values).map((axis) => ({ id: axis.id, label: AXIS_TEXT[sport][axis.id].vi, value: axis.value }))

/**
 * The card for a sport: the latest main assessment (ELO, tier, 8 axes) when
 * there is one, otherwise the older extra tests mapped onto the same axes.
 */
export function buildDnaShare(
  kind: DnaShareKind,
  sport: DnaSportKey,
  profiles: DiagnosticProfiles,
  runs: TestRun[],
  core?: CoreResult | null,
): DnaShareCard | null {
  let stats: DnaShareStat[]
  let axes: DnaShareAxis[]
  if (core && core.sport === sport) {
    stats = [{ label: `ELO ${SPORT_VI[sport]}`, value: core.elo, tier: core.tier.name, sub: `Lần ${core.attempt}` }]
    axes = AXIS_IDS[sport].map((id) => ({ id, label: AXIS_TEXT[sport][id].vi, value: core.axes.find((a) => a.id === id)?.score ?? null }))
  } else {
    const tier = (v: number | null) => (v === null ? null : resolveSkillTier(v).label)
    stats = []
    if (sport === "badminton") {
      const deep = profiles.badminton?.deep
      const singles = deep && deep.schemaVersion === "v1.3.3-provisional" ? deep.overall : null
      const doubles = scenarioElo(runs, "doubles_scenario")
      stats.push(
        { label: "ELO cầu lông đơn", value: singles, tier: tier(singles), sub: "Deep/Retest" },
        { label: "ELO cầu lông đôi", value: doubles.overall, tier: tier(doubles.overall), sub: `${doubles.sessions} lượt tình huống` },
      )
    } else {
      const football = scenarioElo(runs, "football_scenario")
      stats.push({ label: "ELO bóng đá", value: football.overall, tier: tier(football.overall), sub: `${football.sessions} lượt tình huống` })
    }
    try {
      axes = standardAxes(sport, playerRadar(sport, profiles, runs))
    } catch {
      // A malformed legacy record must not block sharing the ELO card.
      axes = standardAxes(sport, [])
    }
  }
  if (kind === "elo" && !stats.some((s) => s.value !== null)) return null
  if (kind === "radar" && !axes.some((a) => a.value !== null)) return null
  return { kind, sport, stats, axes }
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null)
const str = (v: unknown, max = 80) => (typeof v === "string" ? v.slice(0, max) : "")

/**
 * Defensive read of a stored card. Old cards used other axis names; they are
 * mapped to the standard axes and anything without data stays null.
 */
export function readDnaShare(value: unknown): DnaShareCard | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (!isDnaShareKind(v.kind) || !isDnaSport(v.sport)) return null
  const stats = (Array.isArray(v.stats) ? v.stats : []).slice(0, 6).map((s) => {
    const o = (s ?? {}) as Record<string, unknown>
    return { label: str(o.label), value: num(o.value), tier: str(o.tier) || null, sub: str(o.sub) }
  })
  const stored = (Array.isArray(v.axes) ? v.axes : []).slice(0, 12).map((a) => {
    const o = (a ?? {}) as Record<string, unknown>
    return { id: str(o.id, 40) || null, label: str(o.label, 40), value: num(o.value) }
  })
  return { kind: v.kind, sport: v.sport, stats, axes: standardAxes(v.sport, stored) }
}
