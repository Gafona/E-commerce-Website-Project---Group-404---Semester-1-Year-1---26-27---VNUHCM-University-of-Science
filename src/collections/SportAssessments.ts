import { randomUUID } from "node:crypto"
import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
  FieldHook,
} from "payload"
import {
  ASSESSMENT_SCHEMA,
  parseAssessmentInput,
  scoreAssessment,
} from "../lib/sportdna-assessment"

const ownerAccess: Access = ({ req }) => {
  if (req.user?.collection === "admins") return true
  if (req.user?.collection !== "users") return false
  return { owner: { equals: req.user.id } }
}

const assignOwner: FieldHook = ({ req, value }) =>
  req.user?.collection === "users" ? req.user.id : value

const adminField: FieldAccess = ({ req }) => req.user?.collection === "admins"
// Kết quả luôn được tính lại ở server từ bài làm đã lọc; không tin kết quả gửi lên.
const computeResult: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || req.user?.collection !== "users") return data
  const input = parseAssessmentInput(data.answers)
  if (!input) throw new Error("Bài làm không hợp lệ.")
  const result = scoreAssessment(input)
  return {
    ...data,
    sport: "badminton",
    mode: result.mode,
    assessmentKey: randomUUID(),
    status: "completed",
    answers: input,
    growth: null,
    result,
    ratingSystem: "elo_item_v2",
    schemaVersion: ASSESSMENT_SCHEMA,
  }
}

export const SportAssessments: CollectionConfig = {
  slug: "sport-assessments",
  labels: {
    singular: "Bài chẩn đoán thể thao",
    plural: "Bài chẩn đoán thể thao",
  },
  admin: {
    group: "SportDNA",
    useAsTitle: "assessmentKey",
    defaultColumns: ["assessmentKey", "sport", "mode", "owner", "createdAt"],
  },
  access: {
    create: ({ req }) => req.user?.collection === "users",
    read: ownerAccess,
    update: ({ req }) => req.user?.collection === "admins",
    delete: ownerAccess,
  },
  hooks: { beforeValidate: [computeResult] },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      hooks: { beforeValidate: [assignOwner] },
    },
    {
      name: "assessmentKey",
      type: "text",
      required: true,
      index: true,
      admin: { readOnly: true },
      access: { create: adminField, update: adminField },
    },
    {
      name: "sport",
      type: "select",
      required: true,
      options: ["football", "badminton"],
    },
    {
      name: "mode",
      type: "select",
      required: true,
      options: ["quick", "deep"],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "completed",
      options: ["in_progress", "completed"],
      access: { create: adminField, update: adminField },
    },
    { name: "answers", type: "json", required: true },
    { name: "growth", type: "json" },
    {
      name: "result",
      type: "json",
      required: true,
      access: { create: adminField, update: adminField },
    },
    {
      name: "ratingSystem",
      type: "text",
      defaultValue: "elo_item_v2",
      access: { create: adminField, update: adminField },
    },
    {
      name: "schemaVersion",
      type: "text",
      defaultValue: "v6.0",
      access: { create: adminField, update: adminField },
    },
  ],
}
