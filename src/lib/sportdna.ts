import type { Product } from "@/payload-types"
import { signalAccountStateChange } from "./browser-state.ts"
import { RATING_TIERS } from "./rating/ratingConfig.ts"
import { racketFit, racketRadar } from "./racket-radar.ts"
import { fitEligible } from "./fit-eligibility.ts"
import { playerRadar } from "./sportdna-radar.ts"
import type { TestRun } from "./sportdna-runs"
import type { DnaStoredResult } from "./sportdna-core"
import { equipmentFit, type FitReason } from "./sportdna-fit.ts"

export type DnaSport = "football" | "badminton"
export type AssessmentMode = "quick" | "deep"
export type Answers = {
  sport: DnaSport
  role: string
  level: number
  freq: number
  surface: string
  budget: number
  skills: Record<string, number>
}
export type Profiles = Partial<Record<DnaSport, Answers>>
export type DnaProduct = {
  id: string
  name: string
  sport: string
  category: string
  price: number
  match: number
  text: string
  equipment: EquipmentProfile
  specs?: { label: string; value: string }[]
}
export type EquipmentProfile = {
  kind: "badminton_racket" | "football_shoes" | "badminton_shoes" | "football_ball" | "shuttlecock" | "accessory"
  surface: "ag" | "fg" | "ic" | "indoor" | "multi" | null
  balance: "head_heavy" | "even" | "head_light" | null
  shaftFlex: "flexible" | "medium" | "stiff" | "extra_stiff" | null
  weightClass: "3U" | "4U" | "5U" | "6U" | null
  maxTensionLbs: number | null
  footWidth: "narrow" | "standard" | "wide" | null
}
export type EquipmentPreferences = {
  footballSurface?: "ag" | "fg" | "ic"
  badmintonPlaystyle?: "attack" | "defense" | "allround"
  /** Badminton foot shape (legacy shared value). */
  footShape?: "narrow" | "standard" | "wide"
  /** Badminton budget (legacy shared value). */
  budget?: number
  stringTensionLbs?: number
  gripSize?: "G4" | "G5" | "G6"
  footballFootShape?: "narrow" | "standard" | "wide"
  footballPosition?: "goalkeeper" | "defender" | "midfielder" | "striker"
  footballBudget?: number
}
export type EquipmentFit = {
  score: number
  label: "Rất phù hợp" | "Phù hợp" | "Cân nhắc" | "Không phù hợp"
  labelEn?: string
  hardFail: boolean
  pros: string[]
  cons: string[]
  /** Bilingual reasons (newer scorer); pros/cons stay as the Vietnamese copy. */
  reasons?: FitReason[]
  source: "deep" | "quick" | "radar" | "core"
}
export type RadarAxis = {
  id: string
  label: string
  rawElo: number | null
  display: number | null
  status: "ok" | "insufficient_data"
}
export type SkillResult = {
  sport: DnaSport
  mode: AssessmentMode
  overall: number
  skillRatings: Record<string, number>
  tier: ReturnType<typeof resolveSkillTier>
  radar: RadarAxis[]
  growthTags: string[]
  answeredAt: string
  // v6.0 = quiz cũ (đã bỏ, chỉ còn trong dữ liệu đã lưu); v1.3.3-provisional = SportDNA hiện tại.
  schemaVersion: "v6.0" | "v1.3.3-provisional"
  assessmentMode?: "quick" | "deep" | "retest"
  scoredRounds?: number
  totalRounds?: number
}
export type DiagnosticProfiles = Partial<Record<DnaSport, {
  quick?: SkillResult
  deep?: SkillResult
  /** Latest SportDNA core assessment for this sport. */
  core?: DnaStoredResult
}>>

// E1b: ranh giới và tên bậc lấy từ RATING_TIERS (bảng chuẩn dùng chung với MR).
// Giữ id cũ (ánh xạ theo thứ tự tier_1 … tier_10) và hình dạng tuple để nơi dùng không phải đổi.
const LEGACY_TIER_IDS = [
  "tier_0_new",
  "tier_1_beginner",
  "tier_2_below_avg",
  "tier_3_average",
  "tier_4_above_avg",
  "tier_5_good",
  "tier_6_very_good",
  "tier_7_semi_pro",
  "tier_8_pro",
  "tier_9_elite",
] as const

