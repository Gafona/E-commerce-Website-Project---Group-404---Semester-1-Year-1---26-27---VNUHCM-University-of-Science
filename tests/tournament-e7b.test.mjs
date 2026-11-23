import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import ts from "typescript"
import {
  deriveStateFromLedger,
  historyKey,
  processTournament,
} from "../src/lib/rating/tournamentProcessing.ts"
import { closeTournament, ledgerBackedMethods } from "../src/lib/rating/tournamentClose.ts"

// ---------- dữ liệu mẫu ----------

const near = (a, b) => Math.abs(a - b) < 1e-9

let seq = 0
const match = (teamA, teamB, scoreA, scoreB, extra = {}) => ({
  id: `m${String(++seq).padStart(3, "0")}`,
  playedAt: new Date(Date.UTC(2026, 10, 10, 8, seq)).toISOString(),
  teamA,
  teamB,
  scoreA,
  scoreB,
  phase: "group",
  isWalkover: false,
  isDisputed: false,
  isVoided: false,
  isApproved: true,
  confirmedBy: [],
  ...extra,
})

/** Store bộ nhớ chạy đúng đường ledger như Payload store; có thể gây lỗi khi ghi dòng thứ N. */
function ledgerStore({ events, failOnWrite = 0 }) {
  const state = { rows: [], profiles: {}, locks: {}, processed: {}, writes: 0, failOnWrite, order: 0 }
  const io = {
    async loadLedger(ids) {
      return state.rows.filter((r) => ids.includes(r.player)).map((r) => ({ ...r }))
    },
    async loadDevices() {
      return {}
    },
    async existingKeys(eventId) {
      return new Set(state.rows.filter((r) => r.eventId === eventId).map((r) => r.key))
    },
    async writeRow(eventId, row) {
      state.writes += 1
      if (state.failOnWrite && state.writes === state.failOnWrite) throw new Error("db down")
      // Mô phỏng unique index của idempotencyKey.
      if (state.rows.some((r) => r.key === row.idempotencyKey)) throw new Error("duplicate key")
      state.rows.push({
        key: row.idempotencyKey,
        player: row.player,
        eventId,
        matchId: row.matchId,
        reason: row.reason,
        delta: row.delta,
        mrAfter: row.mrAfter,
        occurredAt: row.occurredAt,
        order: ++state.order,
      })
    },
    async saveProfile(player, s) {
      state.profiles[player] = { ...s }
    },
  }
  const store = {
    state,
    async claim(id) {
      if (state.locks[id] || state.processed[id]) return false
      state.locks[id] = true
      return true
    },
    async getEvent(id) {
      return { id, matchType: events[id].matchType, isDemo: false }
    },
    async getMatches(id) {
      return events[id].matches
    },
    async getPriorMatches() {
      return []
    },
    ...ledgerBackedMethods(io),
    async markProcessed(id) {
      state.processed[id] = true
      state.locks[id] = false
    },
    async release(id) {
      state.locks[id] = false
    },
  }
  return store
}

const fourRowEvent = () => {
  seq = 0
  return { e1: { matchType: "community", matches: [match(["p1"], ["p2"], 21, 15), match(["p3"], ["p4"], 18, 21)] } }
}

const lastMrAfter = (rows, player) => rows.filter((r) => r.player === player).at(-1).mrAfter

// ---------- 1. Chống ghi trùng ----------

test("lỗi sau 2/4 dòng → đóng lại: không trùng dòng, MR cuối bằng lần chạy sạch", async () => {
  const clean = ledgerStore({ events: fourRowEvent() })
  const cleanResult = await closeTournament(clean, "e1")
  assert.equal(cleanResult.status, "processed")
  assert.equal(clean.state.rows.length, 4)

  const broken = ledgerStore({ events: fourRowEvent(), failOnWrite: 3 })
  await assert.rejects(closeTournament(broken, "e1"), /db down/)
  assert.equal(broken.state.rows.length, 2, "đã ghi 2/4 dòng trước khi lỗi")
  assert.deepEqual(broken.state.profiles, {}, "chưa tính lại hồ sơ khi lỗi giữa chừng")
  assert.equal(broken.state.locks.e1, false, "khóa được nhả để đóng lại")

  const retry = await closeTournament(broken, "e1")
  assert.equal(retry.status, "processed")
  const keys = broken.state.rows.map((r) => r.key)
  assert.equal(keys.length, 4)
  assert.equal(new Set(keys).size, 4, "không có dòng trùng")
  assert.deepEqual(keys.sort(), clean.state.rows.map((r) => r.key).sort())
  assert.deepEqual(broken.state.profiles, clean.state.profiles, "MR/bộ đếm cuối bằng lần chạy sạch")
  for (const p of ["p1", "p2", "p3", "p4"]) {
    assert.ok(near(broken.state.profiles[p].mr, lastMrAfter(clean.state.rows, p)))
    assert.equal(broken.state.profiles[p].matchesPlayed, 1)
  }
  assert.equal(await closeTournament(broken, "e1").then((r) => r.status), "already_processed")
})

