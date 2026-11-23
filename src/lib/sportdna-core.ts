// SportDNA core engine (client-safe, pure). One shared scorer, parameterised by sport.
//
// ELO per sport (never combined across sports):
//   E_i(R) = 1 / (1 + 10^((D_i − R) / 400))          expected score on item i (difficulty D_i)
//   PR     = R such that Σ E_i(R) = Σ s_i              performance rating of this attempt (Rasch/Elo MLE)
//   ELO    = PR on the first attempt;  ELO_new = ELO_old + 0.5 × (PR − ELO_old) on later attempts
// PR is bounded to [500, hardest item + 400], so self-assessment alone tops out in tier 9;
// tier 10 needs verified competition results.
import { RATING_TIERS } from "./rating/ratingConfig.ts"
import {
  AXES,
  bankFor,
  DRILLS,
  type BadmintonStyle,
  type Bi,
  type CoreQuestion,
  type CoreSport,
  type FootballPosition,
  type FootballSurface,
  type QGroup,
} from "./sportdna-core-bank.ts"

export const CORE_VERSION = "core-1" as const
export const RETAKE_WEIGHT = 0.5
export const CONTRADICTION_GAP = 400
export const CONTRADICTION_LIMIT = 2

export type CoreAnswers = Record<string, number>
export type CoreContext = { position?: FootballPosition; surface?: FootballSurface; style?: BadmintonStyle }

export type CoreResult = {
  version: typeof CORE_VERSION
  sport: CoreSport
  at: string
  attempt: number
  elo: number
  eloBefore: number | null
  performance: number
  tier: { index: number; id: string; name: string }
  axes: { id: string; score: number }[]
  groups: Record<QGroup, number>
  consistency: { ok: boolean; pairs: { hard: string; easy: string }[]; flagged: string[] }
  next: { index: number; name: string; minElo: number; minAxis: number; needElo: number; needAxis: number; weakestAxis: string } | null
  drills: { axis: string; vi: string; en: string }[]
  answered: number
  total: number
  context: CoreContext
}

export type DnaStoredResult = { id?: string; sport: CoreSport; at: string; elo: number; result: CoreResult }

const expected = (rating: number, difficulty: number) => 1 / (1 + 10 ** ((difficulty - rating) / 400))

/** Lowest axis score each tier requires (tiers 1–3 have no axis requirement). */
export const tierAxisMin = (index: number) => (index <= 2 ? 0 : Math.min(80, 10 + index * 7))
export const tierMinElo = (index: number) => RATING_TIERS[index]?.min ?? 0

export function tierFor(elo: number, weakestAxis: number) {
  let index = 0
  for (let i = 0; i < RATING_TIERS.length; i++) {
    const min = RATING_TIERS[i].min
    if ((min === null || elo >= min) && weakestAxis >= tierAxisMin(i)) index = i
  }
  return { index, id: RATING_TIERS[index].id, name: RATING_TIERS[index].name }
}

/** Ladder for explanations: every tier with the conditions to reach it. */
export const TIER_LADDER = RATING_TIERS.map((t, index) => ({ index, id: t.id, name: t.name, minElo: t.min ?? 0, minAxis: tierAxisMin(index) }))

/** Performance rating: solves Σ E_i(R) = Σ s_i by bisection (monotonic in R). */
export function performanceRating(items: { difficulty: number; score: number }[]) {
  if (!items.length) return 1000
  const total = items.reduce((t, i) => t + i.score, 0)
  const hi = Math.max(...items.map((i) => i.difficulty)) + 400
  const lo = 500
  let a = lo
  let b = hi
  for (let step = 0; step < 50; step++) {
    const mid = (a + b) / 2
    const sum = items.reduce((t, i) => t + expected(mid, i.difficulty), 0)
    if (sum < total) a = mid
    else b = mid
  }
  return Math.round(Math.max(lo, Math.min(hi, (a + b) / 2)))
}

const isOption = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3

/** Questions answered "very well" when hard but "poorly" when much easier, in the same group or skill. */
export function findContradictions(bank: CoreQuestion[], answers: CoreAnswers) {
  const answered = bank.filter((q) => isOption(answers[q.id]))
  const pairs: { hard: string; easy: string }[] = []
  for (const hard of answered) {
    const sh = hard.options[answers[hard.id]].score
    if (sh < 0.9) continue
    for (const easy of answered) {
      if (hard.difficulty - easy.difficulty < CONTRADICTION_GAP) continue
      const shared = hard.group === easy.group || Object.keys(hard.axes).some((axis) => axis in easy.axes)
      if (shared && easy.options[answers[easy.id]].score <= 0.25) pairs.push({ hard: hard.id, easy: easy.id })
    }
  }
  const flagged = [...new Set(pairs.flatMap((p) => [p.hard, p.easy]))]
  return { ok: pairs.length < CONTRADICTION_LIMIT, pairs, flagged }
}

