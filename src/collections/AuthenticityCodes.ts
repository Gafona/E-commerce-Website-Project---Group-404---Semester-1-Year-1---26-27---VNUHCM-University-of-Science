import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess, Where } from "payload"
import { APIError } from "payload"
import { isStaff } from "../access/roles"
import { relId } from "../lib/notifications"
import { normalizeAuthCode, AUTH_CODE_PATTERN } from "../lib/authenticity"

const sellerId = (user: unknown) =>
  user && typeof user === "object" && (user as { collection?: string; sellerStatus?: string }).collection === "users"
    ? String((user as { id: string | number }).id)
    : ""

const ownCodes: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const id = sellerId(req.user)
  if (!id) return false
  const where: Where = { seller: { equals: id } }
  return where
}
const serverOnly: FieldAccess = () => false

const fail = (message: string, status = 400): never => {
  throw new APIError(message, status, null, true)
}

const validateCode: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (!data) return data
  if (operation === "update") {
    // Sellers may only revoke/restore or annotate; the code and product stay fixed.
    return data
  }
  const code = normalizeAuthCode(data.code)
  if (!AUTH_CODE_PATTERN.test(code)) fail("Mã xác thực gồm 6–32 ký tự chữ, số hoặc dấu gạch ngang.")
  const product = await req.payload
    .findByID({ collection: "products", id: relId(data.product), depth: 0, overrideAccess: true, select: { seller: true }, req })
    .catch(() => null)
  if (!product) fail("Sản phẩm không tồn tại.")
  const owner = relId(product!.seller)
  if (!isStaff(req.user) && owner !== sellerId(req.user)) fail("Bạn chỉ tạo mã cho sản phẩm của shop mình.", 403)
  const taken = await req.payload.count({ collection: "authenticity-codes", where: { code: { equals: code } }, overrideAccess: true, req })
  if (taken.totalDocs) fail(`Mã ${code} đã tồn tại.`)
  return { ...data, code, seller: owner || null, status: "active", checkCount: 0, firstCheckedAt: null, lastCheckedAt: null }
}

export const AuthenticityCodes: CollectionConfig = {
  slug: "authenticity-codes",
  labels: { singular: "Mã xác thực", plural: "Mã xác thực chính hãng" },
  admin: { group: "BOAI Commerce", useAsTitle: "code", defaultColumns: ["code", "product", "status", "checkCount", "createdAt"] },
  access: {
    create: ({ req }) =>
      isStaff(req.user) || (req.user?.collection === "users" && (req.user as { sellerStatus?: string }).sellerStatus === "approved"),
    read: ownCodes,
    update: ownCodes,
    delete: ownCodes,
  },
  hooks: { beforeValidate: [validateCode] },
  fields: [
    { name: "code", type: "text", required: true, unique: true, index: true, access: { update: serverOnly } },
    { name: "product", type: "relationship", relationTo: "products", required: true, index: true, access: { update: serverOnly } },
    { name: "seller", type: "relationship", relationTo: "users", index: true, access: { create: serverOnly, update: serverOnly } },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { label: "Đang hiệu lực", value: "active" },
        { label: "Đã thu hồi", value: "revoked" },
      ],
    },
    { name: "batch", label: "Lô hàng / ghi chú", type: "text", maxLength: 80 },
    // Groups the codes generated together, so the shop can reprint exactly that set.
    { name: "batchId", label: "Mã lô", type: "text", index: true, maxLength: 40, access: { update: serverOnly }, admin: { readOnly: true } },
    { name: "checkCount", type: "number", defaultValue: 0, min: 0, access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
    { name: "firstCheckedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
    { name: "lastCheckedAt", type: "date", access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
  ],
}
