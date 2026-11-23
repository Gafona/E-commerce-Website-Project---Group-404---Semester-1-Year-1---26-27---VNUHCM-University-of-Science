import {
  APIError,
  type Access,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type FieldAccess,
  type PayloadRequest,
  type Where,
} from "payload"
import { isStaff, isSuspended } from "../access/roles"
import { notifyAdmins, notifyUsers } from "../lib/notifications"
import { checkTransition, isTournamentStatus, TOURNAMENT_STATUSES } from "../lib/rating/tournamentLifecycle"
import { closeTournament } from "../lib/rating/tournamentClose"
import { createPayloadTournamentStore } from "../lib/rating/tournamentPayloadStore"

// Giải đấu và lịch sử Match Rating (E7, M1: cầu lông đơn/đôi).
// Tiền tố tournament- để không trùng collection `events` (khuyến mãi của shop).

const GROUP = "Giải đấu"
const staffAccess: Access = ({ req }) => isStaff(req.user)
const systemOnly: FieldAccess = () => false
const SYSTEM = "ratingSystem"

const idOf = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null
  if (typeof value === "object") {
    const v = value as { id?: unknown; value?: unknown }
    if (v.value !== undefined) return idOf(v.value)
    return v.id === undefined ? null : String(v.id)
  }
  return String(value)
}
const ids = (value: unknown) =>
  (Array.isArray(value) ? value : []).map(idOf).filter((v): v is string => Boolean(v))

const actorRef = (req: PayloadRequest) =>
  req.user && (req.user.collection === "admins" || req.user.collection === "users")
    ? { relationTo: req.user.collection, value: req.user.id }
    : undefined

/** Người tham gia hoặc staff. */
const participantOrStaff =
  (fields: string[]): Access =>
  ({ req }) => {
    if (isStaff(req.user)) return true
    if (req.user?.collection !== "users") return false
    return { or: fields.map((f) => ({ [f]: { equals: req.user!.id } })) }
  }

async function loadEvent(req: PayloadRequest, id: string | null) {
  if (!id) throw new APIError("Thiếu giải đấu.", 400)
  return req.payload.findByID({
    collection: "tournament-events",
    id,
    depth: 0,
    overrideAccess: true,
    req,
  })
}

const lockedStatuses = new Set(["closed_processed", "cancelled"])

// ---------- tournament-events ----------

const eventLifecycle: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req, context }) => {
  if (context?.[SYSTEM]) return data
  if (operation === "create") {
    return { ...data, status: "draft", createdBy: actorRef(req), processedAt: null, processingLock: false }
  }
  const from = originalDoc?.status
  const to = data.status ?? from
  if (!isTournamentStatus(from) || !isTournamentStatus(to))
    throw new APIError("Trạng thái giải không hợp lệ.", 400)
  const check = checkTransition(from, to, { isAdmin: isStaff(req.user) })
  if (!check.ok) throw new APIError(check.reason, 400)
  return data
}

const processOnClose: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  if (context?.[SYSTEM] || operation !== "update") return doc
  if (previousDoc?.status === "pending_approval" && doc.status === "closed_processed") {
    // Cùng req → cùng transaction nếu adapter hỗ trợ; lỗi sẽ hoàn tác cả lần đóng giải.
    await closeTournament(createPayloadTournamentStore(req), String(doc.id))
  }
  return doc
}

