import type {
  Access,
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
  FieldHook,
} from "payload"
import { createHash } from "node:crypto"
import { isStaff } from "../access/roles"
import { notifyUsers } from "../lib/notifications"

const ownerAccess: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { owner: { equals: req.user.id } }
}
/** Members always own what they submit and can never reassign it. */
const assignOwner: FieldHook = ({ req, value, operation, originalDoc }) => {
  if (isStaff(req.user)) return value
  if (req.user?.collection !== "users") return value
  return operation === "create" ? req.user.id : (originalDoc?.owner ?? req.user.id)
}
// Review fields belong to BOAI moderators (CMS editors or app admins).
const reviewField: FieldAccess = ({ req }) => isStaff(req.user)

const protectWorkflow: CollectionBeforeValidateHook = ({ data, req }) => {
  if (!data || req.user?.collection !== "users" || isStaff(req.user)) return data
  // Every member edit (first submission, edit, resubmission) goes back to review.
  return {
    ...data,
    eventFingerprint: createHash("sha256")
      .update(
        [
          req.user.id,
          data.sport,
          String(data.eventName ?? "")
            .trim()
            .toLocaleLowerCase("vi"),
          data.rank,
          data.fieldSize,
        ].join("|"),
      )
      .digest("hex"),
    verificationStatus: "pending",
    officialPoints: null,
    reviewNote: null,
    reviewedAt: null,
  }
}

const stampReview: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (data && isStaff(req.user) && data.verificationStatus && data.verificationStatus !== originalDoc?.verificationStatus)
    data.reviewedAt = new Date().toISOString()
  return data
}

const STATUS_COPY: Record<string, { title: string; message: string }> = {
  verified: { title: "Thành tích đã được xác minh", message: "Thành tích đã hiện trong hồ sơ thể thao của bạn." },
  rejected: { title: "Khai báo thành tích bị từ chối", message: "Bạn có thể chỉnh sửa và gửi lại khai báo." },
  need_more_proof: { title: "Cần bổ sung minh chứng", message: "Hãy bổ sung minh chứng rồi gửi lại khai báo." },
}

const notifyReview: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== "update" || previousDoc?.verificationStatus === doc.verificationStatus) return doc
  const copy = STATUS_COPY[doc.verificationStatus as string]
  if (!copy || !isStaff(req.user)) return doc
  await notifyUsers(req, [doc.owner], {
    category: "account",
    kind: `achievement-${doc.verificationStatus}`,
    title: `${copy.title}: ${doc.eventName}`,
    message: doc.reviewNote ? `${doc.reviewNote} · ${copy.message}` : copy.message,
    href: "/tai-khoan#the-thao",
  })
  return doc
}

export const UserAchievements: CollectionConfig = {
  slug: "user-achievements",
  labels: {
    singular: "Thành tích người chơi",
    plural: "Thành tích người chơi",
  },
  admin: {
    // Đã gỡ khỏi giao diện; giữ collection để không mất dữ liệu cũ.
    hidden: true,
    group: "SportDNA",
    useAsTitle: "eventName",
    defaultColumns: ["eventName", "sport", "rank", "verificationStatus", "owner"],
  },
  access: {
    create: ({ req }) => req.user?.collection === "users",
    read: ownerAccess,
    update: ownerAccess,
    delete: ownerAccess,
  },
  hooks: { beforeValidate: [protectWorkflow, stampReview], afterChange: [notifyReview] },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      hooks: { beforeValidate: [assignOwner] },
    },
    { name: "eventName", type: "text", required: true, maxLength: 120 },
    {
      name: "event",
      type: "relationship",
      relationTo: "competition-events",
    },
    {
      name: "sport",
      type: "select",
      required: true,
      options: ["football", "badminton"],
    },
    // Badminton: singles/doubles/mixed. Football: futsal / 7-a-side / 11-a-side.
    { name: "discipline", type: "text", maxLength: 80 },
    { name: "category", type: "text", maxLength: 80 },
    {
      name: "position",
      label: "Vị trí thi đấu (bóng đá)",
      type: "select",
      options: ["goalkeeper", "defender", "midfielder", "forward"],
    },
    { name: "teamName", label: "Đội / CLB", type: "text", maxLength: 120 },
    { name: "rank", type: "number", required: true, min: 1 },
    { name: "fieldSize", type: "number", required: true, min: 1 },
    {
      name: "participation",
      type: "number",
      required: true,
      min: 0.2,
      max: 1,
    },
    { name: "eventDate", type: "date", required: true },
    {
      name: "claimedLevel",
      type: "select",
      required: true,
      options: ["club", "school_local", "provincial", "national", "international", "continental_world"],
    },
    { name: "evidenceUrl", type: "text", required: true, maxLength: 500 },
    {
      name: "evidenceFiles",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
      maxRows: 5,
    },
    {
      name: "eventFingerprint",
      type: "text",
      index: true,
      access: { create: reviewField, update: reviewField },
    },
    {
      name: "verificationStatus",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: ["pending", "verified", "rejected", "need_more_proof"],
      access: { create: reviewField, update: reviewField },
    },
    {
      name: "officialPoints",
      type: "number",
      min: 0,
      access: { create: reviewField, update: reviewField },
    },
    {
      name: "reviewNote",
      label: "Lý do / ghi chú của người duyệt",
      type: "textarea",
      maxLength: 500,
      access: { create: reviewField, update: reviewField },
    },
    {
      name: "reviewedAt",
      type: "date",
      access: { create: reviewField, update: reviewField },
      admin: { readOnly: true },
    },
  ],
}
