import type { Access, CollectionConfig, FieldAccess, Where } from "payload"
import { isStaff, isSuspended } from "../access/roles"
import { notifyConnection } from "../hooks/community-notifications"

const locked: FieldAccess = () => false
const member: Access = ({ req }) =>
  req.user?.collection === "users" && !isSuspended(req.user)
const participants: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  const where: Where = {
    or: [
      { author: { equals: req.user.id } },
      { recipient: { equals: req.user.id } },
    ],
  }
  return where
}
const staffOrRecipient: Access = ({ req }) =>
  isStaff(req.user)
    ? true
    : req.user?.collection === "users"
      ? { recipient: { equals: req.user.id } }
      : false
const idOf = (v: unknown): string =>
  typeof v === "string"
    ? v
    : v && typeof v === "object" && "id" in v
      ? String(v.id)
      : ""

function connection(friendship: boolean): CollectionConfig {
  return {
    slug: friendship ? "community-friendships" : "community-follows",
    labels: {
      singular: friendship ? "Kết bạn" : "Theo dõi",
      plural: friendship ? "Lời mời & bạn bè" : "Theo dõi thành viên",
    },
    admin: { group: "BOAI Community", useAsTitle: "key" },
    access: {
      create: member,
      read: friendship ? participants : () => true,
      // Follow requests to private profiles are approved by the followed member.
      update: friendship ? participants : staffOrRecipient,
      // Follower can unfollow/cancel; the followed member can decline or remove.
      delete: participants,
    },
    hooks: {
      afterChange: [notifyConnection(friendship)],
      beforeValidate: [
        async ({ data, originalDoc, req, operation }) => {
          if (
            !data ||
            req.user?.collection !== "users" ||
            isSuspended(req.user)
          )
            throw new Error("Vui lòng đăng nhập.")
          if (operation === "update") {
            if (!friendship) {
              if (
                idOf(originalDoc.recipient) !== req.user.id ||
                originalDoc.status !== "pending" ||
                data.status !== "accepted"
              )
                throw new Error(
                  "Chỉ người được theo dõi mới duyệt được yêu cầu đang chờ.",
                )
              return {
                author: originalDoc.author,
                recipient: originalDoc.recipient,
                sourceProfile: originalDoc.sourceProfile,
                targetProfile: originalDoc.targetProfile,
                key: originalDoc.key,
                status: "accepted",
              }
            }
            if (
              idOf(originalDoc.recipient) !== req.user.id ||
              originalDoc.status !== "pending" ||
              data.status !== "accepted"
            )
              throw new Error("Chỉ người nhận được chấp nhận lời mời đang chờ.")
            // Both endpoints and their identity remain immutable even through the API.
            for (const key of [
              "author",
              "recipient",
              "sourceProfile",
              "targetProfile",
              "key",
            ])
              data[key] = originalDoc[key]
            return data
          }
          const target = await req.payload.findByID({
            collection: "community-profiles",
            id: idOf(data.targetProfile),
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          const recipient = idOf(target.account)
          if (!recipient || recipient === req.user.id)
            throw new Error("Hãy chọn một thành viên khác.")
          const targetUser = await req.payload.findByID({
            collection: "users",
            id: recipient,
            depth: 0,
            overrideAccess: true,
            req,
          })
          if (isSuspended(targetUser))
            throw new Error("Tài khoản này hiện không khả dụng.")
          const own = await req.payload.find({
            collection: "community-profiles",
            where: { account: { equals: req.user.id } },
            limit: 1,
            depth: 0,
            overrideAccess: false,
            user: req.user,
            req,
          })
          if (!own.docs[0]) throw new Error("Hãy tạo hồ sơ cộng đồng trước.")
          const recent = await req.payload.count({
            collection: friendship
              ? "community-friendships"
              : "community-follows",
            where: {
              and: [
                { author: { equals: req.user.id } },
                {
                  createdAt: {
                    greater_than: new Date(Date.now() - 3600_000).toISOString(),
                  },
                },
              ],
            },
            overrideAccess: false,
            user: req.user,
            req,
          })
          if (recent.totalDocs >= 50)
            throw new Error("Bạn gửi quá nhiều kết nối. Vui lòng thử lại sau.")
          data.author = req.user.id
          data.recipient = recipient
          data.sourceProfile = own.docs[0].id
          data.key = JSON.stringify(
            friendship
              ? [req.user.id, recipient].sort()
              : [req.user.id, recipient],
          )
          if (friendship) data.status = "pending"
          else data.status = target.visibility === "private" ? "pending" : "accepted"
          return data
        },
      ],
    },
    fields: [
      {
        name: "author",
        type: "relationship",
        relationTo: "users",
        required: true,
        index: true,
        access: {
          create: locked,
          update: locked,
          read: ({ req }) => !!req.user,
        },
      },
      {
        name: "recipient",
        type: "relationship",
        relationTo: "users",
        required: true,
        index: true,
        access: {
          create: locked,
          update: locked,
          read: ({ req }) => !!req.user,
        },
      },
      {
        name: "sourceProfile",
        type: "relationship",
        relationTo: "community-profiles",
        required: true,
        index: true,
        access: { create: locked, update: locked },
      },
      {
        name: "targetProfile",
        type: "relationship",
        relationTo: "community-profiles",
        required: true,
        index: true,
        access: { update: locked },
      },
      {
        name: "key",
        type: "text",
        unique: true,
        required: true,
        access: { create: locked, update: locked, read: locked },
      },
      ...(friendship
        ? [
            {
              name: "status",
              type: "select" as const,
              options: ["pending", "accepted"],
              defaultValue: "pending",
              access: { create: locked },
            },
          ]
        : [
            {
              name: "status",
              type: "select" as const,
              options: [
                { label: "Chờ duyệt", value: "pending" },
                { label: "Đang theo dõi", value: "accepted" },
              ],
              defaultValue: "accepted",
              index: true,
              access: { create: locked },
              admin: {
                description:
                  "Chờ duyệt khi hồ sơ được theo dõi để riêng tư. Bản ghi cũ không có trạng thái được xem là đang theo dõi.",
              },
            },
          ]),
    ],
  }
}

export const CommunityFollows = connection(false)
export const CommunityFriendships = connection(true)
