// Shared jersey-kit catalog: pattern presets, templates, fonts and validation.
// Pure data so the SVG renderer (client + server) and Payload validation agree.

export const PATTERN_IDS = [
  "none",
  "lightning",
  "shards",
  "brush",
  "stripes",
  "pinstripe",
  "hoops",
  "diagonal",
  "sash",
  "halves",
  "gradient",
  "duotone",
  "halftone",
  "chevron",
  "zigzag",
  "geometric",
  "camo",
  "digital",
  "hex",
  "waves",
  "topo",
  "checker",
  "sunburst",
  "centerband",
  "sidepanels",
  "shoulders",
  "chestband",
  "tiger",
  "scales",
  "cross",
  "argyle",
  "splatter",
] as const
export type PatternId = (typeof PATTERN_IDS)[number]

export const PATTERN_LABELS: Record<PatternId, { vi: string; en: string }> = {
  none: { vi: "Trơn", en: "Plain" },
  lightning: { vi: "Tia sét", en: "Lightning" },
  shards: { vi: "Mảnh vỡ", en: "Shards" },
  brush: { vi: "Nét cọ", en: "Brush" },
  stripes: { vi: "Sọc dọc", en: "Stripes" },
  pinstripe: { vi: "Sọc mảnh", en: "Pinstripe" },
  hoops: { vi: "Sọc ngang", en: "Hoops" },
  diagonal: { vi: "Sọc chéo", en: "Diagonal" },
  sash: { vi: "Dải chéo", en: "Sash" },
  halves: { vi: "Hai nửa", en: "Halves" },
  gradient: { vi: "Chuyển màu", en: "Gradient" },
  duotone: { vi: "Hai tông", en: "Duotone" },
  halftone: { vi: "Chấm bi", en: "Halftone" },
  chevron: { vi: "Mũi tên", en: "Chevron" },
  zigzag: { vi: "Zigzag", en: "Zigzag" },
  geometric: { vi: "Hình học", en: "Geometric" },
  camo: { vi: "Rằn ri", en: "Camouflage" },
  digital: { vi: "Pixel", en: "Digital camo" },
  hex: { vi: "Tổ ong", en: "Honeycomb" },
  waves: { vi: "Sóng", en: "Waves" },
  topo: { vi: "Đường đồng mức", en: "Topographic" },
  checker: { vi: "Ô cờ", en: "Checker" },
  sunburst: { vi: "Tỏa nắng", en: "Sunburst" },
  centerband: { vi: "Dải giữa", en: "Center band" },
  sidepanels: { vi: "Viền sườn", en: "Side panels" },
  shoulders: { vi: "Vai phối", en: "Shoulder yoke" },
  chestband: { vi: "Dải ngực", en: "Chest band" },
  tiger: { vi: "Vằn hổ", en: "Tiger" },
  scales: { vi: "Vảy rồng", en: "Scales" },
  cross: { vi: "Dấu cộng", en: "Crosses" },
  argyle: { vi: "Kim cương", en: "Argyle" },
  splatter: { vi: "Sơn vẩy", en: "Splatter" },
}

export type Collar = "crew" | "v"

/** Kit-wide look shared by front and back. */
export type KitStyle = {
  template: string
  pattern: PatternId
  patternColor: string
  patternColor2: string
  /** 0.1–1 */
  patternOpacity: number
  /** 0.5–2 */
  patternScale: number
  patternHidden?: boolean
  trim: string
  collar: Collar
  /** Apply the pattern to the shorts too. */
  pantsPattern: boolean
}

export const DEFAULT_KIT: KitStyle = {
  template: "custom",
  pattern: "none",
  patternColor: "#7c3aed",
  patternColor2: "#c4b5fd",
  patternOpacity: 0.85,
  patternScale: 1,
  trim: "#ffffff",
  collar: "crew",
  pantsPattern: false,
}

export type KitTemplate = {
  id: string
  vi: string
  en: string
  base: string
  pants: string
  text: string
  kit: Omit<KitStyle, "template" | "patternHidden">
}

const t = (
  id: string,
  vi: string,
  en: string,
  base: string,
  pattern: PatternId,
  patternColor: string,
  patternColor2: string,
  trim: string,
  options: Partial<Pick<KitStyle, "patternOpacity" | "patternScale" | "collar" | "pantsPattern">> & {
    pants?: string
    text?: string
  } = {},
): KitTemplate => ({
  id,
  vi,
  en,
  base,
  pants: options.pants ?? base,
  text: options.text ?? "#ffffff",
  kit: {
    pattern,
    patternColor,
    patternColor2,
    trim,
    patternOpacity: options.patternOpacity ?? 0.9,
    patternScale: options.patternScale ?? 1,
    collar: options.collar ?? "crew",
    pantsPattern: options.pantsPattern ?? false,
  },
})

