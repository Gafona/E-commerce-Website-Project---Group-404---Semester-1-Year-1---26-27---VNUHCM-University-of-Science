"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeOff, ImagePlus, Loader2, Shuffle, Trash2, Upload, X } from "lucide-react"
import { SITE_IMAGE_PLACEMENTS, type SiteImagePlacement } from "@/lib/site-image-placements"
import {
  deleteSiteImageAction,
  updateSiteImageAction,
  uploadSiteImageAction,
  type AdminResult,
} from "./actions"
import { btn } from "./AdminControls"
import { ASPECTS, setInputFiles, useImageCropper } from "../components/ImageCropper"

export type ManagedImage = {
  id: string
  title: string
  url: string
  objectPosition: string
  placements: SiteImagePlacement[]
  active: boolean
  credit: string | null
}

const input =
  "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[#1677ff]"
const label = "grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<AdminResult | null>(null)
  const run = (action: () => Promise<AdminResult>, onOk?: () => void) =>
    start(async () => {
      const res = await action().catch(() => ({ ok: false, error: "Mất kết nối. Vui lòng thử lại." }))
      setResult(res)
      if (res.ok) {
        onOk?.()
        router.refresh()
      }
    })
  return { pending, result, run }
}

function PlacementPicker({
  value,
  onChange,
  name,
}: {
  value: SiteImagePlacement[]
  onChange: (value: SiteImagePlacement[]) => void
  name?: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SITE_IMAGE_PLACEMENTS.map((p) => {
        const checked = value.includes(p.value)
        return (
          <label
            key={p.value}
            title={p.hint}
            className={`inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal transition ${checked ? "border-[#071a33] bg-[#071a33] text-white" : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#071a33]"}`}
          >
            <input
              type="checkbox"
              name={name}
              value={p.value}
              checked={checked}
              onChange={() => onChange(checked ? value.filter((v) => v !== p.value) : [...value, p.value])}
              className="sr-only"
            />
            {checked && <Check size={12} />}
            {p.label}
          </label>
        )
      })}
    </div>
  )
}

export function SiteImageUpload({ defaultPlacement }: { defaultPlacement?: SiteImagePlacement }) {
  const { pending, result, run } = useAction()
  const [placements, setPlacements] = useState<SiteImagePlacement[]>(defaultPlacement ? [defaultPlacement] : [])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const { cropFiles, cropper } = useImageCropper()
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        run(
          () => uploadSiteImageAction(data),
          () => {
            form.reset()
            setPreviews([])
          },
        )
      }}
      className="grid gap-4"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <label
          className="relative grid min-h-[180px] cursor-pointer place-items-center overflow-hidden border border-dashed border-[#9fb6d4] bg-[var(--soft-blue)] p-4 text-center transition hover:border-[#1677ff]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!fileInput.current || !e.dataTransfer.files.length) return
            fileInput.current.files = e.dataTransfer.files
            fileInput.current.dispatchEvent(new Event("change", { bubbles: true }))
          }}
        >
          <input
            ref={fileInput}
            type="file"
            name="files"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const input = e.target
              const picked = Array.from(input.files ?? []).slice(0, 6)
              if (!picked.length) return setPreviews([])
              const cropped = await cropFiles(picked, {
                title: "Cắt ảnh website",
                aspects: [ASPECTS.original, ASPECTS.wide, ASPECTS.landscape, ASPECTS.square, ASPECTS.portrait],
                maxOutput: 2600,
                maxBytes: 10 * 1024 * 1024,
              })
              if (!cropped) {
                input.value = ""
                return setPreviews([])
              }
              setInputFiles(input, cropped)
              setPreviews(cropped.map((f) => URL.createObjectURL(f)))
            }}
          />
          {cropper}
          {previews.length ? (
            <div className="grid w-full grid-cols-3 gap-1.5">
              {previews.map((src) => (
                // Local blob previews cannot go through the image loader.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-[4/3] w-full object-cover" />
              ))}
            </div>
          ) : (
            <span className="grid justify-items-center gap-2 text-[12px] text-[var(--muted)]">
              <span className="grid size-11 place-items-center bg-[var(--white)] text-[#1677ff]">
                <ImagePlus size={20} />
              </span>
              <b className="text-[13px] text-[var(--ink)]">Kéo thả hoặc bấm để chọn ảnh</b>
              JPG, PNG, WebP · tối đa 6 ảnh, mỗi ảnh 10 MB
            </span>
          )}
        </label>
        <div className="grid content-start gap-3">
          <label className={label}>
            Tên ảnh
            <input name="title" maxLength={120} placeholder="Ví dụ: Sân cỏ ban đêm" className={input} />
          </label>
          <div className={label}>
            Hiển thị ở
            <PlacementPicker name="placements" value={placements} onChange={setPlacements} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              Tác giả ảnh
              <input name="author" maxLength={120} placeholder="Không bắt buộc" className={input} />
            </label>
            <label className={label}>
              Liên kết nguồn
              <input name="sourceUrl" type="url" maxLength={500} placeholder="https://…" className={input} />
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className={`m-0 text-[12px] font-semibold ${result ? (result.ok ? "text-[#1d7a38]" : "text-[#a42626]") : "text-[var(--muted)]"}`}>
          {result ? (result.ok ? result.message : result.error) : "Ảnh được tối ưu tự động (WebP, tối đa 2400px)."}
        </p>
        <button disabled={pending} className={`${btn.base} ${btn.dark} min-h-9 px-5 text-[12px]`}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Tải lên
        </button>
      </div>
    </form>
  )
}

