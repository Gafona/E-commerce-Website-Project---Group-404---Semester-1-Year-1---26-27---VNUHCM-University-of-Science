import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess, FieldHook } from "payload"
import { computeRun, isTestKind, RUN_KEY_PATTERN, TEST_META } from "../lib/sportdna-runs"

// Lượt làm bài SportDNA ngoài bài đánh đơn: đôi, bóng đá, Quick theo môn, luyện tập, gợi ý vị trí.
const ownerAccess: Access = ({ req }) => {
  if (req.user?.collection === "admins") return true
  if (req.user?.collection !== "users") return false
  return { owner: { equals: req.user.id } }
}
const assignOwner: FieldHook = ({ req, value }) => (req.user?.collection === "users" ? req.user.id : value)
const adminField: FieldAccess = ({ req }) => req.user?.collection === "admins"

// Kết quả luôn được chấm lại ở server từ bài làm; không tin kết quả gửi lên.
const computeResult: CollectionBeforeValidateHook = ({ data, req, operation }) => {
  if (!data || operation !== "create" || req.user?.collection !== "users") return data
  if (!isTestKind(data.test)) throw new Error("Loại bài test không hợp lệ.")
  if (typeof data.runKey !== "string" || !RUN_KEY_PATTERN.test(data.runKey)) throw new Error("Mã lượt làm bài không hợp lệ.")
  const computed = computeRun(data.test, data.answers)
  if (!computed) throw new Error("Bài làm không hợp lệ.")
  const meta = TEST_META[data.test]
  return { ...data, sport: meta.sport, countsElo: meta.countsElo, answers: computed.answers, result: computed.result }
}

export const SportTestRuns: CollectionConfig = {
  slug: "sport-test-runs",
  labels: { singular: "Lượt làm bài SportDNA", plural: "Lượt làm bài SportDNA" },
  admin: {
    group: "SportDNA",
    useAsTitle: "runKey",
    defaultColumns: ["test", "owner", "countsElo", "createdAt"],
  },
  access: {
    create: ({ req }) => req.user?.collection === "users",
    read: ownerAccess,
    update: ({ req }) => req.user?.collection === "admins",
    delete: ownerAccess,
  },
  hooks: { beforeValidate: [computeResult] },
  fields: [
    { name: "owner", type: "relationship", relationTo: "users", required: true, index: true, hooks: { beforeValidate: [assignOwner] } },
    { name: "runKey", type: "text", required: true, index: true, admin: { readOnly: true } },
    {
      name: "test",
      type: "select",
      required: true,
      options: Object.entries(TEST_META).map(([value, m]) => ({ value, label: m.label })),
    },
    { name: "sport", type: "select", required: true, options: ["badminton", "football"], access: { update: adminField } },
    { name: "countsElo", type: "checkbox", defaultValue: false, access: { update: adminField } },
    { name: "answers", type: "json", required: true },
    { name: "result", type: "json", required: true, access: { update: adminField } },
  ],
}
