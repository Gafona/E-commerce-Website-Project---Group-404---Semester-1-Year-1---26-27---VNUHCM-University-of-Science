// SportDNA — ngân hàng câu hỏi/tình huống và chấm điểm (dùng chung cho giao diện và server).
//
// Chấm điểm ở đây là bản TẠM (GIẢ ĐỊNH) trong lúc chờ bộ câu hỏi mới:
//  - 8 câu thể chất → Sức mạnh, Tốc độ, Bền bỉ, Cân bằng (Elo, D = QUIZ_DIFFICULTY).
//  - 8 họ phòng thủ → chấm S = A × T × R bằng scenario-engine.
//  - Tình huống B01–B10 chưa có dữ liệu chấm nên được ghi lại nhưng không tính điểm.

import {
  DEFENSE_FAMILIES,
  DEFENSE_FAMILY_IDS,
  buildDefenseScenario,
  difficultyFrom,
  scoreResponse,
  type Action as EngineAction,
  type DefenseFamily,
} from "./scenario-engine.ts"
import { resolveSkillTier, type RadarAxis, type SkillResult } from "./sportdna.ts"

// ---------- Assessment ----------

export type Mode = "quick" | "deep" | "retest"
export const MODES: Record<
  Mode,
  { label: string; count: string; total: number; k: number; blurb: string }
> = {
  quick: {
    label: "Quick",
    count: "8 quiz ABCD + 2 scenario",
    total: 10,
    k: 16,
    blurb: "8 câu thể chất và 2 tình huống. Không tính ELO, chỉ cập nhật mạng nhện cá nhân.",
  },
  deep: {
    label: "Deep",
    count: "Đúng 36 câu",
    total: 36,
    k: 24,
    blurb: "36 tình huống trên sân — 10 tình huống × 2 biến thể và 8 họ phòng thủ × bản gốc/đối xứng, không lặp.",
  },
  retest: {
    label: "Retest",
    count: "14 câu",
    total: 14,
    k: 16,
    blurb: "14 tình huống (10 tình huống chính + 4 họ phòng thủ), ưu tiên kỹ năng còn yếu hoặc lâu chưa đánh giá.",
  },
}
export const isMode = (v: string): v is Mode =>
  v === "quick" || v === "deep" || v === "retest"

export type Action =
  | "smash"
  | "drop"
  | "clear"
  | "drive"
  | "net_shot"
  | "lift"
  | "block"
  | "push"
  | "serve_short"
  | "serve_flick"
  | "serve_long"

export const ACTION_LABEL: Record<Action, { vi: string; hint: string }> = {
  smash: { vi: "Đập cầu", hint: "Smash" },
  drop: { vi: "Bỏ nhỏ", hint: "Drop" },
  clear: { vi: "Phông cầu", hint: "Clear" },
  drive: { vi: "Đánh ngang", hint: "Drive" },
  net_shot: { vi: "Đánh lưới", hint: "Net shot" },
  lift: { vi: "Lốp cầu", hint: "Lift" },
  block: { vi: "Chặn cầu", hint: "Block" },
  push: { vi: "Đẩy cầu", hint: "Push" },
  serve_short: { vi: "Giao ngắn", hint: "Serve short" },
  serve_flick: { vi: "Giao vẩy", hint: "Serve flick" },
  serve_long: { vi: "Giao cao sâu", hint: "Serve long" },
}
export const SERVE_ACTIONS: Action[] = ["serve_short", "serve_flick", "serve_long"]
export const isServe = (a: Action | null) => !!a && a.startsWith("serve_")

export type Group =
  | "serve"
  | "attack"
  | "defense"
  | "rally"
  | "movement"
  | "reading"
  | "transition"
export const GROUP_LABEL: Record<Group, string> = {
  serve: "Giao cầu",
  attack: "Tấn công",
  defense: "Phòng thủ",
  rally: "Điều cầu",
  movement: "Di chuyển",
  reading: "Đọc tình huống",
  transition: "Chuyển trạng thái",
}

type P = { x: number; y: number }
export type Template = {
  code: string
  name: string
  phase: string
  skill: string
  groups: Group[]
  actions: Action[]
  player: P
  opponent: P & { movement: [number, number] }
  shuttle: P & { height: string; speed: string }
  prompt: string
  // Chỉ có ở 8 họ phòng thủ E6-B (sinh từ lib/scenario-engine.ts).
  defense?: {
    family: DefenseFamily
    canonical: Action
    trap: { action: Action; reason: string }
    difficulty: number
    mirrored: boolean
  }
}