export const KIT_TEMPLATES: KitTemplate[] = [
  t("thunder", "Sấm tím", "Purple Thunder", "#121019", "lightning", "#7c3aed", "#a78bfa", "#7c3aed", { pants: "#121019" }),
  t("ice", "Băng trắng", "Ice Shards", "#f1f5f9", "shards", "#cbd5e1", "#94a3b8", "#1e293b", { text: "#1e293b" }),
  t("rossoneri", "Sọc đỏ đen", "Red & Black Stripes", "#141414", "stripes", "#c1121f", "#c1121f", "#c1121f", { patternScale: 0.9, pants: "#141414" }),
  t("ocean", "Sóng xanh", "Ocean Brush", "#1d4ed8", "brush", "#60a5fa", "#bfdbfe", "#ffffff", { pants: "#ffffff" }),
  t("heritage", "Cổ điển kem", "Heritage Cream", "#f3ecdc", "pinstripe", "#1e293b", "#1e293b", "#1e293b", { patternOpacity: 0.25, collar: "v", text: "#1e293b", pants: "#1e293b" }),
  t("midnight", "Đêm đen", "Midnight Topo", "#0b0b10", "topo", "#3f3f46", "#52525b", "#e5e7eb", { patternOpacity: 0.8 }),
  t("royal", "Hoàng gia", "Royal Hoops", "#1e3a8a", "hoops", "#fbbf24", "#fbbf24", "#fbbf24", { patternScale: 0.55, patternOpacity: 1, text: "#fbbf24" }),
  t("sash", "Dải chéo vàng", "Golden Sash", "#ffffff", "sash", "#f59e0b", "#111827", "#111827", { text: "#111827", pants: "#111827" }),
  t("jungle", "Rừng xanh", "Jungle Camo", "#365314", "camo", "#4d7c0f", "#1a2e05", "#a3e635", { patternOpacity: 1 }),
  t("blaze", "Cam lửa", "Blaze Fade", "#f97316", "gradient", "#7c2d12", "#fb923c", "#111827", { patternOpacity: 1, pants: "#111827" }),
  t("checker", "Ô cờ đỏ", "Red Checker", "#c1121f", "checker", "#ffffff", "#ffffff", "#1e3a8a", { patternOpacity: 0.95, pants: "#ffffff", text: "#1e3a8a" }),
  t("tiger", "Hổ vằn", "Tiger", "#f59e0b", "tiger", "#111111", "#111111", "#111111", { text: "#111111", pants: "#111111" }),
  t("pixel", "Pixel xám", "Grey Pixel", "#374151", "digital", "#6b7280", "#1f2937", "#f97316", { patternOpacity: 1 }),
  t("hive", "Tổ ong xanh", "Cyan Hive", "#0f172a", "hex", "#22d3ee", "#0891b2", "#22d3ee", { patternOpacity: 0.6 }),
  t("candy", "Chấm bi hồng", "Pink Halftone", "#ec4899", "halftone", "#831843", "#9d174d", "#ffffff", { patternOpacity: 0.7 }),
  t("split", "Hai nửa", "Sky Halves", "#ffffff", "halves", "#0ea5e9", "#0369a1", "#0369a1", { text: "#0f172a", pants: "#0369a1" }),
  t("arrow", "Mũi tên lục", "Emerald Arrow", "#065f46", "chevron", "#10b981", "#34d399", "#d1fae5", { patternOpacity: 0.7 }),
  t("voltage", "Zigzag tím", "Violet Voltage", "#4c1d95", "zigzag", "#c4b5fd", "#8b5cf6", "#c4b5fd", { patternOpacity: 0.55 }),
  t("prism", "Hình học", "Prism", "#0c4a6e", "geometric", "#38bdf8", "#0369a1", "#e0f2fe", { patternOpacity: 0.8 }),
  t("sunrise", "Tỏa nắng", "Sunrise", "#facc15", "sunburst", "#f59e0b", "#f59e0b", "#111827", { patternOpacity: 0.6, text: "#111827", pants: "#111827" }),
  t("classic", "Dải giữa đỏ", "Center Stripe", "#ffffff", "centerband", "#dc2626", "#111827", "#dc2626", { text: "#111827", pants: "#dc2626" }),
  t("panther", "Sườn đen", "Panther Panels", "#e11d48", "sidepanels", "#111111", "#ffffff", "#111111", { pants: "#111111" }),
  t("yoke", "Vai trắng", "White Yoke", "#2563eb", "shoulders", "#ffffff", "#1e3a8a", "#ffffff", { pants: "#ffffff" }),
  t("chest", "Dải ngực cam", "Orange Chest Band", "#111827", "chestband", "#f97316", "#fdba74", "#f97316"),
  t("dragon", "Vảy rồng", "Dragon Scales", "#7f1d1d", "scales", "#fca5a5", "#fecaca", "#fca5a5", { patternOpacity: 0.45 }),
  t("argyle", "Kim cương", "Argyle", "#1e293b", "argyle", "#64748b", "#cbd5e1", "#cbd5e1", { patternOpacity: 0.6 }),
  t("tide", "Sóng nước", "Tide", "#0891b2", "waves", "#67e8f9", "#a5f3fc", "#ffffff", { patternOpacity: 0.55 }),
  t("graffiti", "Sơn vẩy", "Graffiti", "#f8fafc", "splatter", "#111827", "#ef4444", "#111827", { text: "#111827", pants: "#111827" }),
  t("forest", "Sọc chéo lục", "Forest Diagonal", "#14532d", "diagonal", "#22c55e", "#22c55e", "#bbf7d0", { patternOpacity: 0.5, patternScale: 0.8 }),
  t("plus", "Dấu cộng", "Indigo Plus", "#312e81", "cross", "#818cf8", "#a5b4fc", "#a5b4fc", { patternOpacity: 0.5 }),
  t("neon", "Hai tông neon", "Neon Duotone", "#1e1b4b", "duotone", "#db2777", "#f472b6", "#f472b6", { patternOpacity: 1 }),
  t("stealth", "Mảnh vỡ đen", "Stealth Shards", "#0a0a0a", "shards", "#262626", "#404040", "#a3a3a3", { patternOpacity: 1 }),
  t("storm", "Sấm xanh", "Blue Storm", "#0b1d4a", "lightning", "#2563eb", "#93c5fd", "#93c5fd"),
  t("lava", "Nham thạch", "Lava Brush", "#1c1917", "brush", "#dc2626", "#f97316", "#f97316"),
  t("snow", "Trơn trắng", "Pure White", "#ffffff", "none", "#000000", "#000000", "#1e3a8a", { text: "#1e3a8a", pants: "#1e3a8a" }),
  t("onyx", "Trơn đen", "Onyx", "#111111", "none", "#000000", "#000000", "#facc15", { text: "#facc15" }),
]