export function SiteImageCard({ image }: { image: ManagedImage }) {
  const { pending, result, run } = useAction()
  const [editing, setEditing] = useState(false)
  const [placements, setPlacements] = useState(image.placements)
  return (
    <article className={`group overflow-hidden border border-[var(--line)] bg-[var(--white)] ${image.active ? "" : "opacity-60"}`}>
      <div className="relative aspect-[4/3] bg-[#0b2348]">
        <Image
          src={image.url}
          alt={image.title}
          fill
          sizes="(max-width: 900px) 50vw, 260px"
          className="object-cover"
          style={{ objectPosition: image.objectPosition }}
        />
        {!image.active && (
          <span className="absolute top-2 left-2 bg-[#071a33] px-2 py-1 text-[9px] font-bold tracking-wider text-white uppercase">Đang ẩn</span>
        )}
      </div>
      <div className="grid gap-2 p-3">
        <div className="min-w-0">
          <b className="block truncate text-[12px]">{image.title}</b>
          {image.credit && <small className="block truncate text-[10px] text-[var(--muted)]">Ảnh: {image.credit}</small>}
        </div>
        {editing ? (
          <div className="grid gap-2">
            <PlacementPicker value={placements} onChange={setPlacements} />
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={pending}
                className={`${btn.base} ${btn.dark}`}
                onClick={() => run(() => updateSiteImageAction(image.id, { active: image.active, placements }), () => setEditing(false))}
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Lưu
              </button>
              <button
                type="button"
                className={`${btn.base} ${btn.ghost}`}
                onClick={() => {
                  setPlacements(image.placements)
                  setEditing(false)
                }}
              >
                <X size={13} /> Hủy
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={`${btn.base} ${btn.ghost}`} onClick={() => setEditing(true)}>
              <Shuffle size={13} /> Vị trí ({image.placements.length})
            </button>
            <button
              type="button"
              disabled={pending}
              className={`${btn.base} ${btn.ghost}`}
              onClick={() => run(() => updateSiteImageAction(image.id, { active: !image.active, placements: image.placements }))}
            >
              {image.active ? <EyeOff size={13} /> : <Eye size={13} />} {image.active ? "Ẩn" : "Hiện"}
            </button>
            <button
              type="button"
              disabled={pending}
              aria-label={`Xóa ${image.title}`}
              className={`${btn.base} ${btn.danger} px-2.5`}
              onClick={() => window.confirm(`Xóa vĩnh viễn ảnh “${image.title}”?`) && run(() => deleteSiteImageAction(image.id))}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {result && !result.ok && <p role="alert" className="m-0 text-[11px] font-semibold text-[#a42626]">{result.error}</p>}
      </div>
    </article>
  )
}
