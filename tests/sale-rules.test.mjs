import assert from "node:assert/strict"
import test from "node:test"
import { effectiveEventStatus, eventWindow, formatEventRange, isRegistrationOpen } from "../src/lib/event-dates.ts"
import { salePrice } from "../src/lib/event-rules.ts"
import { approvedOffers, bestOffers } from "../src/lib/sale-offers.ts"

// 20/11/2026 20:00 – 22/11/2026 22:00, Vietnam time (UTC+7).
const event = { id: "e1", name: "Flash", status: "scheduled", startDate: "2026-11-20T00:00:00.000Z", endDate: "2026-11-22T23:59:59.999Z", startTime: "20:00", endTime: "22:00", maxDiscount: 40 }
const at = (iso) => new Date(iso)

test("events switch on and off at their exact Vietnam times, without anyone saving them", () => {
  assert.equal(effectiveEventStatus(event, at("2026-11-20T12:59:00.000Z")), "scheduled") // 19:59 VN
  assert.equal(effectiveEventStatus(event, at("2026-11-20T13:00:00.000Z")), "active") // 20:00 VN
  assert.equal(effectiveEventStatus(event, at("2026-11-22T15:00:30.000Z")), "active") // 22:00:30 VN
  assert.equal(effectiveEventStatus(event, at("2026-11-22T15:01:00.000Z")), "ended") // 22:01 VN
  assert.equal(effectiveEventStatus({ ...event, status: "paused" }, at("2026-11-21T00:00:00.000Z")), "paused")
  assert.equal(effectiveEventStatus({ ...event, status: "draft" }, at("2026-11-21T00:00:00.000Z")), "draft")
  const { start, end } = eventWindow(event)
  assert.equal(new Date(start).toISOString(), "2026-11-20T13:00:00.000Z")
  assert.equal(new Date(end).toISOString(), "2026-11-22T15:00:59.999Z")
})

test("whole-day events (no times) keep the old calendar-day behaviour", () => {
  const day = { status: "active", startDate: "2026-11-20T00:00:00.000Z", endDate: "2026-11-20T23:59:59.999Z" }
  assert.equal(effectiveEventStatus(day, at("2026-11-19T16:59:00.000Z")), "scheduled") // 23:59 VN the day before
  assert.equal(effectiveEventStatus(day, at("2026-11-19T17:00:00.000Z")), "active") // 00:00 VN
  assert.equal(effectiveEventStatus(day, at("2026-11-20T17:00:00.000Z")), "ended") // next day 00:00 VN
  assert.equal(formatEventRange(day), "20/11/2026 – 20/11/2026")
  assert.equal(formatEventRange(event), "20/11/2026 20:00 – 22/11/2026 22:00")
})

test("shops can register until the event's end time", () => {
  assert.equal(isRegistrationOpen(event, at("2026-11-22T15:00:00.000Z")), true)
  assert.equal(isRegistrationOpen(event, at("2026-11-22T15:01:00.000Z")), false)
  assert.equal(isRegistrationOpen({ ...event, status: "draft" }, at("2026-11-21T00:00:00.000Z")), false)
})

test("sale price rounds to the nearest 1,000₫ and never drops to zero", () => {
  assert.equal(salePrice(1_250_000, 20), 1_000_000)
  assert.equal(salePrice(999_000, 15), 849_000)
  assert.equal(salePrice(1_500, 90), 1_000)
})

const registration = (items, extra = {}) => ({ id: "r1", event: "e1", seller: "s1", reviewStatus: "pending", items, ...extra })
const events = new Map([["e1", event]])

test("each approved product gets its own discount; waiting, rejected and withdrawn ones don't", () => {
  const offers = approvedOffers(
    [
      registration([
        { id: "a", product: "p1", discountPercent: 15, quota: null, sold: 0, status: "approved" },
        { id: "b", product: "p2", discountPercent: 30, quota: null, sold: 0, status: "approved" },
        { id: "c", product: "p3", discountPercent: 20, quota: null, sold: 0, status: "pending" },
        { id: "d", product: "p4", discountPercent: 20, quota: null, sold: 0, status: "rejected" },
        { id: "e", product: "p5", discountPercent: 20, quota: null, sold: 0, status: "withdrawn" },
      ]),
    ],
    events,
  )
  assert.deepEqual(offers.map((o) => [o.productId, o.percent, o.itemId]), [["p1", 15, "a"], ["p2", 30, "b"]])
})

test("the event ceiling caps a discount and a used-up quota stops the event price", () => {
  const offers = approvedOffers(
    [
      registration([
        { id: "a", product: "p1", discountPercent: 60, quota: null, sold: 0, status: "approved" },
        { id: "b", product: "p2", discountPercent: 20, quota: 10, sold: 10, status: "approved" },
        { id: "c", product: "p3", discountPercent: 20, quota: 10, sold: 7, status: "approved" },
      ]),
    ],
    events,
  )
  assert.deepEqual(offers.map((o) => [o.productId, o.percent, o.quotaLeft]), [["p1", 40, null], ["p3", 20, 3]])
})

test("registrations saved before per-product rows apply one discount only once approved", () => {
  const legacy = (status) => registration(null, { reviewStatus: status, products: ["p1", "p2"], discountPercent: 25 })
  assert.equal(approvedOffers([legacy("pending")], events).length, 0)
  assert.deepEqual(approvedOffers([legacy("approved")], events).map((o) => [o.productId, o.percent]), [["p1", 25], ["p2", 25]])
})

test("the highest live offer wins when a product is in two registrations", () => {
  const best = bestOffers(
    approvedOffers(
      [
        registration([{ id: "a", product: "p1", discountPercent: 10, quota: null, sold: 0, status: "approved" }]),
        registration([{ id: "b", product: "p1", discountPercent: 25, quota: null, sold: 0, status: "approved" }], { id: "r2" }),
      ],
      events,
    ),
  )
  assert.equal(best.get("p1").percent, 25)
  assert.equal(best.get("p1").registrationId, "r2")
})
