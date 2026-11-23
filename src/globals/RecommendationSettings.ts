import type { GlobalConfig } from "payload"
import { staffAccess } from "../access/roles"
import { DEFAULT_MIN_PRICE_PER_DAY, DEFAULT_SLOTS, MAX_PRICE_PER_DAY, MAX_SLOTS } from "../lib/recommendations"

/** A custom validate replaces Payload's min/max check, so the range is checked here. */
const wholeNumberIn = (min: number, max: number) => (value: unknown) => {
  const n = Number(value)
  if (value === null || value === undefined || value === "") return "Bắt buộc nhập."
  return (Number.isInteger(n) && n >= min && n <= max) || `Hãy nhập số nguyên từ ${min.toLocaleString("vi-VN")} đến ${max.toLocaleString("vi-VN")}.`
}

/** Rules for paid homepage recommendations; edited in /quan-tri/de-xuat. */
export const RecommendationSettings: GlobalConfig = {
  slug: "recommendation-settings",
  label: "Đề xuất trả phí",
  admin: {
    group: "BOAI Commerce",
    description: "Số suất mỗi vị trí trên trang chủ và giá tối thiểu mỗi ngày shop phải trả.",
  },
  access: { read: staffAccess, update: staffAccess },
  fields: [
    {
      name: "slotsPerPosition",
      label: "Số suất mỗi vị trí",
      type: "number",
      required: true,
      defaultValue: DEFAULT_SLOTS,
      min: 1,
      max: MAX_SLOTS,
      validate: wholeNumberIn(1, MAX_SLOTS),
      admin: { description: "Áp dụng cho từng khối: Trang bị sân cỏ (bóng đá) và Tốc độ trên không (cầu lông)." },
    },
    {
      name: "minPricePerDay",
      label: "Giá tối thiểu mỗi ngày (₫)",
      type: "number",
      required: true,
      defaultValue: DEFAULT_MIN_PRICE_PER_DAY,
      min: 1000,
      max: MAX_PRICE_PER_DAY,
      validate: wholeNumberIn(1000, MAX_PRICE_PER_DAY),
    },
  ],
}
