// Mạng nhện cá nhân: tổng hợp TẤT CẢ bài test (kể cả Quick và luyện tập) thành 8 trục chuẩn 0–100 cho mỗi môn
// (bộ trục chung trong sportdna-axes.ts). Các bài cũ được tính trên trục cũ rồi ánh xạ sang trục chuẩn.
// Khác với ELO: ELO chỉ tính từ Deep/Retest đơn và các lượt Tình huống. Hệ số dưới đây là bản v1 (GIẢ ĐỊNH),
// xem docs/sportdna-ai-prompts.md để hiệu chuẩn lại.
import type { DiagnosticProfiles, SkillResult } from "./sportdna"
import { PRACTICE_QUESTIONS } from "./sportdna-practice.ts"
import type { TestRun } from "./sportdna-runs"
import { AXIS_TEXT, standardAxisId, toStandardAxes } from "./sportdna-axes.ts"

export type DnaSportKey = "badminton" | "football"
export type RadarPoint = { id: string; label: string; value: number | null; weight: number }

/** Internal axes the older tests are scored on; never shown directly (mapped to the standard axes). */
const LEGACY_RADAR_AXES: Record<DnaSportKey, { id: string; label: string }[]> = {
  badminton: [
    { id: "power", label: "Sức mạnh" },
    { id: "speed", label: "Tốc độ" },
    { id: "endurance", label: "Bền bỉ" },
    { id: "balance", label: "Cân bằng" },
    { id: "reflex", label: "Phản xạ" },
    { id: "attack", label: "Tấn công" },
    { id: "defense", label: "Phòng thủ" },
    { id: "tactics", label: "Chiến thuật" },
  ],
  football: [
    { id: "power", label: "Sức mạnh" },
    { id: "speed", label: "Tốc độ" },
    { id: "endurance", label: "Bền bỉ" },
    { id: "duel", label: "Tranh chấp" },
    { id: "reflex", label: "Phản xạ" },
    { id: "defending", label: "Phòng ngự" },
    { id: "passing", label: "Chuyền bóng" },
    { id: "finishing", label: "Dứt điểm" },
  ],
}

type Sample = { axis: string; value: number; weight: number; at: string }
const clamp = (v: number) => Math.max(0, Math.min(100, v))
// ELO 500 → 0, 1000 → 50, 1500 → 100.
const fromElo = (elo: number) => clamp((elo - 500) / 10)
const fromLevel = (level: number) => (level + 1) * 25

const PHYSICAL_AXIS: Record<DnaSportKey, Record<string, string>> = {
  badminton: { "Sức mạnh": "power", "Tốc độ": "speed", "Bền bỉ": "endurance", "Cân bằng": "balance", "Phản xạ": "reflex", "Phối hợp": "tactics" },
  football: { "Sức mạnh": "power", "Tốc độ": "speed", "Bền bỉ": "endurance", "Cân bằng": "duel", "Tranh chấp": "duel", "Phản xạ": "reflex" },
}
const SKILL_AXIS: Record<string, [string, number][]> = {
  doubles_attack: [["attack", 1]],
  doubles_defense: [["defense", 1]],
  rotation: [["tactics", 1]],
  serve_receive: [["tactics", 0.6], ["attack", 0.4]],
  net_play: [["reflex", 0.6], ["attack", 0.4]],
  transition: [["tactics", 0.5], ["defending", 0.5]],
  defensive_reading: [["defending", 1]],
  positioning: [["defending", 0.7], ["passing", 0.3]],
  passing_choice: [["passing", 1]],
  finishing: [["finishing", 1]],
  set_piece: [["finishing", 0.7], ["passing", 0.3]],
}
const PRACTICE_AXIS: Record<string, string> = { G1: "attack", G2: "reflex", G3: "tactics", H1: "tactics", H2: "attack", H3: "defense" }
const QUIZ_KEYS = ["power", "speed", "endurance", "balance"] as const

