import type { CollectionConfig } from "payload"
import { staffAccess } from "../access/roles"

export const DISCOUNT_CODE_PATTERN = /^[A-Z0-9]{3,20}$/

/** Normalizes what a buyer or admin types: no spaces, upper case. */
export const normalizeDiscountCode = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase()

/**
 * Admin-managed percentage codes. Checkout validates them on the server with
 * overrideAccess, so buyers never read this collection directly.
 */
export const DiscountCodes: CollectionConfig = {
  slug: "discount-codes",
  labels: { singular: "Mã giảm giá", plural: "Mã giảm giá" },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "code",
    defaultColumns: ["code", "percent", "active", "updatedAt"],
  },
  access: { read: staffAccess, create: staffAccess, update: staffAccess, delete: staffAccess },
  fields: [
    {
      name: "code",
      label: "Mã",
      type: "text",
      required: true,
      unique: true,
      index: true,
      maxLength: 20,
      hooks: { beforeValidate: [({ value }) => normalizeDiscountCode(value)] },
      validate: (value: unknown) =>
        (typeof value === "string" && DISCOUNT_CODE_PATTERN.test(value)) || "Mã gồm 3–20 ký tự chữ in hoa hoặc số (A–Z, 0–9).",
    },
    {
      name: "percent",
      label: "Giảm (%)",
      type: "number",
      required: true,
      min: 1,
      max: 100,
      validate: (value: unknown) =>
        (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) || "Mức giảm là số nguyên từ 1 đến 100.",
    },
    { name: "active", label: "Đang bật", type: "checkbox", defaultValue: true },
  ],
}
