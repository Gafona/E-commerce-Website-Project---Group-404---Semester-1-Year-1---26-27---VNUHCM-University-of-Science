import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import { checkTransition, TOURNAMENT_STATUSES } from "../src/lib/rating/tournamentLifecycle.ts"
import {
  processTournament,
  uniqueOpponentsInTournament,
} from "../src/lib/rating/tournamentProcessing.ts"
import { closeTournament } from "../src/lib/rating/tournamentClose.ts"

const near = (a, b) => Math.abs(a - b) < 1e-9
const sum = (values) => values.reduce((s, v) => s + v, 0)

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

const roundRobin = () => {
  seq = 0
  const [p1, p2, p3, p4] = ["p1", "p2", "p3", "p4"]
  return [
    match([p1], [p2], 21, 15),
    match([p3], [p4], 18, 21),
    match([p1], [p3], 21, 19),
    match([p2], [p4], 21, 10),
    match([p1], [p4], 12, 21),
    match([p2], [p3], 21, 23),
  ]
}

const profiles = () => ({
  p1: { id: "p1", mr: 1000, matchesPlayed: 20, mrGainFirst10: 0 },
  p2: { id: "p2", mr: 1150, matchesPlayed: 20, mrGainFirst10: 0 },
  p3: { id: "p3", mr: 900, matchesPlayed: 20, mrGainFirst10: 0 },
  // p4 chưa có hồ sơ: khởi tạo MR 1000, người mới (K gấp đôi)
})

test("nghiệm thu 1: giải 4 người đơn vòng tròn, tổng ΔMR toàn giải = 0", () => {
  const result = processTournament({
    eventId: "T1",
    matchType: "community",
    matches: roundRobin(),
    profiles: profiles(),
    priorMatches: [],
  })
  assert.equal(result.history.filter((r) => r.matchId).length, 12)
  assert.ok(near(sum(Object.values(result.totals)), 0), JSON.stringify(result.totals))
  assert.ok(near(sum(result.history.map((r) => r.delta)), 0))
  assert.equal(result.history.filter((r) => r.reason !== "normal").length, 0)
  assert.equal(result.profiles.p4.matchesPlayed, 3)
})

test("kết quả không phụ thuộc thứ tự lưu trong DB", () => {
  const input = (matches) =>
    processTournament({ eventId: "T1", matchType: "community", matches, profiles: profiles(), priorMatches: [] })
  const ordered = input(roundRobin())
  const reversed = input(roundRobin().reverse())
  assert.deepEqual(reversed.totals, ordered.totals)
  assert.deepEqual(reversed.history, ordered.history)
})

test("trận tranh chấp, walkover, vô hiệu, chưa duyệt, hòa đều bị bỏ qua", () => {
  seq = 0
  const result = processTournament({
    eventId: "T2",
    matchType: "community",
    matches: [
      match(["a"], ["b"], 21, 10, { isDisputed: true }),
      match(["a"], ["b"], 21, 10, { isWalkover: true }),
      match(["a"], ["b"], null, null, { isVoided: true }),
      match(["a"], ["b"], 21, 10, { isApproved: false }),
      match(["a"], ["b"], 21, 21),
    ],
    profiles: {},
    priorMatches: [],
  })
  assert.equal(result.history.length, 0)
  assert.equal(result.skipped.length, 5)
})

test("giao hữu V1: tính khi mỗi đội có người xác nhận, không cần admin", () => {
  seq = 0
  const confirmed = match(["a"], ["b"], 21, 10, { isApproved: false, confirmedBy: ["a", "b"], phase: "none" })
  const oneSide = match(["c"], ["d"], 21, 10, { isApproved: false, confirmedBy: ["c"], phase: "none" })
  const result = processTournament({ eventId: "T3", matchType: "friendly", matches: [confirmed, oneSide], profiles: {}, priorMatches: [] })
  assert.deepEqual(result.skipped, [oneSide.id])
  assert.equal(result.history.find((r) => r.player === "a").kMatch, 20) // K 10 × 2 (10 trận đầu)
})

