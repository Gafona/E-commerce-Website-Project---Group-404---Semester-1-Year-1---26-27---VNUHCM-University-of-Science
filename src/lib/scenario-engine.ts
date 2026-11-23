// SportDNA v6.1 — Scenario Engine (prototype cầu lông, template BD-B01)
//
// Quy ước tọa độ (chuẩn hoá 0→1): x từ trái sang phải, y từ trên xuống dưới.
// Nửa sân đối thủ là y ∈ [0, 0.5], lưới ở y = 0.5, người chơi đứng nửa dưới.
// Mọi khoảng cách tính bằng mét (sân đơn 5,18 m × 13,4 m) để chỉ số đo được.

export type Action = "smash" | "drop" | "clear" | "drive"
export type Point = { x: number; y: number }
export type Variant = "deep" | "forward" | "defense"

export const COURT = { width: 5.18, length: 13.4 } as const

export const ACTIONS: Record<
  Action,
  { label: string; hint: string; band: [number, number] }
> = {
  // band = dải độ sâu hợp lệ của điểm rơi: 0 = sát lưới, 1 = vạch cuối sân
  drop: { label: "Bỏ nhỏ", hint: "Rơi sát lưới", band: [0, 0.3] },
  smash: { label: "Đập cầu", hint: "Cắm xuống, tốc độ cao", band: [0.3, 1] },
  clear: { label: "Phông cầu", hint: "Cao và sâu về cuối sân", band: [0.75, 1] },
  drive: { label: "Đánh ngang", hint: "Bay thấp, ngang tầm lưới", band: [0.4, 0.8] },
}

export type Scenario = {
  scenarioId: string
  seed: number
  variant: Variant
  gameMode: "singles"
  rallyPhase: "attacking" | "defending"
  prompt: string
  state: {
    player: Point & { stamina: number }
    opponent: Point & { movement: [number, number] }
    shuttle: Point & { height: ShuttleHeight; speed: ShuttleSpeed }
  }
  constraintsApplied: string[]
  availableActions: Action[]
  // A: mức phù hợp của từng động tác với trạng thái pha cầu (0–1)
  actionFit: Record<Action, number>
  // D_i dùng trong ELO. Tạm thời là công thức đơn giản, sẽ thay bằng 7 tiêu chí.
  difficulty: number
  // Chỉ có ở tình huống phòng thủ (E6-B). Không hiển thị trước khi trả lời.
  defense?: DefenseMeta
}

export type ShuttleHeight = "high" | "mid" | "low"
export type ShuttleSpeed = "slow" | "medium" | "fast"

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const r3 = (v: number) => Math.round(v * 1000) / 1000

export const meters = (a: Point, b: Point) =>
  Math.hypot((a.x - b.x) * COURT.width, (a.y - b.y) * COURT.length)

// PRNG có seed: cùng seed thì ra cùng tình huống (tái lập được kết quả)
export function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Vị trí đối thủ dự kiến sẽ đứng sau ~0,5 giây
export const anticipated = (o: { x: number; y: number; movement: [number, number] }): Point => ({
  x: clamp(o.x + o.movement[0], 0, 1),
  y: clamp(o.y + o.movement[1], 0, 0.5),
})