const TIER_DESCRIPTIONS = [
  "Mới làm quen môn thể thao, chưa nắm kỹ thuật cơ bản.",
  "Nắm được một vài động tác nền tảng, còn nhiều lỗi khi thi đấu.",
  "Chơi được nhưng thiếu ổn định, lộ rõ điểm yếu khi bị ép.",
  "Xử lý được tình huống thông thường, kỹ thuật nền tảng ổn định.",
  "Kiểm soát tốt hơn mặt bằng chung, có điểm mạnh rõ rệt.",
  "Kỹ thuật ổn định, xử lý được áp lực, bước đầu có chiến thuật.",
  "Đa dạng kỹ thuật, kiểm soát tốt trong thi đấu thực tế.",
  "Trình độ thi đấu giải phong trào, kỹ thuật gần hoàn thiện.",
  "Trình độ thi đấu giải chuyên, thể lực và kỹ thuật cao.",
  "Trình độ quốc gia hoặc quốc tế, không giới hạn trần.",
] as const

/** [id cũ, tên, cận dưới (gồm), cận dưới của bậc kế tiếp (không gồm), mô tả]. */
const TIERS = RATING_TIERS.map(
  (tier, i) =>
    [
      LEGACY_TIER_IDS[i],
      tier.name,
      tier.min ?? -Infinity,
      RATING_TIERS[i + 1]?.min ?? Infinity,
      TIER_DESCRIPTIONS[i],
    ] as const,
)

export function resolveSkillTier(rating: number, provisional = false) {
  const i = Math.max(
    0,
    TIERS.findIndex((tier) => rating >= tier[2] && rating < tier[3]),
  )
  const tier = TIERS[i]
  const next = TIERS[i + 1]
  const progress =
    Number.isFinite(tier[2]) && Number.isFinite(tier[3])
      ? Math.max(0, Math.min(1, (rating - tier[2]) / (tier[3] - tier[2])))
      : 1
  return {
    id: tier[0],
    label: tier[1],
    description: tier[4],
    progress,
    eloToNext: next ? Math.max(0, next[2] - rating) : null,
    nextLabel: next?.[1] ?? null,
    provisional,
  }
}

export type AchievementInput = {
  rank: number
  fieldSize: number
  level: "club" | "school_local" | "provincial" | "national" | "international" | "continental_world"
  participation: number
  daysAgo: number
  duplicateIndex?: number
  bonus?: number
}
const LEVEL_FACTOR: Record<AchievementInput["level"], number> = {
  club: 0.45,
  school_local: 0.65,
  provincial: 0.9,
  national: 1.2,
  international: 1.45,
  continental_world: 1.75,
}
export function calculateAchievementPoints(a: AchievementInput) {
  if (a.rank < 1 || a.fieldSize < 1 || a.rank > a.fieldSize) return 0
  const base = 100 * (1 - (a.rank - 1) / a.fieldSize) ** 1.5
  const scale = Math.min(1.35, 0.85 + 0.1 * Math.log2(a.fieldSize))
  const recency = 2 ** (-Math.max(0, a.daysAgo) / 730)
  const duplicate = [1, 0.7, 0.5, 0.25][Math.min(3, a.duplicateIndex ?? 0)]
  return (
    Math.round(
      base *
        LEVEL_FACTOR[a.level] *
        scale *
        Math.max(0.2, Math.min(1, a.participation)) *
        recency *
        duplicate *
        (1 + Math.min(0.25, Math.max(0, a.bonus ?? 0))) *
        100,
    ) / 100
  )
}

