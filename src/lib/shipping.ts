import { resolveProvince, type Province } from "./provinces.ts"
import { PROVINCE_COORDS } from "./province-coords.ts"

/**
 * Pure shipping rules. Each shop's fee comes from the road distance between
 * its warehouse and the delivery point (straight line × 1.3), priced with a
 * km tariff and scaled by the admin's percentage. Without coordinates the
 * distance between the two provinces' centres is used and labelled as an
 * estimate.
 */
export type LatLng = { lat: number; lng: number }

/** Admin-editable part of the tariff (VND, km and %). */
export type ShippingTariff = { firstKm: number; firstFee: number; perKm: number; adjustPercent: number }

export type ShippingSettings = ShippingTariff & {
  /** Warehouse province for products BOAI sells itself (no seller), also the fallback origin. */
  defaultOrigin: string
  defaultOriginPoint: LatLng | null
}

export const DEFAULT_TARIFF: ShippingTariff = { firstKm: 3, firstFee: 8000, perKm: 3000, adjustPercent: 0 }
/** Long-haul part of the tariff is fixed in code: from 100 km each extra km costs 1.500₫. */
export const LONG_FROM_KM = 100
export const LONG_PER_KM = 1500
export const MIN_ADJUST_PERCENT = -100
export const MAX_ADJUST_PERCENT = 100
export const TARIFF_LIMITS = {
  firstKm: { min: 0, max: 50 },
  firstFee: { min: 0, max: 500_000 },
  perKm: { min: 0, max: 100_000 },
} as const
export const MAX_DISTANCE_KM = 3000
export const MAX_SHIPPING_FEE = 10_000_000
/** Estimate used when shop and buyer are in the same province but exact points are unknown. */
export const SAME_PROVINCE_KM = 15
/** Straight-line distance × this factor ≈ road distance. */
export const ROAD_FACTOR = 1.3
/** Distances shown in the admin's live preview. */
export const PREVIEW_KMS = [3, 5, 10, 20] as const

export const SHIPPING_ZONES = ["sameProvince", "sameRegion", "crossRegion"] as const
export type ShippingZone = (typeof SHIPPING_ZONES)[number]

/** Labels for the zones stored on orders placed before distance pricing. */
export const ZONE_LABELS: Record<ShippingZone, { vi: string; en: string; hintVi: string; hintEn: string }> = {
  sameProvince: { vi: "Nội tỉnh", en: "Same province", hintVi: "Shop và khách cùng tỉnh/thành", hintEn: "Shop and buyer in the same province" },
  sameRegion: { vi: "Nội miền", en: "Same region", hintVi: "Khác tỉnh nhưng cùng miền", hintEn: "Different province, same region" },
  crossRegion: { vi: "Liên miền", en: "Cross-region", hintVi: "Shop và khách ở hai miền khác nhau", hintEn: "Shop and buyer in different regions" },
}

const finite = (value: unknown) => {
  if (value === null || value === undefined) return null
  const n = typeof value === "string" && value.trim() === "" ? NaN : Number(value)
  return Number.isFinite(n) ? n : null
}

export const clampPercent = (value: unknown, fallback = 0) => {
  const n = finite(value)
  return n === null ? fallback : Math.min(MAX_ADJUST_PERCENT, Math.max(MIN_ADJUST_PERCENT, Math.round(n)))
}

/** Rough bounding box of Vietnam: rejects swapped or garbage coordinates. */
export function toPoint(lat: unknown, lng: unknown): LatLng | null {
  const a = finite(lat)
  const b = finite(lng)
  if (a === null || b === null) return null
  if (a < 7 || a > 24 || b < 101.5 || b > 111) return null
  return { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(b * 1e6) / 1e6 }
}