function singlesSamples(r: SkillResult): Sample[] {
  const out: Sample[] = []
  const at = r.answeredAt
  const k = r.assessmentMode === "deep" ? 24 : 16
  // Câu thể chất: 2 câu/trục, mỗi câu dịch ELO khoảng ±k/2 quanh 1000 → quy về 0–100.
  for (const key of QUIZ_KEYS) {
    const raw = r.skillRatings[key]
    if (typeof raw === "number") out.push({ axis: key, value: clamp(50 + ((raw - 1000) / k) * 50), weight: 2, at })
  }
  const w = Math.max(1, (r.scoredRounds ?? 0) / 3)
  const sr = r.skillRatings
  if (typeof sr.tactical_rating === "number") out.push({ axis: "tactics", value: fromElo(sr.tactical_rating), weight: w, at })
  if (typeof sr.target_selection_rating === "number") out.push({ axis: "tactics", value: fromElo(sr.target_selection_rating), weight: w / 2, at })
  if (typeof sr.defensive_reading_rating === "number") {
    out.push({ axis: "defense", value: fromElo(sr.defensive_reading_rating), weight: w, at })
    out.push({ axis: "reflex", value: fromElo(sr.defensive_reading_rating), weight: w / 2, at })
  }
  if (typeof sr.shot_selection_rating === "number") out.push({ axis: "defense", value: fromElo(sr.shot_selection_rating), weight: w / 2, at })
  return out
}

function runSamples(run: TestRun, sport: DnaSportKey): Sample[] {
  const out: Sample[] = []
  const at = run.at
  for (const p of run.result.physical ?? []) {
    const axis = PHYSICAL_AXIS[sport][p.axis]
    if (axis) out.push({ axis, value: fromLevel(p.level), weight: 1, at })
  }
  for (const it of run.result.items ?? [])
    for (const [axis, share] of SKILL_AXIS[it.skill] ?? []) out.push({ axis, value: it.s * 100, weight: share, at })
  for (const pick of run.answers.picks ?? []) {
    const q = PRACTICE_QUESTIONS.find((x) => x.id === pick.id)
    const axis = q && PRACTICE_AXIS[q.group]
    if (q && axis) out.push({ axis, value: pick.option === 0 ? 100 : pick.option === q.trap.option ? 0 : 40, weight: 0.5, at })
  }
  return out
}

const MAX_SAMPLES_PER_AXIS = 24

/** Mạng nhện (8 trục chuẩn) của một môn từ hồ sơ đánh đơn + mọi lượt test khác. Trục chưa có dữ liệu = null. */
export function playerRadar(sport: DnaSportKey, profiles: DiagnosticProfiles, runs: TestRun[]): RadarPoint[] {
  const legacy = legacyRadar(sport, profiles, runs)
  const standard = toStandardAxes(
    sport,
    legacy.map((point) => ({ id: point.id, value: point.value, weight: point.weight })),
  )
  // Evidence weight per standard axis = the summed weight of the old axes feeding it.
  const weights = new Map<string, number>()
  for (const point of legacy) {
    const id = point.value === null ? null : standardAxisId(sport, { id: point.id })
    if (id) weights.set(id, (weights.get(id) ?? 0) + point.weight)
  }
  return standard.map((axis) => ({
    id: axis.id,
    label: AXIS_TEXT[sport][axis.id].vi,
    value: axis.value,
    weight: Math.round((weights.get(axis.id) ?? 0) * 10) / 10,
  }))
}

function legacyRadar(sport: DnaSportKey, profiles: DiagnosticProfiles, runs: TestRun[]): RadarPoint[] {
  const samples: Sample[] = []
  if (sport === "badminton")
    for (const r of [profiles.badminton?.quick, profiles.badminton?.deep])
      if (r && r.schemaVersion === "v1.3.3-provisional") samples.push(...singlesSamples(r))
  for (const run of runs) {
    const isBadminton = run.test.startsWith("doubles") || run.test.startsWith("practice")
    if ((sport === "badminton") === isBadminton) samples.push(...runSamples(run, sport))
  }
  return LEGACY_RADAR_AXES[sport].map(({ id, label }) => {
    const mine = samples.filter((s) => s.axis === id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_SAMPLES_PER_AXIS)
    const weight = mine.reduce((t, s) => t + s.weight, 0)
    return {
      id,
      label,
      value: weight >= 1 ? Math.round(mine.reduce((t, s) => t + s.value * s.weight, 0) / weight) : null,
      weight: Math.round(weight * 10) / 10,
    }
  })
}

export const radarValue = (radar: RadarPoint[], id: string) => radar.find((p) => p.id === id)?.value ?? null