export const TournamentEvents: CollectionConfig = {
  slug: "tournament-events",
  labels: { singular: "Giải đấu", plural: "Giải đấu" },
  admin: {
    // Giải đấu đã gỡ khỏi giao diện; collection giữ lại để không mất dữ liệu cũ.
    hidden: true,
    group: GROUP,
    useAsTitle: "name",
    defaultColumns: ["name", "format", "matchType", "status", "startDate", "isDemo"],
  },
  // Demo tournaments are visible to staff only, so sample data never mixes with real events.
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { isDemo: { not_equals: true } }),
    create: staffAccess,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: { beforeChange: [eventLifecycle], afterChange: [processOnClose] },
  fields: [
    { name: "name", type: "text", required: true, maxLength: 160 },
    { name: "sport", type: "select", required: true, defaultValue: "badminton", options: [{ label: "Cầu lông", value: "badminton" }] },
    { name: "format", type: "select", required: true, options: [{ label: "Đơn", value: "singles" }, { label: "Đôi", value: "doubles" }] },
    {
      name: "matchType",
      type: "select",
      required: true,
      options: [
        { label: "Giao hữu (V1, K 10)", value: "friendly" },
        { label: "Cộng đồng (V2, K 24)", value: "community" },
        { label: "Chính thức (V3, K 32)", value: "official" },
      ],
    },
    {
      name: "competitionLevel",
      type: "select",
      options: ["club", "school_local", "provincial", "national", "international", "continental_world"],
      admin: {
        condition: (data) => data?.matchType === "official",
        description: "Chỉ dùng để sinh bản ghi AP cho giải chính thức. Không ảnh hưởng MR.",
      },
    },
    { name: "startDate", type: "date", required: true },
    { name: "registrationDeadline", label: "Hạn đăng ký", type: "date", admin: { description: "Để trống: nhận đăng ký tới khi giải chuyển sang thi đấu." } },
    { name: "venue", type: "text", maxLength: 200 },
    { name: "description", label: "Giới thiệu, điều lệ", type: "textarea", maxLength: 2000 },
    { name: "maxEntries", label: "Số đơn vị tối đa", type: "number", min: 2, max: 512, admin: { description: "Số người (đơn) hoặc cặp (đôi). Để trống nếu không giới hạn." } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: TOURNAMENT_STATUSES.map((value) => ({ label: value, value })),
    },
    { name: "createdBy", type: "relationship", relationTo: ["admins", "users"], admin: { readOnly: true }, access: { create: systemOnly, update: systemOnly } },
    { name: "isDemo", type: "checkbox", defaultValue: false, admin: { description: "Dữ liệu minh họa: hiện chữ \"minh họa\", không tạo MR thật." } },
    { name: "processedAt", type: "date", admin: { readOnly: true }, access: { create: systemOnly, update: systemOnly } },
    { name: "processingLock", type: "checkbox", defaultValue: false, admin: { readOnly: true }, access: { create: systemOnly, update: systemOnly } },
  ],
}

// ---------- tournament-registrations ----------

