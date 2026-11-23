import type { CollectionConfig } from "payload"
import { revalidatePath } from "next/cache"
import { isStaff, staffAccess } from "../access/roles"

const revalidateHome = () => {
  revalidatePath("/")
}

const httpsUrl = (value: unknown) =>
  !value || /^https:\/\/\S+$/i.test(String(value)) || "Liên kết phải bắt đầu bằng https://."

/** Editorial athlete cards shown in the home page "mark of legends" section. */
export const AthleteStories: CollectionConfig = {
  slug: "athlete-stories",
  labels: { singular: "Vận động viên truyền cảm hứng", plural: "Vận động viên truyền cảm hứng" },
  admin: {
    group: "BOAI Admin",
    useAsTitle: "name",
    defaultColumns: ["name", "sport", "sortOrder", "active"],
    description:
      "Thẻ vận động viên ở trang chủ. Tiêu điểm ảnh (focal point) trong Media quyết định vị trí cắt ảnh.",
  },
  defaultSort: "sortOrder",
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffAccess,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: {
    afterChange: [revalidateHome],
    afterDelete: [revalidateHome],
  },
  fields: [
    { name: "name", label: "Tên vận động viên", type: "text", required: true, maxLength: 80 },
    {
      name: "sport",
      label: "Môn thể thao",
      type: "select",
      required: true,
      options: [
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "traitsVi", label: "Phẩm chất (Tiếng Việt)", type: "text", required: true, maxLength: 120 },
        { name: "traitsEn", label: "Phẩm chất (English)", type: "text", maxLength: 120 },
      ],
    },
    { name: "image", label: "Ảnh", type: "upload", relationTo: "media", required: true },
    {
      name: "credit",
      label: "Nguồn ảnh",
      type: "group",
      fields: [
        { name: "author", label: "Tác giả", type: "text", maxLength: 120 },
        { name: "sourceUrl", label: "Liên kết nguồn", type: "text", maxLength: 500, validate: httpsUrl },
        {
          type: "row",
          fields: [
            { name: "license", label: "Giấy phép", type: "text", maxLength: 40 },
            { name: "licenseUrl", label: "Liên kết giấy phép", type: "text", maxLength: 500, validate: httpsUrl },
          ],
        },
      ],
    },
    {
      name: "sortOrder",
      label: "Thứ tự",
      type: "number",
      defaultValue: 0,
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "active",
      label: "Hiển thị",
      type: "checkbox",
      defaultValue: true,
      index: true,
      admin: { position: "sidebar" },
    },
  ],
}
