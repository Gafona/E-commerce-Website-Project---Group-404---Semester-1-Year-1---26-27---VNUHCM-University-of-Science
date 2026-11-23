import assert from "node:assert/strict"
import test from "node:test"
import { AXES, bankFor } from "../src/lib/sportdna-core-bank.ts"
import {
  findContradictions,
  optionOrder,
  parseCoreAnswers,
  performanceRating,
  RETAKE_WEIGHT,
  scoreCore,
  tierFor,
} from "../src/lib/sportdna-core.ts"

const SPORTS = ["badminton", "football"]
// Index of the option with the highest / lowest score for every question.
const pick = (sport, best) =>
  Object.fromEntries(
    bankFor(sport).map((q) => {
      const scores = q.options.map((o) => o.score)
      const target = best ? Math.max(...scores) : Math.min(...scores)
      return [q.id, scores.indexOf(target)]
    }),
  )

test("both sports have the same structure: 18 situations, 6 per group, every axis measured twice", () => {
  for (const sport of SPORTS) {
    const bank = bankFor(sport)
    assert.equal(bank.length, 18, sport)
    for (const group of ["technique", "tactics", "physical"]) assert.equal(bank.filter((q) => q.group === group).length, 6, `${sport} ${group}`)
    for (const axis of AXES[sport]) assert.ok(bank.filter((q) => axis in q.axes).length >= 2, `${sport} axis ${axis}`)
    for (const q of bank) {
      assert.equal(q.options.length, 4)
      assert.ok(q.options.some((o) => o.score === 1), `${q.id} has a best answer`)
      assert.ok(q.prompt.vi && q.prompt.en, `${q.id} is bilingual`)
    }
  }
})

test("an attempt is scored only when every situation is answered", () => {
  const answers = pick("badminton", true)
  delete answers[Object.keys(answers)[0]]
  assert.equal(scoreCore("badminton", answers, {}, null), null)
  assert.equal(parseCoreAnswers("badminton", answers), null)
  assert.equal(parseCoreAnswers("badminton", { ...pick("badminton", true), [bankFor("badminton")[0].id]: 7 }), null)
})

test("each sport has its own ELO: football answers never change the badminton score", () => {
  const strong = scoreCore("badminton", pick("badminton", true), { style: "attack" }, null, "2026-01-01T00:00:00.000Z")
  const weak = scoreCore("football", pick("football", false), { position: "MF", surface: "fg" }, null, "2026-01-01T00:00:00.000Z")
  assert.ok(strong && weak)
  assert.equal(strong.sport, "badminton")
  assert.equal(weak.sport, "football")
  assert.ok(strong.elo > weak.elo + 600, `${strong.elo} vs ${weak.elo}`)
  assert.deepEqual(strong.axes.map((a) => a.id), [...AXES.badminton])
  assert.deepEqual(weak.axes.map((a) => a.id), [...AXES.football])
  // Context is sanitised per sport.
  assert.deepEqual(strong.context, { style: "attack" })
  assert.deepEqual(weak.context, { position: "MF", surface: "fg" })
})

test("a retake moves the ELO halfway towards the new performance and keeps the attempt number", () => {
  const first = scoreCore("football", pick("football", true), {}, null)
  const retake = scoreCore("football", pick("football", false), {}, { elo: first.elo, attempt: first.attempt })
  assert.equal(retake.attempt, 2)
  assert.equal(retake.eloBefore, first.elo)
  assert.equal(retake.elo, Math.round(first.elo + RETAKE_WEIGHT * (retake.performance - first.elo)))
})

test("self-assessment alone can't reach tier 10 (needs verified competition results)", () => {
  for (const sport of SPORTS) {
    const best = scoreCore(sport, pick(sport, true), {}, null)
    assert.ok(best.tier.index <= 8, `${sport} tier ${best.tier.index + 1}`)
    assert.ok(best.next, "a next tier is always shown below the top")
  }
  assert.equal(tierFor(2500, 100).index, 9)
  assert.equal(tierFor(2500, 20).index < 9, true, "a weak axis blocks high tiers")
})

test("performance rating rises with better answers on harder items", () => {
  const easy = performanceRating([{ difficulty: 1000, score: 1 }, { difficulty: 1000, score: 0 }])
  const hard = performanceRating([{ difficulty: 1800, score: 1 }, { difficulty: 1800, score: 0 }])
  assert.ok(hard > easy)
})

test("contradictions: excellent on a hard situation but poor on a much easier one gets flagged", () => {
  const bank = bankFor("badminton")
  const answers = pick("badminton", true)
  const hardest = [...bank].sort((a, b) => b.difficulty - a.difficulty)[0]
  const easy = bank.filter((q) => hardest.difficulty - q.difficulty >= 400 && (q.group === hardest.group || Object.keys(hardest.axes).some((x) => x in q.axes)))
  for (const q of easy) answers[q.id] = q.options.findIndex((o) => o.score <= 0.25)
  const result = findContradictions(bank, answers)
  assert.ok(result.pairs.length >= 1)
  assert.ok(result.flagged.includes(hardest.id))
  assert.equal(findContradictions(bank, pick("badminton", true)).ok, true)
})

test("answer order is shuffled deterministically per question", () => {
  const order = optionOrder("B-T1", 42)
  assert.deepEqual([...order].sort(), [0, 1, 2, 3])
  assert.deepEqual(optionOrder("B-T1", 42), order)
})
