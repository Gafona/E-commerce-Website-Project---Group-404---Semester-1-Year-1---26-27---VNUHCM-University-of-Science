import type { Access, CollectionBeforeChangeHook, CollectionConfig, FieldAccess } from "payload"
import { isStaff } from "../access/roles"

// Hồ sơ Match Rating riêng tư (quyết định 17). Không đặt ở users hay community-profiles.
const ownerOrStaff: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { user: { equals: req.user.id } }
}
const staffOnly: Access = ({ req }) => isStaff(req.user)
const staffField: FieldAccess = ({ req }) => isStaff(req.user)

// Tài khoản trùng deviceId chỉ bị gắn cờ, không bị chặn (quyết định 13).
const flagPossibleAlt: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const deviceId = typeof data.deviceId === "string" ? data.deviceId.trim() : ""
  if (!deviceId) return { ...data, possibleAlt: false }
  if (deviceId === originalDoc?.deviceId && data.possibleAlt !== undefined) return data
  const others = await req.payload.find({
    collection: "rating-profiles",
    where: {
      and: [
        { deviceId: { equals: deviceId } },
        ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return { ...data, deviceId, possibleAlt: others.totalDocs > 0 }
}

export const RatingProfiles: CollectionConfig = {
  slug: "rating-profiles",
  labels: { singular: "Hồ sơ Match Rating", plural: "Hồ sơ Match Rating" },
  admin: {
    // Đã gỡ khỏi giao diện; giữ collection để không mất dữ liệu cũ.
    hidden: true,
    group: "Giải đấu",
    useAsTitle: "user",
    defaultColumns: ["user", "mr", "matchesPlayed", "possibleAlt", "isPublic"],
  },
  access: { read: ownerOrStaff, create: staffOnly, update: staffOnly, delete: staffOnly },
  hooks: { beforeChange: [flagPossibleAlt] },
  fields: [
    { name: "user", type: "relationship", relationTo: "users", required: true, unique: true, index: true },
    { name: "mr", type: "number", required: true, defaultValue: 1000 },
    { name: "matchesPlayed", type: "number", required: true, defaultValue: 0, min: 0 },
    { name: "mrGainFirst10", type: "number", required: true, defaultValue: 0, min: 0 },
    {
      name: "deviceId",
      type: "text",
      index: true,
      access: { read: staffField, create: staffField, update: staffField },
    },
    {
      name: "possibleAlt",
      type: "checkbox",
      defaultValue: false,
      admin: { readOnly: true, description: "Tự gắn khi có hồ sơ khác cùng deviceId. Chỉ là cờ, không chặn." },
      access: { read: staffField, create: staffField, update: staffField },
    },
    {
      name: "isPublic",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Chỉ khi bật mới hiện tên, bậc, MR ở nơi công khai." },
    },
  ],
}
