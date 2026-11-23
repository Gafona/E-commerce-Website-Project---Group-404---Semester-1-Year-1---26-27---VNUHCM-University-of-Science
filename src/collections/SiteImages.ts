import type { CollectionConfig } from "payload"
import { revalidatePath } from "next/cache"
import { isStaff, staffAccess } from "../access/roles"
import { SITE_IMAGE_PLACEMENTS } from "../lib/site-image-placements"

const revalidateSite = () => revalidatePath("/", "layout")

/**
 * Decorative photography for fixed website slots. Each slot can hold several
 * photos; the site shows a random one on every visit.
 */
export const SiteImages: CollectionConfig = {
  slug: "site-images",
  labels: { singular: "Ảnh website", plural: "Ảnh website" },
  admin: {
    group: "BOAI Admin",
    useAsTitle: "title",
    defaultColumns: ["title", "image", "placements", "active", "updatedAt"],
    description: "Mỗi vị trí có thể có nhiều ảnh — website chọn ngẫu nhiên một ảnh mỗi lần mở trang.",
  },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffAccess,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: {
    afterChange: [revalidateSite],
    afterDelete: [revalidateSite],
  },
  fields: [
    { name: "title", label: "Tên ảnh", type: "text", required: true, maxLength: 120 },
    { name: "image", label: "Ảnh", type: "upload", relationTo: "media", required: true },
    {
      name: "placements",
      label: "Hiển thị ở",
      type: "select",
      hasMany: true,
      required: true,
      index: true,
      options: SITE_IMAGE_PLACEMENTS.map((p) => ({ label: p.label, value: p.value })),
    },
    {
      name: "credit",
      label: "Nguồn ảnh",
      type: "group",
      fields: [
        {
          type: "row",
          fields: [
            { name: "author", label: "Tác giả", type: "text", maxLength: 120 },
            {
              name: "sourceUrl",
              label: "Liên kết nguồn",
              type: "text",
              maxLength: 500,
              validate: (value: unknown) =>
                !value || /^https:\/\/\S+$/i.test(String(value)) || "Liên kết phải bắt đầu bằng https://.",
            },
          ],
        },
      ],
    },
    { name: "active", label: "Đang dùng", type: "checkbox", defaultValue: true, index: true, admin: { position: "sidebar" } },
  ],
}