// Thứ tự theo spec: pha cầu → quỹ đạo → vị trí người chơi → đối thủ → động tác hợp lệ,
// rồi mới random biến thể tọa độ trong khoảng cho phép.
export function generateScenario(seed: number): Scenario {
  const rnd = mulberry32(seed)
  const between = (lo: number, hi: number) => lerp(lo, hi, rnd())

  const variant: Variant = rnd() < 0.7 ? "deep" : "forward"
  const lean = [-1, 0, 1][Math.floor(rnd() * 3)]

  const player = {
    x: between(0.25, 0.75),
    y: between(0.68, 0.82),
    stamina: between(0.6, 1),
  }
  const shuttle = {
    x: clamp(player.x + between(-0.05, 0.05), 0.1, 0.9),
    y: clamp(player.y - between(0.03, 0.08), 0.52, 0.9),
    height: "high" as const,
    speed: "medium" as const,
  }
  const opponent = {
    x: between(0.3, 0.7),
    y: variant === "deep" ? between(0.06, 0.18) : between(0.28, 0.38),
    movement: [lean * between(0.05, 0.12), between(0, 0.04)] as [number, number],
  }

  const constraintsApplied: string[] = []
  if (meters(player, shuttle) <= 1.6) constraintsApplied.push("shuttle_in_reach")
  if (variant === "deep" && opponent.y <= 0.2)
    constraintsApplied.push("opponent_out_of_position")
  if (variant === "forward" && opponent.y >= 0.25)
    constraintsApplied.push("opponent_near_net")

  const actionFit: Record<Action, number> =
    variant === "deep"
      ? { drop: 1, smash: 0.8, clear: 0.6, drive: 0.3 }
      : { clear: 1, smash: 0.85, drive: 0.5, drop: 0.35 }

  return {
    scenarioId: `BD-B01-${variant.toUpperCase()}-${seed}`,
    seed,
    variant,
    gameMode: "singles",
    rallyPhase: "attacking",
    prompt:
      variant === "deep"
        ? "Đối thủ đang ở cuối sân. Cầu bổng đến ngay phía trước bạn."
        : "Đối thủ đang áp sát lưới. Cầu bổng đến ngay phía trước bạn.",
    state: { player, opponent, shuttle },
    constraintsApplied,
    availableActions: ["smash", "drop", "clear", "drive"],
    actionFit,
    difficulty:
      1000 +
      (lean !== 0 ? 60 : 0) +
      (player.stamina < 0.75 ? 60 : 0) +
      (variant === "forward" ? 80 : 0),
  }
}

// ───────────────────────── E6-B: tình huống phòng thủ ─────────────────────────
//
// Ánh xạ động tác sang phòng thủ (giữ nguyên 4 nút bấm, chỉ đổi ý nghĩa):
//   clear = nâng cầu cao sâu, drop = chặn ngắn sát lưới,
//   drive = đánh ngang phẳng, smash = phản công đánh xuống.
// Cú bẫy trong mỗi họ có A cao nhưng vùng rơi hợp lệ của nó trùng chỗ đối thủ
// sắp đứng, nên T (space) kéo S xuống dưới đáp án đúng.

export type DefenseFamily =
  | "smash_straight"
  | "smash_cross"
  | "body_drive"
  | "opponent_retreating"
  | "escape_pressure"
  | "two_corners"
  | "fake_smash_drop"
  | "tired_safe_return"

// GIẢ ĐỊNH: 7 tiêu chí độ khó (0–100), tên và trọng số là đề xuất, chưa có spec chốt.
export type DifficultyCriteria = {
  shuttleSpeed: number // s1: cầu đến nhanh, ít thời gian xử lý
  contactHeight: number // s2: điểm chạm thấp, khó đánh lên
  movementLoad: number // s3: quãng di chuyển tới cầu
  deception: number // s4: mức đánh lừa của đối thủ
  trapPull: number // s5: cú bẫy hấp dẫn đến đâu
  fatigue: number // s6: thể lực còn lại thấp
  targetNarrowness: number // s7: vùng điểm rơi tốt hẹp
}
export const DIFFICULTY_WEIGHTS: DifficultyCriteria = {
  shuttleSpeed: 1.2,
  contactHeight: 1.0,
  movementLoad: 0.6,
  deception: 0.9,
  trapPull: 0.8,
  fatigue: 0.7,
  targetNarrowness: 0.8,
}
export const DIFFICULTY_BASE = 900

// D = 900 + Σ wᵢ·sᵢ  (tối đa 900 + 600 = 1500)
export function difficultyFrom(c: DifficultyCriteria) {
  let sum = 0
  for (const k of Object.keys(DIFFICULTY_WEIGHTS) as (keyof DifficultyCriteria)[])
    sum += DIFFICULTY_WEIGHTS[k] * clamp(c[k], 0, 100)
  return DIFFICULTY_BASE + Math.round(sum)
}

export type DefenseMeta = {
  family: DefenseFamily
  variantId: string // ví dụ BD-DF1 hoặc BD-DF1-M (bản đối xứng)
  mirrored: boolean
  canonical: Action
  trap: { action: Action; reason: string }
  criteria: DifficultyCriteria
}

type FamilySpec = {
  code: string
  title: string
  prompt: string
  player: Point & { stamina: number }
  shuttle: Point & { height: ShuttleHeight; speed: ShuttleSpeed }
  opponent: Point & { movement: [number, number] }
  actionFit: Record<Action, number>
  canonical: Action
  trap: { action: Action; reason: string }
  constraints: string[]
  criteria: DifficultyCriteria
}