export const ROLES = {
  football: [
    {
      value: "striker",
      label: "Tiền đạo",
      note: "Dứt điểm, bứt tốc",
      keys: ["toc do", "speed", "dut diem"],
    },
    {
      value: "midfielder",
      label: "Tiền vệ",
      note: "Kiểm soát, chuyền bóng",
      keys: ["kiem soat", "control"],
    },
    {
      value: "defender",
      label: "Hậu vệ",
      note: "Tranh chấp, bền bỉ",
      keys: ["ben", "bao ve"],
    },
    {
      value: "goalkeeper",
      label: "Thủ môn",
      note: "Phản xạ, bắt bóng",
      keys: ["gang", "thu mon", "grip"],
    },
  ],
  badminton: [
    {
      value: "attack",
      label: "Tấn công",
      note: "Đập cầu uy lực",
      keys: ["tan cong", "head heavy", "smash"],
    },
    {
      value: "defense",
      label: "Phòng thủ",
      note: "Phản tạt, chặn cầu",
      keys: ["phong thu", "head light", "linh hoat"],
    },
    {
      value: "allround",
      label: "Toàn diện",
      note: "Cân bằng công thủ",
      keys: ["can bang", "toan dien", "da nang"],
    },
  ],
}
const SURFACE_KEYS: Record<string, string[]> = {
  ag: ["ag", "co nhan tao", "tf"],
  fg: ["fg", "co tu nhien"],
  ic: ["ic", "futsal"],
  mat: ["tham", "bam"],
  wood: ["san go", "bam"],
  outdoor: ["ngoai troi", "ben"],
}
export const norm = (v: string) =>
  v.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
export function playerScore(a: Answers) {
  const v = Object.values(a.skills)
  return Math.round(
    Math.min(
      100,
      a.level * 13 +
        a.freq * 6 +
        (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 5) * 4.3 +
        4,
    ),
  )
}
export function compatibility(p: DnaProduct, a: Answers) {
  const text = norm(p.text)
  const role = ROLES[a.sport].find((r) => r.value === a.role)
  let fit = 40
  if (role?.keys.some((key) => text.includes(key))) fit += 22
  if ((SURFACE_KEYS[a.surface] ?? []).some((key) => text.includes(key)))
    fit += 8
  fit += p.price <= a.budget ? 16 : p.price <= a.budget * 1.3 ? 6 : -12
  fit +=
    10 -
    Math.abs(
      (p.price >= 3500000
        ? 3
        : p.price >= 2000000
          ? 2
          : p.price >= 900000
            ? 1
            : 0) - Math.round(playerScore(a) / 30),
    ) *
      5
  return Math.max(35, Math.min(99, Math.round(fit + (p.match - 80) * 0.2)))
}
export function preferredSkill(profiles: DiagnosticProfiles, sport: DnaSport) {
  return profiles[sport]?.deep ?? profiles[sport]?.quick ?? null
}

const fitLabel = (score: number): EquipmentFit["label"] =>
  score >= 85
    ? "Rất phù hợp"
    : score >= 70
      ? "Phù hợp"
      : score >= 50
        ? "Cân nhắc"
        : "Không phù hợp"

