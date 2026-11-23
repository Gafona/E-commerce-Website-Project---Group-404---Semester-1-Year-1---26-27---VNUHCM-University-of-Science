"use client"

import {
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FolderOpen,
  Hash,
  ImagePlus,
  Italic,
  Layers,
  LayoutTemplate,
  Maximize2,
  Minus,
  MousePointer2,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Shield,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Type,
  Undo2,
  Upload,
  WandSparkles,
  Zap,
  ZoomIn,
} from "lucide-react"
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { ASPECTS, useImageCropper } from "../components/ImageCropper"
import { useShop } from "../components/ShopProvider"
import {
  deleteDesignAction,
  duplicateDesignAction,
  getDesignAction,
  listDesignsAction,
  listMyCustomRequestsAction,
  renameDesignAction,
  saveDesignAction,
  type MyCustomRequest,
} from "../design-actions"
import {
  DEFAULT_KIT,
  fontStack,
  JERSEY_FONTS,
  KIT_TEMPLATES,
  PATTERN_IDS,
  PATTERN_LABELS,
  type KitStyle,
  type KitTemplate,
  type PatternId,
  type TextRole,
} from "@/lib/jersey-kit"
import { crestDataUrl, crestPng, CREST_TEMPLATES, type CrestOptions } from "./crests"
import { garmentCutout } from "./garment-photo"
import { KitPattern } from "./kit-patterns"
import {
  emptyArt,
  emptyKit,
  GARMENT_BOUNDS,
  GARMENT_CENTER,
  GarmentSvg,
  KitPreview,
  MATERIAL_LABELS,
  normalizeArt,
  sideOf,
  type Garment,
  type ItemKind,
  type JerseyArt,
  type JerseySize,
  type Material,
  type Point,
  type Selected,
  type Side,
  type SideArt,
  type StickerKind,
  type Stroke,
  type TextItem,
} from "./jersey-art"
import { serializeWithFonts } from "./svg-export"
import { SendToShops, type CustomShopCard } from "./SendToShops"
import { MyRequests, RequestLinkWatcher } from "./MyRequests"
import { fitItem, printAreaPath } from "./print-area"
import { JERSEY_PATH, PANTS_PATH } from "./jersey-art"

type Tab = "template" | "pattern" | "logo" | "text" | "number" | "draw" | "layers" | "order"
type Tool = "select" | "draw" | "erase"
type TextStyle = {
  font: string
  size: number
  color: string
  bold: boolean
  italic: boolean
  outline: string | null
  outlineWidth: number
  spacing: number
  arc: number
}

const MAX_LOGOS = 6
const MAX_IMAGE_CHARS = 650_000
const SIZE_LIMITS: Record<ItemKind, [number, number]> = { logo: [24, 320], sticker: [30, 110], text: [12, 220] }
const STORE_KEY = "boai-jersey-studio-v1"
const HEX = /^#[0-9a-f]{6}$/i
const PALETTE = [
  "#ffffff", "#f1f5f9", "#f3ecdc", "#111111", "#1f2937", "#64748b",
  "#7c3aed", "#a78bfa", "#1e3a8a", "#1d4ed8", "#0ea5e9", "#22d3ee",
  "#14532d", "#059669", "#22c55e", "#a3e635", "#facc15", "#f59e0b",
  "#f97316", "#dc2626", "#7f1d1d", "#e11d48", "#ec4899", "#c4b5fd",
]
const JERSEY_SIZES: { size: JerseySize; chest: number; length: number }[] = [
  { size: "S", chest: 48, length: 68 },
  { size: "M", chest: 51, length: 70 },
  { size: "L", chest: 54, length: 72 },
  { size: "XL", chest: 57, length: 74 },
  { size: "XXL", chest: 60, length: 76 },
]
const STICKERS: [StickerKind, typeof Star][] = [["star", Star], ["bolt", Zap], ["crest", Shield], ["ball", Sparkles]]
const FONT_GROUPS: { id: (typeof JERSEY_FONTS)[number]["group"]; vi: string; en: string }[] = [
  { id: "sport", vi: "Thể thao", en: "Sport" },
  { id: "modern", vi: "Hiện đại", en: "Modern" },
  { id: "classic", vi: "Cổ điển", en: "Classic" },
  { id: "script", vi: "Viết tay & graffiti", en: "Script & graffiti" },
  { id: "number", vi: "Số áo (không dấu)", en: "Numbers (no diacritics)" },
]
const TEXT_PRESETS: { id: string; vi: string; en: string; style: Partial<TextStyle> }[] = [
  { id: "college", vi: "Đại học", en: "Varsity", style: { font: "graduate", outline: "#111111", outlineWidth: 4, spacing: 2, italic: false, arc: 0 } },
  { id: "speed", vi: "Tốc độ", en: "Speed", style: { font: "saira", italic: true, bold: true, outline: null, spacing: 0, arc: 0 } },
  { id: "bold", vi: "Đậm viền", en: "Heavy outline", style: { font: "anton", outline: "#111111", outlineWidth: 5, spacing: 1, italic: false, arc: 0 } },
  { id: "arch", vi: "Cong vòm", en: "Arched", style: { font: "oswald", arc: 22, spacing: 3, outline: null, italic: false } },
  { id: "graffiti", vi: "Graffiti", en: "Graffiti", style: { font: "sedgwick", outline: "#111111", outlineWidth: 3, arc: 0, spacing: 0 } },
  { id: "neon", vi: "Neon", en: "Neon", style: { font: "bungeeinline", color: "#22d3ee", outline: "#0e7490", outlineWidth: 3, arc: 0 } },
  { id: "retro", vi: "Retro", en: "Retro", style: { font: "alfa", outline: "#facc15", outlineWidth: 4, arc: 0, spacing: 1 } },
  { id: "script", vi: "Viết tay", en: "Script", style: { font: "pacifico", outline: null, arc: -10, spacing: 0, italic: false } },
  { id: "tech", vi: "Kỹ thuật số", en: "Tech", style: { font: "chakra", spacing: 4, outline: null, arc: 0, italic: false } },
  { id: "army", vi: "Quân đội", en: "Stencil", style: { font: "blackops", spacing: 2, outline: null, arc: 0, italic: false } },
]
const ROLE_DEFAULTS: Record<TextRole, Omit<TextItem, "id" | "text" | "color">> = {
  team: { x: 210, y: 250, size: 44, bold: true, italic: true, font: "saira" },
  player: { x: 210, y: 180, size: 34, bold: true, italic: false, font: "oswald", arc: 16, spacing: 3 },
  number: { x: 210, y: 330, size: 104, bold: true, italic: false, font: "graduate", outline: "#111111", outlineWidth: 4 },
}
const MATERIAL_HINTS: Record<Material, { vi: string; en: string }> = {
  polyester: { vi: "Co giãn · Thoát ẩm", en: "Stretch · Wicking" },
  cotton: { vi: "Mềm · Thoáng khí", en: "Soft · Breathable" },
  woven: { vi: "Đứng phom · Mịn", en: "Structured · Smooth" },
  cool: { vi: "Nhẹ · Nhanh khô", en: "Light · Quick dry" },
}
const ITEM_KEY = { sticker: "stickers", text: "texts", logo: "logos" } as const

/** Thu nhỏ ảnh tải lên ở trình duyệt thành data URL (PNG giữ nền trong, JPEG nhẹ hơn). */
async function readImage(file: File, maxDim: number): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("TYPE")
  if (file.size > 8_000_000) throw new Error("SIZE")
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("LOAD"))
      img.src = url
    })
    const keepAlpha = file.type !== "image/jpeg"
    let dim = maxDim
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, dim / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
      const data = keepAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86)
      if (data.length <= MAX_IMAGE_CHARS) return data
      dim = Math.round(dim * 0.72)
    }
    throw new Error("SIZE")
  } finally {
    URL.revokeObjectURL(url)
  }
}

const distToSegment = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Tẩy: bỏ các điểm nằm trong bán kính, tách nét tại chỗ bị tẩy. */
function eraseStrokes(strokes: Stroke[], p: Point, radius: number, newId: () => number): Stroke[] {
  const out: Stroke[] = []
  for (const stroke of strokes) {
    const reach = radius + stroke.width / 2
    const pieces: Point[][] = []
    let piece: Point[] = []
    stroke.points.forEach((point, i) => {
      const prev = stroke.points[i - 1]
      const hit = Math.hypot(point.x - p.x, point.y - p.y) <= reach
      const crossed = !!prev && piece.length > 0 && distToSegment(p, prev, point) <= reach
      if (hit) {
        if (piece.length) pieces.push(piece)
        piece = []
        return
      }
      if (crossed) {
        pieces.push(piece)
        piece = []
      }
      piece.push(point)
    })
    if (piece.length) pieces.push(piece)
    if (pieces.length === 1 && pieces[0].length === stroke.points.length) out.push(stroke)
    else for (const points of pieces) out.push({ ...stroke, id: newId(), points })
  }
  return out
}

const stripImages = (art: JerseyArt): JerseyArt => {
  const strip = (side: SideArt): SideArt => ({ ...side, logos: [], pattern: null })
  return { ...art, front: strip(art.front), back: strip(art.back), pants: { ...art.pants, front: strip(art.pants.front), back: strip(art.pants.back) } }
}

const kitFromTemplate = (template: KitTemplate): KitStyle => ({ ...template.kit, template: template.id })

/** First-visit design so the studio opens on a finished-looking kit. */
function starterArt(): JerseyArt {
  const kit = emptyKit()
  const thunder = KIT_TEMPLATES[0]
  let id = 1
  const role = (role: TextRole, text: string, patch: Partial<TextItem> = {}): TextItem => ({ id: id++, text, color: "#ffffff", ...ROLE_DEFAULTS[role], role, ...patch })
  kit.front.texts = [role("team", "BOAI FC"), role("number", "10")]
  kit.back.texts = [role("player", "CẦU THỦ"), role("number", "10", { y: 300, size: 170 })]
  kit.pants.color = thunder.pants
  return { ...kit, kit: kitFromTemplate(thunder) }
}

// ---------- Small presentational helpers (dark workspace) ----------
const sectionTitle = "m-0 mb-3 text-[13px] font-extrabold text-white"
const fieldLabel = "mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-white/50"
const darkInput = "h-10 w-full rounded-lg border border-white/10 bg-white/[.06] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--lime)]"
const chip = (active: boolean) =>
  `rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${active ? "border-[var(--lime)] bg-[var(--lime)] text-white" : "border-white/10 bg-white/[.04] text-white/75 hover:border-white/30 hover:text-white"}`
const ghostButton = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[.05] px-3 text-[11px] font-bold text-white/85 transition hover:border-white/30 hover:text-white disabled:opacity-40"
const primaryButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--lime)] px-4 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(22,119,255,.35)] transition hover:brightness-110 disabled:opacity-50"