// Tọa độ gốc (bản chưa đối xứng). Bản -M lật x ↔ 1 − x.
export const DEFENSE_FAMILIES: Record<DefenseFamily, FamilySpec> = {
  smash_straight: {
    code: "DF1",
    title: "Đỡ smash thẳng",
    prompt:
      "Đối thủ vừa nhảy đập thẳng từ cuối sân và đang tiếp đất, trọng tâm còn ở phía sau. Cầu cắm xuống thấp, ngay trước người bạn.",
    player: { x: 0.62, y: 0.78, stamina: 0.85 },
    shuttle: { x: 0.66, y: 0.74, height: "low", speed: "fast" },
    opponent: { x: 0.56, y: 0.08, movement: [0, 0.06] },
    actionFit: { drop: 1, clear: 0.8, drive: 0.45, smash: 0 },
    canonical: "drop",
    trap: {
      action: "clear",
      reason: "Nâng cầu cho an toàn nhưng người đập vẫn đứng cuối sân, cầu về đúng tầm đập tiếp.",
    },
    constraints: ["shuttle_below_net", "opponent_deep"],
    criteria: { shuttleSpeed: 60, contactHeight: 50, movementLoad: 10, deception: 0, trapPull: 50, fatigue: 10, targetNarrowness: 20 },
  },
  smash_cross: {
    code: "DF2",
    title: "Đỡ smash chéo",
    prompt:
      "Đối thủ đập chéo rồi lao ngay lên lưới. Cầu bay ngang tầm ngực về phía tay thuận của bạn.",
    player: { x: 0.7, y: 0.76, stamina: 0.8 },
    shuttle: { x: 0.76, y: 0.72, height: "mid", speed: "fast" },
    opponent: { x: 0.44, y: 0.3, movement: [0.03, 0.1] },
    actionFit: { clear: 1, drop: 0.85, drive: 0.6, smash: 0.3 },
    canonical: "clear",
    trap: {
      action: "drop",
      reason: "Chặn ngắn là phản xạ quen khi đỡ đập, nhưng đối thủ đang lao đúng vào lưới.",
    },
    constraints: ["opponent_rushing_net"],
    criteria: { shuttleSpeed: 75, contactHeight: 50, movementLoad: 50, deception: 20, trapPull: 70, fatigue: 20, targetNarrowness: 30 },
  },
  body_drive: {
    code: "DF3",
    title: "Đỡ cú đánh nhanh vào người",
    prompt:
      "Đối thủ đứng giữa sân, vừa đánh ngang nhanh nhắm thẳng vào thân bạn và đang nhích lên phía trước.",
    player: { x: 0.52, y: 0.7, stamina: 0.9 },
    shuttle: { x: 0.55, y: 0.67, height: "mid", speed: "fast" },
    opponent: { x: 0.48, y: 0.32, movement: [0, 0.06] },
    actionFit: { drive: 1, drop: 0.8, clear: 0.55, smash: 0.45 },
    canonical: "drive",
    trap: {
      action: "drop",
      reason: "Chặn nhẹ trông chắc tay, nhưng đối thủ đang bước lên và chờ sẵn ở lưới.",
    },
    constraints: ["shuttle_at_body", "opponent_midcourt"],
    criteria: { shuttleSpeed: 55, contactHeight: 35, movementLoad: 10, deception: 10, trapPull: 55, fatigue: 10, targetNarrowness: 20 },
  },
  opponent_retreating: {
    code: "DF4",
    title: "Nâng cầu hay chặn khi đối thủ lùi",
    prompt:
      "Đối thủ đang lùi nhanh về sau, trọng tâm dồn ra sau. Cầu đến ngang tầm vai, bạn có thời gian chọn cú.",
    player: { x: 0.4, y: 0.72, stamina: 0.85 },
    shuttle: { x: 0.36, y: 0.69, height: "mid", speed: "medium" },
    opponent: { x: 0.52, y: 0.26, movement: [0, -0.06] },
    actionFit: { drop: 1, drive: 0.85, clear: 0.6, smash: 0.5 },
    canonical: "drop",
    trap: {
      action: "drive",
      reason: "Đánh ngang nhanh vào giữa sân là đưa cầu tới đúng chỗ đối thủ đang lùi về.",
    },
    constraints: ["opponent_retreating"],
    criteria: { shuttleSpeed: 30, contactHeight: 20, movementLoad: 30, deception: 20, trapPull: 50, fatigue: 10, targetNarrowness: 20 },
  },
  escape_pressure: {
    code: "DF5",
    title: "Thoát ép sau hai cú liên tiếp",
    prompt:
      "Bạn vừa đỡ hai cú ép liên tiếp và bị kéo về góc cuối sân. Đối thủ đứng chờ ở giữa sân, vợt giơ cao.",
    player: { x: 0.24, y: 0.88, stamina: 0.6 },
    shuttle: { x: 0.2, y: 0.85, height: "mid", speed: "medium" },
    opponent: { x: 0.52, y: 0.22, movement: [0, 0] },
    actionFit: { clear: 1, drive: 0.88, drop: 0.45, smash: 0.3 },
    canonical: "clear",
    trap: {
      action: "drive",
      reason: "Đánh ngang để giành lại thế trận, nhưng cầu đi ngang qua đúng vùng đối thủ đang chờ.",
    },
    constraints: ["player_pushed_deep", "opponent_midcourt"],
    criteria: { shuttleSpeed: 50, contactHeight: 30, movementLoad: 70, deception: 20, trapPull: 70, fatigue: 40, targetNarrowness: 40 },
  },
  two_corners: {
    code: "DF6",
    title: "Đỡ hai góc liên tiếp",
    prompt:
      "Đối thủ đổi góc liên tục; cú thứ hai đưa cầu cao vừa sang góc bên kia. Bạn kịp vào vị trí, đối thủ đứng giữa sân hơi dạt sang một bên.",
    player: { x: 0.78, y: 0.82, stamina: 0.6 },
    shuttle: { x: 0.8, y: 0.78, height: "high", speed: "medium" },
    opponent: { x: 0.57, y: 0.24, movement: [-0.05, 0] },
    actionFit: { smash: 1, drive: 0.85, clear: 0.75, drop: 0.5 },
    canonical: "smash",
    trap: {
      action: "drive",
      reason: "Đánh ngang giữ nhịp nghe hợp lý, nhưng đối thủ đứng giữa sân sẽ chặn ngay.",
    },
    constraints: ["opponent_switching_corners"],
    criteria: { shuttleSpeed: 60, contactHeight: 20, movementLoad: 90, deception: 60, trapPull: 60, fatigue: 50, targetNarrowness: 40 },
  },
  fake_smash_drop: {
    code: "DF7",
    title: "Đối thủ giả smash rồi bỏ nhỏ",
    prompt:
      "Đối thủ ở cuối sân làm động tác đập nhưng chỉ chặt nhẹ; cầu rơi thấp sát lưới trước mặt bạn. Đối thủ bắt đầu bước lên.",
    player: { x: 0.45, y: 0.6, stamina: 0.75 },
    shuttle: { x: 0.42, y: 0.56, height: "low", speed: "slow" },
    opponent: { x: 0.54, y: 0.1, movement: [0, 0.1] },
    actionFit: { drop: 1, drive: 0.8, clear: 0.6, smash: 0 },
    canonical: "drop",
    trap: {
      action: "drive",
      reason: "Đẩy cầu nhanh ra giữa sân là đưa cầu vào đúng đường đối thủ đang bước lên.",
    },
    constraints: ["shuttle_below_net", "opponent_deceptive"],
    criteria: { shuttleSpeed: 70, contactHeight: 90, movementLoad: 80, deception: 100, trapPull: 70, fatigue: 30, targetNarrowness: 60 },
  },
  tired_safe_return: {
    code: "DF8",
    title: "Thể lực thấp, chọn đường trả an toàn",
    prompt:
      "Bạn đang thở dốc sau một pha cầu dài, thể lực còn rất thấp. Cầu đến giữa sân ngang tầm vai, đối thủ đứng gần lưới chờ.",
    player: { x: 0.58, y: 0.74, stamina: 0.25 },
    shuttle: { x: 0.62, y: 0.71, height: "mid", speed: "medium" },
    opponent: { x: 0.46, y: 0.36, movement: [0, 0.03] },
    actionFit: { clear: 1, drop: 0.8, smash: 0.5, drive: 0.35 },
    canonical: "clear",
    trap: {
      action: "drop",
      reason: "Bỏ nhỏ để kết thúc nhanh cho đỡ mệt, nhưng đối thủ đã đứng sẵn ở lưới.",
    },
    constraints: ["player_low_stamina", "opponent_near_net"],
    criteria: { shuttleSpeed: 60, contactHeight: 50, movementLoad: 80, deception: 50, trapPull: 70, fatigue: 100, targetNarrowness: 80 },
  },
}

