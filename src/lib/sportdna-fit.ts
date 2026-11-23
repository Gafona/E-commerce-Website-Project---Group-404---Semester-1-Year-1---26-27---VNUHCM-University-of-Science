// Shared equipment-fit scorer for both sports (one function, parameterised by sport).
// Football boots with the wrong stud type for the player's surface are excluded (no %).
// Rackets that don't suit the player's string tension or grip lose points, with a reason.
import type { DnaProduct, EquipmentFit, EquipmentPreferences } from "./sportdna"
import type { CoreContext } from "./sportdna-core"
import type { CoreSport } from "./sportdna-core-bank"

export type FitReason = { good: boolean; vi: string; en: string }
export type PlayerSignal = { axes: Record<string, number>; context: CoreContext }

const SURFACE: Record<string, { vi: string; en: string }> = {
  ag: { vi: "AG (cỏ nhân tạo)", en: "AG (artificial grass)" },
  fg: { vi: "FG (cỏ tự nhiên)", en: "FG (natural grass)" },
  ic: { vi: "IC (sân trong nhà)", en: "IC (indoor)" },
  indoor: { vi: "IC (sân trong nhà)", en: "IC (indoor)" },
}
const sameSurface = (a: string, b: string) => (a === "indoor" ? "ic" : a) === (b === "indoor" ? "ic" : b)

export const fitLabelOf = (score: number): { vi: EquipmentFit["label"]; en: string } =>
  score >= 85 ? { vi: "Rất phù hợp", en: "Excellent fit" } : score >= 70 ? { vi: "Phù hợp", en: "Good fit" } : score >= 50 ? { vi: "Cân nhắc", en: "Consider" } : { vi: "Không phù hợp", en: "Poor fit" }

/** Handle size from seller specs ("Chu vi cán: G5", "Grip G4"...). */
export function gripOf(specs: DnaProduct["specs"]) {
  for (const s of specs ?? []) {
    if (!/cán|grip/i.test(s.label)) continue
    const m = /G\s?([4-6])/i.exec(s.value)
    if (m) return `G${m[1]}` as "G4" | "G5" | "G6"
  }
  return null
}

