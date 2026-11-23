// Mạng nhện riêng của vợt cầu lông (tính từ thông số người bán chọn) và độ tương thích với mạng nhện người chơi.
// Hệ số là bản v1 (GIẢ ĐỊNH) — xem docs/sportdna-ai-prompts.md để hiệu chuẩn.
import type { RadarPoint } from "./sportdna-radar"

// Lựa chọn cố định cho công cụ người bán. Nhãn (label) cũng là giá trị lưu trong specs.
export const RACKET_SPEC_OPTIONS = {
  material: { label: "Chất liệu", options: ["High Carbon", "HM Graphite", "Graphite", "Carbon Nano", "Carbon Composite", "Nhôm / Thép"] },
  flex: { label: "Độ cứng", options: ["Dẻo", "Trung bình", "Cứng", "Siêu cứng"] },
  balance: { label: "Độ cân bằng", options: ["Nhẹ đầu", "Hơi nhẹ đầu", "Cân bằng", "Hơi nặng đầu", "Nặng đầu"] },
  length: { label: "Chiều dài vợt", options: ["665mm", "670mm", "675mm", "680mm"] },
  weight: { label: "Trọng lượng", options: ["2U", "3U", "4U", "5U", "6U"] },
  grip: { label: "Chu vi cán vợt", options: ["G4", "G5", "G6", "G7"] },
  tension: { label: "Sức căng tối đa", options: ["24 LBS ~ 10.9kg", "26 LBS ~ 11.8kg", "28 LBS ~ 12.7kg", "30 LBS ~ 13.6kg", "31 LBS ~ 14.3kg", "32 LBS ~ 14.5kg", "35 LBS ~ 15.9kg"] },
} as const
export type RacketSpecKey = keyof typeof RACKET_SPEC_OPTIONS

export const RACKET_AXES = [
  { id: "power", label: "Lực đập", en: "Power" },
  { id: "speed", label: "Tốc độ vung", en: "Swing speed" },
  { id: "control", label: "Kiểm soát", en: "Control" },
  { id: "defense", label: "Phản tạt", en: "Defence" },
  { id: "stability", label: "Ổn định", en: "Stability" },
  { id: "ease", label: "Dễ chơi", en: "Ease of use" },
] as const
export type RacketAxis = (typeof RACKET_AXES)[number]["id"]
/** Axis value is null when the specs the seller filled in can't support it. */
export type RacketRadar = { axes: Record<RacketAxis, number | null>; known: number; brand: string | null }

/** Number of the 7 racket specs (weight, balance, stiffness, length, grip, tension, material) given. */
export const RACKET_SPEC_COUNT = 7

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()

// Mỗi thuộc tính quy về 0–1 (null = không có thông tin).
function attrs(spec: Record<string, string>) {
  // Khớp theo từ khóa trong nhãn để đọc được cả sản phẩm cũ ("Trọng lượng / Cán cầm", "Độ dài vợt", "Mức căng"...).
  const entries = Object.entries(spec).map(([k, v]) => [norm(k), norm(v)] as const)
  const get = (...keys: string[]) => entries.find(([k]) => keys.some((key) => k.includes(key)))?.[1] ?? ""
  const weightText = get("trong luong")
  const weight = weightText.match(/([2-7])\s*u/)?.[1]
  const balanceText = get("can bang")
  // Điểm cân bằng ghi bằng mm (vd 308mm): < 285 nhẹ đầu … > 305 nặng đầu.
  const balanceMm = Number(balanceText.match(/(2[6-9]\d|3[0-2]\d)\s*mm/)?.[1])
  const flex = get("do cung")
  const length = Number(get("chieu dai", "do dai").match(/(6\d\d)/)?.[1])
  const grip = (get("chu vi can", "can cam", "can vot") || weightText).match(/g\s*([3-8])\b/)?.[1]
  const tensionText = get("cang")
  const lbs = Number(tensionText.match(/(\d{2}(?:[.,]\d)?)\s*(lbs|lb)/)?.[1]?.replace(",", "."))
  const kg = Number(tensionText.match(/(\d{1,2}(?:[.,]\d)?)\s*kg/)?.[1]?.replace(",", "."))
  const tension = Number.isFinite(lbs) && lbs > 0 ? lbs : Number.isFinite(kg) && kg > 0 ? kg * 2.2046 : Number(tensionText.match(/(\d{2})/)?.[1])
  const material = get("chat lieu", "khung vot")
  return {
    // 2U (90–94 g) nặng nhất → 1, 6U (70–74 g) nhẹ nhất → 0.
    w: weight ? Math.max(0, Math.min(1, (6 - Number(weight)) / 4)) : null,
    b: Number.isFinite(balanceMm) && balanceMm > 0 ? Math.max(0, Math.min(1, (balanceMm - 280) / 30))
      : !balanceText ? null
      : balanceText.includes("hoi nang") ? 0.7
      : balanceText.includes("nang dau") || balanceText.includes("head heavy") ? 1
      : balanceText.includes("hoi nhe") ? 0.3
      : balanceText.includes("nhe dau") || balanceText.includes("head light") ? 0
      : balanceText.includes("can bang") || balanceText.includes("even") ? 0.5 : null,
    f: !flex ? null
      : flex.includes("sieu cung") || flex.includes("extra") ? 1
      : flex.includes("cung") || flex.includes("stiff") ? 0.75
      : flex.includes("trung binh") || flex.includes("medium") ? 0.4
      : flex.includes("deo") || flex.includes("flex") ? 0 : null,
    len: Number.isFinite(length) && length > 600 ? Math.max(0, Math.min(1, (length - 665) / 15)) : null,
    g: grip ? Math.max(0, Math.min(1, (Number(grip) - 4) / 3)) : null,
    t: Number.isFinite(tension) && tension > 15 ? Math.max(0, Math.min(1, (tension - 24) / 11)) : null,
    q: !material ? null
      : material.includes("high carbon") || material.includes("hm") || material.includes("nano") ? 1
      : material.includes("graphite") || material.includes("carbon") ? 0.75
      : material.includes("nhom") || material.includes("thep") || material.includes("alu") ? 0.25 : 0.5,
  }
}

