"use client"

// Shared crop step for every image upload: pick a file, frame it, then hand the
// cropped File back to the caller's existing upload flow.

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, Crop, Minus, Plus, RotateCw, X } from "lucide-react"
import { useShop } from "./ShopProvider"

export type CropAspect = { vi: string; en: string; value: number | "original" }
export type CropOptions = {
  /** First entry is the default. */
  aspects?: CropAspect[]
  title?: string
  /** Circular guide for avatars (output stays square). */
  round?: boolean
  /** Longest output edge in px. */
  maxOutput?: number
  /** Keep output under this size; PNG falls back to JPEG when larger. */
  maxBytes?: number
}

export const ASPECTS = {
  square: { vi: "Vuông 1:1", en: "Square 1:1", value: 1 },
  landscape: { vi: "Ngang 4:3", en: "Landscape 4:3", value: 4 / 3 },
  portrait: { vi: "Dọc 3:4", en: "Portrait 3:4", value: 3 / 4 },
  wide: { vi: "Rộng 16:9", en: "Wide 16:9", value: 16 / 9 },
  banner: { vi: "Ảnh bìa 3:1", en: "Cover 3:1", value: 3 },
  story: { vi: "Story 9:16", en: "Story 9:16", value: 9 / 16 },
  original: { vi: "Tỷ lệ gốc", en: "Original", value: "original" },
} satisfies Record<string, CropAspect>

type Job = {
  file: File
  options: CropOptions
  step?: string
  resolve: (file: File | null | "original") => void
}

/** Replace an <input type="file">'s selection so native form posts send the cropped file. */
export function setInputFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) return
  const dt = new DataTransfer()
  for (const file of files) dt.items.add(file)
  input.files = dt.files
}

export function useImageCropper() {
  const [job, setJob] = useState<Job | null>(null)

  const open = useCallback(
    (file: File, options: CropOptions, step?: string) =>
      new Promise<File | null | "original">((resolve) =>
        setJob({ file, options, step, resolve }),
      ),
    [],
  )

  /** Resolves the cropped file, the original when the user skips, or null on cancel. */
  const cropImage = useCallback(
    async (file: File, options: CropOptions = {}) => {
      if (!file.type.startsWith("image/") || file.type === "image/gif") return file
      const result = await open(file, options)
      return result === "original" ? file : result
    },
    [open],
  )

  /** Crops several files one after another. Cancel aborts the whole batch. */
  const cropFiles = useCallback(
    async (files: File[], options: CropOptions = {}) => {
      const out: File[] = []
      const images = files.filter((f) => f.type.startsWith("image/"))
      let index = 0
      for (const file of files) {
        if (!file.type.startsWith("image/") || file.type === "image/gif") {
          out.push(file)
          continue
        }
        index++
        const step = images.length > 1 ? `${index}/${images.length}` : undefined
        const result = await open(file, options, step)
        if (result === null) return null
        out.push(result === "original" ? file : result)
      }
      return out
    },
    [open],
  )

  const cropper = job ? (
    <CropDialog
      key={job.file.name + job.file.size + job.file.lastModified + (job.step ?? "")}
      job={job}
      onDone={(result) => {
        job.resolve(result)
        setJob(null)
      }}
    />
  ) : null

  return { cropImage, cropFiles, cropper }
}

