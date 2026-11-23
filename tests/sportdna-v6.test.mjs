import assert from "node:assert/strict"
import test from "node:test"
import {
  calculateAchievementPoints,
  calculateEquipmentFit,
  mergeDiagnosticProfiles,
  resolveSkillTier,
  toDnaProduct,
} from "../src/lib/sportdna.ts"
import { scoreAssessment } from "../src/lib/sportdna-assessment.ts"

// Kết quả kỹ năng cầu lông từ SportDNA hiện tại (8 câu thể chất cùng một mức).
const badmintonSkill = (level) =>
  scoreAssessment({ mode: "quick", quiz: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`q${i}`, level])), rounds: [] })
const footballSkill = () => ({ ...badmintonSkill(2), sport: "football" })

test("tier boundaries include their lower bound", () => {
  // E1b: ranh giới theo RATING_TIERS (800/1000/…/2400).
  assert.equal(resolveSkillTier(1000).id, "tier_2_below_avg")
  assert.equal(resolveSkillTier(2400).id, "tier_9_elite")
})

test("same rank at a higher competition level earns more AP", () => {
  const common = { rank: 2, fieldSize: 16, participation: 1, daysAgo: 0 }
  assert.ok(
    calculateAchievementPoints({ ...common, level: "national" }) >
      calculateAchievementPoints({ ...common, level: "club" }),
  )
})

test("same competition level with a larger field earns more AP", () => {
  const common = { rank: 1, level: "provincial", participation: 1, daysAgo: 0 }
  assert.ok(
    calculateAchievementPoints({ ...common, fieldSize: 64 }) >
      calculateAchievementPoints({ ...common, fieldSize: 4 }),
  )
})

test("a starter earns more than a named substitute", () => {
  const common = { rank: 1, fieldSize: 12, level: "national", daysAgo: 0 }
  assert.ok(
    calculateAchievementPoints({ ...common, participation: 1 }) >
      calculateAchievementPoints({ ...common, participation: 0.2 }),
  )
})

test("duplicate achievements are progressively discounted", () => {
  const common = {
    rank: 1,
    fieldSize: 12,
    level: "national",
    participation: 1,
    daysAgo: 0,
  }
  const first = calculateAchievementPoints({ ...common, duplicateIndex: 0 })
  assert.ok(
    first > calculateAchievementPoints({ ...common, duplicateIndex: 1 }),
  )
  assert.ok(
    calculateAchievementPoints({ ...common, duplicateIndex: 2 }) >
      calculateAchievementPoints({ ...common, duplicateIndex: 3 }),
  )
})

test("career source data remains scoreable even when recency lowers current AP", () => {
  const common = {
    rank: 1,
    fieldSize: 20,
    level: "provincial",
    participation: 1,
  }
  const current = calculateAchievementPoints({ ...common, daysAgo: 0 })
  const old = calculateAchievementPoints({ ...common, daysAgo: 1460 })
  assert.ok(current > old)
  assert.ok(old > 0)
})

const product = (equipment) => ({
  id: "test-product",
  name: "Thiết bị thử nghiệm",
  sport: equipment.kind === "football_shoes" ? "football" : "badminton",
  category: "Thiết bị",
  price: 2000000,
  match: 80,
  text: "",
  equipment: {
    kind: "accessory",
    surface: null,
    balance: null,
    shaftFlex: null,
    weightClass: null,
    maxTensionLbs: null,
    footWidth: null,
    ...equipment,
  },
})

test("football surface mismatch is a hard Equipment Fit failure", () => {
  const skill = footballSkill()
  const fit = calculateEquipmentFit(
    product({ kind: "football_shoes", surface: "fg" }),
    skill,
    { footballSurface: "ag" },
  )
  assert.equal(fit.score, 0)
  assert.equal(fit.hardFail, true)
})

