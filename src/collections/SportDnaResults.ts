import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess } from "payload"
import { APIError } from "payload"
import { isStaff } from "../access/roles"
import { parseCoreAnswers, sanitizeContext, scoreCore } from "../lib/sportdna-core"

// One document per SportDNA attempt, per sport. Retakes add a new document, so
// earlier scores stay in the history; the newest one is the current profile.

const ownerOrStaff: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { owner: { equals: req.user.id } }
}
const serverOnly: FieldAccess = () => false

const computeResult: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (!data || operation !== "create" || req.user?.collection !== "users") return data
  const sport = data.sport === "football" ? "football" : data.sport === "badminton" ? "badminton" : null
  if (!sport) throw new APIError("Môn thể thao không hợp lệ.", 400, null, true)
  const answers = parseCoreAnswers(sport, data.answers)
  if (!answers) throw new APIError("Bài làm chưa trả lời đủ các tình huống.", 400, null, true)
  const previous = await req.payload.find({
    collection: "sportdna-results",
    where: { and: [{ owner: { equals: req.user.id } }, { sport: { equals: sport } }] },
    sort: "-createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const last = previous.docs[0]
  const context = sanitizeContext(sport, data.context)
  // The score is always recomputed on the server; client-sent results are ignored.
  const result = scoreCore(sport, answers, context, last ? { elo: Number(last.elo), attempt: Number(last.attempt ?? 1) } : null)
  if (!result) throw new APIError("Bài làm không hợp lệ.", 400, null, true)
  return {
    ...data,
    owner: req.user.id,
    sport,
    answers,
    context,
    result,
    elo: result.elo,
    attempt: result.attempt,
    tierName: result.tier.name,
    consistent: result.consistency.ok,
  }
}

export const SportDnaResults: CollectionConfig = {
  slug: "sportdna-results",
  labels: { singular: "Kết quả SportDNA", plural: "Kết quả SportDNA" },
  admin: { group: "SportDNA", useAsTitle: "tierName", defaultColumns: ["owner", "sport", "elo", "tierName", "attempt", "createdAt"] },
  access: {
    create: ({ req }) => req.user?.collection === "users",
    read: ownerOrStaff,
    // History is append-only for members: retakes never overwrite earlier scores.
    update: ({ req }) => isStaff(req.user),
    delete: ({ req }) => isStaff(req.user),
  },
  hooks: { beforeValidate: [computeResult] },
  fields: [
    { name: "owner", type: "relationship", relationTo: "users", required: true, index: true, access: { update: serverOnly } },
    { name: "sport", type: "select", required: true, index: true, options: ["badminton", "football"], access: { update: serverOnly } },
    { name: "attempt", type: "number", min: 1, access: { create: serverOnly, update: serverOnly } },
    { name: "elo", type: "number", access: { create: serverOnly, update: serverOnly } },
    { name: "tierName", type: "text", access: { create: serverOnly, update: serverOnly } },
    { name: "consistent", type: "checkbox", defaultValue: true, access: { create: serverOnly, update: serverOnly } },
    { name: "context", type: "json" },
    { name: "answers", type: "json", required: true, access: { update: serverOnly } },
    { name: "result", type: "json", access: { create: serverOnly, update: serverOnly } },
  ],
}
