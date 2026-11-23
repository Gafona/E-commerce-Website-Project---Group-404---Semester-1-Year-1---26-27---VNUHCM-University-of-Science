import type { Access, CollectionBeforeValidateHook, CollectionConfig, FieldAccess, Where } from "payload"
import { APIError } from "payload"
import { isStaff, staffAccess, staffField } from "../access/roles"
import { relId } from "../lib/notifications"
import { missingResultMessage, ownerDnaShare } from "../lib/dna-snapshot"
import { isDnaShareKind, isDnaSport } from "../lib/sportdna-share"

const fail = (message: string): never => {
  throw new APIError(message, 400, null, true)
}

const isMember = (user: unknown) => (user as { collection?: string } | null)?.collection === "users"

/** Anyone can open a live link; owners also see their revoked ones. */
const readShares: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  const live: Where = { active: { equals: true } }
  if (!isMember(req.user)) return live
  const mineOrLive: Where = { or: [{ owner: { equals: req.user!.id } }, live] }
  return mineOrLive
}

const ownShares: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  return isMember(req.user) ? { owner: { equals: req.user!.id } } : false
}

/** Who made a link is not part of the public card (the page shows the name only when their profile is public). */
const ownerOnly: FieldAccess = ({ req, doc }) => isStaff(req.user) || (!!req.user && relId(doc?.owner) === String(req.user.id))

const prepareShare: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  if (operation === "update" && originalDoc) {
    // The card is a frozen snapshot; only switching the link off changes. A revoked link stays off.
    const active = originalDoc.active === false ? false : data.active !== false
    return {
      ...data,
      owner: relId(originalDoc.owner),
      sport: originalDoc.sport,
      kind: originalDoc.kind,
      card: originalDoc.card,
      title: originalDoc.title,
      active,
      revokedAt: active ? null : (originalDoc.revokedAt ?? new Date().toISOString()),
    }
  }
  const ownerId = isStaff(req.user) ? relId(data.owner) : isMember(req.user) ? String(req.user!.id) : ""
  if (!ownerId) fail("Hãy đăng nhập để chia sẻ kết quả SportDNA.")
  if (!isDnaSport(data.sport)) return fail("Môn thể thao không hợp lệ.")
  const kind = isDnaShareKind(data.kind) ? data.kind : "elo"
  const card = await ownerDnaShare(req, ownerId, kind, data.sport)
  if (!card) fail(missingResultMessage(kind))
  return {
    ...data,
    owner: ownerId,
    sport: data.sport,
    kind,
    card,
    title: `SportDNA ${data.sport === "badminton" ? "Cầu lông" : "Bóng đá"}`,
    active: true,
    revokedAt: null,
  }
}

const serverOwned = { create: staffField, update: staffField }

/** Public SportDNA result links (/sportdna/chia-se/[id]); the owner can revoke them in Settings. */
export const DnaShares: CollectionConfig = {
  slug: "dna-shares",
  labels: { singular: "Liên kết chia sẻ SportDNA", plural: "Liên kết chia sẻ SportDNA" },
  admin: { group: "Cộng đồng", useAsTitle: "title", defaultColumns: ["title", "owner", "active", "createdAt"] },
  access: { read: readShares, create: ({ req }) => isStaff(req.user) || isMember(req.user), update: ownShares, delete: staffAccess },
  hooks: { beforeValidate: [prepareShare] },
  timestamps: true,
  fields: [
    { name: "title", type: "text", access: serverOwned, admin: { readOnly: true } },
    { name: "owner", label: "Người chia sẻ", type: "relationship", relationTo: "users", required: true, index: true, access: { read: ownerOnly, ...serverOwned }, admin: { readOnly: true } },
    { name: "sport", label: "Môn", type: "select", required: true, options: [{ label: "Cầu lông", value: "badminton" }, { label: "Bóng đá", value: "football" }], access: { update: staffField }, admin: { readOnly: true } },
    { name: "kind", label: "Loại thẻ", type: "select", defaultValue: "elo", options: [{ label: "ELO", value: "elo" }, { label: "Mạng nhện", value: "radar" }], access: { update: staffField }, admin: { readOnly: true } },
    { name: "card", label: "Ảnh chụp kết quả", type: "json", access: serverOwned, admin: { readOnly: true } },
    { name: "active", label: "Đang chia sẻ", type: "checkbox", defaultValue: true, index: true, admin: { position: "sidebar", description: "Tắt để thu hồi liên kết; không bật lại được." } },
    { name: "revokedAt", label: "Thu hồi lúc", type: "date", access: serverOwned, admin: { readOnly: true, position: "sidebar", date: { pickerAppearance: "dayAndTime" } } },
  ],
}