test("idempotencyKey đúng định dạng {eventId}:{matchId|cap}:{userId}:{reason}", () => {
  seq = 0
  const matches = ["p2", "p3", "p4", "p5"].map((o) => match(["p1"], [o], 21, 10))
  const { history } = processTournament({ eventId: "evt", matchType: "official", matches, profiles: {}, priorMatches: [] })
  assert.equal(history[0].idempotencyKey, "evt:m001:p1:normal")
  const cap = history.find((r) => r.reason === "tournament_cap")
  assert.ok(cap, "p1 thắng 4 trận K64 phải chạm trần ±80")
  assert.equal(cap.idempotencyKey, historyKey("evt", null, "p1", "tournament_cap"))
  assert.equal(cap.idempotencyKey, "evt:cap:p1:tournament_cap")
  assert.equal(cap.occurredAt, matches.at(-1).playedAt)
  assert.equal(new Set(history.map((r) => r.idempotencyKey)).size, history.length)
})

test("saveResults chạy hai lần với cùng lịch sử: dòng đã có bị bỏ qua, hồ sơ không cộng dồn", async () => {
  const store = ledgerStore({ events: fourRowEvent() })
  const profiles = await store.getProfiles(["p1", "p2", "p3", "p4"], "e1")
  const { history } = processTournament({ eventId: "e1", matchType: "community", matches: fourRowEvent().e1.matches, profiles, priorMatches: [] })
  await store.saveResults("e1", history, {})
  const once = structuredClone(store.state.profiles)
  await store.saveResults("e1", history, {})
  assert.equal(store.state.rows.length, 4)
  assert.deepEqual(store.state.profiles, once)
})

test("hồ sơ tính lại từ ledger khớp engine qua nhiều giải, có growth cap và trần giải", async () => {
  seq = 0
  const events = {
    a: { matchType: "official", matches: ["p2", "p3", "p4", "p5"].map((o) => match(["p1"], [o], 21, 12)) },
    b: { matchType: "official", matches: ["p2", "p3", "p4", "p5", "p6", "p7"].map((o) => match(["p1"], [o], 21, 18)) },
    c: { matchType: "community", matches: [match(["p1"], ["p2"], 10, 21), match(["p3"], ["p1"], 15, 21)] },
  }
  const store = ledgerStore({ events })
  let chained = {}
  for (const id of ["a", "b", "c"]) {
    await closeTournament(store, id)
    chained = { ...chained, ...processTournament({ eventId: id, matchType: events[id].matchType, matches: events[id].matches, profiles: chained, priorMatches: [] }).profiles }
  }
  assert.ok(store.state.rows.some((r) => r.reason === "tournament_cap"))
  for (const [id, s] of Object.entries(chained)) {
    // Sai số dấu phẩy động do thứ tự cộng khác nhau (~1e-13), nên so với dung sai.
    const got = store.state.profiles[id]
    assert.equal(got.matchesPlayed, s.matchesPlayed, id)
    assert.ok(near(got.mr, s.mr), `${id}: mr ${got.mr} vs ${s.mr}`)
    assert.ok(near(got.mrGainFirst10, s.mrGainFirst10), `${id}: gain ${got.mrGainFirst10} vs ${s.mrGainFirst10}`)
    assert.ok(near(got.mr, lastMrAfter(store.state.rows, id)), `${id}: mr = mrAfter dòng cuối`)
  }
})