export function scoreCore(
  sport: CoreSport,
  answers: CoreAnswers,
  context: CoreContext,
  previous: { elo: number; attempt: number } | null,
  at = new Date().toISOString(),
): CoreResult | null {
  const bank = bankFor(sport)
  const done = bank.filter((q) => isOption(answers?.[q.id]))
  if (done.length !== bank.length) return null
  const items = done.map((q) => ({ q, difficulty: q.difficulty, score: q.options[answers[q.id]].score }))
  const performance = performanceRating(items)
  const elo = Math.round(previous ? previous.elo + RETAKE_WEIGHT * (performance - previous.elo) : performance)

  const axes = AXES[sport].map((axis) => {
    let num = 0
    let den = 0
    for (const { q, score } of items) {
      const w = q.axes[axis as keyof typeof q.axes] ?? 0
      if (!w) continue
      const m = q.difficulty / 1000
      num += w * m * score
      den += w * m
    }
    return { id: axis as string, score: den ? Math.round((100 * num) / den) : 0 }
  })
  const groups = (["technique", "tactics", "physical"] as QGroup[]).reduce(
    (acc, g) => {
      const mine = items.filter((i) => i.q.group === g)
      const num = mine.reduce((t, i) => t + i.score * i.difficulty, 0)
      const den = mine.reduce((t, i) => t + i.difficulty, 0)
      acc[g] = den ? Math.round((100 * num) / den) : 0
      return acc
    },
    {} as Record<QGroup, number>,
  )
  const weakest = [...axes].sort((a, b) => a.score - b.score)[0]
  const tier = tierFor(elo, weakest.score)
  const nextLadder = TIER_LADDER[tier.index + 1]
  const next = nextLadder
    ? {
        index: nextLadder.index,
        name: nextLadder.name,
        minElo: nextLadder.minElo,
        minAxis: nextLadder.minAxis,
        needElo: Math.max(0, nextLadder.minElo - elo),
        needAxis: Math.max(0, nextLadder.minAxis - weakest.score),
        weakestAxis: weakest.id,
      }
    : null
  const drills = [...axes]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((a) => ({ axis: a.id, ...(DRILLS[sport][a.id] as Bi) }))
  return {
    version: CORE_VERSION,
    sport,
    at,
    attempt: (previous?.attempt ?? 0) + 1,
    elo,
    eloBefore: previous?.elo ?? null,
    performance,
    tier,
    axes,
    groups,
    consistency: findContradictions(bank, answers),
    next,
    drills,
    answered: done.length,
    total: bank.length,
    context: sanitizeContext(sport, context),
  }
}

export function sanitizeContext(sport: CoreSport, raw: unknown): CoreContext {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  if (sport === "football")
    return {
      position: ["FW", "MF", "DF", "GK"].includes(String(c.position)) ? (c.position as FootballPosition) : undefined,
      surface: ["ag", "fg", "ic"].includes(String(c.surface)) ? (c.surface as FootballSurface) : undefined,
    }
  return { style: ["attack", "defense", "allround"].includes(String(c.style)) ? (c.style as BadmintonStyle) : undefined }
}

export function parseCoreAnswers(sport: CoreSport, raw: unknown): CoreAnswers | null {
  if (!raw || typeof raw !== "object") return null
  const answers: CoreAnswers = {}
  for (const q of bankFor(sport)) {
    const v = (raw as Record<string, unknown>)[q.id]
    if (!isOption(v)) return null
    answers[q.id] = v as number
  }
  return answers
}

export const isCoreResult = (value: unknown): value is CoreResult =>
  !!value && typeof value === "object" && (value as { version?: unknown }).version === CORE_VERSION

export function latestDnaElo(dna: DnaStoredResult[], sport: CoreSport) {
  const mine = dna.filter((d) => d.sport === sport).sort((a, b) => b.at.localeCompare(a.at))
  return mine[0]?.elo ?? null
}

/** Deterministic option order per question (so answer positions don't reveal scores). */
export function optionOrder(questionId: string, seed: number) {
  let h = seed >>> 0
  for (const ch of questionId) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0
  const order = [0, 1, 2, 3]
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
