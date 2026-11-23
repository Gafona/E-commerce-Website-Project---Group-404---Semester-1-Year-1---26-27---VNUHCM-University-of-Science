// SportDNA — bài test ngoài bài đánh đơn (Deep/Retest/Quick đơn nằm ở sportdna-assessment.ts).
// Dùng chung cho server (collection tự chấm lại) và client (hiển thị ngay, lưu tạm khi chưa đăng nhập).
import {
  PHYSICAL_QUIZ,
  POSITION_QUESTIONS,
  SCENARIOS,
  scoreScenario,
  suggestRole,
  updateRating,
  type Sport as BankSport,
} from "./sportdna-bank"
import { PRACTICE_QUESTIONS, type PracticeSport } from "./sportdna-practice.ts"

export type TestKind =
  | "doubles_scenario"
  | "doubles_quick"
  | "practice_singles"
  | "practice_doubles"
  | "football_scenario"
  | "football_quick"
  | "position"

export const TEST_META: Record<TestKind, { label: string; sport: "badminton" | "football"; countsElo: boolean }> = {
  doubles_scenario: { label: "Tình huống cầu lông đôi", sport: "badminton", countsElo: true },
  doubles_quick: { label: "Quick cầu lông đôi", sport: "badminton", countsElo: false },
  practice_singles: { label: "Luyện tập cầu lông đơn", sport: "badminton", countsElo: false },
  practice_doubles: { label: "Luyện tập cầu lông đôi", sport: "badminton", countsElo: false },
  football_scenario: { label: "Tình huống bóng đá", sport: "football", countsElo: true },
  football_quick: { label: "Quick bóng đá", sport: "football", countsElo: false },
  position: { label: "Gợi ý vị trí bóng đá", sport: "football", countsElo: false },
}
export const isTestKind = (v: unknown): v is TestKind => typeof v === "string" && v in TEST_META

export type RoundAnswer = { id: string; action: string; target?: string }
export type RunAnswers = {
  rounds?: RoundAnswer[]
  physical?: number[]
  picks?: { id: string; option: number }[]
  position?: number[]
}
export type RunItem = { id: string; skill: string; s: number; hardFail: boolean; trapped: boolean; difficulty: number }
export type RunResult = {
  items?: RunItem[]
  avg?: number
  physical?: { id: string; axis: string; level: number }[]
  practice?: { correct: number; total: number; trapped: number; byGroup: Record<string, { correct: number; trapped: number; total: number }> }
  position?: { pos: string; label: string }
}
export type TestRun = { runKey: string; test: TestKind; at: string; answers: RunAnswers; result: RunResult }

const bankSportOf = (test: TestKind): BankSport | null =>
  test.startsWith("doubles") ? "badminton_doubles" : test.startsWith("football") ? "football" : null
const practiceSportOf = (test: TestKind): PracticeSport | null =>
  test === "practice_singles" ? "badminton_singles" : test === "practice_doubles" ? "badminton_doubles" : null
const isLevel = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max

/** Lọc bài làm và chấm lại. Trả null nếu bài làm không hợp lệ cho loại test. */
export function computeRun(test: TestKind, raw: unknown): { answers: RunAnswers; result: RunResult } | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const answers: RunAnswers = {}
  const result: RunResult = {}
  const bank = bankSportOf(test)

  if (bank) {
    const rounds: RoundAnswer[] = []
    const items: RunItem[] = []
    const seen = new Set<string>()
    for (const item of Array.isArray(r.rounds) ? r.rounds.slice(0, 10) : []) {
      if (!item || typeof item !== "object") continue
      const a = item as Record<string, unknown>
      const sc = SCENARIOS.find((s) => s.sport === bank && s.id === a.id)
      if (!sc || seen.has(sc.id) || typeof a.action !== "string") continue
      const action = sc.actions.find((x) => x.id === a.action)
      if (!action) continue
      const needsTarget = !action.noTarget && sc.targets.length > 0
      const target = needsTarget && typeof a.target === "string" && sc.targets.some((t) => t.id === a.target) ? a.target : undefined
      if (needsTarget && !target) continue
      seen.add(sc.id)
      rounds.push({ id: sc.id, action: action.id, ...(target ? { target } : {}) })
      const s = scoreScenario(sc, action.id, target)
      items.push({ id: sc.id, skill: sc.skill, s: s.s, hardFail: s.hardFail, trapped: s.trapped, difficulty: sc.difficulty })
    }
    const isQuick = test.endsWith("_quick")
    if (isQuick) {
      const qs = PHYSICAL_QUIZ[bank]
      const physical = Array.isArray(r.physical) ? r.physical : []
      if (qs.some((_, i) => !isLevel(physical[i], 3))) return null
      answers.physical = qs.map((_, i) => physical[i] as number)
      result.physical = qs.map((q, i) => ({ id: q.id, axis: q.axis, level: physical[i] as number }))
    } else if (!items.length) return null
    answers.rounds = rounds
    result.items = items
    result.avg = items.length ? Math.round((items.reduce((t, i) => t + i.s, 0) / items.length) * 100) / 100 : undefined
    return { answers, result }
  }

  const practice = practiceSportOf(test)
  if (practice) {
    const picks: { id: string; option: number }[] = []
    const byGroup: NonNullable<RunResult["practice"]>["byGroup"] = {}
    let correct = 0
    let trapped = 0
    const seen = new Set<string>()
    for (const item of Array.isArray(r.picks) ? r.picks.slice(0, 40) : []) {
      if (!item || typeof item !== "object") continue
      const p = item as Record<string, unknown>
      const q = PRACTICE_QUESTIONS.find((x) => x.sport === practice && x.id === p.id)
      if (!q || seen.has(q.id) || !isLevel(p.option, 3)) continue
      seen.add(q.id)
      const option = p.option as number
      picks.push({ id: q.id, option })
      const g = (byGroup[q.group] ??= { correct: 0, trapped: 0, total: 0 })
      g.total++
      if (option === 0) { correct++; g.correct++ }
      if (option === q.trap.option) { trapped++; g.trapped++ }
    }
    if (!picks.length) return null
    answers.picks = picks
    result.practice = { correct, total: picks.length, trapped, byGroup }
    return { answers, result }
  }

  // position
  const pos = Array.isArray(r.position) ? r.position : []
  if (POSITION_QUESTIONS.some((q, i) => !isLevel(pos[i], q.options.length - 1))) return null
  answers.position = POSITION_QUESTIONS.map((_, i) => pos[i] as number)
  const role = suggestRole(answers.position)
  result.position = { pos: role.pos, label: role.label }
  return { answers, result }
}

export const SCENARIO_START = 1000
export const SCENARIO_K = 40

/** ELO tình huống (đôi/bóng đá): phát lại các lượt tính ELO theo thứ tự thời gian. Quick không tính. */
export function scenarioElo(runs: TestRun[], test: "doubles_scenario" | "football_scenario") {
  const ratings: Record<string, number> = {}
  const ordered = runs.filter((r) => r.test === test).sort((a, b) => a.at.localeCompare(b.at))
  for (const run of ordered)
    for (const it of run.result.items ?? [])
      ratings[it.skill] = updateRating(ratings[it.skill] ?? SCENARIO_START, it.s, it.difficulty, SCENARIO_K)
  const values = Object.values(ratings)
  return {
    ratings,
    overall: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    sessions: ordered.length,
  }
}

export const RUN_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
