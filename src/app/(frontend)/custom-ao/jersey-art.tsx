import type { PointerEvent as ReactPointerEvent, ReactNode, Ref } from "react"
import { fontStack, normalizeKit, TEXT_ROLES, FONT_IDS, type KitStyle, type TextRole } from "@/lib/jersey-kit"
import { KitPattern } from "./kit-patterns"

/** Shared jersey artwork model and SVG renderer (works in server and client components). */
export type Side = "front" | "back"
export type Garment = "shirt" | "pants"
export type StickerKind = "star" | "bolt" | "crest" | "ball"
export type Point = { x: number; y: number }
export type Stroke = { id: number; points: Point[]; color: string; width: number }
export type StickerItem = { id: number; kind: StickerKind; x: number; y: number; size: number; color: string; hidden?: boolean }
export type TextItem = {
  id: number
  text: string
  x: number
  y: number
  color: string
  size: number
  bold: boolean
  italic: boolean
  font?: string
  outline?: string | null
  outlineWidth?: number
  /** Curve in px: positive arches up, negative dips down. */
  arc?: number
  spacing?: number
  /** Quick-edit slots: team name, player name, shirt number. */
  role?: TextRole
  hidden?: boolean
}
/** Ảnh khách tải lên (data URL PNG/JPEG/WebP đã thu nhỏ ở trình duyệt). size = cạnh khung vuông chứa logo. */
export type LogoItem = { id: number; src: string; x: number; y: number; size: number; hidden?: boolean }
/**
 * Họa tiết phủ mặt áo/quần.
 * - tile: lặp ảnh, scale = cạnh một ô lặp.
 * - garment: ảnh áo mẫu đã tách nền, kéo phủ theo dáng áo/quần.
 */
export type PatternMode = "tile" | "garment"
export type PatternFill = { src: string; scale: number; opacity: number; mode?: PatternMode; hidden?: boolean }
export type SideArt = { strokes: Stroke[]; stickers: StickerItem[]; texts: TextItem[]; logos: LogoItem[]; pattern: PatternFill | null }
export type PantsArt = { enabled: boolean; color: string; front: SideArt; back: SideArt }
/** front/back là áo (giữ nguyên khóa cũ để thiết kế đã lưu vẫn mở được); pants là quần. */
export type JerseyArt = { front: SideArt; back: SideArt; pants: PantsArt; kit?: KitStyle }
export type Material = "cotton" | "polyester" | "woven" | "cool"
export type JerseySize = "S" | "M" | "L" | "XL" | "XXL"
export type ItemKind = "sticker" | "text" | "logo"
export type Selected = { garment: Garment; side: Side; kind: ItemKind; id: number } | null

export const JERSEY_PATH =
  "M128 92 72 119 28 213 83 239 108 192 108 430H312V192l25 47 55-26-44-94-56-27c-16 26-38 38-82 38s-66-12-82-38Z"
export const PANTS_PATH =
  "M112 104H308L338 352C306 366 268 370 232 362L214 262C212 254 208 254 206 262L188 362C152 370 114 366 82 352Z"
/** Vùng được vẽ/đặt hình cho từng loại (theo viewBox 420×480). */
export const GARMENT_BOUNDS: Record<Garment, { x: [number, number]; y: [number, number] }> = {
  shirt: { x: [28, 392], y: [92, 430] },
  pants: { x: [82, 338], y: [104, 368] },
}
export const GARMENT_CENTER: Record<Garment, Point> = { shirt: { x: 210, y: 245 }, pants: { x: 210, y: 200 } }
export const emptyArt = (): SideArt => ({ strokes: [], stickers: [], texts: [], logos: [], pattern: null })
export const emptyKit = (): JerseyArt => ({
  front: emptyArt(),
  back: emptyArt(),
  pants: { enabled: false, color: "#111827", front: emptyArt(), back: emptyArt() },
})
export const sideOf = (art: JerseyArt, garment: Garment, side: Side) => (garment === "shirt" ? art[side] : art.pants[side])
export const itemCount = (s: SideArt) => s.strokes.length + s.stickers.length + s.texts.length + s.logos.length + (s.pattern ? 1 : 0)
export type { KitStyle }

