import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess } from "payload"
import { notifyProductComment } from "../hooks/commerce-notifications"
import { isStaff } from "../access/roles"

const adminField: FieldAccess = ({ req }) => req.user?.collection === "admins"
const member: Access = ({ req }) =>
  req.user?.collection === "users" || req.user?.collection === "admins"
const ownerOrAdmin: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { author: { equals: req.user.id } }
}

const relId = (v: unknown) =>
  v && typeof v === "object" ? (v as { id: string | number }).id : (v as string | number | null | undefined)

/**
 * Identity, seller badge and thread shape are server-owned: app users can only
 * submit `product`, `body` and an optional `parent`.
 */
const enforceCommentRules: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  if (!data) return data
  if (operation !== "create") return data
  const body = String(data.body ?? "").trim()
  if (body.length < 2) throw new Error("Bình luận quá ngắn.")
  if (body.length > 1000) throw new Error("Bình luận tối đa 1000 ký tự.")
  data.body = body

  const productId = relId(data.product)
  if (!productId) throw new Error("Sản phẩm không hợp lệ.")
  const product = await req.payload.findByID({
    collection: "products", id: productId, depth: 0, overrideAccess: true, req,
  })

  const parentId = relId(data.parent)
  if (parentId) {
    const parent = await req.payload.findByID({
      collection: "product-comments", id: parentId, depth: 0, overrideAccess: true, req,
    })
    if (String(relId(parent.product)) !== String(product.id)) throw new Error("Bình luận gốc không hợp lệ.")
    // Keep threads one level deep: replying to a reply attaches to its root.
    data.parent = relId(parent.parent) ?? parent.id
  } else data.parent = null

  if (req.user?.collection === "users") {
    data.author = req.user.id
    data.authorName = req.user.name
    data.isSeller = String(relId(product.seller)) === String(req.user.id)
  }
  return data
}

export const ProductComments: CollectionConfig = {
  slug: "product-comments",
  labels: { singular: "Bình luận sản phẩm", plural: "Bình luận sản phẩm" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "body",
    defaultColumns: ["product", "authorName", "body", "isSeller", "createdAt"],
  },
  access: { read: () => true, create: member, update: ({ req }) => req.user?.collection === "admins", delete: ownerOrAdmin },
  hooks: { beforeValidate: [enforceCommentRules], afterChange: [notifyProductComment] },
  fields: [
    { name: "product", type: "relationship", relationTo: "products", required: true, index: true },
    {
      name: "parent",
      type: "relationship",
      relationTo: "product-comments",
      index: true,
      admin: { description: "Để trống nếu là bình luận gốc." },
    },
    { name: "body", type: "textarea", required: true, maxLength: 1000 },
    {
      name: "author", type: "relationship", relationTo: "users", required: true, index: true,
      access: { update: adminField }, admin: { readOnly: true },
    },
    {
      name: "authorName", type: "text", required: true,
      access: { create: adminField, update: adminField }, admin: { readOnly: true },
    },
    {
      name: "isSeller", type: "checkbox", defaultValue: false, label: "Người bán trả lời",
      access: { create: adminField, update: adminField }, admin: { readOnly: true },
    },
  ],
}