// Positions follow Section 3.1: y=0 opponent baseline (top), y=0.5 net,
// y=1 player baseline (bottom). B01 mirrors Section 14.1; others are layout
// geometry for the mockup only, pending the finalized scenario bank.
export const TEMPLATES: Template[] = [
  {
    code: "B01", name: "Tấn công cầu bổng giữa sân", phase: "attacking", skill: "Chọn điểm rơi",
    groups: ["attack"], actions: ["smash", "drop", "clear", "drive"],
    player: { x: 0.22, y: 0.78 }, opponent: { x: 0.75, y: 0.15, movement: [-0.05, 0.1] },
    shuttle: { x: 0.24, y: 0.68, height: "high", speed: "medium" },
    prompt: "Đối thủ lùi sâu cuối sân. Cầu bổng đến trước mặt bạn.",
  },
  {
    code: "B02", name: "Phòng thủ smash vào thân", phase: "defending", skill: "Block / phản tạt",
    groups: ["defense"], actions: ["block", "drive", "lift", "push"],
    player: { x: 0.5, y: 0.74 }, opponent: { x: 0.45, y: 0.3, movement: [0, 0.03] },
    shuttle: { x: 0.53, y: 0.71, height: "low", speed: "fast" },
    prompt: "Đối thủ đập cầu thẳng vào người bạn. Chọn cách phòng thủ.",
  },
  {
    code: "B03", name: "Xử lý cầu sát lưới", phase: "neutral", skill: "Net shot",
    groups: ["rally", "movement"], actions: ["net_shot", "push", "lift", "drive"],
    player: { x: 0.4, y: 0.6 }, opponent: { x: 0.62, y: 0.4, movement: [0.01, -0.04] },
    shuttle: { x: 0.42, y: 0.54, height: "low", speed: "slow" },
    prompt: "Cầu rơi sát lưới phía bạn, đối thủ đang lùi về giữa sân.",
  },
  {
    code: "B04", name: "Nhận giao cầu", phase: "neutral", skill: "Return serve",
    groups: ["serve"], actions: ["net_shot", "push", "lift", "drive"],
    player: { x: 0.3, y: 0.68 }, opponent: { x: 0.7, y: 0.37, movement: [0, 0] },
    shuttle: { x: 0.3, y: 0.63, height: "low", speed: "slow" },
    prompt: "Đối thủ giao ngắn vào ô của bạn. Chọn cách trả giao cầu.",
  },
  {
    code: "B05", name: "Chọn phương án giao cầu", phase: "neutral", skill: "Serve selection",
    groups: ["serve"], actions: ["serve_short", "serve_flick", "serve_long"],
    player: { x: 0.72, y: 0.67 }, opponent: { x: 0.27, y: 0.36, movement: [0, 0] },
    shuttle: { x: 0.7, y: 0.66, height: "low", speed: "slow" },
    prompt: "Bạn giao cầu từ ô giao bên phải. Chọn kiểu giao và điểm rơi.",
  },
  {
    code: "B06", name: "Bị ép cuối sân cần thoát", phase: "defending", skill: "Defensive positioning",
    groups: ["defense"], actions: ["clear", "drop", "drive"],
    player: { x: 0.14, y: 0.94 }, opponent: { x: 0.55, y: 0.42, movement: [0.02, 0.02] },
    shuttle: { x: 0.12, y: 0.96, height: "high", speed: "slow" },
    prompt: "Bạn bị ép về góc cuối sân, đối thủ đứng gần lưới.",
  },
  {
    code: "B07", name: "Drive ngang đổi hướng", phase: "neutral", skill: "Drive control",
    groups: ["rally", "reading"], actions: ["drive", "push", "block", "lift"],
    player: { x: 0.2, y: 0.63 }, opponent: { x: 0.78, y: 0.38, movement: [-0.06, 0] },
    shuttle: { x: 0.18, y: 0.6, height: "medium", speed: "fast" },
    prompt: "Pha tạt ngang tốc độ cao, đối thủ đang dịch sang trái.",
  },
  {
    code: "B08", name: "Chuyển phòng thủ → tấn công", phase: "attacking", skill: "Transition #1",
    groups: ["attack", "transition"], actions: ["push", "drive", "drop", "lift"],
    player: { x: 0.6, y: 0.76 }, opponent: { x: 0.3, y: 0.45, movement: [0.02, -0.08] },
    shuttle: { x: 0.62, y: 0.67, height: "medium", speed: "medium" },
    prompt: "Đối thủ vừa bỏ nhỏ và đang lùi về. Cơ hội lấy lại thế chủ động.",
  },
  {
    code: "B09", name: "Phòng thủ biên trái tay → phản công", phase: "defending→attacking", skill: "Transition #2",
    groups: ["defense", "movement", "transition"], actions: ["clear", "drop", "drive", "lift"],
    player: { x: 0.1, y: 0.85 }, opponent: { x: 0.6, y: 0.35, movement: [-0.03, 0.05] },
    shuttle: { x: 0.08, y: 0.87, height: "medium", speed: "medium" },
    prompt: "Cầu về góc trái tay của bạn. Phòng thủ rồi tìm cơ hội phản công.",
  },
  {
    code: "B10", name: "Kết thúc điểm khi đối thủ mất thăng bằng", phase: "attacking", skill: "Finish",
    groups: ["attack", "reading"], actions: ["smash", "drop", "drive", "push"],
    player: { x: 0.55, y: 0.64 }, opponent: { x: 0.86, y: 0.12, movement: [0.04, -0.01] },
    shuttle: { x: 0.52, y: 0.57, height: "high", speed: "medium" },
    prompt: "Đối thủ mất thăng bằng ở góc cuối sân phải. Kết thúc điểm.",
  },
]

