import test from "node:test"
import assert from "node:assert/strict"
import * as config from "../src/lib/rating/ratingConfig.ts"
import * as engine from "../src/lib/rating/ratingEngine.ts"
import { FARM_WINDOW_DAYS as closeFarmWindow } from "../src/lib/rating/tournamentClose.ts"
import { resolveSkillTier } from "../src/lib/sportdna.ts"
import { SKILL_TIERS, skillTierOf } from "../src/app/(frontend)/sportdna/_components/data.ts"

const { RATING_TIERS } = config

test("hằng GIẢ ĐỊNH của engine nằm trong ratingConfig với đúng giá trị cũ", () => {
  assert.deepEqual({ ...config.K_BASE }, { friendly: 10, community: 24, official: 32 })
  assert.equal(config.PROVISIONAL_K_MULTIPLIER, 2)
  assert.equal(config.PROVISIONAL_MATCHES, 10)
  assert.equal(config.PROVISIONAL_GROWTH_CAP, 400)
  assert.equal(config.TOURNAMENT_DELTA_CAP, 80)
  assert.deepEqual(config.CAP_CONFIG, { cap1: 1199, cap2Margin: 200, v3ToRemove: 5, v2For1: 10, opp1: 3, v2For2: 20, opp2: 5 })
  assert.deepEqual({ ...config.N_EFF_WEIGHTS }, { v1: 0.2, v2: 0.5, v3: 1.0 })
  assert.equal(config.BLEND_SATURATION, 10)
  assert.equal(config.FARM_MIN_PRIOR_MEETINGS, 2)
  assert.equal(config.FARM_WINDOW_DAYS, 30)
  assert.equal(config.DRIFT_THRESHOLD, 50)
  assert.equal(config.DRIFT_TARGET_MEAN, 1000)
  assert.equal(config.PROCESSING_LOCK_STALE_MS, 10 * 60 * 1000)
})

test("engine và tournamentClose dùng chung một đối tượng hằng từ config", () => {
  assert.equal(engine.K_BASE, config.K_BASE)
  assert.equal(engine.CAP_CONFIG, config.CAP_CONFIG)
  assert.equal(closeFarmWindow, config.FARM_WINDOW_DAYS)
  const fresh = { id: "a", mr: 1000, matchesPlayed: config.PROVISIONAL_MATCHES - 1, mrGainFirst10: 0 }
  const settled = { ...fresh, matchesPlayed: config.PROVISIONAL_MATCHES }
  assert.equal(engine.kFor(fresh, "official"), config.K_BASE.official * config.PROVISIONAL_K_MULTIPLIER)
  assert.equal(engine.kFor(settled, "official"), config.K_BASE.official)
  assert.deepEqual(engine.applyTournamentCap({ a: 500, b: -500 }), { a: config.TOURNAMENT_DELTA_CAP, b: -config.TOURNAMENT_DELTA_CAP })
})

test("bậc quiz (resolveSkillTier) lấy tên và ranh giới từ RATING_TIERS, giữ id cũ theo thứ tự", () => {
  const legacy = ["tier_0_new", "tier_1_beginner", "tier_2_below_avg", "tier_3_average", "tier_4_above_avg", "tier_5_good", "tier_6_very_good", "tier_7_semi_pro", "tier_8_pro", "tier_9_elite"]
  RATING_TIERS.forEach((tier, i) => {
    const probe = tier.min ?? 500
    const got = resolveSkillTier(probe)
    assert.equal(got.id, legacy[i], `${tier.id} → ${legacy[i]}`)
    assert.equal(got.label, tier.name)
    assert.equal(config.resolveRatingTier(probe).id, tier.id, "quiz và MR cho cùng một bậc")
    if (tier.min !== null) assert.equal(resolveSkillTier(tier.min - 0.5).id, legacy[i - 1], "cận dưới thuộc bậc này, ngay dưới thuộc bậc trước")
    assert.equal(got.nextLabel, RATING_TIERS[i + 1]?.name ?? null)
  })
  assert.equal(resolveSkillTier(999.6).id, "tier_1_beginner")
  assert.equal(resolveSkillTier(1000).eloToNext, 200)
  assert.equal(resolveSkillTier(1100).progress, 0.5)
})

test("bảng bậc mockup v133 khớp bảng chuẩn", () => {
  assert.equal(SKILL_TIERS.length, RATING_TIERS.length)
  SKILL_TIERS.forEach((tier, i) => {
    assert.equal(tier.label, RATING_TIERS[i].name)
    assert.equal(tier.min, RATING_TIERS[i].min ?? 0)
    assert.equal(tier.max, RATING_TIERS[i].max)
  })
  assert.equal(skillTierOf(1240).label, "Trung bình khá")
})
