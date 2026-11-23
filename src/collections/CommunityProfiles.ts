import type { Access, CollectionConfig, FieldAccess } from "payload"
import { isStaff } from "../access/roles"
import {
  communityHandleError,
  normalizeCommunityHandle,
} from "../lib/community-identity"

const admin: Access = ({ req }) => isStaff(req.user)
const adminField: FieldAccess = ({ req }) => isStaff(req.user)
/** Members may edit only their own profile, and only the fields left unlocked. */
const ownerOrAdmin: Access = ({ req }) =>
  isStaff(req.user)
    ? true
    : req.user?.collection === "users"
      ? { account: { equals: req.user.id } }
      : false

// A deliberately public projection, separate from private account/seller data.
export const CommunityProfiles: CollectionConfig = {
  slug: "community-profiles",
  labels: { singular: "Hồ sơ cộng đồng", plural: "Hồ sơ cộng đồng" },
  admin: {
    group: "BOAI Community",
    useAsTitle: "name",
    defaultColumns: ["name", "handle", "kind", "visibility", "demo"],
  },
  access: {
    // Demo (sample) profiles are shown to BOAI staff only, never mixed with real members.
    read: ({ req }) => (isStaff(req.user) ? true : { demo: { not_equals: true } }),
    create: ({ req }) =>
      req.user?.collection === "users" || req.user?.collection === "admins",
    update: ownerOrAdmin,
    delete: admin,
  },
  hooks: {
    beforeValidate: [
      // Custom IDs are case-insensitive and unique across the directory.
      async ({ data, originalDoc, req }) => {
        if (!data || !("handle" in data)) return data
        const handle = normalizeCommunityHandle(data.handle)
        if (!handle) {
          data.handle = null
          return data
        }
        if (handle === originalDoc?.handle) {
          data.handle = handle
          return data
        }
        const invalid = communityHandleError(handle)
        if (invalid) throw new Error(invalid)
        const taken = await req.payload.count({
          collection: "community-profiles",
          where: {
            and: [
              { handle: { equals: handle } },
              ...(originalDoc?.id
                ? [{ id: { not_equals: originalDoc.id } }]
                : []),
            ],
          },
          overrideAccess: true,
          req,
        })
        if (taken.totalDocs) throw new Error("ID tùy chỉnh này đã có người dùng.")
        data.handle = handle
        return data
      },
      async ({ data, req, operation }) => {
        if (
          data &&
          operation === "create" &&
          req.user?.collection === "users"
        ) {
          data.account = req.user.id
          data.name = req.user.name
          data.bio = "Thành viên BOAI Community"
          data.kind = req.user.sellerStatus === "approved" ? "shop" : "person"
          data.sport = req.user.favoriteSport ?? "all"
          data.demo = false
          data.visibility = "public"
          const account = await req.payload.findByID({
            collection: "users",
            id: req.user.id,
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          data.avatar = account.avatar ?? null
          data.cover = account.cover ?? null
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: "account",
      type: "relationship",
      relationTo: "users",
      required: true,
      unique: true,
      access: {
        read: ({ req }) =>
          req.user?.collection === "admins" || req.user?.collection === "users",
        create: adminField,
        update: adminField,
      },
      admin: {
        description:
          "Chỉ ID tài khoản được đọc khi đăng nhập để định tuyến tin nhắn; dữ liệu tài khoản vẫn riêng tư.",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      maxLength: 100,
      access: { update: adminField },
    },
    {
      name: "handle",
      label: "ID tùy chỉnh",
      type: "text",
      index: true,
      maxLength: 24,
      admin: {
        description:
          "Thành viên tự đặt trong Cài đặt (hiển thị dạng @id). Mã BOAI-… vẫn dùng được.",
      },
    },
    {
      name: "visibility",
      label: "Quyền riêng tư",
      type: "select",
      defaultValue: "public",
      index: true,
      options: [
        { label: "Công khai", value: "public" },
        { label: "Riêng tư", value: "private" },
      ],
      admin: {
        position: "sidebar",
        description:
          "Riêng tư: chỉ người theo dõi đã được chấp nhận mới xem được bài viết và story.",
      },
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
      access: { create: adminField, update: adminField },
    },
    {
      name: "cover",
      type: "upload",
      relationTo: "media",
      access: { create: adminField, update: adminField },
    },
    {
      name: "bio",
      type: "textarea",
      required: true,
      maxLength: 800,
      access: { update: adminField },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      access: { update: adminField },
      options: [
        { label: "Cá nhân", value: "person" },
        { label: "Shop", value: "shop" },
      ],
    },
    {
      name: "sport",
      type: "select",
      required: true,
      access: { update: adminField },
      options: [
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
        { label: "Đa môn", value: "all" },
      ],
    },
    {
      name: "demo",
      type: "checkbox",
      defaultValue: true,
      access: { update: adminField },
      admin: {
        description:
          "Hiển thị rõ nhãn minh họa, không phải khách hàng hay shop thật.",
      },
    },
  ],
}