// E6-B — 8 họ phòng thủ lấy thẳng từ engine để hai bản SportDNA luôn đồng bộ.
// Nghĩa phòng thủ của 4 động tác engine: clear = lốp cầu, drop = chặn cầu
// (riêng DF7 là đánh lưới vì cầu đã rơi sát lưới), drive = đánh ngang, smash = phản công.
const DEFENSE_ACTION: Record<EngineAction, Action> = { clear: "lift", drop: "block", drive: "drive", smash: "smash" }
const DEFENSE_GROUPS: Record<DefenseFamily, Group[]> = {
  smash_straight: ["defense"],
  smash_cross: ["defense", "reading"],
  body_drive: ["defense"],
  opponent_retreating: ["defense", "reading"],
  escape_pressure: ["defense", "transition"],
  two_corners: ["defense", "movement", "transition"],
  fake_smash_drop: ["defense", "reading", "movement"],
  tired_safe_return: ["defense"],
}
const ENGINE_ORDER: EngineAction[] = ["smash", "drop", "clear", "drive"]

export const DEFENSE_TEMPLATES: Template[] = DEFENSE_FAMILY_IDS.map((family) => {
  const f = DEFENSE_FAMILIES[family]
  const map = (a: EngineAction): Action =>
    family === "fake_smash_drop" && a === "drop" ? "net_shot" : DEFENSE_ACTION[a]
  return {
    code: f.code,
    name: f.title,
    phase: "defending",
    skill: "Đọc phòng thủ",
    groups: DEFENSE_GROUPS[family],
    actions: ENGINE_ORDER.map(map),
    player: { x: f.player.x, y: f.player.y },
    opponent: { x: f.opponent.x, y: f.opponent.y, movement: [...f.opponent.movement] },
    shuttle: {
      x: f.shuttle.x,
      y: f.shuttle.y,
      height: f.shuttle.height === "mid" ? "medium" : f.shuttle.height,
      speed: f.shuttle.speed,
    },
    prompt: f.prompt,
    defense: {
      family,
      canonical: map(f.canonical),
      trap: { action: map(f.trap.action), reason: f.trap.reason },
      difficulty: difficultyFrom(f.criteria),
      mirrored: false,
    },
  }
})

// Biến thể V2 của họ phòng thủ là bản đối xứng trái ↔ phải (BD-DFn-M trong engine).
export function mirrorTemplate(tp: Template): Template {
  const fx = (p: P) => ({ ...p, x: 1 - p.x })
  return {
    ...tp,
    player: fx(tp.player),
    opponent: { ...fx(tp.opponent), movement: [-tp.opponent.movement[0], tp.opponent.movement[1]] },
    shuttle: { ...tp.shuttle, x: 1 - tp.shuttle.x },
    defense: tp.defense && { ...tp.defense, mirrored: !tp.defense.mirrored },
  }
}

export type Round = { template: Template; variant: "V1" | "V2" }
const t = (code: string) => TEMPLATES.find((s) => s.code === code)!
export const findTemplate = (code: string) =>
  TEMPLATES.find((s) => s.code === code) ?? DEFENSE_TEMPLATES.find((s) => s.code === code) ?? null