export type JerseyFont = {
  id: string
  label: string
  /** Supports Vietnamese diacritics. */
  vi: boolean
  group: "sport" | "modern" | "classic" | "script" | "number"
}

/** Keep in sync with custom-ao/jersey-fonts.ts (CSS variable --jf-<id>). */
export const JERSEY_FONTS: JerseyFont[] = [
  { id: "anton", label: "Anton", vi: true, group: "sport" },
  { id: "oswald", label: "Oswald", vi: true, group: "sport" },
  { id: "saira", label: "Saira Condensed", vi: true, group: "sport" },
  { id: "barlow", label: "Barlow Condensed", vi: true, group: "sport" },
  { id: "fjalla", label: "Fjalla One", vi: true, group: "sport" },
  { id: "roboto", label: "Roboto Condensed", vi: true, group: "sport" },
  { id: "montserrat", label: "Montserrat", vi: true, group: "modern" },
  { id: "kanit", label: "Kanit", vi: true, group: "modern" },
  { id: "exo", label: "Exo 2", vi: true, group: "modern" },
  { id: "chakra", label: "Chakra Petch", vi: true, group: "modern" },
  { id: "play", label: "Play", vi: true, group: "modern" },
  { id: "bevietnam", label: "Be Vietnam Pro", vi: true, group: "modern" },
  { id: "bungee", label: "Bungee", vi: true, group: "modern" },
  { id: "bungeeinline", label: "Bungee Inline", vi: true, group: "modern" },
  { id: "blackops", label: "Black Ops One", vi: true, group: "classic" },
  { id: "alfa", label: "Alfa Slab One", vi: true, group: "classic" },
  { id: "paytone", label: "Paytone One", vi: true, group: "classic" },
  { id: "sigmar", label: "Sigmar One", vi: true, group: "classic" },
  { id: "chonburi", label: "Chonburi", vi: true, group: "classic" },
  { id: "bangers", label: "Bangers", vi: true, group: "script" },
  { id: "sedgwick", label: "Sedgwick Ave", vi: true, group: "script" },
  { id: "lobster", label: "Lobster", vi: true, group: "script" },
  { id: "pacifico", label: "Pacifico", vi: true, group: "script" },
  { id: "dancing", label: "Dancing Script", vi: true, group: "script" },
  { id: "bebas", label: "Bebas Neue", vi: false, group: "number" },
  { id: "teko", label: "Teko", vi: false, group: "number" },
  { id: "graduate", label: "Graduate", vi: false, group: "number" },
  { id: "russo", label: "Russo One", vi: false, group: "number" },
  { id: "orbitron", label: "Orbitron", vi: false, group: "number" },
  { id: "staatliches", label: "Staatliches", vi: false, group: "number" },
  { id: "squada", label: "Squada One", vi: false, group: "number" },
  { id: "racing", label: "Racing Sans One", vi: false, group: "number" },
  { id: "oxanium", label: "Oxanium", vi: false, group: "number" },
  { id: "archivo", label: "Archivo Black", vi: false, group: "number" },
]
export const FONT_IDS = new Set(JERSEY_FONTS.map((f) => f.id))
export const fontStack = (id?: string | null) =>
  id && FONT_IDS.has(id) ? `var(--jf-${id}), "Arial Black", Arial, sans-serif` : `Arial, "Helvetica Neue", sans-serif`