// Rule change (SportDNA chuyên sâu): a racket that can't take the player's tension
// is no longer excluded; it loses exactly 25 points and says why.
test("string tension over the racket maximum costs 25 points with the reason", () => {
  const skill = badmintonSkill(2)
  const racket = product({ kind: "badminton_racket", maxTensionLbs: 26 })
  const base = calculateEquipmentFit(racket, skill, { stringTensionLbs: 24 })
  const fit = calculateEquipmentFit(racket, skill, { stringTensionLbs: 28 })
  assert.equal(fit.hardFail, false)
  assert.equal(fit.score, Math.max(0, base.score - 25))
  assert.ok(fit.cons.some((reason) => /vượt giới hạn/.test(reason) && /−25/.test(reason)))
})

test("skill tier is context and never a hard Equipment Fit filter", () => {
  const beginner = badmintonSkill(0)
  const fit = calculateEquipmentFit(
    product({
      kind: "badminton_racket",
      shaftFlex: "extra_stiff",
      weightClass: "4U",
    }),
    beginner,
    {},
  )
  assert.ok(fit.score > 0)
  assert.equal(fit.hardFail, false)
})

test("Equipment Fit stays unknown without assessment or product evidence", () => {
  const skill = badmintonSkill(2)
  assert.equal(
    calculateEquipmentFit(product({ kind: "badminton_racket" }), null, {}),
    null,
  )
  assert.equal(
    calculateEquipmentFit(product({ kind: "badminton_racket" }), skill, {}),
    null,
  )
})

test("Equipment Fit applies technique, playstyle, body, and budget as 40/30/20/10", () => {
  const skill = badmintonSkill(2)
  const withPower = {
    ...skill,
    radar: skill.radar.map((axis) =>
      axis.id === "power" ? { ...axis, display: 70 } : axis,
    ),
  }
  const baseline = calculateEquipmentFit(
    product({ kind: "badminton_racket", weightClass: "3U" }),
    withPower,
    {},
  )
  const technique = calculateEquipmentFit(
    product({
      kind: "badminton_racket",
      shaftFlex: "stiff",
      weightClass: "3U",
    }),
    withPower,
    {},
  )
  const playstyle = calculateEquipmentFit(
    product({
      kind: "badminton_racket",
      balance: "head_heavy",
      weightClass: "3U",
    }),
    withPower,
    { badmintonPlaystyle: "attack" },
  )
  const body = calculateEquipmentFit(
    product({ kind: "badminton_racket", weightClass: "4U" }),
    withPower,
    {},
  )
  const budget = calculateEquipmentFit(
    product({ kind: "badminton_racket", weightClass: "3U" }),
    withPower,
    { budget: 2000000 },
  )
  assert.equal(baseline.score, 72)
  assert.equal(technique.score, 77)
  assert.equal(playstyle.score, 79)
  assert.equal(body.score, 74)
  assert.equal(budget.score, 75)
})

test("structured equipment fields take precedence over free-form specs", () => {
  const parsed = toDnaProduct({
    id: "structured-product",
    name: "Vợt có cấu hình",
    slug: "vot-co-cau-hinh",
    sport: "badminton",
    category: "Vợt cầu lông",
    price: 2000000,
    originalPrice: null,
    shortDescription: null,
    description: null,
    badge: null,
    colors: [],
    sizes: [],
    specs: [{ label: "Độ cứng", value: "Extra Stiff" }],
    features: [],
    match: 80,
    stock: 1,
    equipmentProfile: {
      kind: "badminton_racket",
      shaftFlex: "flexible",
    },
  })
  assert.equal(parsed.equipment.shaftFlex, "flexible")
})

test("cross-device merge keeps the newest result for each sport and mode", () => {
  const older = badmintonSkill(0)
  const newer = badmintonSkill(3)
  older.answeredAt = "2025-01-01T00:00:00.000Z"
  newer.answeredAt = "2026-01-01T00:00:00.000Z"
  const merged = mergeDiagnosticProfiles({ badminton: { quick: older } }, {
    badminton: { quick: newer },
  })
  assert.equal(merged.badminton.quick.overall, newer.overall)
})
