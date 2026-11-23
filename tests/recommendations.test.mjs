import assert from "node:assert/strict"
import test from "node:test"
import {
  addDays,
  bookedOn,
  capacityMessage,
  fillSection,
  firstFreeDay,
  fullDays,
  isDay,
  newRecommendationCode,
  phaseOf,
  rankRecommendations,
  slotRange,
  vnDay,
} from "../src/lib/recommendations.ts"

test("days follow Vietnam time and bookings cover whole days", () => {
  // 18:30 UTC is already the next morning in Vietnam.
  assert.equal(vnDay("2026-11-21T18:30:00Z"), "2026-11-22")
  assert.equal(addDays("2026-11-30", 1), "2026-12-01")
  assert.deepEqual(slotRange("2026-11-22", 3), { startsAt: "2026-11-21T17:00:00.000Z", endsAt: "2026-11-24T17:00:00.000Z" })
  assert.equal(isDay("2026-02-30"), false)
  assert.equal(isDay("2026-12-01"), true)
})

test("capacity is checked per day and suggests the nearest free start", () => {
  const taken = [slotRange("2026-12-01", 5), slotRange("2026-12-03", 2), slotRange("2026-12-03", 4)]
  assert.equal(bookedOn(taken, "2026-12-03"), 3)
  assert.equal(bookedOn(taken, "2026-12-06"), 1)
  assert.deepEqual(fullDays(taken, "2026-12-02", 3, 3), ["2026-12-03", "2026-12-04"])
  assert.deepEqual(fullDays(taken, "2026-12-02", 3, 4), [])
  // A 2-day booking from 02/12 hits the full 03/12; the first start with two free days is 05/12.
  assert.equal(firstFreeDay(taken, "2026-12-02", 2, 3), "2026-12-05")
  assert.equal(firstFreeDay(taken, "2026-12-01", 1, 3), "2026-12-01")
  assert.match(capacityMessage(3, "2026-12-05"), /Vị trí đã đủ 3 sản phẩm trong khoảng thời gian này\. Ngày trống gần nhất: 05\/12\/2026\./)
  assert.match(capacityMessage(3, null, "en"), /already has 3 products/)
})

test("phases come from status and dates", () => {
  const range = slotRange("2026-12-01", 2)
  const before = new Date("2026-11-30T12:00:00Z").getTime()
  const during = new Date("2026-12-01T12:00:00Z").getTime()
  const after = new Date("2026-12-03T12:00:00Z").getTime()
  assert.equal(phaseOf({ status: "approved", ...range }, before), "scheduled")
  assert.equal(phaseOf({ status: "approved", ...range }, during), "running")
  assert.equal(phaseOf({ status: "approved", ...range }, after), "expired")
  assert.equal(phaseOf({ status: "pending", ...range }, during), "pending")
  assert.equal(phaseOf({ status: "pending", ...range }, after), "lapsed")
  assert.equal(phaseOf({ status: "rejected", ...range }, during), "rejected")
})

test("homepage order: price per day, then earliest approval; others fill the rest", () => {
  const ranked = rankRecommendations([
    { id: "a", pricePerDay: 20000, reviewedAt: "2026-11-20T10:00:00Z" },
    { id: "b", pricePerDay: 50000, reviewedAt: "2026-11-21T10:00:00Z" },
    { id: "c", pricePerDay: 20000, reviewedAt: "2026-11-19T10:00:00Z" },
  ]).map((r) => r.id)
  assert.deepEqual(ranked, ["b", "c", "a"])
  const others = [{ id: "x" }, { id: "b" }, { id: "y" }, { id: "z" }]
  assert.deepEqual(fillSection([{ id: "b" }, { id: "c" }], others, 3, 3).map((p) => p.id), ["b", "c", "x"])
  assert.deepEqual(fillSection([], others, 3, 3).map((p) => p.id), ["x", "b", "y"])
  // Never more paid spots than slots.
  assert.deepEqual(fillSection([{ id: "p1" }, { id: "p2" }, { id: "p3" }], others, 3, 2).map((p) => p.id), ["p1", "p2", "x"])
})

test("fee references never look like order codes", () => {
  const code = newRecommendationCode(() => 0.5)
  assert.match(code, /^DX[A-Z2-9]{6}$/)
  assert.equal(/BOAI[A-Z0-9]{8}/.test(code), false)
})
