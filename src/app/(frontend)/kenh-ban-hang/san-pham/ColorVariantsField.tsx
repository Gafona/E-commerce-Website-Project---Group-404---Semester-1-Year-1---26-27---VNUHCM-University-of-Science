"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { ImagePicker } from "./ImagePicker"

export const MAX_PRODUCT_COLORS = 12
export const MAX_COLOR_IMAGES = 4

export type ColorVariantValue = {
  id?: string
  name: string
  hex: string
  images: { id: string; url: string }[]
}

type Row = ColorVariantValue & { key: string }

const PRESETS = [
  { vi: "Đen", en: "Black", hex: "#111111" },
  { vi: "Trắng", en: "White", hex: "#f5f5f5" },
  { vi: "Xám", en: "Grey", hex: "#8a8f98" },
  { vi: "Đỏ", en: "Red", hex: "#d62828" },
  { vi: "Cam", en: "Orange", hex: "#f77f00" },
  { vi: "Vàng", en: "Yellow", hex: "#f2c94c" },
  { vi: "Xanh lá", en: "Green", hex: "#2a9d55" },
  { vi: "Xanh dương", en: "Blue", hex: "#1667e8" },
  { vi: "Xanh navy", en: "Navy", hex: "#14213d" },
  { vi: "Hồng", en: "Pink", hex: "#ff6fa8" },
  { vi: "Tím", en: "Purple", hex: "#7b4fd6" },
]

const HEX = /^#[0-9a-f]{6}$/i
let seq = 0
const newKey = () => `n${Date.now().toString(36)}${seq++}`

/**
 * Several colors per product, each with optional photos. Submits one `colorKey`
 * per row (in order) and `c-<key>:name`, `c-<key>:hex` plus that row's ImagePicker
 * fields under the same prefix.
 */
export function ColorVariantsField({ initial }: { initial?: ColorVariantValue[] }) {
  const { tr } = useShop()
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.length
      ? initial.map((c) => ({ ...c, key: c.id ? `e${c.id}` : newKey() }))
      : [{ key: newKey(), name: "", hex: "#111111", images: [] }],
  )
  const [hexDraft, setHexDraft] = useState<Record<string, string>>({})

  const update = (key: string, patch: Partial<Row>) =>
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <fieldset className="wide m-0 grid gap-3 border border-[var(--line)] p-4">
      <input type="hidden" name="colorsField" value="1" />
      <legend className="px-1 text-[10px] font-bold uppercase">
        {tr("Màu sắc", "Colors")} * · {rows.length}/{MAX_PRODUCT_COLORS}
      </legend>
      <p className="m-0 text-[11px] leading-5 text-[var(--muted)]">
        {tr(
          "Thêm từng màu của sản phẩm. Ảnh theo màu sẽ hiện khi khách bấm vào màu đó; để trống thì dùng ảnh sản phẩm chung.",
          "Add each color. Its photos show when a shopper picks that color; leave empty to use the main photos.",
        )}
      </p>
      {rows.map((row, index) => {
        const prefix = `c-${row.key}:`
        return (
          <div key={row.key} className="grid gap-3 border border-[var(--line)] bg-[var(--paper)] p-3">
            <input type="hidden" name="colorKey" value={row.key} />
            <div className="flex flex-wrap items-end gap-2">
              <label className="m-0 grid gap-1 text-[10px] font-bold uppercase">
                {tr("Mã màu", "Color code")}
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    name={`${prefix}hex`}
                    value={row.hex}
                    onChange={(e) => {
                      update(row.key, { hex: e.target.value })
                      setHexDraft((d) => ({ ...d, [row.key]: e.target.value }))
                    }}
                    aria-label={tr(`Chọn mã màu ${index + 1}`, `Pick color ${index + 1}`)}
                    className="h-10! w-12! shrink-0 cursor-pointer p-1!"
                  />
                  <input
                    value={hexDraft[row.key] ?? row.hex}
                    onChange={(e) => {
                      const value = e.target.value.trim()
                      setHexDraft((d) => ({ ...d, [row.key]: value }))
                      const hex = value.startsWith("#") ? value : `#${value}`
                      if (HEX.test(hex)) update(row.key, { hex: hex.toLowerCase() })
                    }}
                    maxLength={7}
                    aria-label={tr("Mã HEX", "HEX code")}
                    className="w-24! font-mono uppercase"
                    placeholder="#1667E8"
                  />
                </span>
              </label>
              <label className="m-0 grid min-w-40 flex-1 gap-1 text-[10px] font-bold uppercase">
                {tr("Tên màu", "Color name")}
                <input
                  name={`${prefix}name`}
                  value={row.name}
                  onChange={(e) => update(row.key, { name: e.target.value })}
                  maxLength={40}
                  required
                  placeholder={tr("VD: Xanh Soar", "e.g. Soar Blue")}
                />
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((cur) => cur.filter((r) => r.key !== row.key))}
                  className="grid h-10 w-10 cursor-pointer place-items-center border border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[var(--sale)] hover:text-[var(--sale)]"
                  aria-label={tr(`Xóa màu ${row.name || index + 1}`, `Remove color ${row.name || index + 1}`)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label={tr("Màu gợi ý", "Suggested colors")}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  title={tr(preset.vi, preset.en)}
                  onClick={() => {
                    update(row.key, {
                      hex: preset.hex,
                      name: row.name.trim() ? row.name : tr(preset.vi, preset.en),
                    })
                    setHexDraft((d) => ({ ...d, [row.key]: preset.hex }))
                  }}
                  className={`size-6 cursor-pointer rounded-full border-2 p-0 ${
                    row.hex.toLowerCase() === preset.hex ? "border-[var(--lime)]" : "border-white shadow-[0_0_0_1px_var(--line)]"
                  }`}
                  style={{ background: preset.hex }}
                  aria-label={tr(preset.vi, preset.en)}
                />
              ))}
            </div>
            <ImagePicker
              prefix={prefix}
              existing={row.images}
              max={MAX_COLOR_IMAGES}
              compact
              label={tr(`Ảnh màu ${row.name || index + 1} (tùy chọn)`, `Photos for ${row.name || `color ${index + 1}`} (optional)`)}
            />
          </div>
        )
      })}
      {rows.length < MAX_PRODUCT_COLORS && (
        <button
          type="button"
          onClick={() => setRows((cur) => [...cur, { key: newKey(), name: "", hex: "#f5f5f5", images: [] }])}
          className="inline-flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[var(--line)] bg-transparent py-3 text-xs font-bold text-[var(--ink)] hover:border-[var(--lime)] hover:text-[var(--lime-dark)]"
        >
          <Plus size={15} /> {tr("Thêm màu", "Add color")}
        </button>
      )}
    </fieldset>
  )
}