async function assertEligible(req: PayloadRequest, playerIds: string[]) {
  for (const id of playerIds) {
    const account = await req.payload
      .findByID({ collection: "users", id, depth: 0, overrideAccess: true, select: { moderation: true }, req })
      .catch(() => null)
    if (!account) throw new APIError("Không tìm thấy người chơi.", 400)
    if (isSuspended(account)) throw new APIError("Tài khoản người chơi đang bị khóa.", 400)
    const profile = await req.payload.find({
      collection: "community-profiles",
      where: { account: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const p = profile.docs[0]
    if (p?.demo) throw new APIError("Hồ sơ minh họa không được đăng ký giải.", 400)
    if (p?.kind === "shop") throw new APIError("Tài khoản shop không được đăng ký giải.", 400)
  }
}

const ACTIVE_REGISTRATION = ["pending", "approved"]

const validateRegistration: CollectionBeforeValidateHook = async ({ data, originalDoc, req, operation }) => {
  if (!data) return data
  const eventId = idOf(data.event ?? originalDoc?.event)
  const event = await loadEvent(req, eventId)
  const players = ids(data.players ?? originalDoc?.players)
  const expected = event.format === "doubles" ? 2 : 1
  if (players.length !== expected || new Set(players).size !== expected)
    throw new APIError(`Giải ${event.format === "doubles" ? "đôi cần đúng 2" : "đơn cần đúng 1"} người chơi.`, 400)
  const staff = isStaff(req.user)
  if (operation === "create") {
    if (!staff) {
      // Members register themselves (and, for doubles, one partner); review stays with staff.
      if (req.user?.collection !== "users") throw new APIError("Vui lòng đăng nhập để đăng ký giải.", 401)
      if (!players.includes(String(req.user.id))) throw new APIError("Bạn phải là một người chơi trong đăng ký.", 400)
      if (event.isDemo) throw new APIError("Giải minh họa không nhận đăng ký.", 400)
      if (event.status !== "registration_open") throw new APIError("Giải không còn nhận đăng ký.", 400)
      if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() < Date.now())
        throw new APIError("Đã hết hạn đăng ký giải này.", 400)
      data.registeredBy = req.user.id
      data.status = "pending"
      data.reviewNote = null
    } else if (!["draft", "registration_open"].includes(String(event.status))) {
      throw new APIError("Giải không còn nhận đăng ký.", 400)
    }
    const active = await req.payload.find({
      collection: "tournament-registrations",
      where: { and: [{ event: { equals: event.id } }, { status: { in: ACTIVE_REGISTRATION } }] },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { players: true },
      req,
    })
    const taken = new Set(active.docs.flatMap((r) => ids(r.players)))
    if (players.some((p) => taken.has(p))) throw new APIError("Một người chơi đã có đăng ký trong giải này.", 400)
    if (event.maxEntries && active.docs.length >= event.maxEntries) throw new APIError("Giải đã đủ số lượng đăng ký.", 400)
  }
  const before = ids(originalDoc?.players).sort().join("|")
  if (operation === "create" || before !== [...players].sort().join("|")) await assertEligible(req, players)
  return data
}

const notifyRegistration: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const players = ids(doc.players)
  const eventId = idOf(doc.event)
  const event = await req.payload
    .findByID({ collection: "tournament-events", id: eventId!, depth: 0, overrideAccess: true, select: { name: true }, req })
    .catch(() => null)
  const name = event?.name ?? "giải đấu"
  const href = `/giai-dau/${eventId}`
  if (operation === "create") {
    const by = idOf(doc.registeredBy)
    const partners = players.filter((p) => p !== by)
    if (by && partners.length) {
      const author = await req.payload
        .findByID({ collection: "users", id: by, depth: 0, overrideAccess: true, select: { name: true }, req })
        .catch(() => null)
      await notifyUsers(req, partners, {
        category: "event",
        kind: "tournament-partner",
        title: `${author?.name ?? "Đồng đội"} đã đăng ký ${name} cùng bạn`,
        message: "Đăng ký đang chờ ban tổ chức duyệt. Bạn có thể rút khỏi đăng ký trong trang giải.",
        href,
      })
    }
    await notifyAdmins(req, {
      category: "event",
      kind: "admin-tournament-registration",
      title: `Đăng ký mới: ${name}`,
      message: `${players.length} người chơi chờ duyệt.`,
      href: `/quan-tri/giai-dau/${eventId}`,
    })
    return doc
  }
  if (previousDoc?.status === doc.status) return doc
  if (doc.status === "approved" || doc.status === "rejected") {
    await notifyUsers(req, players, {
      category: "event",
      kind: `tournament-registration-${doc.status}`,
      title: doc.status === "approved" ? `Đăng ký ${name} đã được duyệt` : `Đăng ký ${name} bị từ chối`,
      message:
        doc.status === "approved"
          ? "Hẹn gặp bạn ở giải. Lịch thi đấu sẽ được ban tổ chức cập nhật."
          : doc.reviewNote || "Ban tổ chức chưa thể nhận đăng ký này.",
      href,
    })
  }
  return doc
}

/** Người rút lui: giữ trận đã đấu, vô hiệu trận chưa có kết quả. */
const voidOnWithdraw: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== "withdrawn" || previousDoc?.status === "withdrawn") return doc
  const players = ids(doc.players)
  const event = idOf(doc.event)
  const pending = await req.payload.find({
    collection: "tournament-matches",
    where: {
      and: [
        { event: { equals: event } },
        { isVoided: { not_equals: true } },
        { or: [{ scoreA: { exists: false } }, { scoreB: { exists: false } }] },
        { or: players.flatMap((p): Where[] => [{ teamA: { equals: p } }, { teamB: { equals: p } }]) },
      ],
    },
    limit: 500,
    depth: 0,
    overrideAccess: true,
    req,
  })
  for (const match of pending.docs) {
    await req.payload.update({
      collection: "tournament-matches",
      id: match.id,
      data: { isVoided: true },
      overrideAccess: true,
      req,
      context: { [SYSTEM]: true },
    })
  }
  return doc
}

