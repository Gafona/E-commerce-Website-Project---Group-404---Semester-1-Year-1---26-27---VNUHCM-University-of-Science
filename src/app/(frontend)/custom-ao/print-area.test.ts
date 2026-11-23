import assert from "node:assert/strict"
import test from "node:test"
import { clampToPrintArea, fitItem, itemExtent } from "./print-area.ts"

// Shirt sleeve seam runs (72,119) → (108,192); right side mirrors at x = 420 - x.
const sleeveRight = (y: number) => (y <= 192 ? 420 - (72 + ((y - 119) * 36) / 73) : 312)

test("the default chest logo no longer crosses the right sleeve seam", () => {
  const logo = fitItem("shirt", "front", "crew", "logo", { x: 282, y: 172, size: 90 })
  const { hw, hh } = itemExtent("logo", logo)
  for (const y of [logo.y - hh, logo.y, logo.y + hh]) assert.ok(logo.x + hw <= sleeveRight(y), `right edge at y=${y}`)
  assert.ok(logo.x - hw >= 108)
})

test("items dragged off any edge are pulled back inside the panel", () => {
  for (const [x, y] of [[-100, 300], [600, 300], [210, 20], [210, 900], [380, 120], [40, 140]]) {
    const p = clampToPrintArea("shirt", "back", "crew", { x, y }, 30, 30)
    assert.ok(p.x - 30 >= 108 - 0.01 && p.x + 30 <= 312 + 0.01 || p.y + 30 <= 192, `x within torso for ${x},${y}`)
    assert.ok(p.y + 30 <= 426.01 && p.y - 30 >= 92, `y within panel for ${x},${y}`)
  }
})

test("shorts keep items between the waistband and the hem", () => {
  const p = clampToPrintArea("pants", "front", "crew", { x: 210, y: 500 }, 40, 40)
  assert.ok(p.y + 40 <= 344.01)
  const q = clampToPrintArea("pants", "front", "crew", { x: 210, y: 0 }, 40, 40)
  assert.ok(q.y - 40 >= 130 - 0.01)
})

test("an item wider than the panel is centered instead of jammed to one side", () => {
  const p = clampToPrintArea("shirt", "front", "crew", { x: 380, y: 300 }, 150, 20)
  assert.equal(p.x, 210)
})