test("trần ±80/giải ghi dòng tournament_cap và nêu rõ nguồn làm tổng khác 0", () => {
  seq = 0
  const matches = Array.from({ length: 6 }, () => match(["new"], ["vet"], 21, 5, { phase: "knockout" }))
  const result = processTournament({
    eventId: "T4",
    matchType: "official",
    matches,
    profiles: { vet: { id: "vet", mr: 1600, matchesPlayed: 50, mrGainFirst10: 0 } },
    priorMatches: [],
  })
  assert.equal(result.totals.new, 80)
  assert.equal(result.totals.vet, -80)
  const caps = result.history.filter((r) => r.reason === "tournament_cap")
  assert.equal(caps.length, 2)
  assert.ok(near(sum(result.history.map((r) => r.delta)), 0))
})

test("farm qua giải trước: chỉ người vi phạm ΔR = 0", () => {
  seq = 0
  const prior = [1, 2].map((d) => ({
    matchId: `old${d}`,
    matchType: "friendly",
    date: new Date(Date.UTC(2026, 10, 10 - d)),
    teamA: ["x"],
    teamB: ["y"],
    isVerified: true,
    isAdminVerified: false,
    isWalkover: false,
    isKZero: false,
  }))
  const result = processTournament({
    eventId: "T5",
    matchType: "friendly",
    matches: [match(["x"], ["y"], 21, 10, { phase: "none" })],
    profiles: {},
    priorMatches: prior,
  })
  assert.deepEqual(result.history.map((r) => [r.player, r.delta, r.reason]), [
    ["x", 0, "farm_zero"],
    ["y", 0, "farm_zero"],
  ])
})

function memoryStore(event, matches, initial = {}) {
  const state = { event: { ...event, processingLock: false, processedAt: null }, profiles: { ...initial }, history: [], claims: 0 }
  return {
    state,
    async claim() {
      state.claims++
      if (state.event.processingLock || state.event.processedAt) return false
      state.event.processingLock = true
      return true
    },
    async getEvent() { return state.event },
    async getMatches() { return matches },
    async getPriorMatches() { return [] },
    async getProfiles(ids) {
      return Object.fromEntries(ids.filter((id) => state.profiles[id]).map((id) => [id, { ...state.profiles[id] }]))
    },
    async saveResults(_eventId, history, profiles) {
      state.history.push(...history)
      for (const [id, p] of Object.entries(profiles)) state.profiles[id] = { ...p }
    },
    async markProcessed(_eventId, at) {
      state.event.processedAt = at
      state.event.processingLock = false
    },
    async release() { state.event.processingLock = false },
  }
}

test("nghiệm thu 2: đóng giải hai lần, MR không đổi ở lần hai", async () => {
  const store = memoryStore({ id: "T1", matchType: "community", isDemo: false }, roundRobin(), profiles())
  const first = await closeTournament(store, "T1")
  assert.equal(first.status, "processed")
  const afterFirst = JSON.stringify(store.state.profiles)
  const historyCount = store.state.history.length
  const second = await closeTournament(store, "T1")
  assert.equal(second.status, "already_processed")
  assert.equal(JSON.stringify(store.state.profiles), afterFirst)
  assert.equal(store.state.history.length, historyCount)
})

test("lỗi giữa chừng mở khóa để admin đóng lại được, không ghi nửa chừng", async () => {
  const store = memoryStore({ id: "T1", matchType: "community", isDemo: false }, roundRobin(), profiles())
  store.saveResults = async () => { throw new Error("db down") }
  await assert.rejects(() => closeTournament(store, "T1"), /db down/)
  assert.equal(store.state.event.processingLock, false)
  assert.equal(store.state.event.processedAt, null)
})

test("giải minh họa (isDemo) không tạo MR thật", async () => {
  const store = memoryStore({ id: "D1", matchType: "community", isDemo: true }, roundRobin(), {})
  const result = await closeTournament(store, "D1")
  assert.equal(result.demo, true)
  assert.equal(store.state.history.length, 0)
  assert.deepEqual(store.state.profiles, {})
})