export const TournamentRegistrations: CollectionConfig = {
  slug: "tournament-registrations",
  labels: { singular: "Đăng ký giải", plural: "Đăng ký giải" },
  admin: { hidden: true, group: GROUP, defaultColumns: ["event", "players", "status"] },
  access: {
    read: participantOrStaff(["players", "registeredBy"]),
    // Members create their own pending entry; the hook validates event, players and duplicates.
    create: ({ req }) => isStaff(req.user) || req.user?.collection === "users",
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: { beforeValidate: [validateRegistration], afterChange: [voidOnWithdraw, notifyRegistration] },
  fields: [
    { name: "event", type: "relationship", relationTo: "tournament-events", required: true, index: true },
    { name: "players", type: "relationship", relationTo: "users", hasMany: true, required: true, minRows: 1, maxRows: 2 },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      access: { create: ({ req }) => isStaff(req.user), update: ({ req }) => isStaff(req.user) },
      options: [
        { label: "Chờ duyệt", value: "pending" },
        { label: "Đã duyệt", value: "approved" },
        { label: "Từ chối", value: "rejected" },
        { label: "Rút lui", value: "withdrawn" },
      ],
    },
    { name: "registeredBy", label: "Người đăng ký", type: "relationship", relationTo: "users", access: { create: systemOnly, update: systemOnly }, admin: { readOnly: true } },
    { name: "reviewNote", label: "Lý do / ghi chú duyệt", type: "textarea", maxLength: 500, access: { create: ({ req }) => isStaff(req.user), update: ({ req }) => isStaff(req.user) } },
  ],
}

// ---------- tournament-matches ----------

const validateMatch: CollectionBeforeValidateHook = async ({ data, originalDoc, req, context }) => {
  if (!data || context?.[SYSTEM]) return data
  const event = await loadEvent(req, idOf(data.event ?? originalDoc?.event))
  if (lockedStatuses.has(String(event.status)))
    throw new APIError("Giải đã đóng hoặc đã hủy. Sửa sai sau khi đóng phải dùng bản ghi reversal.", 400)
  const teamA = ids(data.teamA ?? originalDoc?.teamA)
  const teamB = ids(data.teamB ?? originalDoc?.teamB)
  const size = event.format === "doubles" ? 2 : 1
  if (teamA.length !== size || teamB.length !== size)
    throw new APIError(`Mỗi đội cần đúng ${size} người chơi.`, 400)
  if (new Set([...teamA, ...teamB]).size !== size * 2)
    throw new APIError("Một người không thể có mặt ở cả hai đội.", 400)
  const registered = await req.payload.find({
    collection: "tournament-registrations",
    where: { and: [{ event: { equals: event.id } }, { status: { equals: "approved" } }] },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const allowed = new Set(registered.docs.flatMap((r) => ids(r.players)))
  if ([...teamA, ...teamB].some((p) => !allowed.has(p)))
    throw new APIError("Mọi người chơi phải có đăng ký đã duyệt trong giải.", 400)
  return data
}

const stampMatch: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req, context }) => {
  if (context?.[SYSTEM]) return data
  const next = { ...data }
  if (operation === "create") next.enteredBy = actorRef(req)
  const approving = data.isApproved === true && originalDoc?.isApproved !== true
  if (approving) {
    if (!isStaff(req.user)) throw new APIError("Chỉ admin được duyệt kết quả.", 403)
    next.approvedBy = actorRef(req)
  }
  if (data.isApproved === false) next.approvedBy = null
  return next
}