export const MATERIAL_LABELS: Record<Material, { vi: string; en: string }> = {
  polyester: { vi: "Polyester thể thao", en: "Performance polyester" },
  cotton: { vi: "Cotton", en: "Cotton" },
  woven: { vi: "Vải sơ mi", en: "Woven shirting" },
  cool: { vi: "Thun lạnh", en: "Cooling jersey" },
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i
const isImage = (v: unknown): v is string => typeof v === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(v)

/** Tolerates partially-shaped stored art so previews never crash. */
export function normalizeArt(value: unknown): JerseyArt {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const side = (input?: unknown): SideArt => {
    const s = (input && typeof input === "object" ? input : {}) as Partial<SideArt>
    const pattern = s.pattern && typeof s.pattern === "object" && isImage(s.pattern.src) ? s.pattern : null
    const texts = (Array.isArray(s.texts) ? s.texts : []).filter((t) => t && typeof t.text === "string").map((t): TextItem => ({
      id: t.id,
      text: t.text,
      x: t.x,
      y: t.y,
      color: t.color,
      size: t.size,
      bold: !!t.bold,
      italic: !!t.italic,
      ...(t.font && FONT_IDS.has(t.font) ? { font: t.font } : {}),
      ...(typeof t.outline === "string" && HEX_COLOR.test(t.outline) ? { outline: t.outline, outlineWidth: Number(t.outlineWidth) || 3 } : {}),
      ...(typeof t.arc === "number" && t.arc ? { arc: Math.max(-80, Math.min(80, t.arc)) } : {}),
      ...(typeof t.spacing === "number" && t.spacing ? { spacing: Math.max(-4, Math.min(30, t.spacing)) } : {}),
      ...(TEXT_ROLES.includes(t.role as TextRole) ? { role: t.role } : {}),
      ...(t.hidden ? { hidden: true } : {}),
    }))
    return {
      strokes: Array.isArray(s.strokes) ? s.strokes : [],
      stickers: Array.isArray(s.stickers) ? s.stickers : [],
      texts,
      logos: Array.isArray(s.logos) ? s.logos.filter((l) => l && isImage(l.src)) : [],
      pattern: pattern
        ? {
            src: pattern.src,
            scale: Number(pattern.scale) || 96,
            opacity: Number(pattern.opacity) || 1,
            mode: pattern.mode === "garment" ? "garment" : "tile",
            ...(pattern.hidden ? { hidden: true } : {}),
          }
        : null,
    }
  }
  const pants = (raw.pants && typeof raw.pants === "object" ? raw.pants : {}) as Partial<PantsArt>
  return {
    front: side(raw.front),
    back: side(raw.back),
    pants: {
      enabled: pants.enabled === true,
      color: typeof pants.color === "string" && HEX_COLOR.test(pants.color) ? pants.color : "#111827",
      front: side(pants.front),
      back: side(pants.back),
    },
    ...(normalizeKit(raw.kit) ? { kit: normalizeKit(raw.kit) } : {}),
  }
}

function MaterialPattern({ id, material }: { id: string; material: Material }) {
  if (material === "polyester") {
    return (
      <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#ffffff" />
      </pattern>
    )
  }
  if (material === "woven") {
    return (
      <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 3h10M0 7h10" stroke="#ffffff" strokeWidth="1" />
      </pattern>
    )
  }
  if (material === "cool") {
    return (
      <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 0 12 12M12 0 0 12" stroke="#ffffff" strokeWidth=".7" />
      </pattern>
    )
  }
  return (
    <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse">
      <path d="M0 0 7 7M7 0 0 7" stroke="#ffffff" strokeWidth=".45" />
    </pattern>
  )
}

export function StickerGraphic({ item }: { item: Pick<StickerItem, "kind" | "size" | "color"> }) {
  const scale = item.size / 42
  if (item.kind === "bolt") {
    return <path d="M8-24-16 4h14l-7 24L17-6H3Z" fill={item.color} transform={`scale(${scale})`} />
  }
  if (item.kind === "crest") {
    return <path d="M0-25 21-16 17 11C13 22 0 28 0 28s-13-6-17-17l-4-27Z" fill={item.color} transform={`scale(${scale})`} />
  }
  if (item.kind === "ball") {
    return (
      <g transform={`scale(${scale})`}>
        <circle r="24" fill="none" stroke={item.color} strokeWidth="4" />
        <path d="m0-9 9 6-3 11H-6L-9-3ZM0-9l-4-13M9-3l12-4M6 8l8 12M-6 8l-8 12M-9-3l-12-4" fill={item.color} stroke={item.color} strokeWidth="3" />
      </g>
    )
  }
  return <path d="m0-26 7 17 19 1-15 12 5 19L0 12-16 23l5-19-15-12 19-1Z" fill={item.color} transform={`scale(${scale})`} />
}

type SelectHandler = (
  side: Side,
  kind: ItemKind,
  id: number,
  point: Point,
  event: ReactPointerEvent<SVGGElement | SVGTextElement>,
) => void

type GarmentProps = {
  /** Unique per rendered SVG so clip/pattern ids never collide on one page. */
  uid: string
  garment: Garment
  side: Side
  art: SideArt
  color: string
  material: Material
  /** Kit-wide template look (pattern, trims). Optional for older designs. */
  kit?: KitStyle
  selected?: Selected
  background?: string | null
  className?: string
  svgRef?: Ref<SVGSVGElement>
  overlay?: ReactNode
  /** Printable-panel outline (SVG path) shown while editing an item. */
  printArea?: string | null
  onPointerDown?: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp?: () => void
  onPointerLeave?: () => void
  onSelect?: SelectHandler
}

const LABEL: Record<Garment, Record<Side, string>> = {
  shirt: { front: "Mặt trước áo", back: "Mặt sau áo" },
  pants: { front: "Mặt trước quần", back: "Mặt sau quần" },
}

const NECK = "M292 92c-16 26-38 38-82 38s-66-12-82-38"
/** Sleeve hems (shirt) in viewBox units. */
const CUFFS = ["28,213 83,239 89,226 34,200", "392,213 337,239 331,226 386,200"]

/** Approximate box of a text item, for the selection outline. */
const textBox = (item: TextItem) => {
  const w = Math.max(item.size * 0.8, item.text.length * item.size * 0.56 + item.text.length * (item.spacing ?? 0))
  const h = item.size * 1.12 + Math.abs(item.arc ?? 0)
  return { x: item.x - w / 2 - 6, y: item.y - h / 2 - 4 - (item.arc ?? 0) / 2, w: w + 12, h: h + 8 }
}

function TextGraphic({ item, uid, selected, grab, onDown }: {
  item: TextItem
  uid: string
  selected: boolean
  grab?: string
  onDown?: (event: ReactPointerEvent<SVGTextElement>) => void
}) {
  const outline = item.outline ? { stroke: item.outline, strokeWidth: item.outlineWidth ?? 3, paintOrder: "stroke" as const, strokeLinejoin: "round" as const } : {}
  const props = {
    fill: item.color,
    fontSize: item.size,
    fontWeight: item.bold ? 800 : 500,
    fontStyle: item.italic ? "italic" : "normal",
    letterSpacing: item.spacing ?? 0,
    style: { fontFamily: fontStack(item.font) },
    className: grab,
    onPointerDown: onDown,
    ...outline,
  }
  const box = selected ? textBox(item) : null
  let body: ReactNode
  if (item.arc) {
    const half = Math.max(90, item.text.length * item.size * 0.5)
    const pathId = `${uid}-arc-${item.id}`
    body = (
      <>
        <path id={pathId} d={`M${item.x - half} ${item.y + item.arc}Q${item.x} ${item.y - item.arc} ${item.x + half} ${item.y + item.arc}`} fill="none" />
        <text {...props} dominantBaseline="middle">
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">{item.text}</textPath>
        </text>
      </>
    )
  } else {
    body = (
      <text {...props} x={item.x} y={item.y} textAnchor="middle" dominantBaseline="central">
        {item.text}
      </text>
    )
  }
  return (
    <g>
      {body}
      {box && <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#1677ff" strokeWidth="2" strokeDasharray="6 4" pointerEvents="none" />}
    </g>
  )
}

export function GarmentSvg({
  uid,
  garment,
  side,
  art,
  color,
  material,
  kit,
  selected = null,
  background = "#edf2f7",
  className = "",
  svgRef,
  overlay,
  printArea = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onSelect,
}: GarmentProps) {
  const clipId = `garment-clip-${uid}`
  const patternId = `garment-pattern-${uid}`
  const uploadId = `garment-upload-${uid}`
  const path = garment === "shirt" ? JERSEY_PATH : PANTS_PATH
  const isSelected = (kind: ItemKind, id: number) =>
    selected?.garment === garment && selected.side === side && selected.kind === kind && selected.id === id
  const grab = onSelect ? "cursor-grab" : undefined
  const showKitPattern = !!kit && !kit.patternHidden && kit.pattern !== "none" && (garment === "shirt" || kit.pantsPattern)
  const upload = art.pattern && !art.pattern.hidden ? art.pattern : null

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 480"
      className={className}
      role="img"
      aria-label={LABEL[garment][side]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <defs>
        <clipPath id={clipId}><path d={path} /></clipPath>
        <MaterialPattern id={patternId} material={material} />
        {upload && upload.mode !== "garment" && (
          <pattern id={uploadId} width={upload.scale} height={upload.scale} patternUnits="userSpaceOnUse">
            <image href={upload.src} width={upload.scale} height={upload.scale} preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
        <linearGradient id={`${patternId}-shade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".16" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        <radialGradient id={`${patternId}-light`} cx=".5" cy=".28" r=".7">
          <stop offset="0" stopColor="#fff" stopOpacity=".14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {background && <rect width="420" height="480" fill={background} />}
      <ellipse cx="210" cy={garment === "shirt" ? 448 : 386} rx={garment === "shirt" ? 138 : 128} ry="12" fill="#0f172a" opacity=".12" />
      <path d={path} fill={color} />
      <g clipPath={`url(#${clipId})`}>
        {showKitPattern && (
          <g opacity={kit!.patternOpacity} pointerEvents="none">
            <KitPattern id={kit!.pattern} c1={kit!.patternColor} c2={kit!.patternColor2} scale={kit!.patternScale} uid={`${uid}-kp`} />
          </g>
        )}
        {upload &&
          (upload.mode === "garment" ? (
            <image
              href={upload.src}
              x={GARMENT_BOUNDS[garment].x[0]}
              y={GARMENT_BOUNDS[garment].y[0]}
              width={GARMENT_BOUNDS[garment].x[1] - GARMENT_BOUNDS[garment].x[0]}
              height={GARMENT_BOUNDS[garment].y[1] - GARMENT_BOUNDS[garment].y[0]}
              preserveAspectRatio="none"
              opacity={upload.opacity}
              pointerEvents="none"
            />
          ) : (
            <rect width="420" height="480" fill={`url(#${uploadId})`} opacity={upload.opacity} pointerEvents="none" />
          ))}
        <rect width="420" height="480" fill={`url(#${patternId})`} opacity=".16" pointerEvents="none" />
        {kit && garment === "shirt" && (
          <g pointerEvents="none">
            {kit.collar === "v" && side === "front" && (
              <path d="M128 92 210 150 292 92c-16 26-38 38-82 38s-66-12-82-38Z" fill="#0f172a" opacity=".55" />
            )}
            <path d={kit.collar === "v" && side === "front" ? "M292 92 210 150 128 92" : NECK} fill="none" stroke={kit.trim} strokeWidth={side === "front" ? 20 : 14} strokeLinejoin="round" />
            {CUFFS.map((points) => <polygon key={points} points={points} fill={kit.trim} />)}
          </g>
        )}
        {kit && garment === "pants" && (
          <g pointerEvents="none" fill="none" stroke={kit.trim} strokeWidth="7">
            <path d="M118 112 90 352M302 112 330 352" />
            <path d="M112 116H308" strokeWidth="18" />
          </g>
        )}
        {art.strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {art.logos.filter((item) => !item.hidden).map((item) => (
          <g
            key={item.id}
            className={grab}
            onPointerDown={onSelect ? (event) => onSelect(side, "logo", item.id, item, event) : undefined}
          >
            <image href={item.src} x={item.x - item.size / 2} y={item.y - item.size / 2} width={item.size} height={item.size} preserveAspectRatio="xMidYMid meet" />
            {isSelected("logo", item.id) && (
              <rect x={item.x - item.size / 2 - 4} y={item.y - item.size / 2 - 4} width={item.size + 8} height={item.size + 8} fill="none" stroke="#1677ff" strokeWidth="2" strokeDasharray="6 4" />
            )}
          </g>
        ))}
        {art.stickers.filter((item) => !item.hidden).map((item) => (
          <g
            key={item.id}
            transform={`translate(${item.x} ${item.y})`}
            className={grab}
            onPointerDown={onSelect ? (event) => onSelect(side, "sticker", item.id, item, event) : undefined}
          >
            {isSelected("sticker", item.id) && (
              <circle r={item.size * 0.78} fill="none" stroke="#1677ff" strokeWidth="2" strokeDasharray="5 4" />
            )}
            <StickerGraphic item={item} />
          </g>
        ))}
        {art.texts.filter((item) => !item.hidden).map((item) => (
          <TextGraphic
            key={item.id}
            item={item}
            uid={uid}
            selected={isSelected("text", item.id)}
            grab={grab}
            onDown={onSelect ? (event) => onSelect(side, "text", item.id, item, event) : undefined}
          />
        ))}
        <rect x="0" y="0" width="420" height="480" fill={`url(#${patternId}-shade)`} pointerEvents="none" />
        <rect x="0" y="0" width="420" height="480" fill={`url(#${patternId}-light)`} pointerEvents="none" />
      </g>
      <path d={path} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" pointerEvents="none" />
      {garment === "shirt" ? (
        <>
          {side === "front" ? (
            (!kit || kit.collar === "crew") && <path d="M173 99c4 38 70 38 74 0-9 20-23 29-37 29s-28-9-37-29Z" fill="#0f172a" opacity=".2" pointerEvents="none" />
          ) : (
            <path d="M170 99c11 15 25 21 40 21s29-6 40-21" fill="none" stroke="#0f172a" strokeWidth="7" opacity=".2" pointerEvents="none" />
          )}
          <path d="M108 192v238M312 192v238M72 119l36 73M348 119l-36 73" fill="none" stroke="#0f172a" strokeWidth="2" opacity=".12" pointerEvents="none" />
        </>
      ) : (
        <g fill="none" stroke="#0f172a" pointerEvents="none">
          <path d="M113 130H307" strokeWidth="2.5" opacity=".3" />
          {side === "front" ? (
            <>
              <path d="M204 132c-4 12-10 20-18 24M216 132c4 12 10 20 18 24" strokeWidth="2.5" opacity=".35" />
              <path d="M210 132v118" strokeWidth="2" opacity=".14" />
            </>
          ) : (
            <>
              <path d="M126 168c34 14 134 14 168 0" strokeWidth="2" opacity=".18" />
              <path d="M238 182h44v34h-44z" strokeWidth="2" opacity=".16" />
            </>
          )}
          <path d="M96 340c34 12 72 14 96 10M324 340c-34 12-72 14-96 10" strokeWidth="2" opacity=".14" />
        </g>
      )}
      {printArea && (
        <path
          d={printArea}
          fill="none"
          stroke="#1677ff"
          strokeWidth="1.5"
          strokeDasharray="5 5"
          opacity=".65"
          pointerEvents="none"
        />
      )}
      {overlay}
    </svg>
  )
}

type WrapperProps = Omit<GarmentProps, "garment" | "color">

/** Áo (giữ API cũ). */
export function JerseySvg({ shirtColor, ...props }: WrapperProps & { shirtColor: string }) {
  return <GarmentSvg garment="shirt" color={shirtColor} {...props} />
}

/** Quần. */
export function PantsSvg({ pantsColor, ...props }: WrapperProps & { pantsColor: string }) {
  return <GarmentSvg garment="pants" color={pantsColor} {...props} />
}

/** Quần đặt dưới áo: trừ phần trống dưới gấu áo và trên cạp quần để cạp quần nằm sau gấu áo. */
export const PANTS_STACK_CLASS = "relative mx-auto -mt-[35%] block aspect-[7/8] w-[86%]"

/** Cả bộ (áo chồng lên quần) cho phần xem trước. */
export function KitPreview({
  uid,
  side,
  art,
  shirtColor,
  material,
  showPants = true,
  className = "",
}: {
  uid: string
  side: Side
  art: JerseyArt
  shirtColor: string
  material: Material
  showPants?: boolean
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <JerseySvg uid={`${uid}-shirt`} side={side} art={art[side]} kit={art.kit} shirtColor={shirtColor} material={material} background={null} className="relative z-10 block aspect-[7/8] w-full" />
      {showPants && (
        <PantsSvg uid={`${uid}-pants`} side={side} art={art.pants[side]} kit={art.kit} pantsColor={art.pants.color} material={material} background={null} className={PANTS_STACK_CLASS} />
      )}
    </div>
  )
}