test("giải chính thức gọi bước AP riêng, không đổi MR", async () => {
  const store = memoryStore({ id: "O1", matchType: "official", isDemo: false }, roundRobin(), profiles())
  let apCalls = 0
  store.recordAchievements = async () => { apCalls++ }
  const reference = processTournament({ eventId: "O1", matchType: "official", matches: roundRobin(), profiles: profiles(), priorMatches: [] })
  await closeTournament(store, "O1")
  assert.equal(apCalls, 1)
  assert.equal(store.state.profiles.p1.mr, reference.profiles.p1.mr)
})

test("nghiệm thu 3: hai tài khoản cùng deviceId không làm tăng số đối thủ khác nhau", () => {
  seq = 0
  const matches = [match(["me"], ["alt1"], 21, 10), match(["me"], ["alt2"], 21, 12), match(["me"], ["real"], 21, 15)]
  const devices = { me: { deviceId: "M" }, alt1: { deviceId: "SAME" }, alt2: { deviceId: "SAME" }, real: { deviceId: "R" } }
  assert.equal(uniqueOpponentsInTournament(matches, "me", "community", devices), 2)
  assert.equal(uniqueOpponentsInTournament(matches, "me", "community", {}), 3)
})

test("nghiệm thu 4: chuyển trạng thái sai thứ tự bị từ chối", () => {
  const admin = { isAdmin: true }
  const rejected = [
    ["draft", "in_progress"],
    ["draft", "closed_processed"],
    ["registration_open", "pending_approval"],
    ["in_progress", "registration_open"],
    ["closed_processed", "pending_approval"],
    ["closed_processed", "cancelled"],
    ["cancelled", "draft"],
  ]
  for (const [from, to] of rejected) assert.equal(checkTransition(from, to, admin).ok, false, `${from} → ${to}`)
  const accepted = [
    ["draft", "registration_open"],
    ["registration_open", "in_progress"],
    ["in_progress", "pending_approval"],
    ["pending_approval", "closed_processed"],
  ]
  for (const [from, to] of accepted) assert.equal(checkTransition(from, to, admin).ok, true, `${from} → ${to}`)
  for (const from of TOURNAMENT_STATUSES.filter((s) => s !== "closed_processed" && s !== "cancelled"))
    assert.equal(checkTransition(from, "cancelled", admin).ok, true, `${from} → cancelled`)
  assert.equal(checkTransition("pending_approval", "closed_processed", { isAdmin: false }).ok, false)
})

const compile = async (path, replacements = []) => {
  let source = await readFile(new URL(path, import.meta.url), "utf8")
  for (const [from, to] of replacements) source = source.replaceAll(from, JSON.stringify(to))
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`)
}

test("nghiệm thu 5: người khác không đọc được rating-profiles của người khác", async () => {
  const roles = new URL("../src/access/roles.ts", import.meta.url).href
  const { RatingProfiles } = await compile("../src/collections/RatingProfiles.ts", [['"../access/roles"', roles]])
  const read = RatingProfiles.access.read
  const owner = { id: "owner", collection: "users", role: "user" }
  const outsider = { id: "outsider", collection: "users", role: "user" }
  assert.equal(read({ req: { user: null } }), false)
  assert.deepEqual(read({ req: { user: outsider } }), { user: { equals: "outsider" } })
  assert.notDeepEqual(read({ req: { user: outsider } }), { user: { equals: owner.id } })
  assert.equal(read({ req: { user: { id: "a", collection: "admins" } } }), true)
  for (const op of ["create", "update", "delete"]) assert.equal(RatingProfiles.access[op]({ req: { user: owner } }), false)
  const deviceField = RatingProfiles.fields.find((f) => f.name === "deviceId")
  assert.equal(deviceField.access.read({ req: { user: owner } }), false)
  const isPublic = RatingProfiles.fields.find((f) => f.name === "isPublic")
  assert.equal(isPublic.defaultValue, false)
})