/** Count of the 7 racket specs a listing provides. */
export function racketSpecsKnown(specs: { label: string; value: string }[] | null | undefined) {
  const a = attrs(Object.fromEntries((specs ?? []).map((s) => [s.label, s.value])))
  return Object.values(a).filter((v) => v !== null).length
}

/**
 * Trả null nếu thiếu thông số (dưới 3/7). Mỗi trục chỉ tính từ các thông số
 * đã có (trọng số chia lại); trục mà phần thông số có được chiếm dưới một nửa
 * trọng số thì để null để biểu đồ ghi "Chưa đủ dữ liệu" thay vì đoán.
 */
export function racketRadar(specs: { label: string; value: string }[] | null | undefined): RacketRadar | null {
  const spec = Object.fromEntries((specs ?? []).map((s) => [s.label, s.value]))
  const a = attrs(spec)
  const known = Object.values(a).filter((v) => v !== null).length
  if (known < 3) return null
  const mid = (x: number, center: number) => 1 - Math.min(1, Math.abs(x - center) * 2)
  type Term = [weight: number, value: number | null, map?: (x: number) => number]
  const axis = (terms: Term[]) => {
    const total = terms.reduce((sum, [w]) => sum + w, 0)
    const present = terms.filter(([, value]) => value !== null)
    const share = present.reduce((sum, [w]) => sum + w, 0)
    if (share / total < 0.5) return null
    const raw = present.reduce((sum, [w, value, map]) => sum + w * (map ? map(value!) : value!), 0) / share
    return Math.round(Math.max(0, Math.min(1, raw)) * 100)
  }
  const inv = (x: number) => 1 - x
  return {
    known,
    brand: spec["Thương hiệu"] ?? null,
    axes: {
      power: axis([[0.35, a.b], [0.25, a.f], [0.2, a.w], [0.1, a.len], [0.1, a.q]]),
      speed: axis([[0.4, a.b, inv], [0.35, a.w, inv], [0.15, a.len, inv], [0.1, a.g]]),
      control: axis([[0.3, a.b, (x) => mid(x, 0.5)], [0.25, a.f, (x) => mid(x, 0.55)], [0.2, a.g], [0.15, a.q], [0.1, a.len, inv]]),
      defense: axis([[0.5, a.b, inv], [0.3, a.w, inv], [0.2, a.g]]),
      stability: axis([[0.35, a.w], [0.3, a.f], [0.2, a.q], [0.15, a.b]]),
      ease: axis([[0.4, a.f, inv], [0.25, a.b, (x) => mid(x, 0.5)], [0.2, a.w, inv], [0.15, a.t, inv]]),
    },
  }
}

