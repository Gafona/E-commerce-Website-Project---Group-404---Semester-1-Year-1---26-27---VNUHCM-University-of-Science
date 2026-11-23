import test from "node:test"
import assert from "node:assert/strict"
import {
  ASSESSMENT_SCHEMA,
  DEFENSE_TEMPLATES,
  QUIZ,
  TARGET_ZONES,
  parseAssessmentInput,
  scoreAssessment,
  scoreRound,
} from "../src/lib/sportdna-assessment.ts"

const allQuiz = (level) => Object.fromEntries(QUIZ.map((q) => [q.id, level]))
const zones = Object.keys(TARGET_ZONES)
// Ô điểm rơi tốt nhất cho một động tác ở một họ phòng thủ
const bestZone = (code, variant, action) =>
  zones.reduce((best, zone) => {
    const s = scoreRound({ code, variant, action, zone }).S
    return s > best.s ? { zone, s } : best
  }, { zone: zones[0], s: -1 }).zone

test("quiz thể chất chấm 4 trục, trả lời tốt hơn thì điểm cao hơn", () => {
  const low = scoreAssessment({ mode: "quick", quiz: allQuiz(0), rounds: [] })
  const high = scoreAssessment({ mode: "quick", quiz: allQuiz(3), rounds: [] })
  for (const key of ["power", "speed", "endurance", "balance"]) assert.ok(high.skillRatings[key] > low.skillRatings[key], key)
  assert.ok(high.overall > low.overall)
  assert.equal(high.schemaVersion, ASSESSMENT_SCHEMA)
  assert.equal(high.sport, "badminton")
  assert.equal(high.mode, "quick")
  assert.equal(high.tier.provisional, true)
})

test("Quick chỉ có quiz: trục tình huống hiện 'chưa đủ dữ liệu', không bịa số", () => {
  const r = scoreAssessment({ mode: "quick", quiz: allQuiz(2), rounds: [] })
  for (const id of ["reflex", "technique", "control", "tactics"]) {
    const axis = r.radar.find((a) => a.id === id)
    assert.equal(axis.status, "insufficient_data")
    assert.equal(axis.display, null)
  }
  assert.equal(r.radar.find((a) => a.id === "power").status, "ok")
  assert.equal(r.radar.length, 8)
})

test("tình huống phòng thủ: đáp án đúng + ô tốt nhất ăn điểm hơn cú bẫy", () => {
  for (const tp of DEFENSE_TEMPLATES)
    for (const variant of ["V1", "V2"]) {
      const good = scoreRound({ code: tp.code, variant, action: tp.defense.canonical, zone: bestZone(tp.code, variant, tp.defense.canonical) })
      const trap = scoreRound({ code: tp.code, variant, action: tp.defense.trap.action, zone: bestZone(tp.code, variant, tp.defense.trap.action) })
      assert.equal(good.scored, true)
      assert.equal(good.verdict, "canonical")
      assert.equal(trap.verdict, "trap")
      assert.ok(good.S > trap.S, `${tp.code}-${variant}: ${good.S} vs ${trap.S}`)
    }
})

test("Deep: chơi đúng toàn bộ phòng thủ cho rating tình huống cao hơn chơi bẫy", () => {
  const rounds = (pick) =>
    DEFENSE_TEMPLATES.flatMap((tp) =>
      ["V1", "V2"].map((variant) => {
        const action = pick(tp)
        return { code: tp.code, variant, action, zone: bestZone(tp.code, variant, action) }
      }),
    )
  const good = scoreAssessment({ mode: "deep", quiz: {}, rounds: rounds((tp) => tp.defense.canonical) })
  const bad = scoreAssessment({ mode: "deep", quiz: {}, rounds: rounds((tp) => tp.defense.trap.action) })
  for (const key of ["tactical_rating", "shot_selection_rating", "target_selection_rating", "defensive_reading_rating"])
    assert.ok(good.skillRatings[key] > bad.skillRatings[key], key)
  assert.equal(good.scoredRounds, 16)
  assert.equal(good.mode, "deep")
  assert.equal(good.radar.find((a) => a.id === "reflex").status, "ok")
})

test("tình huống B01–B10 được ghi nhận nhưng chưa tính điểm", () => {
  const r = scoreAssessment({ mode: "retest", quiz: {}, rounds: [{ code: "B01", variant: "V1", action: "smash", zone: "back_left" }] })
  assert.equal(r.scoredRounds, 0)
  assert.equal(r.totalRounds, 1)
  assert.equal(r.mode, "deep")
  assert.equal(r.assessmentMode, "retest")
})

test("parseAssessmentInput lọc dữ liệu không hợp lệ", () => {
  assert.equal(parseAssessmentInput(null), null)
  assert.equal(parseAssessmentInput({ mode: "hack", quiz: allQuiz(3) }), null)
  assert.equal(parseAssessmentInput({ mode: "quick", quiz: { q1: 9, x: 3 }, rounds: [] }), null)
  const parsed = parseAssessmentInput({
    mode: "deep",
    quiz: { q1: 3, q2: 1.5, evil: 3 },
    rounds: [
      { code: "DF1", variant: "V1", action: "block", zone: "net_left" },
      { code: "DF1", variant: "V3", action: "block", zone: "net_left" },
      { code: "DF1", variant: "V1", action: "serve_long", zone: "net_left" },
      { code: "ZZ9", variant: "V1", action: "block", zone: "net_left" },
      { code: "DF1", variant: "V1", action: "block", zone: "outside" },
    ],
  })
  assert.deepEqual(parsed, { mode: "deep", quiz: { q1: 3 }, rounds: [{ code: "DF1", variant: "V1", action: "block", zone: "net_left" }] })
})
