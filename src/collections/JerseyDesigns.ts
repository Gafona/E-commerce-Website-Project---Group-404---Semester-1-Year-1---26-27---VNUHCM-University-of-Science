import type { Access, CollectionConfig, FieldHook } from "payload"
import { validKit, validTextStyle } from "../lib/jersey-kit"

const ownerAccess: Access = ({ req }) => {
  if (req.user?.collection === "admins") return true
  if (req.user?.collection !== "users") return false
  return { owner: { equals: req.user.id } }
}

const assignOwner: FieldHook = ({ req, value }) =>
  req.user?.collection === "users" ? req.user.id : value

export const hex = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? true : "Màu phải ở định dạng #RRGGBB."

// Ảnh khách tải lên: chỉ nhận PNG/JPEG/WebP dạng data URL đã thu nhỏ (không nhận SVG).
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/
const MAX_IMAGE_CHARS = 700_000
const MAX_ART_CHARS = 6_000_000
const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
const validImage = (v: unknown) => typeof v === "string" && v.length <= MAX_IMAGE_CHARS && IMAGE_DATA_URL.test(v)

function validSide(value: unknown): true | string {
  const side = value as Record<string, unknown> | undefined
  if (!side || !Array.isArray(side.strokes) || !Array.isArray(side.stickers) || !Array.isArray(side.texts)) return "Dữ liệu mặt áo không hợp lệ."
  if (side.strokes.length > 400 || side.stickers.length > 100 || side.texts.length > 100) return "Thiết kế có quá nhiều phần tử."
  for (const stroke of side.strokes as Record<string, unknown>[]) {
    if (!Array.isArray(stroke.points) || stroke.points.length > 1000 || typeof stroke.width !== "number" || stroke.width < 1 || stroke.width > 30 || hex(stroke.color) !== true) return "Dữ liệu nét vẽ không hợp lệ."
    if (stroke.points.some((p) => !p || typeof p !== "object" || typeof (p as Record<string, unknown>).x !== "number" || typeof (p as Record<string, unknown>).y !== "number")) return "Tọa độ nét vẽ không hợp lệ."
  }
  for (const item of side.stickers as Record<string, unknown>[]) {
    if (!["star", "bolt", "crest", "ball"].includes(String(item.kind)) || typeof item.x !== "number" || typeof item.y !== "number" || typeof item.size !== "number" || item.size < 20 || item.size > 120 || hex(item.color) !== true) return "Dữ liệu sticker không hợp lệ."
  }
  for (const item of side.texts as Record<string, unknown>[]) {
    if (typeof item.text !== "string" || !item.text.trim() || item.text.length > 24 || typeof item.x !== "number" || typeof item.y !== "number" || typeof item.size !== "number" || item.size < 12 || item.size > 220 || typeof item.bold !== "boolean" || typeof item.italic !== "boolean" || hex(item.color) !== true) return "Dữ liệu chữ không hợp lệ."
    const style = validTextStyle(item)
    if (style !== true) return style
  }
  if (side.logos !== undefined) {
    if (!Array.isArray(side.logos) || side.logos.length > 6) return "Mỗi mặt tối đa 6 logo."
    for (const item of side.logos as Record<string, unknown>[]) {
      if (!item || !validImage(item.src) || !num(item.x, -200, 620) || !num(item.y, -200, 680) || !num(item.size, 16, 360)) return "Dữ liệu logo không hợp lệ."
    }
  }
  if (side.pattern !== undefined && side.pattern !== null) {
    const p = side.pattern as Record<string, unknown>
    if (typeof p !== "object" || !validImage(p.src) || !num(p.scale, 24, 360) || !num(p.opacity, 0.05, 1)) return "Dữ liệu họa tiết không hợp lệ."
    if (p.mode !== undefined && p.mode !== "tile" && p.mode !== "garment") return "Kiểu phủ họa tiết không hợp lệ."
    if (p.hidden !== undefined && typeof p.hidden !== "boolean") return "Dữ liệu họa tiết không hợp lệ."
  }
  return true
}

export function validArt(value: unknown): true | string {
  if (!value || typeof value !== "object") return "Thiết kế phải có đủ mặt trước và mặt sau."
  const art = value as Record<string, unknown>
  for (const sideName of ["front", "back"]) {
    const result = validSide(art[sideName])
    if (result !== true) return result
  }
  if (art.pants !== undefined) {
    const pants = art.pants as Record<string, unknown> | null
    if (!pants || typeof pants !== "object" || typeof pants.enabled !== "boolean" || hex(pants.color) !== true) return "Dữ liệu quần không hợp lệ."
    for (const sideName of ["front", "back"]) {
      const result = validSide(pants[sideName])
      if (result !== true) return result === "Dữ liệu mặt áo không hợp lệ." ? "Dữ liệu mặt quần không hợp lệ." : result
    }
  }
  const kit = validKit(art.kit)
  if (kit !== true) return kit
  if (JSON.stringify(value).length > MAX_ART_CHARS) return "Thiết kế quá nặng. Hãy dùng ảnh nhỏ hơn hoặc bớt logo."
  return true
}

export const JerseyDesigns: CollectionConfig = {
  slug: "jersey-designs",
  admin: { group: "BOAI Commerce", useAsTitle: "name", defaultColumns: ["name", "owner", "updatedAt"] },
  access: { create: ({ req }) => Boolean(req.user), read: ownerAccess, update: ownerAccess, delete: ownerAccess },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
      // User-supplied owner IDs are ignored; this hook binds app-user writes
      // to the authenticated user at the collection boundary.
      hooks: { beforeValidate: [assignOwner] },
    },
    { name: "name", type: "text", required: true, maxLength: 80 },
    { name: "art", type: "json", required: true, validate: validArt },
    { name: "shirtColor", type: "text", required: true, validate: hex },
    { name: "printColor", type: "text", required: true, validate: hex },
    {
      name: "material",
      type: "select",
      required: true,
      options: ["cotton", "polyester", "woven", "cool"],
    },
    { name: "jerseySize", type: "select", required: true, options: ["S", "M", "L", "XL", "XXL"] },
  ],
}
