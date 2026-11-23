import type { Field, GlobalConfig } from "payload"
import { revalidatePath } from "next/cache"
import { staffAccess } from "../access/roles"
import {
  CONTENT_PAGES,
  SITE_CONTENT,
  type ContentFieldDef,
  type ContentSectionDef,
} from "../lib/site-content-schema"

const MAX: Record<ContentFieldDef["kind"], number> = {
  text: 200,
  textarea: 800,
  lines: 1000,
  url: 300,
  phone: 30,
}

const validateFor = (field: ContentFieldDef) => (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return true
  if (field.kind === "url" && !/^https:\/\/\S+$/i.test(text)) return "Liên kết phải bắt đầu bằng https://."
  if (field.kind === "phone" && !/^[\d\s+().-]{6,30}$/.test(text)) return "Số điện thoại không hợp lệ."
  return true
}

const leaf = (field: ContentFieldDef, name: string, label: string, defaultValue?: string): Field =>
  field.kind === "textarea" || field.kind === "lines"
    ? { name, label, type: "textarea", maxLength: MAX[field.kind], defaultValue, admin: { rows: field.kind === "lines" ? 4 : 3 } }
    : { name, label, type: "text", maxLength: MAX[field.kind], defaultValue, validate: validateFor(field) }

const toPayloadField = (field: ContentFieldDef): Field => {
  if (field.single) {
    const base = leaf(field, field.key, field.label, field.vi || undefined)
    return { ...base, admin: { ...(base.admin ?? {}), description: field.help } } as Field
  }
  return {
    name: field.key,
    label: field.label,
    type: "group",
    admin: { description: field.help, hideGutter: true },
    fields: [
      {
        type: "row",
        fields: [
          leaf(field, "vi", "Tiếng Việt", field.vi),
          leaf(field, "en", "English", field.en),
        ],
      },
    ],
  }
}

const sectionGroup = (section: ContentSectionDef): Field => ({
  name: section.key,
  label: section.label,
  type: "group",
  admin: { description: section.description },
  fields: section.fields.map(toPayloadField),
})

export const SiteContent: GlobalConfig = {
  slug: "site-content",
  label: "Nội dung website",
  admin: {
    group: "BOAI Admin",
    description: "Chữ hiển thị trên website. Ảnh được quản lý trong mục Ảnh website.",
  },
  access: { read: () => true, update: staffAccess },
  hooks: {
    afterChange: [
      ({ req }) => {
        // The /quan-tri editor revalidates after its response (see
        // saveSiteContentAction) so the save returns immediately.
        if (req.context?.skipRevalidate) return
        try {
          revalidatePath("/", "layout")
        } catch {
          // Outside a Next.js request (CLI/seed) there is nothing to revalidate.
        }
      },
    ],
  },
  fields: [
    {
      type: "tabs",
      tabs: CONTENT_PAGES.map((page) => ({
        label: page.label,
        fields: (SITE_CONTENT as readonly ContentSectionDef[])
          .filter((section) => section.page === page.key)
          .map(sectionGroup),
      })),
    },
  ],
}
