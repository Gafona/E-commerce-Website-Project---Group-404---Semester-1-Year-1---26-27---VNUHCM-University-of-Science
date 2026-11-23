"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { ASPECTS, useImageCropper } from "../../components/ImageCropper"

export const MAX_PRODUCT_IMAGES = 8
const MAX_BYTES = 5_000_000
const MAX_SOURCE_BYTES = 25_000_000

type Item =
  | { key: string; kind: "existing"; id: string; url: string }
  | { key: string; kind: "new"; file: File; url: string }

/**
 * Multi-image field for seller product forms. Submits (each name prefixed by `prefix`):
 * - `images`: the newly picked files (in display order)
 * - `imageOrder`: one token per photo, `e:<mediaId>` for kept uploads or
 *   `n:<index into images>` for new files. The first token is the main photo.
 */
export function ImagePicker({
  existing = [],
  required = false,
  prefix = "",
  max = MAX_PRODUCT_IMAGES,
  label,
  compact = false,
}: {
  existing?: { id: string; url: string }[]
  required?: boolean
  /** Distinguishes several pickers in one form, e.g. one per color. */
  prefix?: string
  max?: number
  label?: string
  compact?: boolean
}) {
  const { tr } = useShop()
  const [items, setItems] = useState<Item[]>(() =>
    existing.map((m): Item => ({ key: `e-${m.id}`, kind: "existing", id: m.id, url: m.url })),
  )
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const filesRef = useRef<HTMLInputElement>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])
  const { cropFiles, cropper } = useImageCropper()

  // Mirror the new files into the named (hidden) file input so the form posts them.
  useEffect(() => {
    if (!filesRef.current) return
    const dt = new DataTransfer()
    for (const it of items) if (it.kind === "new") dt.items.add(it.file)
    filesRef.current.files = dt.files
  }, [items])

  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const add = async (list: FileList | File[] | null) => {
    if (!list) return
    const picked = Array.from(list)
    if (pickRef.current) pickRef.current.value = ""
    const accepted: Item[] = []
    let message = ""
    const images = picked
      .filter((file) => {
        if (file.type.startsWith("image/") && file.size <= MAX_SOURCE_BYTES) return true
        message = file.type.startsWith("image/")
          ? tr(`"${file.name}" vượt quá 5MB.`, `"${file.name}" is larger than 5MB.`)
          : tr(`"${file.name}" không phải ảnh.`, `"${file.name}" is not an image.`)
        return false
      })
      .slice(0, Math.max(0, max - items.length))
    const files = images.length
      ? await cropFiles(images, {
          title: tr("Cắt ảnh sản phẩm", "Crop product photo"),
          aspects: [ASPECTS.square, ASPECTS.portrait, ASPECTS.landscape, ASPECTS.original],
        })
      : []
    if (!files) {
      setError(message)
      return
    }
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        message = tr(`"${file.name}" vượt quá 5MB.`, `"${file.name}" is larger than 5MB.`)
        continue
      }
      const url = URL.createObjectURL(file)
      urlsRef.current.push(url)
      accepted.push({ key: `n-${url}`, kind: "new", file, url })
    }
    setItems((cur) => {
      const room = max - cur.length
      if (accepted.length > room) {
        message = tr(`Tối đa ${max} ảnh.`, `Up to ${max} photos.`)
      }
      return [...cur, ...accepted.slice(0, Math.max(0, room))]
    })
    setError(message)
  }

  const move = (from: number, to: number) =>
    setItems((cur) => {
      if (to < 0 || to >= cur.length) return cur
      const next = [...cur]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  const remove = (i: number) => setItems((cur) => cur.filter((_, idx) => idx !== i))

  let newIndex = 0
  const order = items.map((it) => (it.kind === "existing" ? `e:${it.id}` : `n:${newIndex++}`))

  return (
    <div className="wide grid gap-2">
      <div className="flex items-baseline justify-between text-[10px] font-bold uppercase">
        <span>
          {label ?? tr("Ảnh sản phẩm", "Product photos")}
          {required && " *"}
        </span>
        <span className="font-normal normal-case text-[var(--muted)]">
          {items.length}/{max} · {tr("ảnh đầu tiên là ảnh chính", "first photo is the main one")}
        </span>
      </div>

      <input type="hidden" name={`${prefix}imagePicker`} value="1" />
      <input ref={filesRef} type="file" name={`${prefix}images`} multiple hidden tabIndex={-1} aria-hidden />
      {order.map((t) => (
        <input key={t} type="hidden" name={`${prefix}imageOrder`} value={t} />
      ))}

      <div className={compact ? "grid grid-cols-4 gap-2 sm:grid-cols-6" : "grid grid-cols-3 gap-2 sm:grid-cols-4"}>
        {items.map((it, i) => (
          <figure
            key={it.key}
            className={`group relative m-0 aspect-square overflow-hidden border bg-[var(--soft-blue)] ${
              i === 0 ? "border-2 border-[var(--lime)]" : "border-[var(--line)]"
            }`}
          >
            {it.kind === "existing" ? (
              <Image src={it.url} alt="" fill sizes="120px" className="object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={it.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {i === 0 && (
              <span className="absolute left-1 top-1 inline-flex items-center gap-1 bg-[var(--lime)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                <Star size={9} fill="currentColor" /> {tr("Ảnh chính", "Main")}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={tr("Xóa ảnh", "Remove photo")}
              className="absolute right-1 top-1 grid h-6 w-6 cursor-pointer place-items-center rounded-full border-0 bg-black/65 text-white hover:bg-[var(--sale)]"
            >
              <X size={13} />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
                aria-label={tr("Dời lên trước", "Move earlier")}
                className="grid h-6 w-6 cursor-pointer place-items-center border-0 bg-white/90 text-black disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => move(i, 0)}
                  className="cursor-pointer border-0 bg-white/90 px-1.5 text-[9px] font-bold uppercase text-black"
                >
                  {tr("Đặt chính", "Set main")}
                </button>
              )}
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => move(i, i + 1)}
                aria-label={tr("Dời ra sau", "Move later")}
                className="grid h-6 w-6 cursor-pointer place-items-center border-0 bg-white/90 text-black disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </figure>
        ))}

        {items.length < max && (
          <button
            type="button"
            onClick={() => pickRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void add(e.dataTransfer.files)
            }}
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed p-2 text-center text-[11px] font-semibold transition ${
              dragging
                ? "border-[var(--lime)] bg-[var(--soft-blue)] text-[var(--lime-dark)]"
                : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[var(--lime)] hover:text-[var(--lime-dark)]"
            }`}
          >
            <ImagePlus size={22} />
            {items.length ? tr("Thêm ảnh", "Add photos") : tr("Chọn hoặc kéo thả ảnh", "Choose or drop photos")}
          </button>
        )}
      </div>
      <input
        ref={pickRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void add(e.target.files)}
      />
      {!compact && <p className="m-0 text-[11px] text-[var(--muted)]">
        {tr(
          "JPG, PNG hoặc WebP, tối đa 5MB mỗi ảnh. Dùng mũi tên để sắp xếp thứ tự hiển thị.",
          "JPG, PNG or WebP, up to 5MB each. Use the arrows to reorder.",
        )}
      </p>}
      {error && <p className="auth-error m-0">{error}</p>}
      {cropper}
    </div>
  )
}
