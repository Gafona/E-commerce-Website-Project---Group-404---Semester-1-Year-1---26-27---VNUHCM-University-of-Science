import type { CollectionConfig } from "payload"
import { isStaff, staffAccess } from "../access/roles"

export const StoryMusic: CollectionConfig = {
  slug: "story-music",
  labels: { singular: "Nhạc story", plural: "Thư viện nhạc story" },
  admin: {
    group: "BOAI Community",
    useAsTitle: "title",
    description:
      "Chỉ tải nhạc tự sáng tác hoặc có quyền sử dụng. Nhạc được phát kèm story, không trộn vào file video.",
  },
  access: {
    read: ({ req }) =>
      isStaff(req.user) ? true : { active: { equals: true } },
    create: staffAccess,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        const audio = data?.audio ?? originalDoc?.audio
        if (audio) {
          const id = typeof audio === "object" ? audio.id : audio
          const media = await req.payload.findByID({
            collection: "media",
            id,
            overrideAccess: true,
            req,
          })
          if (!media.mimeType?.startsWith("audio/"))
            throw new Error("Vui lòng chọn file âm thanh.")
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: "title",
      label: "Tên bản nhạc",
      type: "text",
      required: true,
      maxLength: 100,
    },
    { name: "artist", label: "Tác giả", type: "text", maxLength: 100 },
    {
      name: "sourceUrl",
      label: "Nguồn chính thức",
      type: "text",
      maxLength: 500,
      validate: (value: unknown) =>
        !value ||
        /^https:\/\/\S+$/i.test(String(value)) ||
        "Nguồn phải là liên kết HTTPS.",
    },
    {
      name: "license",
      label: "Giấy phép sử dụng",
      type: "text",
      maxLength: 100,
    },
    {
      name: "licenseUrl",
      label: "Liên kết giấy phép",
      type: "text",
      maxLength: 500,
      validate: (value: unknown) =>
        !value ||
        /^https:\/\/\S+$/i.test(String(value)) ||
        "Giấy phép phải là liên kết HTTPS.",
    },
    {
      name: "audio",
      label: "File âm thanh",
      type: "upload",
      relationTo: "media",
      required: true,
      filterOptions: { mimeType: { contains: "audio/" } },
    },
    {
      name: "active",
      label: "Cho phép chọn",
      type: "checkbox",
      defaultValue: true,
    },
  ],
}
