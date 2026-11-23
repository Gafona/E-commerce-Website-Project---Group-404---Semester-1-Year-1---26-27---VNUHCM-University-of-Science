import test from "node:test"
import assert from "node:assert/strict"
import { RATING_TIERS } from "../src/lib/rating/ratingConfig.ts"
import { DEFENSE_FAMILIES, DEFENSE_FAMILY_IDS, difficultyFrom, generateDefenseScenario } from "../src/lib/scenario-engine.ts"
import {
  ACTION_LABEL,
  DEFENSE_TEMPLATES,
  MODES,
  SKILL_TIERS,
  TEMPLATES,
  mirrorTemplate,
  sequenceFor,
  skillTierOf,
} from "../src/app/(frontend)/sportdna/_components/data.ts"

test("bảng hạng lấy trực tiếp từ RATING_TIERS, luôn có bậc với elo ≥ 0", () => {
  assert.equal(SKILL_TIERS.length, RATING_TIERS.length)
  SKILL_TIERS.forEach((t, i) => {
    assert.equal(t.label, RATING_TIERS[i].name)
    assert.equal(t.max, RATING_TIERS[i].max)
  })
  assert.equal(skillTierOf(0).label, RATING_TIERS[0].name)
  assert.equal(skillTierOf(999).label, "Phong trào yếu")
  assert.equal(skillTierOf(2400).label, "Huyền thoại")
  assert.equal(skillTierOf(-1), null)
})

test("8 template phòng thủ đồng bộ với engine E6-B", () => {
  assert.equal(DEFENSE_TEMPLATES.length, DEFENSE_FAMILY_IDS.length)
  DEFENSE_TEMPLATES.forEach((tp, i) => {
    const family = DEFENSE_FAMILY_IDS[i]
    const f = DEFENSE_FAMILIES[family]
    assert.equal(tp.code, f.code)
    assert.equal(tp.prompt, f.prompt)
    assert.equal(tp.phase, "defending")
    assert.ok(tp.groups.includes("defense"))
    assert.deepEqual(tp.player, { x: f.player.x, y: f.player.y })
    assert.equal(tp.defense.family, family)
    assert.equal(tp.defense.difficulty, difficultyFrom(f.criteria))
    assert.equal(tp.defense.difficulty, generateDefenseScenario(1, { family }).difficulty)
    assert.equal(tp.actions.length, 4)
    assert.ok(tp.actions.includes(tp.defense.canonical) && tp.actions.includes(tp.defense.trap.action))
    assert.notEqual(tp.defense.canonical, tp.defense.trap.action)
    for (const a of tp.actions) assert.ok(ACTION_LABEL[a], a)
  })
})

test("bản V2 của họ phòng thủ là bản đối xứng", () => {
  for (const tp of DEFENSE_TEMPLATES) {
    const m = mirrorTemplate(tp)
    for (const k of ["player", "opponent", "shuttle"]) {
      assert.ok(Math.abs(tp[k].x + m[k].x - 1) < 1e-9)
      assert.equal(tp[k].y, m[k].y)
    }
    assert.equal(m.opponent.movement[0], -tp.opponent.movement[0])
    assert.equal(m.defense.mirrored, true)
    assert.equal(tp.defense.mirrored, false)
  }
})

test("Deep đúng 36 câu, không lặp; Quick giữ nguyên; Retest có 4 câu phòng thủ", () => {
  const deep = sequenceFor("deep")
  assert.equal(deep.length, 36)
  assert.equal(MODES.deep.total, 36)
  const keys = deep.map((r) => `${r.template.code}-${r.variant}`)
  assert.equal(new Set(keys).size, 36)
  assert.equal(deep.filter((r) => r.template.defense).length, 16)
  for (const tp of TEMPLATES) assert.equal(deep.filter((r) => r.template.code === tp.code).length, 2)
  for (const r of deep) if (r.template.defense) assert.equal(r.template.defense.mirrored, r.variant === "V2")
  assert.deepEqual(sequenceFor("quick").map((r) => r.template.code), ["B01", "B05"])
  const retest = sequenceFor("retest")
  assert.equal(retest.length, 14)
  assert.equal(MODES.retest.total, 14)
  assert.equal(retest.filter((r) => r.template.defense).length, 4)
  for (const r of retest) if (r.template.defense) assert.equal(r.template.defense.mirrored, r.variant === "V2")
})
