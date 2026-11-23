import type { Access, CollectionConfig, FieldAccess, Where } from "payload"
import { isStaff } from "../access/roles"

export const NOTIFICATION_CATEGORIES = ["shop", "community", "order", "event", "account", "system"] as const
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

const staffField: FieldAccess = ({ req }) => isStaff(req.user)

/** Personal notifications plus broadcasts addressed to the viewer's audience. */
const readOwnAndBroadcast: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return { audience: { equals: "all" } }
  const audiences = ["all"]
  if (req.user.sellerStatus === "approved") audiences.push("sellers")
  const where: Where = {
    or: [{ recipient: { equals: req.user.id } }, { audience: { in: audiences } }],
  }
  return where
}

const ownPersonal: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { recipient: { equals: req.user.id } }
}

export const Notifications: CollectionConfig = {
  slug: "notifications",
  labels: { singular: "Thông báo", plural: "Thông báo người dùng" },
  admin: {
    group: "BOAI Admin",
    useAsTitle: "title",
    defaultColumns: ["title", "category", "audience", "recipient", "readAt", "createdAt"],
  },
  access: {
    // Notifications are written by trusted server hooks only.
    create: ({ req }) => isStaff(req.user),
    read: readOwnAndBroadcast,
    update: ownPersonal,
    delete: ownPersonal,
  },
  fields: [
    {
      name: "audience",
      label: "Người nhận",
      type: "select",
      required: true,
      defaultValue: "user",
      index: true,
      options: [
        { label: "Một tài khoản", value: "user" },
        { label: "Mọi người", value: "all" },
        { label: "Người bán đã duyệt", value: "sellers" },
      ],
      access: { create: staffField, update: staffField },
      admin: { position: "sidebar" },
    },
    {
      name: "recipient",
      label: "Tài khoản nhận",
      type: "relationship",
      relationTo: "users",
      index: true,
      access: { create: staffField, update: staffField },
      admin: { position: "sidebar", condition: (data) => data?.audience === "user" },
    },
    {
      name: "category",
      label: "Nhóm",
      type: "select",
      required: true,
      defaultValue: "system",
      index: true,
      options: [
        { label: "Cửa hàng", value: "shop" },
        { label: "Cộng đồng", value: "community" },
        { label: "Đơn hàng", value: "order" },
        { label: "Sự kiện", value: "event" },
        { label: "Tài khoản", value: "account" },
        { label: "Hệ thống", value: "system" },
      ],
      access: { create: staffField, update: staffField },
      admin: { position: "sidebar" },
    },
    {
      name: "kind",
      label: "Loại",
      type: "text",
      maxLength: 60,
      access: { create: staffField, update: staffField },
      admin: { position: "sidebar", description: "Mã sự kiện nội bộ, ví dụ shop-suspended." },
    },
    { name: "title", label: "Tiêu đề", type: "text", required: true, maxLength: 140, access: { create: staffField, update: staffField } },
    { name: "message", label: "Nội dung", type: "textarea", maxLength: 600, access: { create: staffField, update: staffField } },
    { name: "href", label: "Đường dẫn", type: "text", maxLength: 300, access: { create: staffField, update: staffField } },
    { name: "actorName", label: "Người thực hiện", type: "text", maxLength: 100, access: { create: staffField, update: staffField } },
    { name: "image", label: "Ảnh", type: "upload", relationTo: "media", access: { create: staffField, update: staffField } },
    {
      name: "dedupeKey",
      type: "text",
      index: true,
      access: { create: staffField, update: staffField },
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "readAt",
      label: "Đã đọc lúc",
      type: "date",
      admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } },
    },
  ],
}