/** Tool panel body. Phones scroll the whole body; tablet/desktop keep `top` and `footer` pinned and scroll only the middle. */
const galleryGrid = "grid gap-1.5 max-md:-mx-3 max-md:grid-flow-col max-md:overflow-x-auto max-md:px-3 max-md:pb-1 max-md:[scrollbar-width:thin]"
function Pane({ children, top, footer }: { children: ReactNode; top?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col [scrollbar-width:thin] max-md:overflow-y-auto max-md:overscroll-contain">
      {top && <div className="shrink-0 px-3 pt-3 md:px-4">{top}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3.5 p-3 [scrollbar-width:thin] md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:p-4">{children}</div>
      {footer && <div className="grid shrink-0 gap-2.5 border-t border-white/[.08] bg-black/15 p-3 md:px-4">{footer}</div>}
    </div>
  )
}

function ColorRow({ value, onChange, colors = PALETTE, name, compact = false }: { value: string; onChange: (color: string) => void; colors?: string[]; name: string; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={name}>
      {colors.map((color) => {
        const active = value.toLowerCase() === color
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${name} ${color}`}
            onClick={() => onChange(color)}
            className={`${compact ? "size-6" : "size-7"} rounded-full border-2 transition hover:scale-110 ${active ? "scale-110 border-white shadow-[0_0_0_2px_var(--lime)]" : "border-white/15"}`}
            style={{ background: color }}
          />
        )
      })}
      <label className={`relative ${compact ? "size-6" : "size-7"} cursor-pointer overflow-hidden rounded-full border-2 border-white/25 bg-[conic-gradient(#ef4444,#facc15,#22c55e,#1677ff,#7c3aed,#ef4444)]`} title="Màu khác">
        <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={HEX.test(value) ? value : "#ffffff"} aria-label={`${name} — màu khác`} onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  )
}

function Slider({ label, value, min, max, step = 1, suffix = "", onChange, onStart }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
  onStart?: () => void
}) {
  return (
    <label className="grid grid-cols-[88px_minmax(0,1fr)_44px] items-center gap-2 text-[11px] font-semibold text-white/75">
      <span>{label}</span>
      <input className="min-w-0 accent-[var(--lime)]" type="range" min={min} max={max} step={step} value={value} onPointerDown={onStart} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="text-right tabular-nums text-white/55">{Number.isInteger(step) ? Math.round(value) : value.toFixed(1)}{suffix}</span>
    </label>
  )
}

type ColorField = {
  key: string
  name: string
  value: string
  onChange: (color: string) => void
  /** Called when the palette opens, e.g. to show that part on the canvas. */
  onOpen?: () => void
}
const COLOR_FIELD_COLS = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3"]

/** Compact color controls: one swatch button per field, palette opens inline below the row. */
function ColorFields({ fields }: { fields: ColorField[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const active = fields.find((field) => field.key === open)
  // Three-up rows are narrow: show just the swatch and a short name.
  const dense = fields.length >= 3
  return (
    <div className="grid gap-2">
      <div className={`grid gap-1.5 ${COLOR_FIELD_COLS[fields.length] ?? "grid-cols-3"}`}>
        {fields.map((field) => {
          const isOpen = open === field.key
          return (
            <button
              key={field.key}
              type="button"
              aria-expanded={isOpen}
              title={`${field.name} · ${field.value}`}
              onClick={() => {
                setOpen(isOpen ? null : field.key)
                if (!isOpen) field.onOpen?.()
              }}
              className={`flex h-11 min-w-0 items-center gap-2 rounded-lg border px-2 text-left transition ${isOpen ? "border-[var(--lime)] bg-[var(--lime)]/10" : "border-white/10 bg-white/[.04] hover:border-white/30"}`}
            >
              <span className="size-6 shrink-0 rounded-full border-2 border-white/25" style={{ background: field.value }} />
              <span className="min-w-0 flex-1">
                {dense ? (
                  <span className="block truncate text-[11px] font-bold text-white/80">{field.name}</span>
                ) : (
                  <>
                    <small className="block truncate text-[9px] font-bold uppercase tracking-[.08em] text-white/50">{field.name}</small>
                    <span className="block truncate text-[10px] font-semibold uppercase tabular-nums text-white/80">{field.value}</span>
                  </>
                )}
              </span>
              {!dense && <ChevronDown size={12} className={`shrink-0 text-white/40 transition ${isOpen ? "rotate-180" : ""}`} />}
            </button>
          )
        })}
      </div>
      {active && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
          <ColorRow compact value={active.value} name={active.name} onChange={active.onChange} />
        </div>
      )}
    </div>
  )
}

function FontPicker({ value, onChange, sample, groups, maxHeight = "max-h-[220px]" }: { value: string; onChange: (font: string) => void; sample: string; groups?: (typeof JERSEY_FONTS)[number]["group"][]; maxHeight?: string }) {
  const { tr } = useShop()
  return (
    <div className={`grid gap-3 overflow-y-auto pr-1 ${maxHeight}`}>
      {FONT_GROUPS.filter((g) => !groups || groups.includes(g.id)).map((group) => (
        <div key={group.id}>
          <span className={fieldLabel}>{tr(group.vi, group.en)}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {JERSEY_FONTS.filter((font) => font.group === group.id).map((font) => (
              <button
                key={font.id}
                type="button"
                aria-pressed={value === font.id}
                onClick={() => onChange(font.id)}
                className={`rounded-lg border px-2 py-2 text-left transition ${value === font.id ? "border-[var(--lime)] bg-[var(--lime)]/15" : "border-white/10 bg-white/[.03] hover:border-white/30"}`}
              >
                <span className="block truncate text-lg leading-tight text-white" style={{ fontFamily: fontStack(font.id) }}>{sample || "ABC 123"}</span>
                <small className="block truncate text-[9px] text-white/45">{font.label}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TextStyleControls({ value, onChange, onStart, showArc = true }: { value: TextStyle; onChange: (patch: Partial<TextStyle>) => void; onStart?: () => void; showArc?: boolean }) {
  const { tr } = useShop()
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <select
          className={`${darkInput} flex-1`}
          value={value.font}
          aria-label={tr("Phông chữ", "Font")}
          onChange={(event) => { onStart?.(); onChange({ font: event.target.value }) }}
          style={{ fontFamily: fontStack(value.font) }}
        >
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.id} label={tr(group.vi, group.en)}>
              {JERSEY_FONTS.filter((font) => font.group === group.id).map((font) => (
                <option key={font.id} value={font.id}>{font.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className={`grid size-10 place-items-center rounded-lg border ${value.bold ? "border-[var(--lime)] bg-[var(--lime)] text-white" : "border-white/10 text-white/70"}`} aria-pressed={value.bold} aria-label={tr("In đậm", "Bold")} onClick={() => { onStart?.(); onChange({ bold: !value.bold }) }}><Bold size={15} /></button>
        <button type="button" className={`grid size-10 place-items-center rounded-lg border ${value.italic ? "border-[var(--lime)] bg-[var(--lime)] text-white" : "border-white/10 text-white/70"}`} aria-pressed={value.italic} aria-label={tr("In nghiêng", "Italic")} onClick={() => { onStart?.(); onChange({ italic: !value.italic }) }}><Italic size={15} /></button>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className={`${fieldLabel} mb-0`}>{tr("Màu & viền chữ", "Color & outline")}</span>
          <button type="button" className={chip(!!value.outline)} onClick={() => { onStart?.(); onChange({ outline: value.outline ? null : "#111111" }) }}>{tr("Viền", "Outline")}: {value.outline ? tr("Bật", "On") : tr("Tắt", "Off")}</button>
        </div>
        <ColorFields
          fields={[
            { key: "color", name: tr("Màu chữ", "Text"), value: value.color, onChange: (color) => { onStart?.(); onChange({ color }) } },
            ...(value.outline ? [{ key: "outline", name: tr("Màu viền", "Outline"), value: value.outline, onChange: (outline: string) => { onStart?.(); onChange({ outline }) } }] : []),
          ]}
        />
        {value.outline && <Slider label={tr("Độ dày viền", "Outline")} value={value.outlineWidth} min={1} max={12} onStart={onStart} onChange={(outlineWidth) => onChange({ outlineWidth })} />}
      </div>
      <Slider label={tr("Cỡ chữ", "Size")} value={value.size} min={12} max={220} onStart={onStart} onChange={(size) => onChange({ size })} />
      <Slider label={tr("Giãn chữ", "Spacing")} value={value.spacing} min={-4} max={30} onStart={onStart} onChange={(spacing) => onChange({ spacing })} />
      {showArc && <Slider label={tr("Độ cong", "Curve")} value={value.arc} min={-80} max={80} onStart={onStart} onChange={(arc) => onChange({ arc })} />}
    </div>
  )
}

const styleOf = (item: TextItem): TextStyle => ({
  font: item.font ?? "anton",
  size: item.size,
  color: item.color,
  bold: item.bold,
  italic: item.italic,
  outline: item.outline ?? null,
  outlineWidth: item.outlineWidth ?? 3,
  spacing: item.spacing ?? 0,
  arc: item.arc ?? 0,
})
const textPatch = (style: Partial<TextStyle>): Partial<TextItem> => {
  const patch: Partial<TextItem> = { ...style } as Partial<TextItem>
  if ("outline" in style) patch.outline = style.outline ?? undefined
  if ("arc" in style) patch.arc = style.arc || undefined
  if ("spacing" in style) patch.spacing = style.spacing || undefined
  return patch
}

export function JerseyStudio({ shops }: { shops: CustomShopCard[] }) {
  const { tr, notify } = useShop()
  const [tab, setTab] = useState<Tab>("template")
  const [tool, setTool] = useState<Tool>("select")
  const [garment, setGarment] = useState<Garment>("shirt")
  const [activeSide, setActiveSide] = useState<Side>("front")
  const [previewSide, setPreviewSide] = useState<Side>("front")
  const [shirtColor, setShirtColor] = useState(KIT_TEMPLATES[0].base)
  const [printColor, setPrintColor] = useState("#ffffff")
  const [material, setMaterial] = useState<Material>("polyester")
  const [jerseySize, setJerseySize] = useState<JerseySize>("M")
  const [brushSize, setBrushSize] = useState(8)
  const [eraserSize, setEraserSize] = useState(16)
  const [art, setArt] = useState<JerseyArt>(starterArt)
  const [selected, setSelected] = useState<Selected>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [uploading, setUploading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [patternMode, setPatternMode] = useState<"preset" | "photo">("preset")
  const [textMode, setTextMode] = useState<"names" | "custom">("names")
  const [showDesigns, setShowDesigns] = useState(false)
  const [logoMode, setLogoMode] = useState<"library" | "upload">("library")
  const [crest, setCrest] = useState<CrestOptions>({ initials: "BFC", name: "BOAI FOOTBALL CLUB", c1: "#121019", c2: "#7c3aed", accent: "#ffffff" })
  const [textDraft, setTextDraft] = useState("KIM LONG")
  const [textStyle, setTextStyle] = useState<TextStyle>({ font: "saira", size: 40, color: "#ffffff", bold: true, italic: true, outline: null, outlineWidth: 3, spacing: 0, arc: 0 })
  const { cropImage, cropper } = useImageCropper()
  // Original uploads (session only) so background removal can be re-run or undone.
  const patternSources = useRef(new Map<string, { blob: Blob; preview: string }>())
  const [cutoutState, setCutoutState] = useState<Record<string, "cutout" | "original">>({})
  const [cutTolerance, setCutTolerance] = useState(60)
  const logoSources = useRef(new Map<number, { blob: Blob; preview: string }>())
  const [logoCutoutState, setLogoCutoutState] = useState<Record<number, "cutout" | "original">>({})
  const [logoTolerance, setLogoTolerance] = useState(60)
  const [, setHistoryTick] = useState(0)
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [profile, setProfile] = useState({ id: "", name: "", phone: "" })
  const [designs, setDesigns] = useState<{ id: string; name: string; updatedAt: string }[]>([])
  const [requests, setRequests] = useState<MyCustomRequest[]>([])
  const [openRequest, setOpenRequest] = useState<string | null>(null)
  const [designName, setDesignName] = useState("Thiết kế mới")
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null)
  const [cloudPending, startCloudTransition] = useTransition()
  const canvasRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const exportRefs = useRef<Record<string, SVGSVGElement | null>>({})
  const logoInput = useRef<HTMLInputElement>(null)
  const patternInput = useRef<HTMLInputElement>(null)
  const drawing = useRef<{ garment: Garment; side: Side; id: number } | null>(null)
  const erasing = useRef(false)
  const dragging = useRef<{ garment: Garment; side: Side; kind: ItemKind; id: number; dx: number; dy: number; snapshot: JerseyArt | null } | null>(null)
  const idCounter = useRef(1)
  const artRef = useRef(art)
  artRef.current = art
  const history = useRef<JerseyArt[]>([])
  const future = useRef<JerseyArt[]>([])
  const starterLogo = useRef(false)
  const openRequestFromLink = useCallback((id: string) => setOpenRequest(id), [])
  const kit = art.kit ?? DEFAULT_KIT
  const patternPart: Garment = garment === "pants" && kit.pantsPattern ? "pants" : "shirt"

  useEffect(
    () => () => {
      for (const source of logoSources.current.values()) URL.revokeObjectURL(source.preview)
      for (const source of patternSources.current.values()) URL.revokeObjectURL(source.preview)
    },
    [],
  )

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null")
      if (saved?.art?.front && saved?.art?.back) {
        setArt(normalizeArt(saved.art))
        if (HEX.test(saved.shirtColor ?? "")) setShirtColor(saved.shirtColor)
        if (HEX.test(saved.printColor ?? "")) setPrintColor(saved.printColor)
        if (saved.material in MATERIAL_LABELS) setMaterial(saved.material)
        if (JERSEY_SIZES.some(({ size }) => size === saved.jerseySize)) setJerseySize(saved.jerseySize)
      } else starterLogo.current = true
    } catch {
      starterLogo.current = true
    }
    setReady(true)
  }, [])

  // The starter kit gets a crest once the browser can rasterize it.
  useEffect(() => {
    if (!ready || !starterLogo.current) return
    starterLogo.current = false
    const template = CREST_TEMPLATES[0]
    void crestPng(template.svg(crest)).then((src) =>
      setArt((cur) => (cur.front.logos.length ? cur : { ...cur, front: { ...cur.front, logos: [{ id: 9001, src, x: 282, y: 172, size: 66 }] } })),
    ).catch(() => {})
  }, [ready, crest])

  useEffect(() => {
    if (!ready) return
    const draftValue = { art, shirtColor, printColor, material, jerseySize }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(draftValue))
    } catch {
      // Ảnh logo/họa tiết có thể vượt dung lượng lưu trên máy: vẫn giữ phần còn lại.
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...draftValue, art: stripImages(art) })) } catch {}
    }
  }, [art, jerseySize, material, printColor, ready, shirtColor])

  const refreshDesigns = async () => {
    const result = await listDesignsAction()
    setAuthenticated(result.authenticated)
    setProfile(result.profile)
    setDesigns(result.designs)
    if (result.authenticated) setRequests(await listMyCustomRequestsAction())
  }

  useEffect(() => {
    if (!ready) return
    void (async () => {
      await refreshDesigns()
      const id = new URLSearchParams(window.location.search).get("design")
      if (id) openDesign(id)
    })()
    // Runs once after the local draft has loaded.
  }, [ready])

  const draft = { art, shirtColor, printColor, material, jerseySize }

  // ---------- Lịch sử ----------
  const checkpoint = (snapshot: JerseyArt = artRef.current) => {
    history.current = [...history.current.slice(-59), snapshot]
    future.current = []
    setHistoryTick((t) => t + 1)
  }
  const resetHistory = () => {
    history.current = []
    future.current = []
    setHistoryTick((t) => t + 1)
  }
  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    future.current.push(artRef.current)
    setArt(prev)
    setSelected(null)
    setHistoryTick((t) => t + 1)
  }
  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    history.current.push(artRef.current)
    setArt(next)
    setSelected(null)
    setHistoryTick((t) => t + 1)
  }

  // ---------- Thiết kế đã lưu ----------
  const saveToAccount = () => startCloudTransition(async () => {
    try {
      const result = await saveDesignAction(currentDesignId, designName, draft)
      if (!result.ok) return notify(tr("Vui lòng đặt tên cho thiết kế.", "Give your design a name."))
      setCurrentDesignId(result.id)
      setDesignName(result.name)
      await refreshDesigns()
      notify(tr("Đã lưu thiết kế vào tài khoản", "Design saved to your account"))
    } catch {
      notify(tr("Không lưu được. Hãy đăng nhập hoặc dùng ảnh nhỏ hơn.", "Could not save. Sign in or use smaller images."))
    }
  })

  const openDesign = (id: string) => startCloudTransition(async () => {
    const result = await getDesignAction(id)
    if (!result.ok) return notify(tr("Không tìm thấy thiết kế.", "Design not found."))
    const design = result.design
    setCurrentDesignId(design.id)
    setDesignName(design.name)
    setArt(normalizeArt(design.art))
    setShirtColor(design.shirtColor)
    setPrintColor(design.printColor)
    setMaterial(design.material)
    setJerseySize(design.jerseySize)
    setSelected(null)
    resetHistory()
    notify(tr("Đã mở thiết kế", "Design opened"))
  })

  const renameDesign = (id: string, oldName: string) => {
    const name = window.prompt(tr("Tên mới cho thiết kế", "New design name"), oldName)
    if (!name?.trim()) return
    startCloudTransition(async () => {
      const result = await renameDesignAction(id, name)
      if (result.ok) {
        if (currentDesignId === id) setDesignName(name.trim().slice(0, 80))
        await refreshDesigns()
      }
    })
  }
  const duplicateDesign = (id: string) => startCloudTransition(async () => {
    const result = await duplicateDesignAction(id)
    if (result.ok) { await refreshDesigns(); notify(tr("Đã nhân bản thiết kế", "Design duplicated")) }
  })
  const removeDesign = (id: string) => {
    if (!window.confirm(tr("Xóa thiết kế này khỏi tài khoản?", "Delete this design from your account?"))) return
    startCloudTransition(async () => {
      const result = await deleteDesignAction(id)
      if (result.ok) {
        if (currentDesignId === id) { setCurrentDesignId(null); setDesignName(tr("Thiết kế mới", "New design")) }
        await refreshDesigns()
      }
    })
  }

  // ---------- Chỉnh sửa chung ----------
  const nextId = () => Date.now() + idCounter.current++
  const updateSide = (g: Garment, side: Side, update: (current: SideArt) => SideArt) =>
    setArt((current) =>
      g === "shirt"
        ? { ...current, [side]: update(current[side]) }
        : { ...current, pants: { ...current.pants, enabled: true, [side]: update(current.pants[side]) } },
    )
  const current = sideOf(art, garment, activeSide)
  const setKit = (patch: Partial<KitStyle>) => setArt((cur) => ({ ...cur, kit: { ...(cur.kit ?? DEFAULT_KIT), ...patch } }))
  /** Keep an item inside the printable panel of its garment face. */
  const fit = <T extends { x: number; y: number; size: number }>(g: Garment, side: Side, kind: ItemKind, item: T) =>
    fitItem(g, side, artRef.current.kit?.collar ?? "crew", kind, item)

  const switchView = (g: Garment, side: Side) => {
    setGarment(g)
    setActiveSide(side)
    setPreviewSide(side)
    setSelected(null)
    setCursor(null)
    drawing.current = null
    erasing.current = false
    dragging.current = null
  }

  // Editing a part's color brings that part onto the canvas and outlines it
  // briefly, so changes are always visible (e.g. shorts while on the shirt).
  const [flash, setFlash] = useState<{ key: number; garment: Garment } | null>(null)
  const showPart = (g: Garment, side?: Side) => {
    if (g !== garment || (side && side !== activeSide)) switchView(g, side ?? activeSide)
    setFlash((current) => ({ key: (current?.key ?? 0) + 1, garment: g }))
  }
  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), 900)
    return () => clearTimeout(timer)
  }, [flash])

  const svgPoint = (event: ReactPointerEvent<Element>) => {
    const svg = canvasRef.current
    if (!svg) return GARMENT_CENTER[garment]
    const bounds = svg.getBoundingClientRect()
    const box = GARMENT_BOUNDS[garment]
    return {
      x: Math.max(box.x[0], Math.min(box.x[1], ((event.clientX - bounds.left) / bounds.width) * 420)),
      y: Math.max(box.y[0], Math.min(box.y[1], ((event.clientY - bounds.top) / bounds.height) * 480)),
    }
  }

  const eraseAt = (point: Point) =>
    updateSide(garment, activeSide, (side) => ({ ...side, strokes: eraseStrokes(side.strokes, point, eraserSize, nextId) }))

  const handleCanvasDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    setSelected(null)
    if (tool === "draw") {
      event.currentTarget.setPointerCapture(event.pointerId)
      checkpoint()
      const id = nextId()
      const point = svgPoint(event)
      drawing.current = { garment, side: activeSide, id }
      updateSide(garment, activeSide, (side) => ({ ...side, strokes: [...side.strokes, { id, points: [point], color: printColor, width: brushSize }] }))
    } else if (tool === "erase") {
      event.currentTarget.setPointerCapture(event.pointerId)
      checkpoint()
      erasing.current = true
      eraseAt(svgPoint(event))
    }
  }

  const handleCanvasMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = svgPoint(event)
    if (tool === "erase") setCursor(point)
    const stroke = drawing.current
    if (stroke) {
      updateSide(stroke.garment, stroke.side, (side) => ({
        ...side,
        strokes: side.strokes.map((item) => (item.id === stroke.id ? { ...item, points: [...item.points, point] } : item)),
      }))
    }
    if (erasing.current) eraseAt(point)
    const drag = dragging.current
    if (drag) {
      if (drag.snapshot) {
        checkpoint(drag.snapshot)
        drag.snapshot = null
      }
      const key = ITEM_KEY[drag.kind]
      updateSide(drag.garment, drag.side, (side) => ({
        ...side,
        [key]: (side[key] as { id: number; x: number; y: number; size: number }[]).map((item) =>
          item.id === drag.id ? fit(drag.garment, drag.side, drag.kind, { ...item, x: point.x - drag.dx, y: point.y - drag.dy }) : item,
        ),
      }))
    }
  }

  const endPointer = () => {
    drawing.current = null
    erasing.current = false
    dragging.current = null
  }

  const handleSelect = (side: Side, kind: ItemKind, id: number, origin: Point, event: ReactPointerEvent<SVGGElement | SVGTextElement>) => {
    if (tool === "draw" || tool === "erase") return
    event.stopPropagation()
    const point = svgPoint(event)
    setSelected({ garment, side, kind, id })
    dragging.current = { garment, side, kind, id, dx: point.x - origin.x, dy: point.y - origin.y, snapshot: artRef.current }
  }

  // ---------- Mẫu áo & họa tiết ----------
  const applyTemplate = (template: KitTemplate) => {
    checkpoint()
    setShirtColor(template.base)
    setArt((cur) => {
      const recolor = (side: SideArt): SideArt => ({ ...side, texts: side.texts.map((t) => (t.role ? { ...t, color: template.text } : t)) })
      return {
        ...cur,
        kit: kitFromTemplate(template),
        front: recolor(cur.front),
        back: recolor(cur.back),
        pants: { ...cur.pants, color: template.pants },
      }
    })
    notify(tr(`Đã áp dụng mẫu ${template.vi}`, `Applied ${template.en}`))
  }
  const choosePattern = (pattern: PatternId) => {
    checkpoint()
    setKit({ pattern, template: "custom", patternHidden: false })
  }

  // ---------- Chữ ----------
  const addText = () => {
    const clean = textDraft.trim().slice(0, 24)
    if (!clean) return
    checkpoint()
    const id = nextId()
    const y = garment === "pants" ? 170 : activeSide === "front" ? 200 : 380
    updateSide(garment, activeSide, (side) => ({ ...side, texts: [...side.texts, fit(garment, activeSide, "text", { id, text: clean, x: 210, y, ...textPatch(textStyle) } as TextItem)] }))
    setSelected({ garment, side: activeSide, kind: "text", id })
  }
  const roleText = (role: TextRole, side: Side) => art[side].texts.find((t) => t.role === role)
  const roleSide: Record<Exclude<TextRole, "number">, Side> = { team: "front", player: "back" }

  /** Team / player name slots on the shirt; empty text removes the slot. */
  const setRoleName = (role: "team" | "player", text: string) => {
    const side = roleSide[role]
    const clean = text.slice(0, 24)
    setArt((cur) => {
      const existing = cur[side].texts.find((t) => t.role === role)
      const texts = !clean.trim()
        ? cur[side].texts.filter((t) => t.role !== role)
        : existing
          ? cur[side].texts.map((t) => (t.role === role ? { ...t, text: clean } : t))
          : [...cur[side].texts, { id: nextId(), text: clean, color: KIT_TEMPLATES.find((tpl) => tpl.id === cur.kit?.template)?.text ?? "#ffffff", ...ROLE_DEFAULTS[role], role }]
      return { ...cur, [side]: { ...cur[side], texts } }
    })
  }
  const patchRole = (role: TextRole, patch: Partial<TextItem>) =>
    setArt((cur) => {
      const sides: Side[] = role === "number" ? ["front", "back"] : [roleSide[role]]
      const next = { ...cur }
      for (const side of sides) next[side] = { ...cur[side], texts: cur[side].texts.map((t) => (t.role === role ? fit("shirt", side, "text", { ...t, ...patch }) : t)) }
      return next
    })

  const numberText = roleText("number", "front") ?? roleText("number", "back")
  const setNumber = (value: string) => {
    const clean = value.replace(/[^0-9]/g, "").slice(0, 3)
    setArt((cur) => {
      const has = (side: Side) => cur[side].texts.some((t) => t.role === "number")
      if (!clean) return { ...cur, front: { ...cur.front, texts: cur.front.texts.filter((t) => t.role !== "number") }, back: { ...cur.back, texts: cur.back.texts.filter((t) => t.role !== "number") } }
      if (!has("front") && !has("back")) {
        const color = KIT_TEMPLATES.find((tpl) => tpl.id === cur.kit?.template)?.text ?? "#ffffff"
        return {
          ...cur,
          front: { ...cur.front, texts: [...cur.front.texts, { id: nextId(), text: clean, color, ...ROLE_DEFAULTS.number, role: "number" }] },
          back: { ...cur.back, texts: [...cur.back.texts, { id: nextId(), text: clean, color, ...ROLE_DEFAULTS.number, y: 300, size: 170, role: "number" }] },
        }
      }
      const set = (side: SideArt): SideArt => ({ ...side, texts: side.texts.map((t) => (t.role === "number" ? { ...t, text: clean } : t)) })
      return { ...cur, front: set(cur.front), back: set(cur.back) }
    })
  }
  const toggleNumberSide = (side: Side) => {
    checkpoint()
    setArt((cur) => {
      const exists = cur[side].texts.some((t) => t.role === "number")
      if (exists) return { ...cur, [side]: { ...cur[side], texts: cur[side].texts.filter((t) => t.role !== "number") } }
      const template = numberText ?? ({ text: "10", color: "#ffffff", ...ROLE_DEFAULTS.number } as TextItem)
      const placement = side === "front" ? { y: 330, size: 104 } : { y: 300, size: 170 }
      return { ...cur, [side]: { ...cur[side], texts: [...cur[side].texts, { ...template, ...placement, id: nextId(), role: "number" as const }] } }
    })
  }

  // ---------- Hình ảnh ----------
  const imageError = (error: unknown) => {
    const code = error instanceof Error ? error.message : ""
    notify(
      code === "TYPE"
        ? tr("Chỉ nhận ảnh PNG, JPG hoặc WebP.", "Only PNG, JPG or WebP images.")
        : code === "SIZE"
          ? tr("Ảnh quá lớn, hãy chọn ảnh dưới 8MB.", "Image too large, pick one under 8MB.")
          : tr("Không đọc được ảnh này.", "Could not read this image."),
    )
  }

  const addLogo = (src: string, size = 70) => {
    const id = nextId()
    const position = garment === "shirt" ? (activeSide === "front" ? { x: 282, y: 172 } : { x: 210, y: 130 }) : GARMENT_CENTER.pants
    checkpoint()
    updateSide(garment, activeSide, (side) => ({ ...side, logos: [...side.logos, fit(garment, activeSide, "logo", { id, src, ...position, size })] }))
    setSelected({ garment, side: activeSide, kind: "logo", id })
    return id
  }

  const addCrest = async (svg: string) => {
    if (current.logos.length >= MAX_LOGOS) return notify(tr(`Mỗi mặt tối đa ${MAX_LOGOS} logo.`, `Up to ${MAX_LOGOS} logos per side.`))
    try {
      addLogo(await crestPng(svg))
      notify(tr("Đã thêm logo. Kéo để đặt vị trí.", "Logo added. Drag to place it."))
    } catch {
      notify(tr("Không tạo được logo này.", "Could not create this logo."))
    }
  }

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = ""
    if (!picked) return
    if (current.logos.length >= MAX_LOGOS) return notify(tr(`Mỗi mặt tối đa ${MAX_LOGOS} logo.`, `Up to ${MAX_LOGOS} logos per side.`))
    const file = await cropImage(picked, { title: tr("Cắt logo", "Crop logo"), aspects: [ASPECTS.original, ASPECTS.square], maxOutput: 1200 })
    if (!file) return
    setUploading(true)
    try {
      // Background removal runs right away; the original stays available to restore.
      const cutout = await garmentCutout(file, { tolerance: logoTolerance, lenient: true }).catch(() => null)
      const src = cutout?.src ?? (await readImage(file, 512))
      const id = addLogo(src, 90)
      logoSources.current.set(id, { blob: file, preview: URL.createObjectURL(file) })
      setLogoCutoutState((state) => ({ ...state, [id]: cutout ? "cutout" : "original" }))
      notify(cutout
        ? tr("Đã tải logo và tách nền tự động.", "Logo uploaded with background removed.")
        : tr("Đã tải logo. Không thấy nền trơn để tách — bạn vẫn có thể thử tách nền ở bảng Thuộc tính.", "Logo uploaded. No plain background found — you can retry removal in Properties."))
    } catch (error) {
      imageError(error)
    } finally {
      setUploading(false)
    }
  }

  const uploadPattern = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0]
    event.target.value = ""
    if (!picked) return
    const file = await cropImage(picked, { title: tr("Cắt ảnh áo mẫu / họa tiết", "Crop garment photo / pattern"), aspects: [ASPECTS.original, ASPECTS.square], maxOutput: 1600 })
    if (!file) return
    setUploading(true)
    try {
      const cutout = /^image\/(png|jpeg|webp)$/.test(file.type) && file.size <= 8_000_000 ? await garmentCutout(file, { tolerance: cutTolerance }).catch(() => null) : null
      const key = `${garment}:${activeSide}`
      const previous = patternSources.current.get(key)
      if (previous) URL.revokeObjectURL(previous.preview)
      patternSources.current.set(key, { blob: file, preview: URL.createObjectURL(file) })
      setCutoutState((s) => ({ ...s, [key]: cutout ? "cutout" : "original" }))
      checkpoint()
      if (cutout) {
        updateSide(garment, activeSide, (side) => ({ ...side, pattern: { src: cutout.src, scale: 96, opacity: 1, mode: "garment" } }))
        if (garment === "shirt") setShirtColor(cutout.color)
        else setArt((cur) => ({ ...cur, pants: { ...cur.pants, color: cutout.color } }))
        notify(tr("Đã dựng áo theo ảnh mẫu và chọn màu nền khớp ảnh.", "Garment rebuilt from your photo with a matching base color."))
      } else {
        const src = await readImage(file, 360)
        updateSide(garment, activeSide, (side) => ({ ...side, pattern: { src, scale: 96, opacity: 1, mode: "tile" } }))
        notify(tr("Đã phủ họa tiết lên mặt này.", "Pattern applied to this side."))
      }
    } catch (error) {
      imageError(error)
    } finally {
      setUploading(false)
    }
  }

  const patternKey = `${garment}:${activeSide}`
  const patternSource = patternSources.current.get(patternKey)
  const removeBackground = async () => {
    if (!current.pattern) return
    setUploading(true)
    try {
      const blob = patternSource?.blob ?? (await (await fetch(current.pattern.src)).blob())
      const cutout = await garmentCutout(blob, { tolerance: cutTolerance, lenient: true })
      if (!cutout) return notify(tr("Không tìm thấy nền trơn quanh áo. Hãy tăng độ nhạy hoặc dùng ảnh nền một màu.", "No plain background found. Raise sensitivity or use a single-color backdrop."))
      checkpoint()
      updateSide(garment, activeSide, (side) => (side.pattern ? { ...side, pattern: { ...side.pattern, src: cutout.src, mode: "garment" } } : side))
      if (garment === "shirt") setShirtColor(cutout.color)
      else setArt((cur) => ({ ...cur, pants: { ...cur.pants, color: cutout.color } }))
      setCutoutState((s) => ({ ...s, [patternKey]: "cutout" }))
      notify(tr("Đã tách nền và cắt quanh áo.", "Background removed and cropped around the garment."))
    } catch {
      notify(tr("Không thể tách nền ảnh này.", "Could not remove this background."))
    } finally {
      setUploading(false)
    }
  }
  const restoreOriginal = async () => {
    if (!current.pattern || !patternSource) return
    setUploading(true)
    try {
      const src = await readImage(patternSource.blob as File, 640)
      checkpoint()
      updateSide(garment, activeSide, (side) => (side.pattern ? { ...side, pattern: { ...side.pattern, src } } : side))
      setCutoutState((s) => ({ ...s, [patternKey]: "original" }))
    } catch (error) {
      imageError(error)
    } finally {
      setUploading(false)
    }
  }
  const setPattern = (patch: Partial<NonNullable<SideArt["pattern"]>>) =>
    updateSide(garment, activeSide, (side) => (side.pattern ? { ...side, pattern: { ...side.pattern, ...patch } } : side))
  const removePattern = () => {
    checkpoint()
    updateSide(garment, activeSide, (side) => ({ ...side, pattern: null }))
  }
  const patternToOtherSide = () => {
    if (!current.pattern) return
    checkpoint()
    const other: Side = activeSide === "front" ? "back" : "front"
    const pattern = current.pattern
    updateSide(garment, other, (side) => ({ ...side, pattern }))
    notify(tr("Đã áp dụng ảnh cho mặt còn lại.", "Copied to the other side."))
  }

  // ---------- Đối tượng đang chọn ----------
  const selectedItem = selected
    ? (sideOf(art, selected.garment, selected.side)[ITEM_KEY[selected.kind]] as { id: number; size: number; src?: string }[]).find((item) => item.id === selected.id) ?? null
    : null
  const selectedText = selected?.kind === "text" ? (selectedItem as unknown as TextItem | null) : null
  const selectedLogoSource = selected?.kind === "logo" ? logoSources.current.get(selected.id) : undefined
  const updateSelected = (patch: Record<string, unknown>) => {
    if (!selected) return
    const key = ITEM_KEY[selected.kind]
    updateSide(selected.garment, selected.side, (side) => ({
      ...side,
      [key]: (side[key] as { id: number; x: number; y: number; size: number }[]).map((item) =>
        item.id === selected.id ? fit(selected.garment, selected.side, selected.kind, { ...item, ...patch }) : item,
      ),
    }))
  }
  const removeLogoBackground = async () => {
    if (!selected || selected.kind !== "logo" || !selectedItem?.src) return
    setUploading(true)
    try {
      const source = logoSources.current.get(selected.id)
      const blob = source?.blob ?? (await (await fetch(selectedItem.src)).blob())
      const cutout = await garmentCutout(blob, { tolerance: logoTolerance, lenient: true })
      if (!cutout) return notify(tr("Không tìm thấy nền trơn quanh logo. Hãy tăng độ nhạy.", "No plain background found around the logo. Raise sensitivity."))
      checkpoint()
      updateSelected({ src: cutout.src })
      setLogoCutoutState((state) => ({ ...state, [selected.id]: "cutout" }))
      notify(tr("Đã tách nền logo.", "Logo background removed."))
    } catch {
      notify(tr("Không thể tách nền logo này.", "Could not remove this logo background."))
    } finally {
      setUploading(false)
    }
  }
  const restoreOriginalLogo = async () => {
    if (!selected || selected.kind !== "logo") return
    const source = logoSources.current.get(selected.id)
    if (!source) return
    setUploading(true)
    try {
      const src = await readImage(source.blob as File, 512)
      checkpoint()
      updateSelected({ src })
      setLogoCutoutState((state) => ({ ...state, [selected.id]: "original" }))
    } catch (error) {
      imageError(error)
    } finally {
      setUploading(false)
    }
  }

  const removeItem = (g: Garment, side: Side, kind: ItemKind, id: number) => {
    checkpoint()
    const key = ITEM_KEY[kind]
    updateSide(g, side, (s) => ({ ...s, [key]: (s[key] as { id: number }[]).filter((item) => item.id !== id) }))
    if (kind === "logo") {
      const source = logoSources.current.get(id)
      if (source) URL.revokeObjectURL(source.preview)
      logoSources.current.delete(id)
    }
    if (selected?.id === id) setSelected(null)
  }
  const deleteSelected = () => selected && removeItem(selected.garment, selected.side, selected.kind, selected.id)
  const toggleHidden = (kind: ItemKind, id: number) => {
    checkpoint()
    const key = ITEM_KEY[kind]
    updateSide(garment, activeSide, (s) => ({ ...s, [key]: (s[key] as { id: number; hidden?: boolean }[]).map((item) => (item.id === id ? { ...item, hidden: !item.hidden } : item)) }))
  }
  const moveLayer = (kind: ItemKind, id: number, direction: 1 | -1) => {
    checkpoint()
    const key = ITEM_KEY[kind]
    updateSide(garment, activeSide, (s) => {
      const list = [...(s[key] as { id: number }[])]
      const i = list.findIndex((item) => item.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= list.length) return s
      ;[list[i], list[j]] = [list[j], list[i]]
      return { ...s, [key]: list }
    })
  }

  const addSticker = (kind: StickerKind) => {
    checkpoint()
    const id = nextId()
    const c = GARMENT_CENTER[garment]
    updateSide(garment, activeSide, (side) => ({ ...side, stickers: [...side.stickers, fit(garment, activeSide, "sticker", { id, kind, x: c.x, y: c.y, size: 54, color: printColor })] }))
    setSelected({ garment, side: activeSide, kind: "sticker", id })
  }

  const clearSide = () => {
    if (!window.confirm(tr("Xóa toàn bộ chi tiết ở mặt này? (giữ mẫu áo và màu)", "Clear everything on this side? (keeps template and colors)"))) return
    checkpoint()
    setArt((cur) => (garment === "shirt" ? { ...cur, [activeSide]: emptyArt() } : { ...cur, pants: { ...cur.pants, [activeSide]: emptyArt() } }))
    setSelected(null)
  }
  const togglePants = (enabled: boolean) => setArt((cur) => ({ ...cur, pants: { ...cur.pants, enabled } }))

  // Phím tắt: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (hoặc Y), Delete.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo() }
      else if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); redo() }
      else if ((event.key === "Delete" || event.key === "Backspace") && selected) { event.preventDefault(); deleteSelected() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const selectedKey = selected ? `${selected.kind}-${selected.id}` : null

  const exportViews: [Garment, Side][] = [["shirt", "front"], ["shirt", "back"], ...(art.pants.enabled ? ([["pants", "front"], ["pants", "back"]] as [Garment, Side][]) : [])]
  const downloadDesign = async () => {
    try {
      const svgs = exportViews.map(([g, side]) => exportRefs.current[`${g}-${side}`])
      if (svgs.some((svg) => !svg)) return
      const images = await Promise.all(
        svgs.map(async (svg) => {
          const source = await serializeWithFonts(svg!)
          const image = new Image()
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`
          await image.decode()
          return image
        }),
      )
      const rows = Math.ceil(images.length / 2)
      const canvas = document.createElement("canvas")
      canvas.width = 960
      canvas.height = rows * 530 + 70
      const context = canvas.getContext("2d")
      if (!context) return
      context.fillStyle = "#f4f7fb"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = "#171816"
      context.textAlign = "center"
      exportViews.forEach(([g, side], i) => {
        const x = (i % 2) * 460 + 40
        const y = Math.floor(i / 2) * 530
        context.font = "800 20px Arial"
        context.fillText(`${g === "shirt" ? "ÁO" : "QUẦN"} · ${side === "front" ? "MẶT TRƯỚC" : "MẶT SAU"}`, x + 210, y + 38)
        context.drawImage(images[i], x, y + 50, 420, 480)
      })
      context.font = "600 14px Arial"
      context.fillText(`BOAI CUSTOM · ${material.toUpperCase()} · SIZE ${jerseySize}`, 480, canvas.height - 22)
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "boai-custom-kit.png"
        link.click()
        URL.revokeObjectURL(url)
        notify(tr("Đã tải ảnh thiết kế", "Design image downloaded"))
      }, "image/png")
    } catch {
      notify(tr("Không thể xuất ảnh. Vui lòng thử lại.", "Could not export the image. Please try again."))
    }
  }

  const toggleFullscreen = () => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.requestFullscreen?.().catch(() => {})
  }

  const garmentName = (g: Garment) => (g === "shirt" ? tr("Áo", "Shirt") : tr("Quần", "Shorts"))
  const sideName = (side: Side) => (side === "front" ? tr("Mặt trước", "Front") : tr("Mặt sau", "Back"))
  const canvasColor = garment === "shirt" ? shirtColor : art.pants.color
  const otherSide: Side = activeSide === "front" ? "back" : "front"
  const tabs: [Tab, string, typeof Pencil][] = [
    ["template", tr("Mẫu áo", "Template"), LayoutTemplate],
    ["pattern", tr("Họa tiết", "Pattern"), Palette],
    ["logo", "Logo", Shield],
    ["text", tr("Chữ", "Text"), Type],
    ["number", tr("Số áo", "Number"), Hash],
    ["draw", tr("Vẽ", "Draw"), Pencil],
    ["layers", tr("Lớp", "Layers"), Layers],
    ["order", tr("Đặt may", "Order"), ShoppingBag],
  ]
  const [, activeTabName, ActiveTabIcon] = tabs.find(([value]) => value === tab) ?? tabs[0]
  const crestPreviews = useMemo(() => CREST_TEMPLATES.map((template) => ({ template, svg: template.svg(crest) })), [crest])
  const teamText = roleText("team", "front")
  const playerText = roleText("player", "back")

  // Layer rows for the current garment side, top-most first.
  const layerRows: { key: string; label: string; icon: ReactNode; hidden?: boolean; kind?: ItemKind; id?: number; onToggle?: () => void; onDelete?: () => void; first?: boolean; last?: boolean }[] = [
    ...current.texts.map((t, i, list) => ({ key: `t${t.id}`, label: t.text, icon: <Type size={14} />, hidden: t.hidden, kind: "text" as const, id: t.id, first: i === list.length - 1, last: i === 0 })).reverse(),
    ...current.stickers.map((s, i, list) => ({ key: `s${s.id}`, label: `Sticker ${s.kind}`, icon: <Star size={14} />, hidden: s.hidden, kind: "sticker" as const, id: s.id, first: i === list.length - 1, last: i === 0 })).reverse(),
    ...current.logos.map((l, i, list) => ({ key: `l${l.id}`, label: "Logo", icon: <span className="block size-4 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${l.src})` }} />, hidden: l.hidden, kind: "logo" as const, id: l.id, first: i === list.length - 1, last: i === 0 })).reverse(),
    ...(current.strokes.length
      ? [{ key: "strokes", label: tr(`Nét vẽ (${current.strokes.length})`, `Strokes (${current.strokes.length})`), icon: <Pencil size={14} />, onDelete: () => { checkpoint(); updateSide(garment, activeSide, (s) => ({ ...s, strokes: [] })) } }]
      : []),
    ...(current.pattern
      ? [{ key: "upload", label: tr("Ảnh họa tiết", "Photo pattern"), icon: <ImagePlus size={14} />, hidden: current.pattern.hidden, onToggle: () => { checkpoint(); setPattern({ hidden: !current.pattern?.hidden }) }, onDelete: removePattern }]
      : []),
    ...(art.kit && kit.pattern !== "none" && (garment === "shirt" || kit.pantsPattern)
      ? [{ key: "kit", label: `${tr("Họa tiết", "Pattern")}: ${tr(PATTERN_LABELS[kit.pattern].vi, PATTERN_LABELS[kit.pattern].en)}`, icon: <Palette size={14} />, hidden: kit.patternHidden, onToggle: () => { checkpoint(); setKit({ patternHidden: !kit.patternHidden }) }, onDelete: () => choosePattern("none") }]
      : []),
  ]

  const presetRow = (sample: string, onPick: (style: Partial<TextStyle>) => void) => (
    <div>
      <span className={fieldLabel}>{tr("Kiểu chữ mẫu", "Text presets")}</span>
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:thin] md:-mx-4 md:px-4">
        {TEXT_PRESETS.map((preset) => (
          <button key={preset.id} type="button" onClick={() => onPick(preset.style)} className="w-[100px] shrink-0 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5 text-left transition hover:border-[var(--lime)]">
            <span className="block truncate text-base leading-tight text-white" style={{ fontFamily: fontStack(preset.style.font), fontStyle: preset.style.italic ? "italic" : "normal", color: preset.style.color, WebkitTextStroke: preset.style.outline ? `1px ${preset.style.outline}` : undefined }}>{sample || "KIM LONG"}</span>
            <small className="text-[9px] text-white/45">{tr(preset.vi, preset.en)}</small>
          </button>
        ))}
      </div>
    </div>
  )

  /** Quick font / weight / color controls for the team and player name slots. */
  const roleControls = (role: "team" | "player", item: TextItem) => (
    <div className="mt-2 grid gap-2">
      <div className="flex items-center gap-1.5">
        <select className={`${darkInput} min-w-0 flex-1`} value={item.font ?? "saira"} style={{ fontFamily: fontStack(item.font) }} aria-label={tr("Phông chữ", "Font")} onChange={(event) => { checkpoint(); patchRole(role, { font: event.target.value }) }}>
          {JERSEY_FONTS.filter((f) => f.vi).map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
        </select>
        <button type="button" className={`grid size-10 shrink-0 place-items-center rounded-lg border ${item.bold ? "border-[var(--lime)] bg-[var(--lime)]" : "border-white/10 text-white/70"}`} aria-pressed={item.bold} aria-label={tr("In đậm", "Bold")} onClick={() => { checkpoint(); patchRole(role, { bold: !item.bold }) }}><Bold size={15} /></button>
        <button type="button" className={`grid size-10 shrink-0 place-items-center rounded-lg border ${item.italic ? "border-[var(--lime)] bg-[var(--lime)]" : "border-white/10 text-white/70"}`} aria-pressed={item.italic} aria-label={tr("In nghiêng", "Italic")} onClick={() => { checkpoint(); patchRole(role, { italic: !item.italic }) }}><Italic size={15} /></button>
        <button type="button" className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-white/30 hover:text-white" title={tr("Chỉnh chi tiết: viền, cỡ, độ cong", "More: outline, size, curve")} aria-label={tr("Chỉnh chi tiết", "More styling")} onClick={() => { switchView("shirt", roleSide[role]); setSelected({ garment: "shirt", side: roleSide[role], kind: "text", id: item.id }) }}><SlidersHorizontal size={15} /></button>
      </div>
      <ColorFields fields={[{ key: "color", name: tr("Màu chữ", "Text color"), value: item.color, onOpen: () => showPart("shirt", roleSide[role]), onChange: (color) => { checkpoint(); patchRole(role, { color }); showPart("shirt", roleSide[role]) } }]} />
    </div>
  )

  const segmented = <T extends string>(value: T, options: [T, string, typeof Pencil][], onChange: (value: T) => void) => (
    <div className="grid grid-flow-col gap-1 rounded-xl bg-white/[.05] p-1" role="tablist">
      {options.map(([id, label, Icon]) => (
        <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition ${value === id ? "bg-[var(--lime)] text-white shadow" : "text-white/60 hover:text-white"}`}>
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )

  const editing = !!(selected && selectedItem)
  const selectedTitle = selected?.kind === "logo" ? tr("Logo đang chọn", "Selected logo") : selected?.kind === "text" ? tr("Chữ đang chọn", "Selected text") : tr("Sticker đang chọn", "Selected sticker")

  const selectedPane = selected && selectedItem ? (
    <Pane key={selectedKey}>
      {selectedText ? (
        <>
          <input className={darkInput} maxLength={24} value={selectedText.text} aria-label={tr("Nội dung", "Content")} onChange={(event) => event.target.value.trim() && updateSelected({ text: event.target.value.slice(0, 24) })} />
          {presetRow(selectedText.text, (style) => { checkpoint(); updateSelected(textPatch(style)) })}
          <TextStyleControls value={styleOf(selectedText)} onStart={() => checkpoint()} onChange={(patch) => updateSelected(textPatch(patch))} />
        </>
      ) : (
        <>
          <Slider label={tr("Kích cỡ", "Size")} value={selectedItem.size} min={SIZE_LIMITS[selected.kind][0]} max={SIZE_LIMITS[selected.kind][1]} onStart={() => checkpoint()} onChange={(size) => updateSelected({ size })} />
          {selected.kind === "sticker" && (
            <div><span className={fieldLabel}>{tr("Màu sticker", "Sticker color")}</span><ColorRow compact value={(selectedItem as unknown as { color: string }).color} name={tr("Màu sticker", "Sticker color")} onChange={(color) => { checkpoint(); updateSelected({ color }) }} /></div>
          )}
          {selected.kind === "logo" && selectedItem.src && (
            <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold"><WandSparkles size={14} className="text-[var(--lime)]" /> {tr("Tách nền logo", "Remove logo background")}</span>
                {logoCutoutState[selected.id] && <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${logoCutoutState[selected.id] === "cutout" ? "bg-[var(--lime)] text-white" : "bg-white/10 text-white/60"}`}>{logoCutoutState[selected.id] === "cutout" ? tr("Đã tách", "Removed") : tr("Ảnh gốc", "Original")}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold uppercase text-white/50">
                <figure className="m-0 grid gap-1"><span className="mx-auto block aspect-square w-full max-w-[120px] rounded-lg border border-white/10 bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${selectedLogoSource?.preview ?? selectedItem.src})` }} />{tr("Ảnh gốc", "Original")}</figure>
                <figure className="m-0 grid gap-1"><span className="mx-auto block aspect-square w-full max-w-[120px] rounded-lg border border-white/10 bg-[length:10px_10px] bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)]"><span className="block size-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${selectedItem.src})` }} /></span>{tr("Đang dùng", "In use")}</figure>
              </div>
              <Slider label={tr("Độ nhạy", "Sensitivity")} value={logoTolerance} min={20} max={140} step={5} onChange={setLogoTolerance} />
              <div className={`grid gap-1.5 ${selectedLogoSource ? "grid-cols-2" : ""}`}>
                <button type="button" className={primaryButton} disabled={uploading} onClick={removeLogoBackground}><WandSparkles size={13} /> {logoCutoutState[selected.id] === "cutout" ? tr("Tách lại", "Run again") : tr("Tách nền", "Remove bg")}</button>
                {selectedLogoSource && <button type="button" className={ghostButton} disabled={uploading || logoCutoutState[selected.id] === "original"} onClick={restoreOriginalLogo}><RotateCcw size={13} /> {tr("Logo gốc", "Original")}</button>}
              </div>
            </div>
          )}
        </>
      )}
      <p className="m-0 text-[10px] leading-4 text-white/45">{tr("Kéo trực tiếp trên áo để đổi vị trí. Bấm “Xong” để quay lại công cụ.", "Drag on the shirt to move it. Tap “Done” to go back to the tools.")}</p>
    </Pane>
  ) : null

  return (
    <div className="pb-20 [--hdr:76px] max-[900px]:[--hdr:64px] max-[720px]:[--hdr:62px]">
      <Suspense fallback={null}>
        <RequestLinkWatcher onOpen={openRequestFromLink} />
      </Suspense>

      <div id="studio" className="mx-auto w-full scroll-mt-[var(--hdr)] md:w-[min(1560px,calc(100%-32px))] md:pt-4 lg:w-[min(1560px,calc(100%-48px))]">
        {/* Header bar — one compact row on every screen size. */}
        <section className="flex h-14 items-center gap-2 border-b border-white/[.08] bg-[#0b1222] px-3 text-white md:h-16 md:gap-3 md:rounded-t-2xl md:border md:px-4">
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-[var(--lime)] md:grid"><Shirt size={19} /></span>
          <label className="min-w-0 flex-1">
            <small className="block truncate text-[9px] font-extrabold uppercase tracking-[.16em] text-white/45"><span className="max-sm:hidden">BOAI Design Lab · </span>{tr("Tên thiết kế", "Design name")}</small>
            <input className="w-full truncate bg-transparent py-0.5 font-[family-name:var(--display)] text-base font-extrabold uppercase leading-[1.25] text-white outline-none md:text-xl" maxLength={80} value={designName} onChange={(event) => setDesignName(event.target.value)} />
          </label>
          <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-white/50 xl:flex"><Check size={13} className="text-emerald-400" /> {tr("Tự lưu nháp trên máy", "Draft autosaved")}</span>
          {authenticated && designs.length > 0 && (
            <button type="button" className={`${ghostButton} max-sm:px-2.5 ${showDesigns ? "border-[var(--lime)] text-white" : ""}`} aria-expanded={showDesigns} onClick={() => setShowDesigns(!showDesigns)} title={tr("Thiết kế đã lưu", "Saved designs")}>
              <FolderOpen size={15} /> <span className="max-sm:hidden">{tr("Đã lưu", "Saved")}</span> <span className="tabular-nums text-white/50">{designs.length}</span>
            </button>
          )}
          {authenticated ? (
            <button type="button" className={`${ghostButton} max-sm:px-2.5`} disabled={cloudPending} onClick={saveToAccount} aria-label={tr("Lưu thiết kế", "Save")} title={tr("Lưu thiết kế", "Save")}><Save size={15} /> <span className="max-sm:hidden">{cloudPending ? tr("Đang lưu…", "Saving…") : tr("Lưu thiết kế", "Save")}</span></button>
          ) : (
            <a className={`${ghostButton} max-sm:px-2.5`} href="/dang-nhap" aria-label={tr("Đăng nhập để lưu", "Sign in to save")} title={tr("Đăng nhập để lưu", "Sign in to save")}><Save size={15} /> <span className="max-sm:hidden">{tr("Đăng nhập để lưu", "Sign in to save")}</span></a>
          )}
          <button type="button" className={`${ghostButton} max-sm:px-2.5`} onClick={downloadDesign} aria-label={tr("Tải ảnh", "Download")} title={tr("Tải ảnh", "Download")}><Download size={15} /> <span className="max-md:hidden">{tr("Tải ảnh", "Download")}</span></button>
          <a href="#gui-shop" className={`${primaryButton} h-9 px-3 md:h-10 md:px-4`}><Send size={15} /> <span className="sm:hidden">{tr("Báo giá", "Quote")}</span><span className="max-sm:hidden">{tr("Gửi shop báo giá", "Get quotes")}</span></a>
        </section>

        {authenticated && designs.length > 0 && showDesigns && (
          <section className="flex gap-2 overflow-x-auto border-b border-white/[.08] bg-[#0b1222] px-3 py-2 md:border-x md:px-4" aria-label={tr("Thiết kế đã lưu", "Saved designs")}>
            {designs.map((design) => (
              <div key={design.id} className={`flex min-w-[240px] items-center gap-1.5 rounded-xl border p-1.5 text-white ${currentDesignId === design.id ? "border-[var(--lime)]" : "border-white/10"}`}>
                <button type="button" className="min-w-0 flex-1 px-1 text-left" disabled={cloudPending} onClick={() => openDesign(design.id)}>
                  <b className="block truncate text-xs">{design.name}</b>
                  <small className="text-[10px] text-white/45">{new Date(design.updatedAt).toLocaleDateString("vi-VN")}</small>
                </button>
                {[
                  [FolderOpen, tr("Mở", "Open"), () => openDesign(design.id)],
                  [Type, tr("Đổi tên", "Rename"), () => renameDesign(design.id, design.name)],
                  [Copy, tr("Nhân bản", "Duplicate"), () => duplicateDesign(design.id)],
                  [Trash2, tr("Xóa", "Delete"), () => removeDesign(design.id)],
                ].map(([Icon, label, action]) => {
                  const I = Icon as typeof Copy
                  return <button key={label as string} type="button" className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" title={label as string} aria-label={label as string} onClick={action as () => void}><I size={14} /></button>
                })}
              </div>
            ))}
          </section>
        )}

        {/*
          Workspace sized to exactly one screen. Phones: canvas on top, tool tabs, then the tool panel —
          all visible together. Tablet/desktop: tool rail + tool panel sit right beside the canvas.
          Long lists scroll inside the panel, never the page.
        */}
        <div className="flex h-[max(520px,calc(100dvh_-_var(--hdr)_-_56px))] flex-col gap-px overflow-clip bg-white/[.06] md:grid md:h-[clamp(560px,calc(100dvh_-_var(--hdr)_-_96px),980px)] md:grid-cols-[64px_300px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:rounded-b-2xl md:border md:border-t-0 md:border-white/[.08] lg:grid-cols-[72px_340px_minmax(0,1fr)] 2xl:grid-cols-[76px_380px_minmax(0,1fr)]">
          {/* Tool rail */}
          <div className="order-2 flex shrink-0 overflow-x-auto bg-[#0b1222] text-white [scrollbar-width:none] md:order-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:py-2" role="tablist" aria-label={tr("Công cụ thiết kế", "Design tools")}>
            {tabs.map(([value, name, Icon]) => {
              const active = tab === value && !editing
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => { setTab(value); setSelected(null); if (value !== "draw") setTool("select") }}
                  className={`relative flex min-w-[46px] flex-1 flex-col items-center gap-1 px-0.5 py-2 text-[10px] font-bold transition md:mx-1.5 md:flex-none md:rounded-xl md:py-2 ${active ? "text-white md:bg-white/[.08]" : tab === value ? "text-white/80" : "text-white/50 hover:text-white md:hover:bg-white/[.04]"}`}
                >
                  <Icon size={17} />
                  <span className="whitespace-nowrap leading-tight">{name}</span>
                  {tab === value && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-[var(--lime)] md:top-2 md:bottom-2 md:-left-1.5 md:right-auto md:h-auto md:w-[3px]" />}
                </button>
              )
            })}
          </div>

          {/* Tool panel — right next to the canvas. */}
          <aside className="order-3 flex min-h-0 min-w-0 flex-[1_1_54%] flex-col bg-[#0d1527] text-white md:order-2">
            <header className={`h-10 shrink-0 items-center justify-between gap-2 border-b border-white/[.08] px-3 md:flex md:h-11 md:px-4 ${editing ? "flex" : "hidden"}`}>
              {editing ? (
                <>
                  <button type="button" className="inline-flex min-w-0 items-center gap-0.5 text-xs font-bold text-white/60 hover:text-white" onClick={() => setSelected(null)}>
                    <ChevronLeft size={16} className="shrink-0" /> <span className="truncate">{activeTabName}</span>
                  </button>
                  <h2 className="m-0 truncate text-[13px] font-extrabold">{selectedTitle}</h2>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" className="grid size-8 place-items-center rounded-lg border border-white/10 text-red-300 hover:border-red-300/50" onClick={deleteSelected} aria-label={tr("Xóa", "Delete")} title={tr("Xóa", "Delete")}><Trash2 size={14} /></button>
                    <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--lime)] px-2.5 text-[11px] font-extrabold" onClick={() => setSelected(null)}><Check size={13} /> {tr("Xong", "Done")}</button>
                  </span>
                </>
              ) : (
                <>
                  <h2 className="m-0 flex items-center gap-2 text-sm font-extrabold"><ActiveTabIcon size={15} className="text-[var(--lime)]" /> {activeTabName}</h2>
                  <span className="truncate rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-bold text-white/60">{garmentName(garment)} · {sideName(activeSide)}</span>
                </>
              )}
            </header>

            {selectedPane}

            {!editing && tab === "template" && (
              <Pane
                footer={
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`${fieldLabel} mb-0`}>{tr("Màu sắc", "Colors")}</span>
                      <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-white/70"><input type="checkbox" className="size-3.5 accent-[var(--lime)]" checked={art.pants.enabled} onChange={(event) => togglePants(event.target.checked)} />{tr("May kèm quần", "Include shorts")}</label>
                    </div>
                    <ColorFields
                      fields={[
                        { key: "shirt", name: tr("Áo", "Shirt"), value: shirtColor, onOpen: () => showPart("shirt"), onChange: (color) => { setShirtColor(color); showPart("shirt") } },
                        { key: "pants", name: tr("Quần", "Shorts"), value: art.pants.color, onOpen: () => showPart("pants"), onChange: (color) => { setArt((cur) => ({ ...cur, pants: { ...cur.pants, color } })); showPart("pants") } },
                        { key: "trim", name: tr("Viền cổ", "Trim"), value: kit.trim, onOpen: () => showPart("shirt"), onChange: (trim) => { setKit({ trim }); showPart("shirt") } },
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["crew", "v"] as const).map((collar) => <button key={collar} type="button" className={chip(kit.collar === collar)} onClick={() => { checkpoint(); setKit({ collar }) }}>{collar === "crew" ? tr("Cổ tròn", "Crew neck") : tr("Cổ tim (V)", "V-neck")}</button>)}
                    </div>
                  </>
                }
              >
                <h2 className={`${sectionTitle} mb-0`}>{tr(`Chọn mẫu áo · ${KIT_TEMPLATES.length} mẫu`, `Choose a template · ${KIT_TEMPLATES.length}`)}</h2>
                <div className={`${galleryGrid} max-md:auto-cols-[76px] max-md:grid-rows-1 md:grid-cols-3`}>
                  {KIT_TEMPLATES.map((template) => {
                    const active = kit.template === template.id && !!art.kit
                    return (
                      <button
                        key={template.id}
                        type="button"
                        aria-pressed={active}
                        title={tr(template.vi, template.en)}
                        onClick={() => applyTemplate(template)}
                        className={`group relative overflow-hidden rounded-xl border bg-gradient-to-b from-[#1b2540] to-[#111a2e] p-1.5 text-left transition hover:-translate-y-0.5 ${active ? "border-[var(--lime)] shadow-[0_0_0_2px_var(--lime)]" : "border-white/10 hover:border-white/30"}`}
                      >
                        <GarmentSvg uid={`tpl-${template.id}`} garment="shirt" side="front" art={emptyArt()} color={template.base} kit={kitFromTemplate(template)} material="polyester" background={null} className="block aspect-[7/8] w-full" />
                        <small className="block truncate px-0.5 text-[10px] font-semibold text-white/70">{tr(template.vi, template.en)}</small>
                        {active && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-[var(--lime)]"><Check size={12} strokeWidth={3} /></span>}
                      </button>
                    )
                  })}
                </div>
              </Pane>
            )}

            {!editing && tab === "pattern" && (
              <Pane
                top={segmented(patternMode, [["preset", tr("Kiểu có sẵn", "Presets"), Palette], ["photo", tr("Ảnh của bạn", "Your photo"), ImagePlus]], setPatternMode)}
                footer={patternMode === "preset" ? (
                  <>
                    <ColorFields
                      fields={[
                        { key: "main", name: tr("Màu chính", "Main"), value: kit.patternColor, onOpen: () => showPart(patternPart), onChange: (patternColor) => { setKit({ patternColor, template: "custom" }); showPart(patternPart) } },
                        { key: "second", name: tr("Màu phụ", "Second"), value: kit.patternColor2, onOpen: () => showPart(patternPart), onChange: (patternColor2) => { setKit({ patternColor2, template: "custom" }); showPart(patternPart) } },
                      ]}
                    />
                    <Slider label={tr("Độ đậm", "Opacity")} value={Math.round(kit.patternOpacity * 100)} min={10} max={100} suffix="%" onStart={() => checkpoint()} onChange={(v) => setKit({ patternOpacity: v / 100 })} />
                    <Slider label={tr("Kích thước", "Scale")} value={kit.patternScale} min={0.5} max={2} step={0.05} suffix="×" onStart={() => checkpoint()} onChange={(patternScale) => setKit({ patternScale })} />
                    <label className="flex items-center gap-2 text-xs font-semibold text-white/80">
                      <input type="checkbox" className="size-4 accent-[var(--lime)]" checked={kit.pantsPattern} onChange={(event) => { checkpoint(); setKit({ pantsPattern: event.target.checked }) }} />
                      {tr("Phủ họa tiết lên cả quần", "Apply pattern to shorts")}
                    </label>
                  </>
                ) : undefined}
              >
                {patternMode === "preset" ? (
                  <>
                    <h2 className={`${sectionTitle} mb-0`}>{tr(`Họa tiết · ${PATTERN_IDS.length - 1} kiểu`, `Patterns · ${PATTERN_IDS.length - 1}`)}</h2>
                    <div className={`${galleryGrid} max-md:auto-cols-[74px] max-md:grid-rows-2 md:grid-cols-3 lg:grid-cols-4`}>
                      {PATTERN_IDS.map((id) => {
                        const active = kit.pattern === id
                        return (
                          <button key={id} type="button" aria-pressed={active} onClick={() => choosePattern(id)} title={tr(PATTERN_LABELS[id].vi, PATTERN_LABELS[id].en)}
                            className={`overflow-hidden rounded-lg border text-left transition hover:-translate-y-0.5 ${active ? "border-[var(--lime)] shadow-[0_0_0_2px_var(--lime)]" : "border-white/10 hover:border-white/30"}`}>
                            <svg viewBox="80 130 260 200" className="block aspect-[13/10] w-full" aria-hidden>
                              <rect x="0" y="0" width="420" height="480" fill={shirtColor} />
                              <g opacity={Math.max(0.5, kit.patternOpacity)}>
                                <KitPattern id={id} c1={kit.patternColor} c2={kit.patternColor2} scale={kit.patternScale} uid={`pt-${id}`} />
                              </g>
                            </svg>
                            <small className="block truncate bg-white/[.04] px-1.5 py-0.5 text-[9px] font-semibold text-white/75">{tr(PATTERN_LABELS[id].vi, PATTERN_LABELS[id].en)}</small>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="m-0 text-[11px] leading-5 text-white/55">{tr("Ảnh áo trên nền trơn sẽ được tách nền và dựng theo dáng áo; ảnh vân sẽ được lặp kín.", "Garment photos are cut out and fitted; textures are tiled.")}</p>
                    {current.pattern ? (
                      <div className="grid gap-2.5">
                        <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold uppercase text-white/50">
                          <figure className="m-0 grid gap-1">
                            <span className="mx-auto block aspect-square w-full max-w-[130px] rounded-lg border border-white/10 bg-white bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${patternSource?.preview ?? current.pattern.src})` }} />
                            {tr("Ảnh gốc", "Original")}
                          </figure>
                          <figure className="m-0 grid gap-1">
                            <span className="mx-auto block aspect-square w-full max-w-[130px] rounded-lg border border-white/10 bg-[length:12px_12px] bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)]">
                              <span className="block size-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${current.pattern.src})` }} />
                            </span>
                            {cutoutState[patternKey] === "cutout" ? tr("Đã tách nền", "Background removed") : tr("Đang dùng", "In use")}
                          </figure>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["garment", "tile"] as const).map((mode) => (
                            <button key={mode} type="button" className={chip((current.pattern?.mode ?? "tile") === mode)} onClick={() => { checkpoint(); setPattern({ mode }) }}>
                              {mode === "garment" ? tr("Theo dáng áo", "Fit garment") : tr("Lặp họa tiết", "Repeat")}
                            </button>
                          ))}
                        </div>
                        {current.pattern.mode !== "garment" && <Slider label={tr("Cỡ ô", "Tile")} value={current.pattern.scale} min={32} max={240} onStart={() => checkpoint()} onChange={(scale) => setPattern({ scale })} />}
                        <Slider label={tr("Độ đậm", "Opacity")} value={Math.round(current.pattern.opacity * 100)} min={10} max={100} suffix="%" onStart={() => checkpoint()} onChange={(v) => setPattern({ opacity: v / 100 })} />
                        <Slider label={tr("Độ nhạy tách", "Sensitivity")} value={cutTolerance} min={20} max={140} step={5} onChange={setCutTolerance} />
                        <div className="grid grid-cols-2 gap-1.5">
                          <button type="button" className={ghostButton} disabled={uploading} onClick={removeBackground}><WandSparkles size={13} /> {tr("Tách nền", "Remove bg")}</button>
                          <button type="button" className={ghostButton} disabled={uploading || !patternSource || cutoutState[patternKey] === "original"} onClick={restoreOriginal}><RotateCcw size={13} /> {tr("Ảnh gốc", "Original")}</button>
                          <button type="button" className={ghostButton} onClick={patternToOtherSide}>{tr("Dùng cho mặt kia", "Copy to other side")}</button>
                          <button type="button" className={`${ghostButton} text-red-300`} onClick={removePattern}><Trash2 size={13} /> {tr("Gỡ ảnh", "Remove")}</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="grid place-items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-8 text-center text-xs font-bold text-white/75 transition hover:border-[var(--lime)] hover:text-white disabled:opacity-50" disabled={uploading} onClick={() => patternInput.current?.click()}>
                        <Upload size={22} className="text-[var(--lime)]" />
                        {uploading ? tr("Đang xử lý…", "Processing…") : tr("Tải ảnh áo mẫu / họa tiết", "Upload photo / texture")}
                        <small className="font-semibold text-white/40">PNG · JPG · WebP</small>
                      </button>
                    )}
                  </>
                )}
              </Pane>
            )}

            {!editing && tab === "logo" && (
              <Pane
                top={segmented(logoMode, [["library", tr("Logo mẫu", "Crest library"), Shield], ["upload", tr("Tải logo lên", "Upload logo"), Upload]], setLogoMode)}
                footer={logoMode === "library" ? (
                  <>
                    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-2">
                      <label><span className={fieldLabel}>{tr("Viết tắt", "Initials")}</span><input className={darkInput} maxLength={4} value={crest.initials} onChange={(event) => setCrest({ ...crest, initials: event.target.value })} /></label>
                      <label><span className={fieldLabel}>{tr("Tên CLB", "Club name")}</span><input className={darkInput} maxLength={20} value={crest.name} onChange={(event) => setCrest({ ...crest, name: event.target.value })} /></label>
                    </div>
                    <ColorFields
                      fields={([["c1", tr("Nền", "Base")], ["c2", tr("Phụ", "Second")], ["accent", tr("Nhấn", "Accent")]] as const).map(([key, name]) => ({
                        key,
                        name,
                        value: crest[key],
                        onChange: (color: string) => setCrest({ ...crest, [key]: color }),
                      }))}
                    />
                  </>
                ) : undefined}
              >
                {logoMode === "library" ? (
                  <>
                    <h2 className={`${sectionTitle} mb-0`}>{tr(`${CREST_TEMPLATES.length} mẫu logo · bấm để thêm`, `${CREST_TEMPLATES.length} crests · tap to add`)}</h2>
                    <div className={`${galleryGrid} max-md:auto-cols-[68px] max-md:grid-rows-1 md:grid-cols-3 lg:grid-cols-4`}>
                      {crestPreviews.map(({ template, svg }) => (
                        <button key={template.id} type="button" onClick={() => void addCrest(svg)} className="rounded-lg border border-white/10 bg-white/[.03] p-1.5 transition hover:-translate-y-0.5 hover:border-[var(--lime)]" title={tr(template.vi, template.en)}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data preview */}
                          <img src={crestDataUrl(svg)} alt="" className="block aspect-square w-full" />
                          <small className="mt-0.5 block truncate text-[9px] text-white/60">{tr(template.vi, template.en)}</small>
                        </button>
                      ))}
                    </div>
                    <p className="m-0 text-[10px] leading-4 text-white/40">
                      {tr(
                        "Logo mẫu là thiết kế phong cách CLB do BOAI tạo. Logo chính thức của các CLB là thương hiệu đã đăng ký — nếu đội bạn có quyền dùng logo riêng, hãy chọn “Tải logo lên”.",
                        "Crests are club-style originals by BOAI. Official club logos are registered trademarks — if your team owns its logo, upload it instead.",
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <button type="button" className="grid place-items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-7 text-center text-xs font-bold text-white/75 transition hover:border-[var(--lime)] hover:text-white disabled:opacity-50" disabled={uploading} onClick={() => logoInput.current?.click()}>
                      <Upload size={22} className="text-[var(--lime)]" />
                      {uploading ? tr("Đang xử lý ảnh…", "Processing…") : tr("Chọn ảnh logo", "Choose logo image")}
                      <small className="font-semibold text-white/40">{tr("Tự động tách nền trơn", "Plain backgrounds removed automatically")}</small>
                    </button>
                    <Slider label={tr("Độ nhạy tách", "Sensitivity")} value={logoTolerance} min={20} max={140} step={5} onChange={setLogoTolerance} />
                    <ol className="m-0 grid list-none gap-2 p-0 text-[11px] leading-5 text-white/60">
                      <li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">1</span>{tr("Chọn ảnh, cắt sát logo nhưng chừa chút nền xung quanh.", "Pick an image and crop around the logo, keeping some margin.")}</li>
                      <li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">2</span>{tr("Nền trơn được tách tự động, logo đặt lên ngực áo.", "The plain background is removed automatically.")}</li>
                      <li className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold">3</span>{tr("Chưa sạch? Bấm vào logo trên áo, chỉnh độ nhạy rồi Tách lại.", "Not clean? Tap the logo, adjust sensitivity and run again.")}</li>
                    </ol>
                  </>
                )}
              </Pane>
            )}

            {!editing && tab === "text" && (
              <Pane top={segmented(textMode, [["names", tr("Tên đội & cầu thủ", "Team & player"), Shirt], ["custom", tr("Chữ tự do", "Free text"), Type]], setTextMode)}>
                {textMode === "names" ? (
                  <>
                    <div>
                      <label className="block"><span className={fieldLabel}>{tr("Tên đội · mặt trước", "Team name · front")}</span><input className={darkInput} maxLength={24} value={teamText?.text ?? ""} placeholder={tr("Để trống = không in", "Empty = none")} onChange={(event) => setRoleName("team", event.target.value)} /></label>
                      {teamText && roleControls("team", teamText)}
                    </div>
                    <div className="border-t border-white/[.08] pt-3">
                      <label className="block"><span className={fieldLabel}>{tr("Tên cầu thủ · mặt sau", "Player name · back")}</span><input className={darkInput} maxLength={24} value={playerText?.text ?? ""} placeholder={tr("Để trống = không in", "Empty = none")} onChange={(event) => setRoleName("player", event.target.value)} /></label>
                      {playerText && roleControls("player", playerText)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input className={`${darkInput} min-w-0 flex-1`} maxLength={24} value={textDraft} aria-label={tr("Nội dung chữ", "Text")} onChange={(event) => setTextDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addText()} />
                      <button type="button" className={`${primaryButton} shrink-0 px-3`} onClick={addText} title={`${tr("Thêm vào", "Add to")} ${garmentName(garment).toLowerCase()} · ${sideName(activeSide).toLowerCase()}`}><Plus size={15} /> {tr("Thêm", "Add")}</button>
                    </div>
                    {presetRow(textDraft, (style) => setTextStyle((s) => ({ ...s, ...style })))}
                    <TextStyleControls value={textStyle} onChange={(patch) => setTextStyle((s) => ({ ...s, ...patch }))} />
                    <details className="group rounded-xl border border-white/10">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-[11px] font-bold text-white/75 hover:text-white [&::-webkit-details-marker]:hidden">
                        {tr(`Xem mẫu ${JERSEY_FONTS.length} phông chữ`, `Browse ${JERSEY_FONTS.length} fonts`)}
                        <ChevronDown size={14} className="transition group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-white/10 p-2">
                        <FontPicker value={textStyle.font} sample={textDraft} onChange={(font) => setTextStyle((s) => ({ ...s, font }))} />
                      </div>
                    </details>
                  </>
                )}
              </Pane>
            )}

            {!editing && tab === "number" && (
              <Pane
                top={
                  <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
                    <input className={`${darkInput} h-[68px] text-center text-3xl! font-black`} inputMode="numeric" maxLength={3} value={numberText?.text ?? ""} placeholder="10" aria-label={tr("Số áo", "Number")} style={{ fontFamily: fontStack(numberText?.font ?? "graduate") }} onChange={(event) => setNumber(event.target.value)} />
                    <div className="grid gap-1.5">
                      {(["front", "back"] as const).map((side) => {
                        const on = !!roleText("number", side)
                        return <button key={side} type="button" className={`${chip(on)} text-left`} onClick={() => toggleNumberSide(side)}>{on ? <Check size={12} className="mr-1 inline" /> : <Plus size={12} className="mr-1 inline" />}{side === "front" ? tr("Số mặt trước", "Front number") : tr("Số mặt sau", "Back number")}</button>
                      })}
                    </div>
                  </div>
                }
                footer={numberText ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={`${fieldLabel} mb-0`}>{tr("Màu & viền số", "Color & outline")}</span>
                      <button type="button" className={chip(!!numberText.outline)} onClick={() => { checkpoint(); patchRole("number", { outline: numberText.outline ? undefined : "#111111", outlineWidth: numberText.outlineWidth ?? 4 }) }}>{tr("Viền", "Outline")}: {numberText.outline ? tr("Bật", "On") : tr("Tắt", "Off")}</button>
                    </div>
                    <ColorFields
                      fields={[
                        { key: "color", name: tr("Màu số", "Number"), value: numberText.color, onOpen: () => showPart("shirt"), onChange: (color) => { checkpoint(); patchRole("number", { color }); showPart("shirt") } },
                        ...(numberText.outline ? [{ key: "outline", name: tr("Màu viền", "Outline"), value: numberText.outline, onOpen: () => showPart("shirt"), onChange: (outline: string) => { checkpoint(); patchRole("number", { outline }); showPart("shirt") } }] : []),
                      ]}
                    />
                    {numberText.outline && <Slider label={tr("Độ dày viền", "Outline")} value={numberText.outlineWidth ?? 4} min={1} max={12} onStart={() => checkpoint()} onChange={(outlineWidth) => patchRole("number", { outlineWidth })} />}
                  </>
                ) : undefined}
              >
                {numberText ? (
                  <div>
                    <span className={fieldLabel}>{tr("Font số", "Number font")}</span>
                    <FontPicker value={numberText.font ?? "graduate"} sample={numberText.text} groups={["number", "sport", "classic"]} maxHeight="max-md:max-h-[188px] md:max-h-none md:overflow-visible" onChange={(font) => { checkpoint(); patchRole("number", { font }) }} />
                  </div>
                ) : (
                  <p className="m-0 text-xs text-white/55">{tr("Nhập số áo ở trên để bắt đầu.", "Type a number above to start.")}</p>
                )}
                <p className="m-0 text-[10px] leading-4 text-white/45">{tr("Kéo số trên áo để đổi vị trí; bấm vào số để chỉnh cỡ riêng từng mặt.", "Drag the number to move it; tap it to resize per side.")}</p>
              </Pane>
            )}

            {!editing && tab === "draw" && (
              <Pane>
                <div className="grid grid-cols-3 gap-1.5">
                  {([["select", tr("Chọn & kéo", "Select"), MousePointer2], ["draw", tr("Vẽ tay", "Draw"), Pencil], ["erase", tr("Tẩy nét", "Erase"), Eraser]] as const).map(([value, name, Icon]) => (
                    <button key={value} type="button" className={`${chip(tool === value)} flex flex-col items-center gap-1 py-2.5`} aria-pressed={tool === value} onClick={() => { setTool(value); setCursor(null) }}><Icon size={16} />{name}</button>
                  ))}
                </div>
                <div>
                  <span className={fieldLabel}>{tr("Màu vẽ & sticker", "Draw & sticker color")}</span>
                  <ColorRow
                    compact
                    value={printColor}
                    name={tr("Màu in", "Print color")}
                    onChange={(color) => {
                      setPrintColor(color)
                      // Recolor the selected sticker too, so the canvas follows the palette.
                      if (selected?.kind === "sticker") {
                        checkpoint()
                        updateSelected({ color })
                      }
                    }}
                  />
                </div>
                {tool === "draw" && <Slider label={tr("Độ dày nét", "Brush")} value={brushSize} min={2} max={24} onChange={setBrushSize} />}
                {tool === "erase" && <Slider label={tr("Cỡ tẩy", "Eraser")} value={eraserSize} min={6} max={48} onChange={setEraserSize} />}
                <div>
                  <span className={fieldLabel}>Sticker</span>
                  <div className="grid grid-cols-4 gap-2">
                    {STICKERS.map(([kind, Icon]) => (
                      <button key={kind} type="button" className="grid aspect-square max-h-16 w-full place-items-center rounded-xl border border-white/10 bg-white/[.04] transition hover:border-[var(--lime)]" aria-label={`${tr("Thêm sticker", "Add sticker")} ${kind}`} onClick={() => addSticker(kind)}><Icon size={22} /></button>
                    ))}
                  </div>
                </div>
              </Pane>
            )}

            {!editing && tab === "layers" && (
              <Pane footer={<button type="button" className={`${ghostButton} w-full text-red-300`} onClick={clearSide}><Trash2 size={14} /> {tr("Xóa toàn bộ chi tiết mặt này", "Clear everything on this side")}</button>}>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {layerRows.map((row) => (
                    <li key={row.key} className="flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-xs hover:bg-white/[.04]">
                      <span className="grid size-6 shrink-0 place-items-center text-white/60">{row.icon}</span>
                      <button type="button" className={`min-w-0 flex-1 truncate text-left ${row.hidden ? "text-white/35 line-through" : "text-white/85"}`} disabled={!row.kind} onClick={() => row.kind && setSelected({ garment, side: activeSide, kind: row.kind, id: row.id! })}>{row.label}</button>
                      {row.kind && (
                        <>
                          <button type="button" className="grid size-7 place-items-center rounded text-white/50 hover:text-white disabled:opacity-20" disabled={row.first} aria-label={tr("Đưa lên trên", "Bring forward")} onClick={() => moveLayer(row.kind!, row.id!, 1)}><ArrowUp size={13} /></button>
                          <button type="button" className="grid size-7 place-items-center rounded text-white/50 hover:text-white disabled:opacity-20" disabled={row.last} aria-label={tr("Đưa xuống dưới", "Send backward")} onClick={() => moveLayer(row.kind!, row.id!, -1)}><ArrowDown size={13} /></button>
                        </>
                      )}
                      {(row.kind || row.onToggle) && (
                        <button type="button" className="grid size-7 place-items-center rounded text-white/50 hover:text-white" aria-label={row.hidden ? tr("Hiện", "Show") : tr("Ẩn", "Hide")} onClick={() => (row.kind ? toggleHidden(row.kind, row.id!) : row.onToggle?.())}>{row.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                      )}
                      <button type="button" className="grid size-7 place-items-center rounded text-white/50 hover:text-red-300" aria-label={tr("Xóa layer", "Delete layer")} onClick={() => (row.kind ? removeItem(garment, activeSide, row.kind, row.id!) : row.onDelete?.())}><Trash2 size={13} /></button>
                    </li>
                  ))}
                  <li className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-white/60">
                    <span className="grid size-6 place-items-center"><span className="size-4 rounded-full border border-white/30" style={{ background: canvasColor }} /></span>
                    {garment === "shirt" ? tr("Áo nền", "Base shirt") : tr("Quần nền", "Base shorts")}
                  </li>
                </ul>
                <p className="m-0 text-[10px] leading-4 text-white/45">{tr("Bấm tên một lớp để chỉnh. Mũi tên đổi thứ tự trên/dưới.", "Tap a layer to edit it. Arrows change stacking order.")}</p>
              </Pane>
            )}

            {!editing && tab === "order" && (
              <Pane
                footer={
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <a href="#gui-shop" className={`${primaryButton} w-full`}><Send size={15} /> {tr("Gửi shop báo giá", "Get quotes")}</a>
                    <button type="button" className={ghostButton + " h-10"} onClick={downloadDesign} aria-label={tr("Tải ảnh thiết kế (PNG)", "Download design (PNG)")} title={tr("Tải ảnh thiết kế (PNG)", "Download design (PNG)")}><Download size={15} /> PNG</button>
                  </div>
                }
              >
                <div className="flex items-center gap-3 rounded-xl bg-white/[.04] p-2">
                  <KitPreview uid="live" side={previewSide} art={art} shirtColor={shirtColor} material={material} showPants={art.pants.enabled} className="w-20 shrink-0" />
                  <div className="grid flex-1 gap-1.5">
                    <div className="flex gap-1">
                      {(["front", "back"] as const).map((side) => <button key={side} type="button" className={chip(previewSide === side)} onClick={() => setPreviewSide(side)}>{side === "front" ? tr("Trước", "Front") : tr("Sau", "Back")}</button>)}
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-white/75"><input type="checkbox" className="size-3.5 accent-[var(--lime)]" checked={art.pants.enabled} onChange={(event) => togglePants(event.target.checked)} />{tr("May kèm quần", "Include shorts")}</label>
                  </div>
                </div>
                <div>
                  <span className={fieldLabel}>{tr("Chất liệu", "Material")}</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(MATERIAL_LABELS) as Material[]).map((value) => (
                      <button key={value} type="button" aria-pressed={material === value} onClick={() => setMaterial(value)}
                        className={`rounded-lg border p-2 text-left transition ${material === value ? "border-[var(--lime)] bg-[var(--lime)]/10" : "border-white/10 hover:border-white/30"}`}>
                        <b className="block text-[11px] leading-4">{tr(MATERIAL_LABELS[value].vi, MATERIAL_LABELS[value].en)}</b>
                        <small className="block text-[9px] text-white/45">{tr(MATERIAL_HINTS[value].vi, MATERIAL_HINTS[value].en)}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={fieldLabel}>Size</span>
                  <div className="grid grid-cols-5 gap-1">
                    {JERSEY_SIZES.map(({ size }) => <button key={size} type="button" aria-pressed={jerseySize === size} className={chip(jerseySize === size)} onClick={() => setJerseySize(size)}>{size}</button>)}
                  </div>
                  {(() => {
                    const row = JERSEY_SIZES.find((item) => item.size === jerseySize)!
                    return <p className="m-0 mt-2 text-[10px] text-white/50">{tr(`Ngang ngực ${row.chest} cm · dài áo ${row.length} cm (đo phẳng)`, `Chest ${row.chest} cm · length ${row.length} cm (flat)`)}</p>
                  })()}
                </div>
              </Pane>
            )}
            <input ref={patternInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadPattern} />
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo} />
            {cropper}
          </aside>

          {/* Canvas */}
          <section ref={stageRef} className="relative order-1 flex min-h-0 flex-[1_1_46%] flex-col bg-[radial-gradient(ellipse_at_50%_30%,#f8fafc_0%,#e2e8f0_55%,#cbd5e1_100%)] md:order-3">
            <div className="flex shrink-0 items-center justify-center gap-2 p-2 md:p-3">
              <div className="flex rounded-full bg-[#0b1222] p-0.5 shadow-lg md:p-1" role="tablist" aria-label={tr("Trang phục", "Garment")}>
                {(["shirt", "pants"] as const).map((g) => (
                  <button key={g} type="button" role="tab" aria-selected={garment === g} onClick={() => switchView(g, activeSide)}
                    className={`rounded-full px-3.5 py-1 text-[11px] font-extrabold transition md:px-4 md:py-1.5 md:text-xs ${garment === g ? "bg-[var(--lime)] text-white" : "text-white/65 hover:text-white"}`}>{garmentName(g)}</button>
                ))}
              </div>
              <div className="flex rounded-full bg-white p-0.5 shadow-lg md:p-1" role="tablist" aria-label={tr("Mặt", "Side")}>
                {(["front", "back"] as const).map((side) => (
                  <button key={side} type="button" role="tab" aria-selected={activeSide === side} onClick={() => switchView(garment, side)}
                    className={`rounded-full px-4 py-1 text-[11px] font-extrabold transition md:px-5 md:py-1.5 md:text-xs ${activeSide === side ? "bg-[#0b1222] text-white" : "text-slate-600 hover:text-slate-900"}`}>{side === "front" ? tr("Trước", "Front") : tr("Sau", "Back")}</button>
                ))}
              </div>
            </div>
            {garment === "pants" && !art.pants.enabled && (
              <p className="mx-2 mb-1 mt-0 flex shrink-0 flex-wrap items-center justify-between gap-x-2 rounded-xl border border-dashed border-[var(--lime)] bg-white/90 px-3 py-1 text-[11px] text-slate-700 md:mx-3 md:text-xs">
                {tr("Quần chưa nằm trong đơn may.", "Shorts aren't in the order yet.")}
                <button type="button" className="font-bold text-[var(--lime-dark)]" onClick={() => togglePants(true)}>{tr("Đặt may kèm quần", "Include shorts")}</button>
              </p>
            )}
            <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto px-2 md:px-3">
              <div className="aspect-[7/8] h-full max-w-full origin-top transition-transform duration-200 [perspective:1400px]" style={{ transform: `scale(${zoom})` }}>
                <div key={`${garment}-${activeSide}`} className="jersey-flip size-full">
                  <GarmentSvg
                    uid="canvas"
                    svgRef={canvasRef}
                    garment={garment}
                    side={activeSide}
                    art={current}
                    kit={art.kit}
                    color={canvasColor}
                    material={material}
                    selected={selected}
                    printArea={selected && selected.garment === garment && selected.side === activeSide ? printAreaPath(garment, activeSide, art.kit?.collar ?? "crew") : null}
                    background={null}
                    className={`block size-full touch-none select-none drop-shadow-[0_30px_34px_rgba(15,23,42,.28)] ${tool === "draw" ? "cursor-crosshair" : tool === "erase" ? "cursor-none" : ""}`}
                    onPointerDown={handleCanvasDown}
                    onPointerMove={handleCanvasMove}
                    onPointerUp={endPointer}
                    onPointerLeave={() => setCursor(null)}
                    onSelect={handleSelect}
                    overlay={
                      <>
                        {tool === "erase" && cursor && <circle cx={cursor.x} cy={cursor.y} r={eraserSize} fill="rgba(255,255,255,.35)" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3" pointerEvents="none" />}
                        {flash?.garment === garment && (
                          <path key={flash.key} d={garment === "shirt" ? JERSEY_PATH : PANTS_PATH} fill="none" stroke="var(--lime)" strokeWidth="6" strokeLinejoin="round" pointerEvents="none" className="studio-flash" />
                        )}
                      </>
                    }
                  />
                </div>
              </div>
            </div>
            {/* Mini view of the opposite side so both faces stay in sight; tap to flip. */}
            <button
              type="button"
              onClick={() => switchView(garment, otherSide)}
              className="absolute right-2 top-12 z-10 w-14 rounded-xl border border-white bg-white/80 p-1 shadow-lg backdrop-blur transition hover:-translate-y-0.5 md:right-3 md:top-16 md:w-24 md:p-1.5"
              title={tr(`Xem ${sideName(otherSide).toLowerCase()}`, `View ${sideName(otherSide).toLowerCase()}`)}
            >
              <GarmentSvg uid="mini" garment={garment} side={otherSide} art={sideOf(art, garment, otherSide)} kit={art.kit} color={canvasColor} material={material} background={null} className="pointer-events-none block aspect-[7/8] w-full" />
              <small className="block text-center text-[8px] font-extrabold uppercase tracking-wide text-slate-600 md:text-[9px]">{sideName(otherSide)}</small>
            </button>
            <div className="flex shrink-0 items-center justify-center gap-1 p-2 md:gap-1.5 md:p-3">
              <div className="flex items-center gap-0.5 rounded-full bg-white px-1 py-0.5 shadow-lg md:gap-1 md:px-2 md:py-1">
                <ZoomIn size={15} className="ml-1 text-slate-500 max-md:hidden" />
                <button type="button" className="grid size-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100" aria-label={tr("Thu nhỏ", "Zoom out")} onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}><Minus size={15} /></button>
                <button type="button" className="w-11 text-center text-xs font-bold tabular-nums text-slate-700" onClick={() => setZoom(1)} title={tr("Về 100%", "Reset")}>{Math.round(zoom * 100)}%</button>
                <button type="button" className="grid size-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100" aria-label={tr("Phóng to", "Zoom in")} onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 10) / 10))}><Plus size={15} /></button>
              </div>
              <button type="button" className="grid size-9 place-items-center rounded-full bg-white text-slate-700 shadow-lg hover:text-slate-950 md:size-10" aria-label={tr("Toàn màn hình", "Fullscreen")} title={tr("Toàn màn hình", "Fullscreen")} onClick={toggleFullscreen}><Maximize2 size={16} /></button>
              <span className="mx-0.5 h-6 w-px bg-slate-300 max-md:hidden" />
              <button type="button" className="inline-flex size-9 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-bold text-slate-700 shadow-lg disabled:opacity-40 md:size-auto md:h-10 md:px-3 xl:px-4" disabled={!history.current.length} onClick={undo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={15} /> <span className="hidden xl:inline">Undo</span></button>
              <button type="button" className="inline-flex size-9 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-bold text-slate-700 shadow-lg disabled:opacity-40 md:size-auto md:h-10 md:px-3 xl:px-4" disabled={!future.current.length} onClick={redo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /> <span className="hidden xl:inline">Redo</span></button>
              <button type="button" className="inline-flex size-9 items-center justify-center gap-1.5 rounded-full bg-white text-xs font-bold text-slate-700 shadow-lg md:size-auto md:h-10 md:px-3 xl:px-4" onClick={clearSide} aria-label={tr("Xóa mặt này", "Clear side")} title={tr("Xóa mặt này", "Clear side")}><Trash2 size={15} /> <span className="hidden xl:inline">{tr("Xóa mặt này", "Clear side")}</span></button>
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto w-[min(1560px,calc(100%-24px))] lg:w-[min(1560px,calc(100%-48px))]">
        <SendToShops
          shops={shops}
          authenticated={authenticated}
          profile={profile}
          design={{ id: currentDesignId, name: designName, draft }}
          onSent={(designId) => {
            setCurrentDesignId(designId)
            startCloudTransition(async () => {
              await refreshDesigns()
              document.getElementById("yeu-cau")?.scrollIntoView({ behavior: "smooth", block: "start" })
            })
          }}
        />

        <MyRequests requests={requests} onChanged={() => startCloudTransition(refreshDesigns)} openId={openRequest} onOpen={setOpenRequest} />
      </div>

      {/* Off-screen copies of every side, used only for PNG export. */}
      <div className="pointer-events-none fixed -left-[10000px] top-0 w-[420px]" aria-hidden>
        {exportViews.map(([g, side]) => (
          <GarmentSvg
            key={`${g}-${side}`}
            uid={`export-${g}-${side}`}
            svgRef={(node) => { exportRefs.current[`${g}-${side}`] = node }}
            garment={g}
            side={side}
            art={sideOf(art, g, side)}
            kit={art.kit}
            color={g === "shirt" ? shirtColor : art.pants.color}
            material={material}
          />
        ))}
      </div>
    </div>
  )
}
