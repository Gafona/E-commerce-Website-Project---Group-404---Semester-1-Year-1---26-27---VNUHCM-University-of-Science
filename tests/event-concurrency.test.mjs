import assert from "node:assert/strict"
import test from "node:test"
import { eventOverlaps, eventWindow, formatEventMoment, windowsOverlap } from "../src/lib/event-dates.ts"

const at = (iso) => new Date(iso)

test("event end moments are shown in Vietnam time, independent of the runtime zone", () => {
  const end = eventWindow({ startDate: "2026-11-16", endDate: "2026-11-30" }).end
  assert.equal(formatEventMoment(end), "30/11 23:59")
  assert.equal(formatEventMoment(Date.parse("2026-11-21T17:05:00Z")), "22/11 00:05")
})

test("overlap uses exact start/end times, not just the days", () => {
  const morning = eventWindow({ startDate: "2026-12-01", endDate: "2026-12-01", startTime: "08:00", endTime: "11:00" })
  const evening = eventWindow({ startDate: "2026-12-01", endDate: "2026-12-01", startTime: "20:00", endTime: "22:00" })
  const allDay = eventWindow({ startDate: "2026-12-01", endDate: "2026-12-01" })
  assert.equal(windowsOverlap(morning, evening), false)
  assert.equal(windowsOverlap(morning, allDay), true)
})

test("concurrent events are paired; drafts and finished events are ignored", () => {
  const events = [
    { id: "ronaldo", name: "Ronaldo", status: "active", startDate: "2026-11-16", endDate: "2026-11-30" },
    { id: "messi", name: "Messi", status: "active", startDate: "2026-11-16", endDate: "2026-11-30" },
    { id: "draft", name: "Nháp", status: "draft", startDate: "2026-11-20", endDate: "2026-11-25" },
    { id: "old", name: "Cũ", status: "active", startDate: "2026-10-01", endDate: "2026-10-05" },
    { id: "dec", name: "Tháng 12", status: "scheduled", startDate: "2026-12-10", endDate: "2026-12-12" },
  ]
  const map = eventOverlaps(events, at("2026-11-21T07:00:00Z"))
  assert.deepEqual([...map.keys()].sort(), ["messi", "ronaldo"])
  assert.deepEqual(map.get("ronaldo").map((e) => e.id), ["messi"])
})