export const DEFENSE_FAMILY_IDS = Object.keys(DEFENSE_FAMILIES) as DefenseFamily[]

export function generateDefenseScenario(
  seed: number,
  opts: { family?: DefenseFamily; mirrored?: boolean } = {},
): Scenario {
  const rnd = mulberry32(seed ^ 0x5eed)
  const familyPick = DEFENSE_FAMILY_IDS[Math.floor(rnd() * DEFENSE_FAMILY_IDS.length)]
  const mirrorPick = rnd() < 0.5
  // Rung nhẹ tọa độ (±0,02) để mỗi seed khác nhau mà không đổi bản chất họ.
  return buildDefenseScenario(opts.family ?? familyPick, opts.mirrored ?? mirrorPick, seed, (v, amt) =>
    v + (rnd() * 2 - 1) * amt,
  )
}

// Dựng tình huống phòng thủ từ bảng họ. Mặc định không rung tọa độ (đúng vị trí
// hiển thị trên sân của SportDNA), dùng khi chấm bài làm.
export function buildDefenseScenario(
  family: DefenseFamily,
  mirrored: boolean,
  seed = 0,
  jitter: (v: number, amt: number) => number = (v) => v,
): Scenario {
  const f = DEFENSE_FAMILIES[family]
  const mx = (x: number) => (mirrored ? 1 - x : x)

  const player = {
    x: clamp(mx(jitter(f.player.x, 0.02)), 0.05, 0.95),
    y: clamp(jitter(f.player.y, 0.02), 0.55, 0.95),
    stamina: f.player.stamina,
  }
  const shuttle = {
    x: clamp(mx(jitter(f.shuttle.x, 0.02)), 0.05, 0.95),
    y: clamp(jitter(f.shuttle.y, 0.02), 0.52, 0.95),
    height: f.shuttle.height,
    speed: f.shuttle.speed,
  }
  const opponent = {
    x: clamp(mx(jitter(f.opponent.x, 0.02)), 0.05, 0.95),
    y: clamp(jitter(f.opponent.y, 0.02), 0.02, 0.48),
    movement: [mirrored ? -f.opponent.movement[0] : f.opponent.movement[0], f.opponent.movement[1]] as [
      number,
      number,
    ],
  }

  const constraintsApplied: string[] = []
  if (meters(player, shuttle) <= 1.6) constraintsApplied.push("shuttle_in_reach")
  constraintsApplied.push(...f.constraints)

  const variantId = `BD-${f.code}${mirrored ? "-M" : ""}`
  return {
    scenarioId: `${variantId}-${seed}`,
    seed,
    variant: "defense",
    gameMode: "singles",
    rallyPhase: "defending",
    prompt: f.prompt,
    state: { player, opponent, shuttle },
    constraintsApplied,
    availableActions: ["smash", "drop", "clear", "drive"],
    actionFit: { ...f.actionFit },
    difficulty: difficultyFrom(f.criteria),
    defense: {
      family,
      variantId,
      mirrored,
      canonical: f.canonical,
      trap: { ...f.trap },
      criteria: { ...f.criteria },
    },
  }
}