/** [vi, en] error for an admin tariff input, or null when it is acceptable. */
export function tariffIssue(input: Partial<Record<keyof ShippingTariff, unknown>>): readonly [string, string] | null {
  const checks: [keyof typeof TARIFF_LIMITS, string, string][] = [
    ["firstFee", "Phí mở đầu", "Starting fee"],
    ["firstKm", "Số km mở đầu", "Starting distance"],
    ["perKm", "Phí mỗi km tiếp theo", "Fee per extra km"],
  ]
  for (const [key, vi, en] of checks) {
    const n = finite(input[key])
    const { min, max } = TARIFF_LIMITS[key]
    if (n === null) return [`${vi} phải là một số.`, `${en} must be a number.`]
    if (n < min || n > max) return [`${vi} cần nằm trong khoảng ${min.toLocaleString("vi-VN")}–${max.toLocaleString("vi-VN")}.`, `${en} must be between ${min} and ${max}.`]
    if (key !== "firstKm" && !Number.isInteger(n)) return [`${vi} phải là số nguyên (đồng).`, `${en} must be a whole number of dong.`]
  }
  const adjust = finite(input.adjustPercent)
  if (adjust === null || !Number.isInteger(adjust)) return ["Mức điều chỉnh phải là số nguyên.", "The adjustment must be a whole number."]
  if (adjust < MIN_ADJUST_PERCENT || adjust > MAX_ADJUST_PERCENT)
    return ["Mức điều chỉnh chỉ từ −100% đến +100%.", "The adjustment must be between −100% and +100%."]
  return null
}

/** Normalizes the stored global, falling back to defaults for missing values. */
export function resolveShippingSettings(doc: unknown): ShippingSettings {
  const raw = (doc && typeof doc === "object" ? doc : {}) as Record<string, unknown>
  const pick = (key: keyof typeof TARIFF_LIMITS) => {
    const n = finite(raw[key])
    const { min, max } = TARIFF_LIMITS[key]
    return n === null ? DEFAULT_TARIFF[key] : Math.min(max, Math.max(min, n))
  }
  return {
    firstKm: pick("firstKm"),
    firstFee: Math.round(pick("firstFee")),
    perKm: Math.round(pick("perKm")),
    adjustPercent: clampPercent(raw.adjustPercent, DEFAULT_TARIFF.adjustPercent),
    defaultOrigin: resolveProvince(raw.defaultOriginProvince)?.code ?? "ho-chi-minh",
    defaultOriginPoint: toPoint(raw.originLat, raw.originLng),
  }
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Road distance estimate between two exact points, to 0.1 km. */
export const roadKm = (a: LatLng, b: LatLng) => Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10

export function shippingZone(origin: Province | null, destination: Province | null): ShippingZone {
  if (!origin || !destination) return "crossRegion"
  if (origin.code === destination.code) return "sameProvince"
  return origin.region === destination.region ? "sameRegion" : "crossRegion"
}

/** Road distance between two provinces' centres; null when either is unknown. */
export function estimateKm(origin: Province | null, destination: Province | null): number | null {
  if (!origin || !destination) return null
  if (origin.code === destination.code) return SAME_PROVINCE_KM
  const a = PROVINCE_COORDS[origin.code]
  const b = PROVINCE_COORDS[destination.code]
  if (!a || !b) return null
  return Math.round(roadKm({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }))
}

/** Tariff before the admin percentage: first km block, per km up to 100 km, then the long-haul rate. */
export function baseFeeForKm(km: number, tariff: ShippingTariff) {
  const d = Math.max(0, Math.min(MAX_DISTANCE_KM, km))
  if (d <= tariff.firstKm) return tariff.firstFee
  const mid = Math.max(0, Math.min(d, LONG_FROM_KM) - tariff.firstKm)
  const long = Math.max(0, d - Math.max(LONG_FROM_KM, tariff.firstKm))
  return tariff.firstFee + mid * tariff.perKm + long * LONG_PER_KM
}

/** Final fee: base × (1 + adj/100), rounded to the nearest 1.000₫. */
export function shippingFeeFor(km: number, tariff: ShippingTariff) {
  const fee = (baseFeeForKm(km, tariff) * (100 + clampPercent(tariff.adjustPercent))) / 100
  return Math.min(MAX_SHIPPING_FEE, Math.max(0, Math.round(fee / 1000) * 1000))
}

/** Google Maps directions between two free-text addresses (no API key needed). */
export const mapsDirectionsUrl = (origin: string, destination: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`

/** One shop's shipping line at checkout. */
export type ShippingQuoteLine = {
  /** Seller id, or "boai" for products BOAI sells itself. */
  key: string
  shopName: string
  subtotal: number
  originProvince: string
  distanceKm: number
  fee: number
  /** True when the distance comes from province centres instead of exact points. */
  estimated: boolean
}