export const TEXT_ROLES = ["team", "player", "number"] as const
export type TextRole = (typeof TEXT_ROLES)[number]

const HEX = /^#[0-9a-f]{6}$/i
const inRange = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max

export function normalizeKit(value: unknown): KitStyle | undefined {
  if (!value || typeof value !== "object") return undefined
  const k = value as Record<string, unknown>
  const pattern = PATTERN_IDS.includes(k.pattern as PatternId) ? (k.pattern as PatternId) : "none"
  const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback)
  return {
    template: typeof k.template === "string" ? k.template.slice(0, 40) : "custom",
    pattern,
    patternColor: hex(k.patternColor, DEFAULT_KIT.patternColor),
    patternColor2: hex(k.patternColor2, DEFAULT_KIT.patternColor2),
    patternOpacity: inRange(k.patternOpacity, 0.05, 1) ? (k.patternOpacity as number) : DEFAULT_KIT.patternOpacity,
    patternScale: inRange(k.patternScale, 0.4, 2.5) ? (k.patternScale as number) : 1,
    patternHidden: k.patternHidden === true,
    trim: hex(k.trim, DEFAULT_KIT.trim),
    collar: k.collar === "v" ? "v" : "crew",
    pantsPattern: k.pantsPattern === true,
  }
}

/** Payload-side validation for the optional `art.kit` object. */
export function validKit(value: unknown): true | string {
  if (value === undefined || value === null) return true
  if (typeof value !== "object") return "Kiểu áo không hợp lệ."
  const k = value as Record<string, unknown>
  if (typeof k.template !== "string" || k.template.length > 40) return "Mẫu áo không hợp lệ."
  if (!PATTERN_IDS.includes(k.pattern as PatternId)) return "Họa tiết không hợp lệ."
  for (const key of ["patternColor", "patternColor2", "trim"]) {
    if (typeof k[key] !== "string" || !HEX.test(k[key] as string)) return "Màu họa tiết không hợp lệ."
  }
  if (!inRange(k.patternOpacity, 0.05, 1) || !inRange(k.patternScale, 0.4, 2.5)) return "Thông số họa tiết không hợp lệ."
  if (k.collar !== "crew" && k.collar !== "v") return "Kiểu cổ áo không hợp lệ."
  if (typeof k.pantsPattern !== "boolean") return "Thông số quần không hợp lệ."
  if (k.patternHidden !== undefined && typeof k.patternHidden !== "boolean") return "Thông số họa tiết không hợp lệ."
  return true
}

/** Extra text styling fields; all optional for designs saved before the redesign. */
export function validTextStyle(item: Record<string, unknown>): true | string {
  if (item.font !== undefined && (typeof item.font !== "string" || !FONT_IDS.has(item.font))) return "Phông chữ không hợp lệ."
  if (item.outline !== undefined && item.outline !== null && (typeof item.outline !== "string" || !HEX.test(item.outline))) return "Màu viền chữ không hợp lệ."
  if (item.outlineWidth !== undefined && !inRange(item.outlineWidth, 0, 12)) return "Độ dày viền chữ không hợp lệ."
  if (item.arc !== undefined && !inRange(item.arc, -80, 80)) return "Độ cong chữ không hợp lệ."
  if (item.spacing !== undefined && !inRange(item.spacing, -4, 30)) return "Giãn chữ không hợp lệ."
  if (item.role !== undefined && !TEXT_ROLES.includes(item.role as TextRole)) return "Loại chữ không hợp lệ."
  if (item.hidden !== undefined && typeof item.hidden !== "boolean") return "Dữ liệu chữ không hợp lệ."
  return true
}