// Chọn tình huống cho từng lượt: lượt chẵn là tấn công (BD-B01), lượt lẻ là phòng thủ.
export function generateRoundScenario(seed: number, round: number): Scenario {
  return round % 2 === 1 ? generateDefenseScenario(seed) : generateScenario(seed)
}

export type Score = {
  action: Action
  target: Point
  A: number // chọn động tác
  space: number // khoảng trống so với vị trí đối thủ dự kiến
  reach: number // độ sâu điểm rơi có hợp với động tác không
  T: number // chọn điểm rơi = space × reach
  R: number // hệ số rủi ro (sát vạch)
  S: number // S = A × T × R, luôn nằm trong [0, 1]
  zone: string
  notes: string[]
}

const SPACE_REF_M = 3.5 // cách đối thủ từ 3,5 m trở lên là khoảng trống tối đa

export function zoneLabel(p: Point) {
  const depth = clamp((0.5 - p.y) / 0.5, 0, 1)
  const row = depth < 1 / 3 ? "sát lưới" : depth < 2 / 3 ? "giữa sân" : "cuối sân"
  const col = p.x < 1 / 3 ? "trái" : p.x < 2 / 3 ? "giữa" : "phải"
  return `${row} · ${col}`
}

// Công thức nhân: A hoặc T bằng 0 thì cả câu bằng 0, và S không bao giờ vượt 1
// (khác bản cộng W + R trong spec, vì ELO cần điểm trong khoảng 0–1).
export function scoreResponse(sc: Scenario, action: Action, target: Point): Score {
  const inCourt =
    target.x >= 0 && target.x <= 1 && target.y >= 0 && target.y <= 0.5
  const A = sc.actionFit[action]

  const away = meters(target, anticipated(sc.state.opponent))
  const space = 0.1 + 0.9 * clamp(away / SPACE_REF_M, 0, 1)

  const [lo, hi] = ACTIONS[action].band
  const depth = clamp((0.5 - target.y) / 0.5, 0, 1)
  const gap = depth < lo ? lo - depth : depth > hi ? depth - hi : 0
  const reach = clamp(1 - gap / 0.25, 0, 1)

  const margin = Math.min(
    target.x * COURT.width,
    (1 - target.x) * COURT.width,
    target.y * COURT.length,
  )
  const R = margin < 0.2 ? 0.8 : margin < 0.5 ? 0.93 : 1

  const T = inCourt ? space * reach : 0
  const S = inCourt ? A * T * R : 0

  const notes: string[] = []
  if (space < 0.55)
    notes.push(
      `Điểm rơi chỉ cách chỗ đối thủ sẽ đứng khoảng ${away.toFixed(1)} m nên dễ bị đón.`,
    )
  if (reach < 0.6)
    notes.push(`${ACTIONS[action].label} khó rơi đúng độ sâu bạn chọn.`)
  if (R < 1) notes.push("Điểm rơi sát vạch, rủi ro đánh ra ngoài.")
  if (A < 0.7) notes.push("Có động tác hiệu quả hơn cho tình huống này.")
  if (!notes.length)
    notes.push("Cầu đi vào khoảng trống và độ sâu hợp với động tác.")

  return {
    action,
    target: { x: r3(target.x), y: r3(target.y) },
    A,
    space: r3(space),
    reach: r3(reach),
    T: r3(T),
    R,
    S: r3(S),
    zone: zoneLabel(target),
    notes,
  }
}

