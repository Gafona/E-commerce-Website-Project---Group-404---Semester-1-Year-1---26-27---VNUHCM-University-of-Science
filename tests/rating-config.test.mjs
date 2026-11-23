import test from "node:test"
import assert from "node:assert/strict"
import { resolveRatingTier } from "../src/lib/rating/ratingConfig.ts"
import {
  calculateBlendedRating,
  countUniqueOpponents,
} from "../src/lib/rating/ratingEngine.ts"

const cases = [
  [799, "tier_1", "gray"],
  [800, "tier_2", "gray"],
  [999, "tier_2", "gray"],
  [1000, "tier_3", "gray"],
  [1199, "tier_3", "gray"],
  [1200, "tier_4", "green"],
  [1599, "tier_5", "green"],
  [1600, "tier_6", "orange"],
  [2399, "tier_9", "red"],
  [2400, "tier_10", "purple"],
]

for (const [br, id, color] of cases) {
  test(`BR ${br} → ${id} (${color})`, () => {
    const tier = resolveRatingTier(br)
    assert.equal(tier.id, id)
    assert.equal(tier.color, color)
    assert.ok(tier.progress >= 0 && tier.progress <= 1)
  })
}

test("progress tại cận dưới = 0, cận trên = 1 của bậc có hai đầu", () => {
  assert.equal(resolveRatingTier(1000).progress, 0)
  assert.equal(resolveRatingTier(1199).progress, 1)
})

test("bậc cuối có progress = 0", () => {
  assert.equal(resolveRatingTier(2400).progress, 0)
  assert.equal(resolveRatingTier(3500).progress, 0)
})

test("bậc đầu kẹp progress trong [0, 1]", () => {
  assert.equal(resolveRatingTier(-500).progress, 0)
  assert.equal(resolveRatingTier(799).progress, 1)
})

test("BR số thực sát ranh giới giữ bậc dưới", () => {
  assert.equal(resolveRatingTier(999.6).id, "tier_2")
})

// Bước 0 (E7): BR số thực nằm giữa cận trên trong bảng và cận dưới của bậc kế.
for (const [br, id] of [
  [1199.6, "tier_3"],
  [1599.9, "tier_5"],
  [2399.9, "tier_9"],
]) {
  test(`bước 0: BR ${br} → ${id}, progress trong [0, 1]`, () => {
    const tier = resolveRatingTier(br)
    assert.equal(tier.id, id)
    assert.ok(tier.progress >= 0 && tier.progress <= 1)
  })
}

test("tích hợp: 3 đối thủ V2 cùng deviceId không gỡ trần 1 dù đủ 10 trận V2", () => {
  const players = {
    target: { deviceId: "T" },
    alt1: { deviceId: "SAME" },
    alt2: { deviceId: "SAME" },
    alt3: { deviceId: "SAME" },
  }
  const opponents = ["alt1", "alt2", "alt3"]
  const matches = Array.from({ length: 10 }, (_, i) => ({
    matchId: `m${i}`,
    matchType: "community",
    date: new Date(Date.UTC(2026, 10, 1 + i)),
    teamA: ["target"],
    teamB: [opponents[i % 3]],
    isVerified: true,
    isAdminVerified: true,
    isWalkover: false,
    isKZero: false,
  }))
  const unique = countUniqueOpponents(matches, "target", "community", players)
  assert.equal(unique, 1)
  const result = calculateBlendedRating({
    ar: 1500,
    mr: 1500,
    v1: 0,
    v2: 10,
    v3: 0,
    uniqueV2Opponents: unique,
  })
  assert.ok(result.activeCaps.includes("cap1_1199"))
  assert.equal(result.br, 1199)
})