export function calculateEquipmentFit(
  product: DnaProduct,
  skill: SkillResult | null,
  preferences: EquipmentPreferences = {},
): EquipmentFit | null {
  if (!skill || skill.sport !== product.sport) return null
  const { equipment } = product
  const pros: string[] = []
  const cons: string[] = []
  const hasEquipmentEvidence = [
    equipment.surface,
    equipment.balance,
    equipment.shaftFlex,
    equipment.weightClass,
    equipment.maxTensionLbs,
    equipment.footWidth,
  ].some((value) => value !== null && value !== undefined)
  if (!hasEquipmentEvidence) return null

  if (
    equipment.kind === "football_shoes" &&
    preferences.footballSurface &&
    equipment.surface &&
    equipment.surface !== "multi" &&
    equipment.surface !== preferences.footballSurface
  ) {
    return {
      score: 0,
      label: "Không phù hợp",
      hardFail: true,
      pros,
      cons: ["Loại đinh không phù hợp với mặt sân bạn đã chọn."],
      source: skill.mode,
    }
  }
  // A racket that can't take the player's tension loses points (with the reason) instead of being excluded.
  const tensionPenalty =
    equipment.kind === "badminton_racket" &&
    preferences.stringTensionLbs &&
    equipment.maxTensionLbs &&
    preferences.stringTensionLbs > equipment.maxTensionLbs
      ? 25
      : 0
  if (tensionPenalty)
    cons.push(`Mức căng ${preferences.stringTensionLbs} lbs vượt giới hạn ${equipment.maxTensionLbs} lbs của khung vợt (−25).`)

  let technique = 72
  let playstyle = 70
  let body = 75
  let budget = 70
  const power = skill.radar.find((axis) => axis.id === "power")?.display
  const reflex = skill.radar.find((axis) => axis.id === "reflex")?.display

  if (equipment.kind === "badminton_racket") {
    if (
      equipment.shaftFlex === "extra_stiff" ||
      equipment.shaftFlex === "stiff"
    ) {
      if (power !== null && power !== undefined && power < 45) {
        technique -= equipment.shaftFlex === "extra_stiff" ? 38 : 22
        cons.push("Thân vợt cứng đòi hỏi lực cổ tay tốt hơn hồ sơ hiện tại.")
      } else if (power !== null && power !== undefined && power >= 60) {
        technique += 14
        pros.push("Độ cứng thân vợt phù hợp khả năng tạo lực hiện tại.")
      }
    }
    if (
      equipment.shaftFlex === "flexible" &&
      power !== null &&
      power !== undefined &&
      power < 50
    ) {
      technique += 15
      pros.push("Thân vợt dẻo hỗ trợ tạo lực khi sức mạnh còn đang phát triển.")
    }
    if (equipment.balance === "head_heavy") {
      if (reflex !== null && reflex !== undefined && reflex < 45) {
        technique -= 18
        cons.push(
          "Đầu vợt nặng có thể làm chậm phản tạt và chuyển đổi phòng thủ.",
        )
      }
      if (preferences.badmintonPlaystyle === "attack") {
        playstyle += 24
        pros.push("Điểm cân bằng nặng đầu hỗ trợ lối chơi tấn công.")
      } else if (preferences.badmintonPlaystyle === "defense") {
        playstyle -= 28
        cons.push("Nặng đầu không tối ưu cho ưu tiên phòng thủ và phản tạt.")
      }
    }
    if (
      equipment.balance === "head_light" &&
      preferences.badmintonPlaystyle === "defense"
    ) {
      playstyle += 24
      pros.push("Đầu vợt nhẹ hỗ trợ xoay trở và phản tạt nhanh.")
    }
    if (equipment.weightClass === "4U" || equipment.weightClass === "5U") {
      body += 10
      pros.push(`${equipment.weightClass} là mức trọng lượng dễ kiểm soát.`)
    }
  }

  if (
    (equipment.kind === "football_shoes" ||
      equipment.kind === "badminton_shoes") &&
    preferences.footShape &&
    equipment.footWidth
  ) {
    if (preferences.footShape === "wide" && equipment.footWidth === "narrow") {
      body -= 55
      cons.push("Form giày thon không phù hợp bàn chân bè.")
    } else if (
      preferences.footShape === "narrow" &&
      equipment.footWidth === "wide"
    ) {
      body -= 24
      cons.push("Form giày bè có thể tạo cảm giác lỏng với bàn chân thon.")
    } else if (preferences.footShape === equipment.footWidth) {
      body += 20
      pros.push("Form giày khớp với dáng bàn chân đã chọn.")
    }
  }

  if (preferences.budget && preferences.budget > 0) {
    if (product.price <= preferences.budget) {
      budget = 100
      pros.push("Sản phẩm nằm trong ngân sách của bạn.")
    } else if (product.price <= preferences.budget * 1.25) {
      budget = 58
      cons.push("Giá cao hơn ngân sách một chút.")
    } else {
      budget = 20
      cons.push("Giá vượt đáng kể ngân sách đã đặt.")
    }
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      // The tension penalty is taken off the final score, so "(−25)" in the reason is exact.
      Math.round(technique * 0.4 + playstyle * 0.3 + body * 0.2 + budget * 0.1) - tensionPenalty,
    ),
  )
  if (!pros.length)
    pros.push("Không phát hiện xung đột lớn với hồ sơ kỹ năng hiện tại.")
  return {
    score,
    label: fitLabel(score),
    hardFail: false,
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 3),
    source: skill.mode,
  }
}