test("deriveStateFromLedger: bỏ qua giải đang đóng, reversal chỉ đổi mr, farm_zero không tính trận", () => {
  const rows = [
    { player: "p", eventId: "x", matchId: "m1", reason: "normal", delta: 30, occurredAt: "2026-01-01T00:00:00Z", order: 1 },
    { player: "p", eventId: "x", matchId: "m2", reason: "farm_zero", delta: 0, occurredAt: "2026-01-02T00:00:00Z", order: 2 },
    { player: "p", eventId: "y", matchId: "m3", reason: "normal", delta: -10, occurredAt: "2026-02-01T00:00:00Z", order: 3 },
    { player: "p", eventId: "x", matchId: "m1", reason: "reversal", delta: -30, occurredAt: "2026-03-01T00:00:00Z", order: 4 },
  ]
  assert.deepEqual(deriveStateFromLedger(rows, ["p"]).p, { mr: 990, matchesPlayed: 2, mrGainFirst10: 30 })
  assert.deepEqual(deriveStateFromLedger(rows, ["p"], "y").p, { mr: 1000, matchesPlayed: 1, mrGainFirst10: 30 })
  assert.deepEqual(deriveStateFromLedger([], ["q"]).q, { mr: 1000, matchesPlayed: 0, mrGainFirst10: 0 })
})

// ---------- Biên dịch module Next có alias để test với Payload giả ----------

const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
const STUBS = {
  "@/lib/app-auth": dataUrl("export const appAuth = { currentUser: async () => globalThis.__e7b.user }"),
  "@/lib/payload": dataUrl("export async function getPayloadClient() { return globalThis.__e7b.payload }"),
  "server-only": dataUrl("export {}"),
  "@/lib/rating/ratingConfig": pathToFileURL("src/lib/rating/ratingConfig.ts").href,
  "@/lib/rating/ratingEngine": pathToFileURL("src/lib/rating/ratingEngine.ts").href,
}
async function load(path) {
  const source = await readFile(path, "utf8")
  let code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  for (const [from, to] of Object.entries(STUBS)) code = code.replaceAll(`"${from}"`, `"${to}"`)
  return import(dataUrl(code))
}

const idOf = (v) => (v && typeof v === "object" ? String(v.id) : v == null ? v : String(v))
function matches(doc, where) {
  if (!where) return true
  if (where.and) return where.and.every((w) => matches(doc, w))
  if (where.or) return where.or.some((w) => matches(doc, w))
  return Object.entries(where).every(([field, cond]) => {
    const raw = doc[field]
    const values = Array.isArray(raw) ? raw.map(idOf) : [idOf(raw)]
    if ("equals" in cond) return values.includes(typeof cond.equals === "boolean" ? cond.equals : String(cond.equals)) || raw === cond.equals
    if ("in" in cond) return values.some((v) => cond.in.map(String).includes(v))
    throw new Error(`toán tử chưa hỗ trợ: ${JSON.stringify(cond)}`)
  })
}
/** Payload giả: rating-profiles đọc theo chủ sở hữu khi overrideAccess=false (giống ownerOrStaff). */
function fakePayload(db) {
  const calls = { update: [] }
  const scoped = (collection, args) => {
    let docs = (db[collection] ?? []).filter((d) => matches(d, args.where))
    if (args.overrideAccess === false && ["rating-profiles", "match-rating-history", "sport-assessments"].includes(collection)) {
      const owner = { "rating-profiles": "user", "match-rating-history": "player", "sport-assessments": "owner" }[collection]
      docs = docs.filter((d) => args.user && idOf(d[owner]) === String(args.user.id))
    }
    if (args.overrideAccess === false && collection === "tournament-registrations") docs = []
    return docs
  }
  return {
    calls,
    async find(args) {
      const docs = scoped(args.collection, args).map((d) => structuredClone(d))
      return { docs, totalDocs: docs.length }
    },
    async findByID({ collection, id }) {
      const doc = (db[collection] ?? []).find((d) => String(d.id) === String(id))
      if (!doc) throw new Error("Not Found")
      return structuredClone(doc)
    },
    async update(args) {
      calls.update.push(structuredClone(args))
      const doc = db[args.collection].find((d) => String(d.id) === String(args.id))
      Object.assign(doc, args.data)
      return doc
    },
  }
}

// ---------- 3. Server action isPublic ----------

const profilesDb = () => ({
  "rating-profiles": [
    { id: "rp-me", user: "me", mr: 1240, isPublic: false, deviceId: "dev-1", possibleAlt: true, matchesPlayed: 3, mrGainFirst10: 40 },
    { id: "rp-other", user: "other", mr: 1500, isPublic: false, deviceId: "dev-2", possibleAlt: false },
  ],
})