// Họ phòng thủ: V2 là bản đối xứng.
const roundOf = (code: string, variant: "V1" | "V2"): Round => {
  const tp = findTemplate(code)!
  return { template: tp.defense && variant === "V2" ? mirrorTemplate(tp) : tp, variant }
}

// Illustrative order only — real sampling (greedy set cover / priority chain) is HOLD.
export function sequenceFor(mode: Mode): Round[] {
  if (mode === "deep")
    // 10 tình huống × V1/V2, xen kẽ với 8 họ phòng thủ × bản gốc/đối xứng = 36 câu.
    return TEMPLATES.flatMap((tp, i) => {
      const df = DEFENSE_TEMPLATES[i]
      return [
        { template: tp, variant: "V1" as const },
        { template: tp, variant: "V2" as const },
        ...(df
          ? [
              { template: df, variant: "V1" as const },
              { template: mirrorTemplate(df), variant: "V2" as const },
            ]
          : []),
      ]
    })
  if (mode === "quick")
    return [
      { template: t("B01"), variant: "V1" },
      { template: t("B05"), variant: "V1" },
    ]
  // Retest: 10 tình huống B và 4 họ phòng thủ (các câu phòng thủ là phần đang được chấm điểm).
  const codes = ["B06", "DF1", "B02", "B09", "DF5", "B03", "B07", "DF3", "B08", "B05", "DF8", "B01", "B10", "B04"]
  return codes.map((c, i) => roundOf(c, i % 2 ? "V2" : "V1"))
}

export type ZoneKey =
  | "net_left" | "net_center" | "net_right"
  | "mid_left" | "mid_center" | "mid_right"
  | "back_left" | "back_center" | "back_right"
export const TARGET_ZONES: Record<ZoneKey, { x: [number, number]; y: [number, number] }> = {
  net_left: { x: [0, 0.33], y: [0.4, 0.5] },
  net_center: { x: [0.33, 0.67], y: [0.4, 0.5] },
  net_right: { x: [0.67, 1], y: [0.4, 0.5] },
  mid_left: { x: [0, 0.33], y: [0.25, 0.35] },
  mid_center: { x: [0.33, 0.67], y: [0.25, 0.35] },
  mid_right: { x: [0.67, 1], y: [0.25, 0.35] },
  back_left: { x: [0, 0.33], y: [0.05, 0.15] },
  back_center: { x: [0.33, 0.67], y: [0.05, 0.15] },
  back_right: { x: [0.67, 1], y: [0.05, 0.15] },
}
export const ZONE_LABEL: Record<ZoneKey, string> = {
  net_left: "Lưới trái", net_center: "Lưới giữa", net_right: "Lưới phải",
  mid_left: "Giữa trái", mid_center: "Giữa sân", mid_right: "Giữa phải",
  back_left: "Cuối trái", back_center: "Cuối giữa", back_right: "Cuối phải",
}

// Section 6: B05 v1.3.3 hardcodes playerServicePosition = "right", so the
// cross-court target is the opponent's screen-LEFT half.
export const PLAYER_SERVICE_POSITION: "right" | "left" = "right"
export const serveXRange = (pos: "right" | "left"): [number, number] =>
  pos === "right" ? [0, 0.5] : [0.5, 1]
export const SERVE_Y: Record<"serve_short" | "serve_flick" | "serve_long", [number, number]> = {
  serve_short: [0.275, 0.35],
  serve_flick: [0.125, 0.275],
  serve_long: [0, 0.125],
}

// ---------- Quiz thể chất & rating ----------

