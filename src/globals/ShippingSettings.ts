import type { Field, GlobalConfig } from "payload"
import { APIError } from "payload"
import { revalidatePath } from "next/cache"
import { staffAccess } from "../access/roles"
import { PROVINCES } from "../lib/provinces"
import {
  DEFAULT_TARIFF,
  MAX_ADJUST_PERCENT,
  MIN_ADJUST_PERCENT,
  SHIPPING_ZONES,
  tariffIssue,
  TARIFF_LIMITS,
  type ShippingZone,
} from "../lib/shipping"

// Legacy zone-rate fields stay in the schema (hidden) so stored values are kept,
// but pricing now uses the km tariff below scaled by `adjustPercent`.
const legacyMoney = (name: string): Field => ({ name, type: "number", admin: { hidden: true } })
const legacyZone = (zone: ShippingZone): Field => ({
  name: zone,
  type: "group",
  admin: { hidden: true },
  fields: [legacyMoney("fee"), legacyMoney("min"), legacyMoney("max")],
})

export const ShippingSettings: GlobalConfig = {
  slug: "shipping-settings",
  label: "Biểu phí vận chuyển",
  admin: {
    group: "BOAI Commerce",
    description:
      "Phí ship mỗi shop = biểu phí theo km (khoảng cách đường chim bay × 1,3) × (1 + điều chỉnh/100), làm tròn 1.000₫. Từ km thứ 100 mỗi km thêm 1.500₫.",
  },
  access: { read: () => true, update: staffAccess },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        // Same rules as the /quan-tri/van-chuyen form, enforced for every writer
        // (keys a partial update leaves out keep their stored/default values).
        const present = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
        const issue = tariffIssue({ ...DEFAULT_TARIFF, ...present })
        if (issue) throw new APIError(issue[0], 400, null, true)
        return data
      },
    ],
    afterChange: [
      () => {
        try {
          revalidatePath("/", "layout")
        } catch {
          // Outside a Next.js request (CLI) there is nothing to revalidate.
        }
      },
    ],
  },
  fields: [
    {
      name: "firstFee",
      label: "Phí mở đầu (₫)",
      type: "number",
      defaultValue: DEFAULT_TARIFF.firstFee,
      min: TARIFF_LIMITS.firstFee.min,
      max: TARIFF_LIMITS.firstFee.max,
      admin: { description: "Áp dụng cho quãng đường đầu tiên (mặc định 8.000₫ cho 3 km đầu).", step: 1000 },
    },
    {
      name: "firstKm",
      label: "Số km mở đầu",
      type: "number",
      defaultValue: DEFAULT_TARIFF.firstKm,
      min: TARIFF_LIMITS.firstKm.min,
      max: TARIFF_LIMITS.firstKm.max,
      admin: { step: 0.5 },
    },
    {
      name: "perKm",
      label: "Phí mỗi km tiếp theo (₫)",
      type: "number",
      defaultValue: DEFAULT_TARIFF.perKm,
      min: TARIFF_LIMITS.perKm.min,
      max: TARIFF_LIMITS.perKm.max,
      admin: { description: "Áp dụng đến km thứ 100; sau đó 1.500₫/km (cố định).", step: 500 },
    },
    {
      name: "adjustPercent",
      label: "Điều chỉnh phí vận chuyển (%)",
      type: "number",
      defaultValue: 0,
      min: MIN_ADJUST_PERCENT,
      max: MAX_ADJUST_PERCENT,
      admin: { description: "Số nguyên từ -100 đến 100. Ví dụ 10 = tăng 10%, -15 = giảm 15%.", step: 1 },
    },
    {
      name: "defaultOriginProvince",
      label: "Kho của BOAI (cho sản phẩm BOAI tự bán)",
      type: "select",
      defaultValue: "ho-chi-minh",
      options: PROVINCES.map((p) => ({ label: p.name, value: p.code })),
    },
    {
      type: "row",
      fields: [
        { name: "originLat", label: "Vĩ độ kho BOAI", type: "number", admin: { step: 0.000001 } },
        { name: "originLng", label: "Kinh độ kho BOAI", type: "number", admin: { step: 0.000001 } },
      ],
    },
    { name: "rates", type: "group", admin: { hidden: true }, fields: SHIPPING_ZONES.map(legacyZone) },
    { name: "allowSellerRates", type: "checkbox", admin: { hidden: true } },
    { name: "freeShipFrom", type: "number", admin: { hidden: true } },
  ],
}
