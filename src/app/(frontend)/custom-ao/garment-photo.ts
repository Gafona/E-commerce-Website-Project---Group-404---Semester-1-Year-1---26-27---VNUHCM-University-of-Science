// Turns a product photo of a shirt/shorts (garment on a plain background) into a
// cutout that can be stretched over the studio's garment silhouette.

const MAX_DIM = 640
/** Stay under the JerseyDesigns image limit (700k chars). */
const MAX_CHARS = 680_000

export type GarmentCutout = { src: string; color: string }

function loadImage(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("READ"))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("READ"))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

const dist = (d: Uint8ClampedArray, i: number, c: [number, number, number]) =>
  Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2])

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`

/**
 * Returns null when the image does not look like a garment on a plain backdrop
 * (e.g. a seamless texture), so the caller can fall back to tiling.
 */
export async function garmentCutout(
  file: Blob,
  {
    tolerance = 60,
    /** Manual run from the studio: accept a less uniform backdrop. */
    lenient = false,
  }: { tolerance?: number; lenient?: boolean } = {},
): Promise<GarmentCutout | null> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h)
  const d = data.data

  // Background = median color of the image border; it must be fairly uniform.
  const border: number[] = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1)
  const transparentBorder = border.filter((p) => d[p * 4 + 3] < 16).length / border.length
  const channel = (k: number) => {
    const values = border.map((p) => d[p * 4 + k]).sort((a, b) => a - b)
    return values[values.length >> 1]
  }
  const bg: [number, number, number] = [channel(0), channel(1), channel(2)]
  const TOL = Math.max(10, Math.min(160, tolerance))
  const uniform = border.filter((p) => d[p * 4 + 3] < 16 || dist(d, p * 4, bg) < TOL).length / border.length
  if (uniform < (lenient ? 0.5 : 0.8)) return null

  // Flood-fill the backdrop from the edges so same-colored areas inside the garment survive.
  const isBg = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  const matches = (p: number) => d[p * 4 + 3] < 16 || dist(d, p * 4, bg) < TOL
  for (const p of border) {
    if (!isBg[p] && matches(p)) {
      isBg[p] = 1
      queue[tail++] = p
    }
  }
  while (head < tail) {
    const p = queue[head++]
    const x = p % w
    const neighbors = [p - w, p + w, x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1]
    for (const n of neighbors) {
      if (n < 0 || n >= w * h || isBg[n] || !matches(n)) continue
      isBg[n] = 1
      queue[tail++] = n
    }
  }

  let minX = w, minY = h, maxX = -1, maxY = -1, count = 0
  const bins = new Map<number, [number, number, number, number]>()
  for (let p = 0; p < w * h; p++) {
    const i = p * 4
    if (isBg[p]) {
      d[i + 3] = 0
      continue
    }
    const x = p % w
    const y = (p / w) | 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    count++
    // Soften the edge against the backdrop.
    const edge = (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) || (p >= w && isBg[p - w]) || (p < w * (h - 1) && isBg[p + w])
    if (edge) d[i + 3] = Math.min(d[i + 3], 140)
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)
    const bin = bins.get(key) ?? [0, 0, 0, 0]
    bin[0] += d[i]; bin[1] += d[i + 1]; bin[2] += d[i + 2]; bin[3]++
    bins.set(key, bin)
  }
  const boxArea = (maxX - minX + 1) * (maxY - minY + 1)
  // Nothing (or everything) removed: not a cutout-able product photo.
  if (maxX < 0 || count < w * h * 0.08 || (transparentBorder < 0.5 && count > w * h * 0.97) || boxArea < w * h * 0.1) return null
  ctx.putImageData(data, 0, 0)

  let best: [number, number, number, number] = [0, 0, 0, 1]
  for (const bin of bins.values()) if (bin[3] > best[3]) best = bin
  const color = hex(best[0] / best[3], best[1] / best[3], best[2] / best[3])

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1
  let factor = 1
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = document.createElement("canvas")
    out.width = Math.max(1, Math.round(cropW * factor))
    out.height = Math.max(1, Math.round(cropH * factor))
    const octx = out.getContext("2d")
    if (!octx) return null
    octx.imageSmoothingQuality = "high"
    octx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, out.width, out.height)
    let src = out.toDataURL("image/webp", 0.86)
    // Browsers without WebP encoding fall back to PNG automatically.
    if (!src.startsWith("data:image/webp")) src = out.toDataURL("image/png")
    if (src.length <= MAX_CHARS) return { src, color }
    factor *= 0.8
  }
  return null
}