// Section 2.1 QuickQuizCard — 8 physical self-assessment questions
export type QuizQuestion = { id: string; axis: string; q: string; options: [string, string, string, string] }
export const QUIZ: QuizQuestion[] = [
  { id: "q1", axis: "Sức mạnh", q: "Cú phông cầu từ cuối sân của bạn thường bay tới đâu?", options: ["Giữa sân đối thủ", "Qua vạch giao cầu ngắn 1-2 m", "Gần cuối sân đối thủ", "Sát baseline đối thủ, ổn định"] },
  { id: "q2", axis: "Sức mạnh", q: "Khi bạn đập cầu, đối thủ cùng trình độ thường…", options: ["Đỡ dễ dàng", "Đỡ được nhưng bị động", "Thường trả cầu yếu", "Hay không kịp phản ứng"] },
  { id: "q3", axis: "Tốc độ", q: "Từ giữa sân lên lưới cứu cầu bỏ nhỏ, bạn thường…", options: ["Không kịp tới cầu", "Kịp nhưng phải lốp bổng", "Kịp và trả cầu an toàn", "Kịp và chủ động đánh lưới"] },
  { id: "q4", axis: "Tốc độ", q: "Khi đối thủ đổi hướng liên tục trái – phải, bạn…", options: ["Thường bị bắt sai chân", "Theo được 2-3 lượt", "Theo được phần lớn pha", "Luôn về vị trí kịp thời"] },
  { id: "q5", axis: "Bền bỉ", q: "Bạn chơi liên tục được bao lâu trước khi phong độ giảm rõ?", options: ["Dưới 15 phút", "15 – 30 phút", "30 – 60 phút", "Trên 60 phút"] },
  { id: "q6", axis: "Bền bỉ", q: "Sau một pha cầu dài trên 20 lượt, bạn…", options: ["Cần nghỉ lâu mới chơi tiếp", "Thở dốc, mất vài điểm sau đó", "Hồi lại sau khoảng 1 điểm", "Gần như không bị ảnh hưởng"] },
  { id: "q7", axis: "Cân bằng", q: "Sau cú nhảy đập, bạn tiếp đất…", options: ["Thường mất thăng bằng", "Vững nhưng chậm về vị trí", "Vững và về vị trí khá nhanh", "Vững, về vị trí ngay lập tức"] },
  { id: "q8", axis: "Cân bằng", q: "Khi bị kéo sâu về góc trái tay, bạn…", options: ["Thường không giữ được trọng tâm", "Đánh được nhưng cầu yếu", "Đánh được và về giữa sân", "Đánh chủ động, trụ vững"] },
]


export const RATINGS = [
  { key: "tactical_rating", label: "Tactical" },
  { key: "shot_selection_rating", label: "Shot selection" },
  { key: "target_selection_rating", label: "Target selection" },
  { key: "defensive_reading_rating", label: "Defensive reading" },
] as const

// ---------- Chấm điểm (GIẢ ĐỊNH) ----------

export const ASSESSMENT_SCHEMA = "v1.3.3-provisional" as const
export const QUIZ_DIFFICULTY = 1000 // GIẢ ĐỊNH: độ khó chung của câu thể chất
const START = 1000
const LEVEL_SCORE = [0, 1 / 3, 2 / 3, 1] as const

const QUIZ_AXIS: Record<string, "power" | "speed" | "endurance" | "balance"> = {
  "Sức mạnh": "power",
  "Tốc độ": "speed",
  "Bền bỉ": "endurance",
  "Cân bằng": "balance",
}
// Động tác giao diện → động tác engine (chỉ dùng cho họ phòng thủ).
const TO_ENGINE: Partial<Record<Action, EngineAction>> = {
  lift: "clear",
  block: "drop",
  net_shot: "drop",
  drive: "drive",
  smash: "smash",
}

export type QuizAnswers = Record<string, number>
export type RoundAnswer = { code: string; variant: "V1" | "V2"; action: Action; zone: ZoneKey }
export type AssessmentInput = { mode: Mode; quiz: QuizAnswers; rounds: RoundAnswer[] }
export type RoundScore = RoundAnswer & { scored: boolean; A?: number; T?: number; S?: number; verdict?: "canonical" | "trap" | "other" }

const elo = (rating: number, difficulty: number, score: number, k: number) =>
  rating + k * (score - 1 / (1 + 10 ** ((difficulty - rating) / 400)))

export const zoneCenter = (z: ZoneKey) => {
  const r = TARGET_ZONES[z]
  return { x: (r.x[0] + r.x[1]) / 2, y: (r.y[0] + r.y[1]) / 2 }
}

// Chấm một lượt tình huống. Chỉ họ phòng thủ có dữ liệu chấm.
export function scoreRound(answer: RoundAnswer): RoundScore {
  const tp = findTemplate(answer.code)
  if (!tp?.defense || !tp.actions.includes(answer.action)) return { ...answer, scored: false }
  const engineAction = TO_ENGINE[answer.action]
  if (!engineAction) return { ...answer, scored: false }
  const sc = buildDefenseScenario(tp.defense.family, answer.variant === "V2")
  const s = scoreResponse(sc, engineAction, zoneCenter(answer.zone))
  const verdict =
    answer.action === tp.defense.canonical ? "canonical" : answer.action === tp.defense.trap.action ? "trap" : "other"
  return { ...answer, scored: true, A: s.A, T: s.T, S: s.S, verdict }
}