export const fitFor = (
  profiles: DiagnosticProfiles,
  p: DnaProduct,
  preferences: EquipmentPreferences = {},
  runs: TestRun[] = [],
): EquipmentFit | null => {
  // Apparel, accessories, shuttlecocks, bags and listings without the key specs get no fit at all.
  if (!fitEligible(p)) return null
  // Newest SportDNA assessment first: the shared scorer for both sports.
  const sport: DnaSport = p.sport === "badminton" ? "badminton" : "football"
  const core = profiles[sport]?.core
  if (core?.result?.axes) {
    const axes = Object.fromEntries(core.result.axes.map((a) => [a.id, a.score]))
    return equipmentFit(sport, p, { axes, context: core.result.context ?? {} }, preferences)
  }
  // Vợt có đủ thông số: so mạng nhện vợt với mạng nhện người chơi (tổng hợp mọi bài test).
  const rr = p.equipment.kind === "badminton_racket" ? racketRadar(p.specs) : null
  if (rr) {
    const max = p.equipment.maxTensionLbs
    const overTension = !!(preferences.stringTensionLbs && max && preferences.stringTensionLbs > max)
    const fit = racketFit(playerRadar("badminton", profiles, runs), rr, preferences.badmintonPlaystyle)
    if (!fit) return null
    let score = fit.score - (overTension ? 25 : 0)
    const cons = [...fit.cons]
    if (overTension) cons.unshift(`Mức căng ${preferences.stringTensionLbs} lbs vượt giới hạn ${max} lbs của khung vợt (−25).`)
    const pros = [...fit.pros]
    if (preferences.budget && preferences.budget > 0) {
      const budget = p.price <= preferences.budget ? 100 : p.price <= preferences.budget * 1.25 ? 58 : 20
      score = Math.round(score * 0.9 + budget * 0.1)
      if (budget === 100) pros.push("Sản phẩm nằm trong ngân sách của bạn.")
      else cons.push(budget === 58 ? "Giá cao hơn ngân sách một chút." : "Giá vượt đáng kể ngân sách đã đặt.")
    }
    score = Math.max(0, Math.min(100, score))
    if (!pros.length) pros.push("Không phát hiện xung đột lớn với mạng nhện của bạn.")
    return { score, label: fitLabel(score), hardFail: false, pros: pros.slice(0, 3), cons: cons.slice(0, 3), source: "radar" }
  }
  return calculateEquipmentFit(
    p,
    preferredSkill(
      profiles,
      p.sport === "badminton" ? "badminton" : "football",
    ),
    preferences,
  )
}
export const dnaText = (
  p: Pick<Product, "name" | "category" | "shortDescription" | "description" | "specs" | "features">,
) =>
  [
    p.name,
    p.category,
    p.shortDescription,
    p.description,
    ...(p.specs ?? []).map((s) => `${s.label} ${s.value}`),
    ...(p.features ?? []).map((f) => f.feature),
  ].join(" ")
export const toDnaProduct = (p: Product): DnaProduct => ({
  id: String(p.id),
  name: p.name,
  sport: p.sport,
  category: p.category,
  price: p.price,
  match: p.match,
  text: dnaText(p),
  equipment: equipmentProfileOf(p),
  specs: (p.specs ?? []).map(({ label, value }) => ({ label, value })),
})

function equipmentProfileOf(p: Product): EquipmentProfile {
  const text = norm(dnaText(p))
  const category = norm(p.category)
  const configured = p.equipmentProfile
  const kind =
    configured?.kind ??
    (category.includes("vot")
      ? "badminton_racket"
      : category.includes("giay") && p.sport === "football"
        ? "football_shoes"
        : category.includes("giay")
          ? "badminton_shoes"
          : category.includes("bong")
            ? "football_ball"
            : category.includes("cau long")
              ? "shuttlecock"
              : "accessory")
  const tensionValues = [
    ...text.matchAll(/(\d{2})(?:\s*[–-]\s*(\d{2}))?\s*lbs/g),
  ].flatMap((match) => [Number(match[1]), Number(match[2] || match[1])])
  return {
    kind,
    surface:
      configured?.surface ??
      (/\b(tf|ag)\b|co nhan tao/.test(text)
        ? "ag"
        : /\bfg\b|co tu nhien/.test(text)
          ? "fg"
          : /\b(ic|futsal)\b|trong nha/.test(text)
            ? "ic"
            : null),
    balance:
      configured?.balance ??
      (text.includes("nang dau") || text.includes("head heavy")
        ? "head_heavy"
        : text.includes("nhe dau") || text.includes("head light")
          ? "head_light"
          : text.includes("can bang")
            ? "even"
            : null),
    shaftFlex:
      configured?.shaftFlex ??
      (text.includes("extra stiff") || text.includes("sieu cung")
        ? "extra_stiff"
        : text.includes("stiff") || text.includes("than cung")
          ? "stiff"
          : text.includes("flexible") || text.includes("deo")
            ? "flexible"
            : text.includes("medium")
              ? "medium"
              : null),
    weightClass:
      configured?.weightClass ??
      text
        .match(/\b[3-6]u\b/i)?.[0]
        ?.toUpperCase() as "3U" | "4U" | "5U" | "6U" | undefined ??
      null,
    maxTensionLbs:
      configured?.maxTensionLbs ??
      (tensionValues.length ? Math.max(...tensionValues) : null),
    footWidth:
      configured?.footWidth ??
      (text.includes("form be") || text.includes("wide")
        ? "wide"
        : text.includes("form thon") || text.includes("narrow")
          ? "narrow"
          : null),
  }
}

