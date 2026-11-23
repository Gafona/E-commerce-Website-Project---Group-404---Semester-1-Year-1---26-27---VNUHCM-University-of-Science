import type { CollectionBeforeValidateHook, CollectionConfig } from "payload"
import { isStaff, staffAccess } from "../access/roles"

export const ANNOUNCEMENT_THEMES = ["brand", "dark", "sale", "light"] as const
export const isSafeAnnouncementHref = (value: string) =>
  /^\/(?!\/)[^\s]*$/.test(value) || /^https:\/\/[^\s]+$/i.test(value)

const validateAnnouncement: CollectionBeforeValidateHook = ({ data, originalDoc, req, operation }) => {
  if (!data) return data
  const current = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  const label = String(current.ctaLabel ?? "").trim()
  const href = String(current.ctaHref ?? "").trim()
  if (Boolean(label) !== Boolean(href)) {
    throw new Error("Nút hành động cần có cả nhãn và đường dẫn.")
  }
  if (href && !isSafeAnnouncementHref(href)) {
    throw new Error("Đường dẫn phải bắt đầu bằng / hoặc https://.")
  }
  const start = current.startAt ? new Date(String(current.startAt)) : null
  const end = current.endAt ? new Date(String(current.endAt)) : null
  if (start && end && end.getTime() <= start.getTime()) {
    throw new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu.")
  }
  if (operation === "create" && req.user?.collection === "users") data.createdBy = req.user.id
  return data
}

export const SiteAnnouncements: CollectionConfig = {
  slug: "site-announcements",
  labels: { singular: "Thông báo toàn trang", plural: "Thông báo & pop-up" },
  admin: {
    group: "BOAI Admin",
    useAsTitle: "title",
    defaultColumns: ["title", "displayType", "scope", "active", "startAt", "endAt"],
  },
  access: {
    // Visitors only ever receive switched-on announcements; schedules are applied at render.
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffAccess,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: { beforeValidate: [validateAnnouncement] },
  fields: [
    { name: "title", label: "Tiêu đề", type: "text", required: true, maxLength: 120 },
    { name: "message", label: "Nội dung", type: "textarea", required: true, maxLength: 600 },
    { name: "image", label: "Ảnh minh họa", type: "upload", relationTo: "media" },
    {
      name: "displayType",
      label: "Kiểu hiển thị",
      type: "select",
      required: true,
      defaultValue: "popup",
      options: [
        { label: "Pop-up giữa màn hình", value: "popup" },
        { label: "Thanh thông báo đầu trang", value: "banner" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "scope",
      label: "Phạm vi",
      type: "select",
      required: true,
      defaultValue: "home",
      options: [
        { label: "Chỉ trang chủ", value: "home" },
        { label: "Toàn bộ website", value: "all" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "theme",
      label: "Màu sắc",
      type: "select",
      required: true,
      defaultValue: "brand",
      options: [
        { label: "Xanh BOAI", value: "brand" },
        { label: "Navy đậm", value: "dark" },
        { label: "Đỏ khuyến mãi", value: "sale" },
        { label: "Sáng", value: "light" },
      ],
      admin: { position: "sidebar" },
    },
    { name: "ctaLabel", label: "Nhãn nút", type: "text", maxLength: 40 },
    { name: "ctaHref", label: "Đường dẫn nút", type: "text", maxLength: 300 },
    { name: "startAt", label: "Bắt đầu hiển thị", type: "date", admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
    { name: "endAt", label: "Kết thúc hiển thị", type: "date", admin: { position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
    { name: "active", label: "Đang bật", type: "checkbox", defaultValue: true, index: true, admin: { position: "sidebar" } },
    {
      name: "createdBy",
      label: "Người tạo",
      type: "relationship",
      relationTo: "users",
      access: { create: () => false, update: () => false },
      admin: { position: "sidebar", readOnly: true },
    },
  ],
}