export function equipmentFit(sport: CoreSport, product: DnaProduct, player: PlayerSignal, prefs: EquipmentPreferences = {}): EquipmentFit | null {
  if (product.sport !== sport) return null
  const eq = product.equipment
  const grip = gripOf(product.specs)
  const evidence = [eq.surface, eq.balance, eq.shaftFlex, eq.weightClass, eq.maxTensionLbs, eq.footWidth, grip].some((v) => v !== null && v !== undefined)
  if (!evidence) return null
  const reasons: FitReason[] = []
  const add = (good: boolean, vi: string, en: string) => reasons.push({ good, vi, en })
  const axis = (id: string) => player.axes[id] ?? 50

  if (eq.kind === "football_shoes") {
    const surface = prefs.footballSurface ?? player.context.surface
    if (surface && eq.surface && eq.surface !== "multi" && !sameSurface(eq.surface, surface)) {
      const r: FitReason = {
        good: false,
        vi: `Giày đinh ${SURFACE[eq.surface]?.vi ?? eq.surface} không hợp mặt sân ${SURFACE[surface].vi} bạn chơi: loại khỏi gợi ý.`,
        en: `${SURFACE[eq.surface]?.en ?? eq.surface} studs don't suit the ${SURFACE[surface].en} surface you play on: excluded.`,
      }
      return { score: 0, label: "Không phù hợp", labelEn: "Not suitable", hardFail: true, pros: [], cons: [r.vi], reasons: [r], source: "core" }
    }
  }

  let score = 72
  if (sport === "badminton" && eq.kind === "badminton_racket") {
    const power = axis("smash")
    const reflex = axis("defense")
    const style = prefs.badmintonPlaystyle ?? player.context.style
    if (eq.shaftFlex === "stiff" || eq.shaftFlex === "extra_stiff") {
      if (power < 45) {
        score -= eq.shaftFlex === "extra_stiff" ? 28 : 16
        add(false, "Thân vợt cứng cần lực cổ tay mạnh hơn điểm Đập cầu hiện tại của bạn.", "A stiff shaft needs more wrist power than your current Smash score.")
      } else if (power >= 65) {
        score += 12
        add(true, "Độ cứng thân vợt hợp với lực đập của bạn.", "The stiff shaft suits your smash power.")
      }
    }
    if (eq.shaftFlex === "flexible" && power < 50) {
      score += 12
      add(true, "Thân vợt dẻo giúp tạo lực khi lực đập còn đang phát triển.", "A flexible shaft helps you generate power while your smash develops.")
    }
    if (eq.balance === "head_heavy") {
      if (style === "attack") {
        score += 12
        add(true, "Nặng đầu hỗ trợ lối chơi tấn công của bạn.", "Head-heavy balance supports your attacking style.")
      } else if (style === "defense") {
        score -= 15
        add(false, "Nặng đầu không tối ưu cho lối chơi phòng thủ, phản tạt.", "Head-heavy balance isn't ideal for defensive, counter-hitting play.")
      }
      if (reflex < 45) {
        score -= 8
        add(false, "Đầu vợt nặng có thể làm chậm phản xạ phòng thủ của bạn.", "A heavy head may slow your defensive reactions.")
      }
    }
    if (eq.balance === "head_light" && style === "defense") {
      score += 12
      add(true, "Nhẹ đầu giúp xoay trở và phản tạt nhanh.", "Head-light balance helps quick defence and counters.")
    }
    if (eq.weightClass === "4U" || eq.weightClass === "5U") {
      score += 4
      add(true, `${eq.weightClass} là mức trọng lượng dễ kiểm soát.`, `${eq.weightClass} is an easy weight to control.`)
    }
    if (prefs.stringTensionLbs && eq.maxTensionLbs) {
      if (prefs.stringTensionLbs > eq.maxTensionLbs) {
        score -= 25
        add(false, `Bạn quen căng ${prefs.stringTensionLbs} lbs, vượt giới hạn ${eq.maxTensionLbs} lbs của khung vợt (−25).`, `You string at ${prefs.stringTensionLbs} lbs, above this frame's ${eq.maxTensionLbs} lbs limit (−25).`)
      } else {
        add(true, `Khung chịu được mức căng ${prefs.stringTensionLbs} lbs bạn dùng.`, `The frame handles your ${prefs.stringTensionLbs} lbs tension.`)
      }
    }
    if (prefs.gripSize && grip && prefs.gripSize !== grip) {
      score -= 10
      add(false, `Cán ${grip} khác cỡ ${prefs.gripSize} bạn quen cầm (−10).`, `${grip} handle differs from the ${prefs.gripSize} you're used to (−10).`)
    }
  }

  if (eq.kind === "football_shoes" || eq.kind === "badminton_shoes") {
    const shape = sport === "football" ? (prefs.footballFootShape ?? prefs.footShape) : prefs.footShape
    if (eq.kind === "football_shoes" && eq.surface) {
      score += 6
      add(true, `Đinh ${SURFACE[eq.surface]?.vi ?? eq.surface} dùng được cho mặt sân của bạn.`, `${SURFACE[eq.surface]?.en ?? eq.surface} studs work on your surface.`)
    }
    if (shape && eq.footWidth) {
      if (shape === "wide" && eq.footWidth === "narrow") {
        score -= 30
        add(false, "Form giày thon không hợp bàn chân bè.", "A narrow last doesn't suit a wide foot.")
      } else if (shape === "narrow" && eq.footWidth === "wide") {
        score -= 12
        add(false, "Form giày bè có thể lỏng với bàn chân thon.", "A wide last may feel loose on a narrow foot.")
      } else if (shape === eq.footWidth) {
        score += 10
        add(true, "Form giày khớp dáng bàn chân của bạn.", "The last matches your foot shape.")
      }
    }
    if (sport === "football" && axis("speed") >= 70 && eq.weightClass === null) {
      add(true, "Tốc độ là thế mạnh: ưu tiên giày nhẹ, ôm chân.", "Speed is your strength: favour light, snug boots.")
    }
  }

  if (sport === "football" && eq.kind === "football_ball") {
    const surface = prefs.footballSurface ?? player.context.surface
    if (surface && eq.surface && eq.surface !== "multi") {
      if (sameSurface(eq.surface, surface)) {
        score += 10
        add(true, `Bóng làm cho mặt sân ${SURFACE[surface].vi} bạn hay chơi.`, `Made for the ${SURFACE[surface].en} surface you play on.`)
      } else {
        score -= 15
        add(false, `Bóng tối ưu cho ${SURFACE[eq.surface]?.vi ?? eq.surface}, khác mặt sân ${SURFACE[surface].vi} bạn chơi.`, `Built for ${SURFACE[eq.surface]?.en ?? eq.surface}, not the ${SURFACE[surface].en} surface you play on.`)
      }
    }
  }

  const budget = sport === "football" ? (prefs.footballBudget ?? prefs.budget) : prefs.budget
  if (budget && budget > 0) {
    if (product.price <= budget) {
      score += 6
      add(true, "Nằm trong ngân sách của bạn.", "Within your budget.")
    } else if (product.price <= budget * 1.25) {
      score -= 6
      add(false, "Cao hơn ngân sách một chút.", "Slightly over your budget.")
    } else {
      score -= 18
      add(false, "Vượt đáng kể ngân sách đã đặt.", "Well over your budget.")
    }
  }
  if (!reasons.length) add(true, "Không thấy xung đột với hồ sơ SportDNA của bạn.", "No conflicts with your SportDNA profile.")
  const final = Math.max(0, Math.min(100, Math.round(score)))
  const label = fitLabelOf(final)
  return {
    score: final,
    label: label.vi,
    labelEn: label.en,
    hardFail: false,
    pros: reasons.filter((r) => r.good).map((r) => r.vi).slice(0, 3),
    cons: reasons.filter((r) => !r.good).map((r) => r.vi).slice(0, 3),
    reasons: [...reasons.filter((r) => !r.good), ...reasons.filter((r) => r.good)].slice(0, 5),
    source: "core",
  }
}
