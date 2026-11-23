/**
 * The single source of SportDNA radar axes, used by the test, results,
 * profile, community posts and share images. Older radars (the first
 * community share cards and the extra practice tests) are mapped onto these
 * axes; an axis with no data stays null and is shown as "Chưa đủ dữ liệu".
 */
export type DnaAxisSport = "badminton" | "football"
export type Bilingual = { vi: string; en: string }

export const AXIS_IDS = {
  badminton: ["smash", "drop", "net", "defense", "movement", "endurance", "stability", "tactics"],
  football: ["control", "passing", "shooting", "dribbling", "positioning", "speed", "defending", "endurance"],
} as const

export const AXIS_TEXT: Record<DnaAxisSport, Record<string, Bilingual>> = {
  badminton: {
    smash: { vi: "Đập cầu", en: "Smash" },
    drop: { vi: "Chặt", en: "Drop" },
    net: { vi: "Lưới", en: "Net play" },
    defense: { vi: "Phòng thủ", en: "Defence" },
    movement: { vi: "Di chuyển", en: "Movement" },
    endurance: { vi: "Sức bền", en: "Endurance" },
    stability: { vi: "Ổn định", en: "Consistency" },
    tactics: { vi: "Chiến thuật", en: "Tactics" },
  },
  football: {
    control: { vi: "Kiểm bóng", en: "Ball control" },
    passing: { vi: "Chuyền", en: "Passing" },
    shooting: { vi: "Sút", en: "Shooting" },
    dribbling: { vi: "Rê dắt", en: "Dribbling" },
    positioning: { vi: "Vị trí", en: "Positioning" },
    speed: { vi: "Tốc độ", en: "Speed" },
    defending: { vi: "Phòng ngự", en: "Defending" },
    endurance: { vi: "Sức bền", en: "Endurance" },
  },
}

export const axisText = (sport: DnaAxisSport, id: string): Bilingual => AXIS_TEXT[sport][id] ?? { vi: id, en: id }

/** "Đập cầu · Chặt · Lưới · …" for intros. */
export const axisList = (sport: DnaAxisSport, lang: "vi" | "en") => AXIS_IDS[sport].map((id) => AXIS_TEXT[sport][id][lang]).join(" · ")

export type DnaAxisValue = { id: string; value: number | null }

/**
 * Old radar axes → standard axes. Keys are the old ids and also their old
 * Vietnamese labels, because early community posts stored labels only.
 */
const LEGACY_RADAR: Record<DnaAxisSport, Record<string, string | null>> = {
  badminton: {
    power: "smash", attack: "smash", speed: "movement", endurance: "endurance", balance: "stability", reflex: "net", defense: "defense", tactics: "tactics",
    "Sức mạnh": "smash", "Tấn công": "smash", "Tốc độ": "movement", "Bền bỉ": "endurance", "Cân bằng": "stability", "Phản xạ": "net", "Phòng thủ": "defense", "Chiến thuật": "tactics",
  },
  football: {
    power: null, reflex: null, speed: "speed", endurance: "endurance", duel: "defending", defending: "defending", passing: "passing", finishing: "shooting",
    "Sức mạnh": null, "Phản xạ": null, "Tốc độ": "speed", "Bền bỉ": "endurance", "Tranh chấp": "defending", "Phòng ngự": "defending", "Chuyền bóng": "passing", "Dứt điểm": "shooting",
  },
}

/** The badminton singles extra test (sân 2D) radar: sub-rating ids → standard axes. */
export const LEGACY_SINGLES_AXES: Record<string, string> = {
  power: "smash",
  speed: "movement",
  reflex: "defense",
  technique: "drop",
  control: "tactics",
  endurance: "endurance",
  tactics: "tactics",
  balance: "stability",
}

/** Resolves any stored axis (standard id, standard label, old id or old label) to a standard id. */
export function standardAxisId(sport: DnaAxisSport, axis: { id?: string | null; label?: string | null }): string | null {
  const ids = AXIS_IDS[sport] as readonly string[]
  if (axis.id && ids.includes(axis.id)) return axis.id
  const label = axis.label?.trim() ?? ""
  const byLabel = ids.find((id) => AXIS_TEXT[sport][id].vi === label || AXIS_TEXT[sport][id].en === label)
  if (byLabel) return byLabel
  const legacy = (axis.id && LEGACY_RADAR[sport][axis.id]) ?? LEGACY_RADAR[sport][label]
  return legacy ?? null
}

/**
 * Full standard axis list from any set of stored values. Several old axes
 * that land on the same standard axis are averaged; axes nothing maps to are null.
 */
export function toStandardAxes(
  sport: DnaAxisSport,
  values: { id?: string | null; label?: string | null; value: number | null; weight?: number }[],
  resolve: (axis: { id?: string | null; label?: string | null }) => string | null = (axis) => standardAxisId(sport, axis),
): DnaAxisValue[] {
  const sums = new Map<string, { total: number; weight: number }>()
  for (const item of values) {
    if (item.value === null || item.value === undefined || !Number.isFinite(item.value)) continue
    const id = resolve(item)
    if (!id) continue
    const weight = item.weight && item.weight > 0 ? item.weight : 1
    const current = sums.get(id) ?? { total: 0, weight: 0 }
    sums.set(id, { total: current.total + item.value * weight, weight: current.weight + weight })
  }
  return AXIS_IDS[sport].map((id) => {
    const sum = sums.get(id)
    return { id, value: sum && sum.weight > 0 ? Math.round(Math.max(0, Math.min(100, sum.total / sum.weight))) : null }
  })
}

export type StrengthSummary =
  | { kind: "none" }
  | { kind: "even"; value: number }
  | { kind: "split"; strongest: { id: string; value: number }; weakest: { id: string; value: number } | null }

/**
 * "Mạnh nhất" and "Cần cải thiện" are never the same axis: with one known
 * axis only the strongest is shown, and when every known axis has the same
 * score the result is "Các kỹ năng đang đồng đều".
 */
export function strengthSummary(axes: DnaAxisValue[]): StrengthSummary {
  const known = axes.filter((a): a is { id: string; value: number } => a.value !== null)
  if (!known.length) return { kind: "none" }
  const max = Math.max(...known.map((a) => a.value))
  const min = Math.min(...known.map((a) => a.value))
  if (known.length > 1 && max === min) return { kind: "even", value: max }
  const strongest = known.find((a) => a.value === max)!
  const weakest = known.length > 1 ? known.find((a) => a.value === min && a.id !== strongest.id) ?? null : null
  return { kind: "split", strongest, weakest }
}