// Quét lưới động tác × điểm rơi để tìm phương án tốt nhất (hiện sau khi trả lời)
export function findBest(sc: Scenario): Score {
  let best: Score | null = null
  for (const action of sc.availableActions)
    for (let i = 1; i < 20; i++)
      for (let j = 1; j < 25; j++) {
        const s = scoreResponse(sc, action, { x: i / 20, y: j * 0.02 })
        if (!best || s.S > best.S) best = s
      }
  return best as Score
}

export type ScenarioRatings = {
  tactical: number
  shot_selection: number
  target_selection: number
}
export const START_RATINGS: ScenarioRatings = {
  tactical: 1000,
  shot_selection: 1000,
  target_selection: 1000,
}
export const ROUNDS = 5

export function eloUpdate(rating: number, difficulty: number, score: number, k = 24) {
  const expected = 1 / (1 + 10 ** ((difficulty - rating) / 400))
  return Math.round(rating + k * (score - expected))
}

// Ba rating tách riêng: chọn động tác (A), chọn điểm rơi (T), tổng hợp (S).
// Thời gian phản hồi chỉ được lưu như metric riêng, không đưa vào đây.
export function applyRound(r: ScenarioRatings, sc: Scenario, s: Score): ScenarioRatings {
  return {
    tactical: eloUpdate(r.tactical, sc.difficulty, s.S),
    shot_selection: eloUpdate(r.shot_selection, sc.difficulty, s.A),
    target_selection: eloUpdate(r.target_selection, sc.difficulty, s.T),
  }
}

export const roundSeeds = (base: number, n = ROUNDS) =>
  Array.from({ length: n }, (_, i) => (base + i * 104729) | 0)
