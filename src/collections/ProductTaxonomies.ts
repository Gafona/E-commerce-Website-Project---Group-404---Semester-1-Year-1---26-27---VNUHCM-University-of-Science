import type { CollectionConfig } from "payload"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

export const ProductTaxonomies: CollectionConfig = {
  slug: "product-taxonomies",
  access: {
    create: ({ req }) =>
      req.user?.collection === "admins" ||
      (req.user?.collection === "users" &&
        req.user.sellerStatus === "approved"),
    delete: ({ req }) => req.user?.collection === "admins",
    read: () => true,
    update: ({ req }) => req.user?.collection === "admins",
  },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "name",
    defaultColumns: ["name", "kind", "sport", "createdAt"],
    description:
      "Danh mục và thương hiệu dùng chung giữa form đăng bán và bộ lọc tìm kiếm.",
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const name = String(data.name ?? originalDoc?.name ?? "")
          .replace(/\s+/g, " ")
          .trim()
        const sport = data.sport ?? originalDoc?.sport
        const kind = data.kind ?? originalDoc?.kind
        data.name = name
        if (name && sport && kind) {
          data.slug = `${sport}-${kind}-${slugify(name)}`
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === "create" && req.user?.collection === "users") {
          data.createdBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: "name",
      label: "Tên tag",
      type: "text",
      required: true,
      index: true,
      maxLength: 60,
      validate: (value: unknown) =>
        String(value ?? "").trim().length >= 2 ||
        "Tên tag cần ít nhất 2 ký tự.",
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "sport",
      label: "Môn",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
      ],
    },
    {
      name: "kind",
      label: "Loại tag",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Danh mục", value: "category" },
        { label: "Thương hiệu", value: "brand" },
      ],
    },
    {
      name: "createdBy",
      label: "Người bán đã tạo",
      type: "relationship",
      relationTo: "users",
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
}
