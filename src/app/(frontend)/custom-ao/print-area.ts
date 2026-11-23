import type { Garment, ItemKind, Point, Side, TextItem } from "./jersey-art"

/**
 * Printable panel of each garment face (viewBox 420×480). Items must stay
 * inside it: on a real shirt the sleeve seams are slanted, so a chest logo
 * pushed toward the shoulder would wrap onto the sleeve and the other face.
 */
const MARGIN = 4

// Shirt: torso from the neck (128,92) down the shoulder to the sleeve seam
// tip (72,119), along the slanted seam to the armpit (108,192), then straight.
const shirtLeft = (y: number) =>
  y <= 119 ? 128 - ((y - 92) * 56) / 27 : y <= 192 ? 72 + ((y - 119) * 36) / 73 : 108
// Shorts: outer leg seam from the waist (112,104) to the hem (82,352).
const pantsLeft = (y: number) => 112 - ((y - 104) * 30) / 248

const leftEdge = (garment: Garment, y: number) => (garment === "shirt" ? shirtLeft(y) : pantsLeft(y))
const rightEdge = (garment: Garment, y: number) => 420 - leftEdge(garment, y)

/** Lowest allowed top edge at x: neckline (+ trim) on shirts, waistband on shorts. */
function topEdge(garment: Garment, side: Side, collar: string, x: number) {
  if (garment === "pants") return 126
  if (x <= 128) return 92 + ((128 - x) * 27) / 56
  if (x >= 292) return 92 + ((x - 292) * 27) / 56
  const t = (x - 210) / 82
  const vNeck = collar === "v" && side === "front"
  const neck = vNeck ? 150 - Math.abs(x - 210) * (58 / 82) : 92 + 38 * (1 - t * t)
  return neck + (side === "front" ? 10 : 7)
}

const bottomEdge = (garment: Garment) => (garment === "shirt" ? 430 : 348)

/** Half width/height of an item's visual box. */
export function itemExtent(kind: ItemKind, item: { size: number } & Partial<TextItem>) {
  if (kind !== "text") return { hw: item.size / 2, hh: item.size / 2 }
  const text = item.text ?? ""
  const w = Math.max(item.size * 0.8, text.length * item.size * 0.56 + text.length * (item.spacing ?? 0))
  const h = item.size * 1.12 + Math.abs(item.arc ?? 0)
  return { hw: w / 2, hh: h / 2 }
}

/** Moves a box (center + half extents) fully inside the printable panel. */
export function clampToPrintArea(
  garment: Garment,
  side: Side,
  collar: string,
  center: Point,
  hw: number,
  hh: number,
): Point {
  let { x, y } = center
  const bottom = bottomEdge(garment) - MARGIN - hh
  for (let pass = 0; pass < 3; pass++) {
    const x0 = x - hw
    const x1 = x + hw
    const xs = [x0, x1, ...(x0 < 210 && x1 > 210 ? [210] : [])]
    const top = Math.max(...xs.map((px) => topEdge(garment, side, collar, px))) + MARGIN + hh
    y = top > bottom ? (top + bottom) / 2 : Math.min(Math.max(y, top), bottom)
    const y0 = y - hh
    const y1 = y + hh
    // The edge functions are V-shaped or monotone, so endpoints bound them.
    const left = Math.max(leftEdge(garment, y0), leftEdge(garment, y1)) + MARGIN + hw
    const right = Math.min(rightEdge(garment, y0), rightEdge(garment, y1)) - MARGIN - hw
    x = left > right ? 210 : Math.min(Math.max(x, left), right)
  }
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
}

/** Clamped position for an item of the given kind. */
export function fitItem<T extends { x: number; y: number; size: number }>(
  garment: Garment,
  side: Side,
  collar: string,
  kind: ItemKind,
  item: T,
): T {
  const { hw, hh } = itemExtent(kind, item as T & Partial<TextItem>)
  const point = clampToPrintArea(garment, side, collar, item, hw, hh)
  return point.x === item.x && point.y === item.y ? item : { ...item, ...point }
}

/** Outline of the printable panel, shown while an item is selected. */
export function printAreaPath(garment: Garment, side: Side, collar: string) {
  const m = MARGIN
  if (garment === "pants") {
    return `M${pantsLeft(126) + m} ${126 + m}H${420 - pantsLeft(126) - m}L${420 - pantsLeft(348) - m} ${348 - m}H${pantsLeft(348) + m}Z`
  }
  const pts: string[] = []
  for (let x = 128; x <= 292; x += 8) pts.push(`${x} ${topEdge("shirt", side, collar, x) + m}`)
  return [
    `M${shirtLeft(119) + m + 6} ${119 + m}`,
    `L${128} ${92 + m + 8}`,
    ...pts.map((p) => `L${p}`),
    `L${292} ${92 + m + 8}`,
    `L${420 - shirtLeft(119) - m - 6} ${119 + m}`,
    `L${420 - 108 - m} ${192}`,
    `L${420 - 108 - m} ${430 - m}`,
    `L${108 + m} ${430 - m}`,
    `L${108 + m} ${192}`,
    "Z",
  ].join("")
}
