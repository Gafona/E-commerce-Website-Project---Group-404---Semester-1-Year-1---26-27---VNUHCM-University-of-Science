import test from "node:test"
import assert from "node:assert/strict"
import {
  ACTIONS,
  DEFENSE_FAMILIES,
  DEFENSE_FAMILY_IDS,
  generateDefenseScenario,
  generateRoundScenario,
  generateScenario,
  meters,
  roundSeeds,
  scoreResponse,
} from "../src/lib/scenario-engine.ts"

const ACTS = Object.keys(ACTIONS)
const SEEDS = [1, 2, 3, 42, 777, 104729, -5]

// Điểm S cao nhất mỗi động tác đạt được trên lưới điểm rơi (giống findBest)
function bestPerAction(sc) {
  const out = {}
  for (const a of ACTS) {
    let b = 0
    for (let i = 1; i < 20; i++)
      for (let j = 1; j < 25; j++) b = Math.max(b, scoreResponse(sc, a, { x: i / 20, y: j * 0.02 }).S)
    out[a] = b
  }
  return out
}

const variants = DEFENSE_FAMILY_IDS.flatMap((family) =>
  [false, true].flatMap((mirrored) => SEEDS.map((seed) => ({ family, mirrored, seed }))),
)

test("có đúng 8 họ, mỗi họ có bản gốc và bản đối xứng với variantId khác nhau", () => {
  assert.equal(DEFENSE_FAMILY_IDS.length, 8)
  const ids = new Set()
  for (const family of DEFENSE_FAMILY_IDS)
    for (const mirrored of [false, true]) ids.add(generateDefenseScenario(1, { family, mirrored }).defense.variantId)
  assert.equal(ids.size, 16)
})

test("cùng seed cho ra cùng tình huống; bản -M lật trục x", () => {
  for (const seed of SEEDS) assert.deepEqual(generateDefenseScenario(seed), generateDefenseScenario(seed))
  for (const family of DEFENSE_FAMILY_IDS) {
    const a = generateDefenseScenario(9, { family, mirrored: false })
    const b = generateDefenseScenario(9, { family, mirrored: true })
    for (const k of ["player", "shuttle", "opponent"]) {
      assert.ok(Math.abs(a.state[k].x + b.state[k].x - 1) < 1e-9, `${family} ${k}.x`)
      assert.equal(a.state[k].y, b.state[k].y)
    }
    assert.equal(a.state.opponent.movement[0], -b.state.opponent.movement[0])
    assert.deepEqual(a.actionFit, b.actionFit)
    assert.equal(a.difficulty, b.difficulty)
  }
})

test("mọi biến thể: hình học hợp lệ, cầu trong tầm với và trong sân", () => {
  for (const { family, mirrored, seed } of variants) {
    const sc = generateDefenseScenario(seed, { family, mirrored })
    const { player, shuttle, opponent } = sc.state
    const id = sc.scenarioId
    assert.equal(sc.rallyPhase, "defending", id)
    assert.ok(player.y > 0.5 && player.y <= 1 && player.x >= 0 && player.x <= 1, `${id} player`)
    assert.ok(shuttle.y > 0.5 && shuttle.y <= 1 && shuttle.x >= 0 && shuttle.x <= 1, `${id} shuttle trong sân`)
    assert.ok(opponent.y >= 0 && opponent.y < 0.5, `${id} opponent ở nửa bên kia`)
    assert.ok(meters(player, shuttle) <= 1.6, `${id} cầu trong tầm với`)
    assert.ok(sc.constraintsApplied.includes("shuttle_in_reach"), id)
    assert.ok(player.stamina > 0 && player.stamina <= 1, id)
  }
})

test("đáp án đúng thắng mọi động tác khác với cách biệt rõ, cú bẫy hấp dẫn nhưng thua", () => {
  for (const { family, mirrored, seed } of variants) {
    const sc = generateDefenseScenario(seed, { family, mirrored })
    const { canonical, trap } = sc.defense
    const best = bestPerAction(sc)
    const id = sc.scenarioId
    assert.notEqual(trap.action, canonical, id)
    for (const a of ACTS)
      if (a !== canonical) assert.ok(best[canonical] - best[a] >= 0.15, `${id}: ${canonical}=${best[canonical]} vs ${a}=${best[a]}`)
    // Bẫy: A cao (≥ 0,5, đứng thứ hai) nhưng bị T kéo xuống dưới A của nó
    assert.ok(sc.actionFit[trap.action] >= 0.5, `${id} trap A`)
    const secondA = Math.max(...ACTS.filter((a) => a !== canonical).map((a) => sc.actionFit[a]))
    assert.equal(sc.actionFit[trap.action], secondA, `${id} trap là A cao thứ hai`)
    assert.ok(best[trap.action] <= sc.actionFit[trap.action] * 0.85, `${id} trap bị T trừ`)
  }
})

test("cầu thấp thì không thể phản công đánh xuống (smash A = 0)", () => {
  for (const family of DEFENSE_FAMILY_IDS) {
    const f = DEFENSE_FAMILIES[family]
    if (f.shuttle.height === "low") assert.equal(f.actionFit.smash, 0, family)
  }
})

test("các họ dùng dãy A khác nhau và đáp án đúng không dồn vào một động tác", () => {
  const fits = new Set(DEFENSE_FAMILY_IDS.map((f) => JSON.stringify(DEFENSE_FAMILIES[f].actionFit)))
  assert.equal(fits.size, 8)
  const canon = new Set(DEFENSE_FAMILY_IDS.map((f) => DEFENSE_FAMILIES[f].canonical))
  assert.ok(canon.size >= 3, [...canon].join(","))
})

test("độ khó từ 7 tiêu chí: ≥3 họ trong 950–1100 và ≥2 họ từ 1300", () => {
  const D = DEFENSE_FAMILY_IDS.map((family) => generateDefenseScenario(1, { family }).difficulty)
  for (const d of D) assert.ok(d >= 900 && d <= 1500)
  assert.ok(D.filter((d) => d >= 950 && d <= 1100).length >= 3, D.join(","))
  assert.ok(D.filter((d) => d >= 1300).length >= 2, D.join(","))
  for (const family of DEFENSE_FAMILY_IDS)
    assert.equal(Object.keys(DEFENSE_FAMILIES[family].criteria).length, 7)
})

test("chọn lượt: lượt chẵn giữ nguyên tình huống tấn công cũ, lượt lẻ là phòng thủ", () => {
  const seeds = roundSeeds(12345)
  seeds.forEach((seed, i) => {
    const sc = generateRoundScenario(seed, i)
    if (i % 2 === 0) assert.deepEqual(sc, generateScenario(seed))
    else assert.equal(sc.variant, "defense")
  })
})

test("tình huống tấn công cũ không đổi", () => {
  const sc = generateScenario(4242)
  assert.equal(sc.rallyPhase, "attacking")
  assert.equal(sc.defense, undefined)
  assert.ok(sc.scenarioId.startsWith("BD-B01-"))
})