export const TournamentMatches: CollectionConfig = {
  slug: "tournament-matches",
  labels: { singular: "Trận đấu", plural: "Trận đấu" },
  admin: { hidden: true, group: GROUP, defaultColumns: ["event", "teamA", "teamB", "scoreA", "scoreB", "isApproved", "playedAt"] },
  access: { read: participantOrStaff(["teamA", "teamB"]), create: staffAccess, update: staffAccess, delete: staffAccess },
  hooks: { beforeValidate: [validateMatch], beforeChange: [stampMatch] },
  fields: [
    { name: "event", type: "relationship", relationTo: "tournament-events", required: true, index: true },
    { name: "teamA", type: "relationship", relationTo: "users", hasMany: true, required: true, minRows: 1, maxRows: 2 },
    { name: "teamB", type: "relationship", relationTo: "users", hasMany: true, required: true, minRows: 1, maxRows: 2 },
    {
      name: "phase",
      type: "select",
      required: true,
      defaultValue: "none",
      options: [
        { label: "Vòng bảng", value: "group" },
        { label: "Loại trực tiếp", value: "knockout" },
        { label: "Không phân vòng", value: "none" },
      ],
    },
    { name: "playedAt", type: "date", required: true, admin: { description: "Thứ tự xử lý rating theo thời điểm này, không theo thứ tự lưu." } },
    { name: "scoreA", type: "number", min: 0 },
    { name: "scoreB", type: "number", min: 0 },
    { name: "enteredBy", type: "relationship", relationTo: ["admins", "users"], admin: { readOnly: true }, access: { create: systemOnly, update: systemOnly } },
    { name: "confirmedBy", type: "relationship", relationTo: "users", hasMany: true, admin: { description: "Giao hữu (V1): mỗi đội cần ít nhất một người xác nhận." } },
    { name: "isApproved", type: "checkbox", defaultValue: false, admin: { description: "Admin duyệt (bắt buộc với giải cộng đồng và chính thức)." } },
    { name: "approvedBy", type: "relationship", relationTo: ["admins", "users"], admin: { readOnly: true }, access: { create: systemOnly, update: systemOnly } },
    { name: "isWalkover", type: "checkbox", defaultValue: false },
    { name: "isDisputed", type: "checkbox", defaultValue: false, admin: { description: "Đang tranh chấp: giữ chờ, không tính rating." } },
    { name: "isVoided", type: "checkbox", defaultValue: false, admin: { description: "Vô hiệu (vd người chơi rút lui trước khi đấu)." } },
  ],
}

// ---------- tournament-results ----------

export const TournamentResults: CollectionConfig = {
  slug: "tournament-results",
  labels: { singular: "Kết quả giải", plural: "Kết quả giải" },
  admin: { hidden: true, group: GROUP, defaultColumns: ["event", "player", "finalRank", "wins", "losses"] },
  access: { read: participantOrStaff(["player"]), create: staffAccess, update: staffAccess, delete: staffAccess },
  fields: [
    { name: "event", type: "relationship", relationTo: "tournament-events", required: true, index: true },
    { name: "player", type: "relationship", relationTo: "users", required: true, index: true },
    { name: "finalRank", type: "number", min: 1 },
    { name: "wins", type: "number", min: 0, defaultValue: 0 },
    { name: "losses", type: "number", min: 0, defaultValue: 0 },
  ],
}

// ---------- match-rating-history ----------