export type RacketFit = { score: number; pros: string[]; cons: string[]; needs: Record<RacketAxis, number> }

const AXIS_LABEL = Object.fromEntries(RACKET_AXES.map((a) => [a.id, a.label])) as Record<RacketAxis, string>

/** Độ tương thích = 100 − khoảng cách có trọng số giữa "vợt người chơi cần" và mạng nhện vợt. */
export function racketFit(player: RadarPoint[], racket: RacketRadar, playstyle?: "attack" | "defense" | "allround"): RacketFit | null {
  const p = (id: string) => player.find((x) => x.id === id)?.value ?? null
  const known = player.filter((x) => x.value !== null).length
  if (known < 3) return null
  const n = (id: string) => p(id) ?? 50
  const c = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
  // Nhu cầu = phong cách (tấn công ↔ phòng thủ, quanh mốc 50) + năng lực (người giỏi chịu được vợt khó hơn).
  // Không phải "càng giỏi càng cần cao mọi trục": vợt nào cũng đánh đổi giữa các trục.
  // Trục người chơi là bộ trục chuẩn SportDNA (Đập cầu, Lưới, Phòng thủ, Di chuyển, Chiến thuật…).
  const ability = (n("smash") + n("movement") + n("net") + n("defense") + n("tactics")) / 5
  const style = n("smash") - n("defense")
  const needs: Record<RacketAxis, number> = {
    power: c(50 + style * 0.6 + (n("smash") - 50) * 0.4),
    speed: c(50 - style * 0.4 + (n("net") - 50) * 0.3 + (n("movement") - 50) * 0.2),
    control: c(45 + (n("tactics") - 50) * 0.6 + (ability - 50) * 0.3),
    defense: c(50 - style * 0.6 + (n("net") - 50) * 0.3),
    stability: c(40 + (n("smash") - 50) * 0.6 + (ability - 50) * 0.3),
    ease: c(100 - ability, 15, 85),
  }
  if (playstyle === "attack") { needs.power = Math.min(100, needs.power + 15); needs.defense = Math.max(0, needs.defense - 10) }
  if (playstyle === "defense") { needs.defense = Math.min(100, needs.defense + 15); needs.speed = Math.min(100, needs.speed + 10); needs.power = Math.max(0, needs.power - 10) }
  const WEIGHT: Record<RacketAxis, number> = { power: 1.2, speed: 1, control: 1, defense: 0.9, stability: 0.7, ease: 1.2 }
  let dist = 0
  let total = 0
  const gaps: { id: RacketAxis; gap: number }[] = []
  for (const { id } of RACKET_AXES) {
    const value = racket.axes[id]
    // Axes the seller's specs can't support don't count either way.
    if (value === null) continue
    // Vợt "dư" một chút so với nhu cầu ít hại hơn vợt "thiếu", trừ trục Dễ chơi (thiếu dễ chơi mới là vấn đề).
    const raw = value - needs[id]
    const gap = raw > 0 && id !== "power" ? raw * 0.6 : Math.abs(raw)
    gaps.push({ id, gap: raw })
    dist += gap * WEIGHT[id]
    total += WEIGHT[id]
  }
  let score = total ? 100 - (dist / total) * 1.6 : 70
  const cons: string[] = []
  // Thân cứng/nặng đầu mà lực còn yếu: phạt thêm.
  if ((racket.axes.power ?? 0) >= 70 && n("smash") < 45) {
    score -= 12
    cons.push("Vợt thiên lực đập, đòi hỏi sức mạnh cổ tay cao hơn hồ sơ hiện tại.")
  }
  const sorted = [...gaps].sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap))
  const pros = sorted.slice(0, 2).filter((g) => Math.abs(g.gap) <= 15).map((g) => `${AXIS_LABEL[g.id]} của vợt khớp với nhu cầu của bạn.`)
  // "Dư" chỉ đáng lưu ý ở Lực đập/Ổn định (vợt khó chơi hơn); các trục khác chỉ báo khi thiếu.
  for (const g of [...sorted].reverse()) {
    if (cons.length >= 3 || Math.abs(g.gap) <= 20) continue
    if (g.gap < 0) cons.push(`${AXIS_LABEL[g.id]} thấp hơn mức bạn cần.`)
    else if (g.id === "power" || g.id === "stability") cons.push(`${AXIS_LABEL[g.id]} cao hơn mức bạn cần, vợt sẽ khó điều khiển hơn.`)
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), pros, cons: cons.slice(0, 3), needs }
}