const rel = (raw: number, overall: number) => Math.max(0, Math.min(100, Math.round(50 + (raw - overall) / 4)))

export function scoreAssessment(input: AssessmentInput, answeredAt = new Date().toISOString()): SkillResult {
  const k = MODES[input.mode].k
  const ratings: Record<string, number> = {}

  for (const q of QUIZ) {
    const level = input.quiz[q.id]
    if (level === undefined) continue
    const key = QUIZ_AXIS[q.axis]
    ratings[key] = elo(ratings[key] ?? START, QUIZ_DIFFICULTY, LEVEL_SCORE[level], k)
  }

  let scoredRounds = 0
  for (const answer of input.rounds) {
    const r = scoreRound(answer)
    if (!r.scored) continue
    scoredRounds++
    const d = findTemplate(r.code)!.defense!.difficulty
    const reading = r.verdict === "canonical" ? 1 : r.verdict === "trap" ? 0 : 0.5
    ratings.tactical_rating = elo(ratings.tactical_rating ?? START, d, r.S!, k)
    ratings.shot_selection_rating = elo(ratings.shot_selection_rating ?? START, d, r.A!, k)
    ratings.target_selection_rating = elo(ratings.target_selection_rating ?? START, d, r.T!, k)
    ratings.defensive_reading_rating = elo(ratings.defensive_reading_rating ?? START, d, reading, k)
  }

  for (const key of Object.keys(ratings)) ratings[key] = Math.round(ratings[key])
  const values = Object.values(ratings)
  const overall = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : START

  // 8 trục theo RADAR_AXES: id khớp với Equipment Fit (power, reflex…).
  const axis = (id: string, label: string, raw: number | undefined): RadarAxis =>
    raw === undefined
      ? { id, label, rawElo: null, display: null, status: "insufficient_data" }
      : { id, label, rawElo: raw, display: rel(raw, overall), status: "ok" }
  const radar = [
    axis("power", "Sức mạnh", ratings.power),
    axis("speed", "Tốc độ", ratings.speed),
    axis("reflex", "Phản xạ", ratings.defensive_reading_rating),
    axis("technique", "Kỹ thuật", ratings.shot_selection_rating),
    axis("control", "Kiểm soát", ratings.target_selection_rating),
    axis("endurance", "Bền bỉ", ratings.endurance),
    axis("tactics", "Chiến thuật", ratings.tactical_rating),
    axis("balance", "Cân bằng", ratings.balance),
  ]

  return {
    sport: "badminton",
    mode: input.mode === "quick" ? "quick" : "deep",
    assessmentMode: input.mode,
    overall,
    skillRatings: ratings,
    tier: resolveSkillTier(overall, input.mode === "quick"),
    radar,
    growthTags: [],
    scoredRounds,
    totalRounds: input.rounds.length,
    answeredAt,
    schemaVersion: ASSESSMENT_SCHEMA,
  }
}

// Kiểm tra và lọc dữ liệu bài làm gửi lên (dùng ở server). Trả null nếu không hợp lệ.
export function parseAssessmentInput(raw: unknown): AssessmentInput | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.mode !== "string" || !isMode(r.mode)) return null
  const quiz: QuizAnswers = {}
  if (r.quiz && typeof r.quiz === "object")
    for (const q of QUIZ) {
      const v = (r.quiz as Record<string, unknown>)[q.id]
      if (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3) quiz[q.id] = v as number
    }
  const rounds: RoundAnswer[] = []
  if (Array.isArray(r.rounds))
    for (const item of r.rounds.slice(0, 60)) {
      if (!item || typeof item !== "object") continue
      const a = item as Record<string, unknown>
      const tp = typeof a.code === "string" ? findTemplate(a.code) : null
      if (!tp) continue
      if (a.variant !== "V1" && a.variant !== "V2") continue
      if (typeof a.action !== "string" || !tp.actions.includes(a.action as Action)) continue
      if (typeof a.zone !== "string" || !(a.zone in TARGET_ZONES)) continue
      rounds.push({ code: tp.code, variant: a.variant, action: a.action as Action, zone: a.zone as ZoneKey })
    }
  if (!Object.keys(quiz).length && !rounds.length) return null
  return { mode: r.mode, quiz, rounds }
}