const LEGACY_KEY = (s: DnaSport) => `boai-sportdna-${s}`
const V5_KEY = "boai-sportdna-v5"
const EQUIPMENT_KEY = "boai-sportdna-equipment-v1"
export const DNA_EVENT = "boai-sportdna-change"
export function loadProfiles(): Profiles {
  const out: Profiles = {}
  try {
    for (const s of ["football", "badminton"] as const) {
      const v = JSON.parse(localStorage.getItem(LEGACY_KEY(s)) ?? "null")
      if (v?.sport === s) out[s] = v
    }
  } catch {}
  return out
}
export function saveProfile(a: Answers) {
  localStorage.setItem(LEGACY_KEY(a.sport), JSON.stringify(a))
  window.dispatchEvent(new Event(DNA_EVENT))
  signalAccountStateChange()
}
export function removeProfile(s: DnaSport) {
  localStorage.removeItem(LEGACY_KEY(s))
  window.dispatchEvent(new Event(DNA_EVENT))
  signalAccountStateChange()
}
export function loadDiagnosticProfiles(): DiagnosticProfiles {
  try {
    return JSON.parse(localStorage.getItem(V5_KEY) ?? "{}")
  } catch {
    return {}
  }
}
export function saveDiagnosticResult(result: SkillResult) {
  const all = loadDiagnosticProfiles()
  all[result.sport] = { ...all[result.sport], [result.mode]: result }
  localStorage.setItem(V5_KEY, JSON.stringify(all))
  window.dispatchEvent(new Event(DNA_EVENT))
  signalAccountStateChange()
}
export function saveDiagnosticProfiles(profiles: DiagnosticProfiles) {
  localStorage.setItem(V5_KEY, JSON.stringify(profiles))
  window.dispatchEvent(new Event(DNA_EVENT))
  signalAccountStateChange()
}
export function mergeDiagnosticProfiles(
  local: DiagnosticProfiles,
  remote: DiagnosticProfiles,
): DiagnosticProfiles {
  const merged: DiagnosticProfiles = { ...local }
  for (const sport of ["football", "badminton"] as const) {
    for (const mode of ["quick", "deep"] as const) {
      const left = merged[sport]?.[mode]
      const right = remote[sport]?.[mode]
      if (
        right &&
        (!left ||
          new Date(right.answeredAt).getTime() >
            new Date(left.answeredAt).getTime())
      )
        merged[sport] = { ...merged[sport], [mode]: right }
    }
    const localCore = merged[sport]?.core
    const remoteCore = remote[sport]?.core
    if (remoteCore && (!localCore || remoteCore.at > localCore.at)) merged[sport] = { ...merged[sport], core: remoteCore }
  }
  return merged
}
export function loadEquipmentPreferences(): EquipmentPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(EQUIPMENT_KEY) ?? "null")
    if (saved) return saved
    const legacy = loadProfiles()
    const football = legacy.football
    const badminton = legacy.badminton
    return {
      footballSurface:
        football && ["ag", "fg", "ic"].includes(football.surface)
          ? football.surface as "ag" | "fg" | "ic"
          : undefined,
      badmintonPlaystyle:
        badminton && ["attack", "defense", "allround"].includes(badminton.role)
          ? badminton.role as "attack" | "defense" | "allround"
          : undefined,
      budget:
        Math.max(football?.budget ?? 0, badminton?.budget ?? 0) || undefined,
    }
  } catch {
    return {}
  }
}
export function saveEquipmentPreferences(value: EquipmentPreferences) {
  localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(value))
  window.dispatchEvent(new Event(DNA_EVENT))
  signalAccountStateChange()
}
