/**
 * Vietnam's 34 provinces/cities after the 1 July 2025 merger, grouped into the
 * three shipping regions. `aliases` keep pre-merger names so addresses saved
 * before the merger still resolve to the right province.
 */
export type Region = "north" | "central" | "south"

export const REGION_LABELS: Record<Region, { vi: string; en: string }> = {
  north: { vi: "Miền Bắc", en: "Northern Vietnam" },
  central: { vi: "Miền Trung", en: "Central Vietnam" },
  south: { vi: "Miền Nam", en: "Southern Vietnam" },
}

export type Province = { code: string; name: string; region: Region; aliases: string[] }

export const PROVINCES: Province[] = [
  // Miền Bắc
  { code: "ha-noi", name: "Hà Nội", region: "north", aliases: ["Hanoi"] },
  { code: "hai-phong", name: "Hải Phòng", region: "north", aliases: ["Hải Dương"] },
  { code: "quang-ninh", name: "Quảng Ninh", region: "north", aliases: [] },
  { code: "bac-ninh", name: "Bắc Ninh", region: "north", aliases: ["Bắc Giang"] },
  { code: "hung-yen", name: "Hưng Yên", region: "north", aliases: ["Thái Bình"] },
  { code: "ninh-binh", name: "Ninh Bình", region: "north", aliases: ["Hà Nam", "Nam Định"] },
  { code: "phu-tho", name: "Phú Thọ", region: "north", aliases: ["Vĩnh Phúc", "Hòa Bình", "Hoà Bình"] },
  { code: "thai-nguyen", name: "Thái Nguyên", region: "north", aliases: ["Bắc Kạn", "Bắc Cạn"] },
  { code: "tuyen-quang", name: "Tuyên Quang", region: "north", aliases: ["Hà Giang"] },
  { code: "lao-cai", name: "Lào Cai", region: "north", aliases: ["Yên Bái"] },
  { code: "lang-son", name: "Lạng Sơn", region: "north", aliases: [] },
  { code: "cao-bang", name: "Cao Bằng", region: "north", aliases: [] },
  { code: "lai-chau", name: "Lai Châu", region: "north", aliases: [] },
  { code: "dien-bien", name: "Điện Biên", region: "north", aliases: [] },
  { code: "son-la", name: "Sơn La", region: "north", aliases: [] },
  // Miền Trung & Tây Nguyên
  { code: "thanh-hoa", name: "Thanh Hóa", region: "central", aliases: ["Thanh Hoá"] },
  { code: "nghe-an", name: "Nghệ An", region: "central", aliases: [] },
  { code: "ha-tinh", name: "Hà Tĩnh", region: "central", aliases: [] },
  { code: "quang-tri", name: "Quảng Trị", region: "central", aliases: ["Quảng Bình"] },
  { code: "hue", name: "Huế", region: "central", aliases: ["Thừa Thiên Huế", "Thừa Thiên - Huế"] },
  { code: "da-nang", name: "Đà Nẵng", region: "central", aliases: ["Quảng Nam", "Danang"] },
  { code: "quang-ngai", name: "Quảng Ngãi", region: "central", aliases: ["Kon Tum"] },
  { code: "gia-lai", name: "Gia Lai", region: "central", aliases: ["Bình Định"] },
  { code: "dak-lak", name: "Đắk Lắk", region: "central", aliases: ["Đắc Lắk", "Dak Lak", "Phú Yên"] },
  { code: "khanh-hoa", name: "Khánh Hòa", region: "central", aliases: ["Khánh Hoà", "Ninh Thuận", "Nha Trang"] },
  { code: "lam-dong", name: "Lâm Đồng", region: "central", aliases: ["Đắk Nông", "Đắc Nông", "Bình Thuận", "Đà Lạt"] },
  // Miền Nam
  { code: "ho-chi-minh", name: "TP. Hồ Chí Minh", region: "south", aliases: ["Hồ Chí Minh", "HCM", "TPHCM", "Sài Gòn", "Saigon", "Bình Dương", "Bà Rịa - Vũng Tàu", "Bà Rịa Vũng Tàu", "Vũng Tàu"] },
  { code: "dong-nai", name: "Đồng Nai", region: "south", aliases: ["Bình Phước"] },
  { code: "tay-ninh", name: "Tây Ninh", region: "south", aliases: ["Long An"] },
  { code: "can-tho", name: "Cần Thơ", region: "south", aliases: ["Sóc Trăng", "Hậu Giang"] },
  { code: "vinh-long", name: "Vĩnh Long", region: "south", aliases: ["Bến Tre", "Trà Vinh"] },
  { code: "dong-thap", name: "Đồng Tháp", region: "south", aliases: ["Tiền Giang"] },
  { code: "ca-mau", name: "Cà Mau", region: "south", aliases: ["Bạc Liêu"] },
  { code: "an-giang", name: "An Giang", region: "south", aliases: ["Kiên Giang", "Phú Quốc"] },
]

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const stripPrefix = (value: string) => value.replace(/^(tinh|thanh pho|tp)\s+/, "")

const LOOKUP: { key: string; province: Province }[] = PROVINCES.flatMap((province) =>
  [province.name, ...province.aliases].map((label) => ({ key: stripPrefix(normalize(label)), province })),
).sort((a, b) => b.key.length - a.key.length)

/** Exact province lookup by code, current name or a pre-merger name. */
export function resolveProvince(value: unknown): Province | null {
  if (typeof value !== "string" || !value.trim()) return null
  const byCode = PROVINCES.find((p) => p.code === value.trim())
  if (byCode) return byCode
  const key = stripPrefix(normalize(value))
  return LOOKUP.find((entry) => entry.key === key)?.province ?? null
}

/** Best-effort province from a free-text address: the name that appears last wins. */
export function detectProvince(address: unknown): Province | null {
  if (typeof address !== "string" || !address.trim()) return null
  const exact = resolveProvince(address)
  if (exact) return exact
  const text = ` ${normalize(address)} `
  let best: { at: number; province: Province } | null = null
  for (const entry of LOOKUP) {
    const at = text.lastIndexOf(` ${entry.key} `)
    if (at >= 0 && (!best || at > best.at)) best = { at, province: entry.province }
  }
  return best?.province ?? null
}

export const provincesByRegion = () =>
  (Object.keys(REGION_LABELS) as Region[]).map((region) => ({
    region,
    provinces: PROVINCES.filter((p) => p.region === region),
  }))