function CropDialog({
  job,
  onDone,
}: {
  job: Job
  onDone: (result: File | null | "original") => void
}) {
  const { tr } = useShop()
  const aspects = job.options.aspects?.length
    ? job.options.aspects
    : [ASPECTS.original, ASPECTS.square, ASPECTS.landscape, ASPECTS.portrait]
  const [source, setSource] = useState<Blob>(job.file)
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [aspectIndex, setAspectIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState({ x: 0, y: 0 })
  const [box, setBox] = useState({ w: 0, maxH: 420 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const imgRef = useRef<HTMLImageElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)

  // Open as a native modal so the cropper joins the browser's top layer. A
  // z-indexed overlay sits *behind* any parent <dialog> opened with
  // showModal() (e.g. the story composer) and is inert there.
  useEffect(() => {
    const el = dialogRef.current
    if (el && !el.open) el.showModal()
    return () => {
      if (el?.open) el.close()
    }
  }, [])

  // Read the file as a data URL: unlike blob URLs it can't be revoked out from
  // under the <img> by Strict Mode's mount → cleanup → mount cycle.
  useEffect(() => {
    let alive = true
    const reader = new FileReader()
    reader.onload = () => {
      if (alive && typeof reader.result === "string") setSrc(reader.result)
    }
    reader.onerror = () => {
      if (alive) setError(tr("Không đọc được ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP khác.", "Couldn't read this image. Try another JPG, PNG or WebP."))
    }
    reader.readAsDataURL(source)
    return () => {
      alive = false
      if (reader.readyState === FileReader.LOADING) reader.abort()
    }
  }, [source, tr])

  // An already-decoded image may finish before React attaches onLoad.
  useEffect(() => {
    const el = imgRef.current
    if (src && el?.complete && el.naturalWidth && !natural) {
      setNatural({ w: el.naturalWidth, h: el.naturalHeight })
      setCenter({ x: el.naturalWidth / 2, y: el.naturalHeight / 2 })
    }
  }, [src, natural])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () =>
      setBox({
        w: el.clientWidth,
        maxH: Math.max(220, Math.min(window.innerHeight * 0.56, 560)),
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const selected = aspects[aspectIndex]
  const ratio =
    selected.value === "original"
      ? natural
        ? natural.w / natural.h
        : 1
      : selected.value
  const frameW = Math.max(0, Math.min(box.w, box.maxH * ratio))
  const frameH = ratio ? frameW / ratio : 0
  const base = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1
  const scale = base * zoom

  const clamp = useCallback(
    (point: { x: number; y: number }, s = scale) => {
      if (!natural || !s) return point
      const halfW = frameW / 2 / s
      const halfH = frameH / 2 / s
      return {
        x: Math.min(Math.max(point.x, halfW), natural.w - halfW),
        y: Math.min(Math.max(point.y, halfH), natural.h - halfH),
      }
    },
    [natural, frameW, frameH, scale],
  )

  // Keep the framed point valid as the frame or zoom changes.
  useEffect(() => {
    setCenter((c) => clamp(c))
  }, [clamp])

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const setZoomClamped = (value: number) =>
    setZoom(Math.min(4, Math.max(1, Math.round(value * 100) / 100)))

  async function rotate() {
    const img = imgRef.current
    if (!img || !natural) return
    const canvas = document.createElement("canvas")
    canvas.width = natural.h
    canvas.height = natural.w
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(img, -natural.w / 2, -natural.h / 2)
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    )
    if (!blob) return
    setNatural(null)
    setZoom(1)
    setSource(blob)
  }

  async function apply() {
    const img = imgRef.current
    if (!img || !natural || !scale) return
    setBusy(true)
    setError("")
    try {
      const sw = frameW / scale
      const sh = frameH / scale
      const sx = center.x - sw / 2
      const sy = center.y - sh / 2
      const max = job.options.maxOutput ?? 2000
      const k = Math.min(1, max / Math.max(sw, sh))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(sw * k))
      canvas.height = Math.max(1, Math.round(sh * k))
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("canvas")
      ctx.imageSmoothingQuality = "high"
      const sourceType = job.file.type
      let type =
        sourceType === "image/png" || sourceType === "image/webp"
          ? sourceType
          : "image/jpeg"
      if (type === "image/jpeg") {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      const encode = (t: string) =>
        new Promise<Blob | null>((r) => canvas.toBlob(r, t, 0.9))
      let blob = await encode(type)
      const limit = job.options.maxBytes ?? 5 * 1024 * 1024
      if (blob && blob.size > limit && type !== "image/jpeg") {
        type = "image/jpeg"
        ctx.globalCompositeOperation = "destination-over"
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        blob = await encode(type)
      }
      if (!blob) throw new Error("encode")
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"
      const name = `${job.file.name.replace(/\.[^.]+$/, "") || "image"}-crop.${ext}`
      onDone(new File([blob], name, { type, lastModified: Date.now() }))
    } catch {
      setError(tr("Không thể cắt ảnh này. Hãy thử ảnh khác.", "Couldn't crop this image. Try another one."))
      setBusy(false)
    }
  }

  const offsetX = natural ? frameW / 2 - center.x * scale : 0
  const offsetY = natural ? frameH / 2 - center.y * scale : 0

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-label={job.options.title ?? tr("Cắt ảnh", "Crop image")}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none place-items-center border-0 bg-[#020b18]/80 p-3 text-white backdrop-blur-sm open:grid backdrop:bg-transparent sm:p-6"
      // Portaled events still bubble through the React tree; keep them away
      // from the host form/dialog so cropping never closes or submits it.
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!busy) onDone(null)
      }}
    >
      <div className="flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-[#0b1626] text-white shadow-2xl ring-1 ring-white/10">
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1677ff]/20 text-[#7ab4ff]">
            <Crop size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-[15px] font-bold text-white">
              {job.options.title ?? tr("Cắt ảnh", "Crop image")}
              {job.step && <span className="ml-2 text-xs font-semibold text-white/50">{job.step}</span>}
            </h2>
            <p className="m-0 mt-0.5 text-[11px] text-white/55">
              {tr("Kéo để căn chỉnh, cuộn hoặc dùng thanh trượt để phóng to.", "Drag to reposition, scroll or use the slider to zoom.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDone(null)}
            aria-label={tr("Đóng", "Close")}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-5">
          <div ref={areaRef} className="grid w-full place-items-center">
            <div
              className="relative touch-none overflow-hidden rounded-lg bg-[repeating-conic-gradient(#1b2738_0_25%,#141f2e_0_50%)] bg-[length:20px_20px] select-none"
              style={{ width: frameW, height: frameH, cursor: drag.current ? "grabbing" : "grab" }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
              }}
              onPointerMove={(event) => {
                const d = drag.current
                if (!d || d.id !== event.pointerId || !scale) return
                const dx = event.clientX - d.x
                const dy = event.clientY - d.y
                drag.current = { ...d, x: event.clientX, y: event.clientY }
                setCenter((c) => clamp({ x: c.x - dx / scale, y: c.y - dy / scale }))
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onWheel={(event) => setZoomClamped(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08))}
            >
              {/* Local blob preview cannot go through the image loader. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {src && <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onError={() => setError(tr("Không đọc được ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP khác.", "Couldn't read this image. Try another JPG, PNG or WebP."))}
                onLoad={(event) => {
                  const el = event.currentTarget
                  setNatural({ w: el.naturalWidth, h: el.naturalHeight })
                  setCenter({ x: el.naturalWidth / 2, y: el.naturalHeight / 2 })
                }}
                className="pointer-events-none absolute top-0 left-0 max-w-none origin-top-left"
                style={
                  natural
                    ? {
                        width: natural.w * scale,
                        height: natural.h * scale,
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                      }
                    : { opacity: 0 }
                }
              />}
              {job.options.round && (
                <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(2,11,24,0.6)]" />
              )}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 ring-1 ring-white/60 ring-inset">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="border-[0.5px] border-white/20" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoomClamped(zoom - 0.2)}
              aria-label={tr("Thu nhỏ", "Zoom out")}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-white/10 text-white hover:bg-white/20"
            >
              <Minus size={15} />
            </button>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoomClamped(Number(event.target.value))}
              aria-label={tr("Mức phóng to", "Zoom level")}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#1677ff]"
            />
            <button
              type="button"
              onClick={() => setZoomClamped(zoom + 0.2)}
              aria-label={tr("Phóng to", "Zoom in")}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-white/10 text-white hover:bg-white/20"
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              onClick={rotate}
              disabled={!natural}
              className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-white/10 px-3 text-[11px] font-bold text-white hover:bg-white/20 disabled:opacity-40"
            >
              <RotateCw size={14} /> {tr("Xoay", "Rotate")}
            </button>
          </div>

          {aspects.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Tỷ lệ khung", "Aspect ratio")}>
              {aspects.map((aspect, i) => (
                <button
                  key={aspect.en}
                  type="button"
                  role="radio"
                  aria-checked={i === aspectIndex}
                  onClick={() => {
                    setAspectIndex(i)
                    setZoom(1)
                  }}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                    i === aspectIndex
                      ? "border-[#1677ff] bg-[#1677ff] text-white"
                      : "border-white/20 bg-transparent text-white/75 hover:border-white/50 hover:text-white"
                  }`}
                >
                  {tr(aspect.vi, aspect.en)}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="m-0 mt-3 text-xs font-semibold text-red-300">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={() => onDone("original")}
            disabled={busy}
            className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-white/60 underline-offset-2 hover:text-white hover:underline"
          >
            {tr("Dùng ảnh gốc, không cắt", "Use original, no crop")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onDone(null)}
              disabled={busy}
              className="h-10 cursor-pointer rounded-lg border border-white/20 bg-transparent px-4 text-xs font-bold text-white hover:bg-white/10"
            >
              {tr("Hủy", "Cancel")}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy || !natural}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#1677ff] px-5 text-xs font-bold text-white hover:bg-[#0865e5] disabled:cursor-wait disabled:opacity-60"
            >
              <Check size={15} /> {busy ? tr("Đang cắt…", "Cropping…") : tr("Cắt & dùng ảnh", "Crop & use")}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  )

  return typeof document === "undefined" ? null : createPortal(dialog, document.body)
}