/** Admin chỉ được tạo dòng reversal; hệ thống ghi các dòng khác với context SYSTEM. */
const prepareReversal: CollectionBeforeValidateHook = async ({ data, operation, req, context }) => {
  if (!data || context?.[SYSTEM] || operation !== "create") return data
  const originalId = idOf(data.reversalOf)
  if (data.reason !== "reversal" || !originalId)
    throw new APIError("Chỉ được tạo bản ghi reversal, kèm dòng lịch sử gốc.", 400)
  const original = await req.payload.findByID({ collection: "match-rating-history", id: originalId, depth: 0, overrideAccess: true, req })
  if (original.reason === "reversal") throw new APIError("Không đảo một bản ghi reversal.", 400)
  const existing = await req.payload.find({
    collection: "match-rating-history",
    where: { reversalOf: { equals: originalId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.totalDocs) throw new APIError("Dòng lịch sử này đã được đảo.", 400)
  const player = idOf(original.player)
  const profile = await req.payload.find({
    collection: "rating-profiles",
    where: { user: { equals: player } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const before = Number(profile.docs[0]?.mr ?? 1000)
  const delta = -Number(original.delta ?? 0)
  return {
    ...data,
    player,
    event: idOf(original.event),
    match: idOf(original.match),
    mrBefore: before,
    mrAfter: before + delta,
    delta,
    kMatch: null,
    reason: "reversal",
    // Mỗi dòng gốc chỉ đảo được một lần; unique chặn cả khi hai yêu cầu chạy song song.
    idempotencyKey: `reversal:${originalId}`,
    occurredAt: new Date().toISOString(),
  }
}

const applyReversal: CollectionAfterChangeHook = async ({ doc, operation, req, context }) => {
  if (context?.[SYSTEM] || operation !== "create" || doc.reason !== "reversal") return doc
  const player = idOf(doc.player)
  const found = await req.payload.find({
    collection: "rating-profiles",
    where: { user: { equals: player } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const profile = found.docs[0]
  if (profile) {
    await req.payload.update({
      collection: "rating-profiles",
      id: profile.id,
      data: { mr: doc.mrAfter },
      overrideAccess: true,
      req,
      context: { [SYSTEM]: true },
    })
  }
  return doc
}

export const MatchRatingHistory: CollectionConfig = {
  slug: "match-rating-history",
  labels: { singular: "Lịch sử MR", plural: "Lịch sử MR" },
  admin: { hidden: true, group: GROUP, defaultColumns: ["player", "event", "delta", "reason", "createdAt"] },
  access: {
    read: participantOrStaff(["player"]),
    create: staffAccess,
    update: () => false,
    delete: () => false,
  },
  hooks: { beforeValidate: [prepareReversal], afterChange: [applyReversal] },
  fields: [
    { name: "player", type: "relationship", relationTo: "users", required: true, index: true },
    { name: "event", type: "relationship", relationTo: "tournament-events", index: true },
    { name: "match", type: "relationship", relationTo: "tournament-matches" },
    { name: "mrBefore", type: "number", required: true },
    { name: "mrAfter", type: "number", required: true },
    { name: "delta", type: "number", required: true },
    { name: "kMatch", type: "number" },
    {
      name: "reason",
      type: "select",
      required: true,
      options: ["normal", "farm_zero", "growth_cap", "tournament_cap", "reversal"],
    },
    { name: "reversalOf", type: "relationship", relationTo: "match-rating-history", admin: { description: "Chỉ dùng cho reason = reversal." } },
    {
      name: "idempotencyKey",
      type: "text",
      unique: true,
      index: true,
      admin: { readOnly: true, description: "{eventId}:{matchId|cap}:{userId}:{reason} — hệ thống ghi, chống ghi trùng khi đóng lại giải." },
      access: { create: systemOnly, update: systemOnly },
    },
    {
      name: "occurredAt",
      type: "date",
      admin: { readOnly: true, description: "Thời điểm trận; dùng để tính lại hồ sơ MR từ lịch sử." },
      access: { create: systemOnly, update: systemOnly },
    },
  ],
}
