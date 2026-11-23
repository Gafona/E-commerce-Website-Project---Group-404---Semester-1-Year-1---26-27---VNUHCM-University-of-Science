"use client"

import { useState } from "react"
import { ImagePlus, X } from "lucide-react"
import type { CommunityPostImage } from "@/lib/community"
import { MAX_POST_IMAGE_BYTES, MAX_POST_IMAGES } from "@/lib/community-media"
import { ASPECTS, useImageCropper } from "../components/ImageCropper"
import { useShop } from "../components/ShopProvider"

/**
 * Photo attachments for a community post composer: photos already on the post
 * being edited plus newly picked (cropped) files, with picker and preview UI.
 */
export function usePostImages(onError: (message: string) => void) {
  const { tr } = useShop()
  const { cropFiles, cropper } = useImageCropper()
  const [kept, setKept] = useState<CommunityPostImage[]>([])
  const [fresh, setFresh] = useState<{ file: File; preview: string }[]>([])
  const count = kept.length + fresh.length

  function reset(initial: CommunityPostImage[] = []) {
    setFresh((old) => {
      old.forEach((image) => URL.revokeObjectURL(image.preview))
      return []
    })
    setKept(initial)
  }

  async function pick(files: File[]) {
    const room = MAX_POST_IMAGES - count
    if (files.length > room) onError(tr(`Mỗi bài viết tối đa ${MAX_POST_IMAGES} ảnh.`, `Up to ${MAX_POST_IMAGES} photos per post.`))
    const cropped = await cropFiles(files.slice(0, Math.max(0, room)), {
      title: tr("Cắt ảnh bài viết", "Crop post photo"),
      aspects: [ASPECTS.original, ASPECTS.square, ASPECTS.portrait, ASPECTS.landscape],
      maxOutput: 2000,
    })
    for (const file of cropped ?? []) {
      if (file.size > MAX_POST_IMAGE_BYTES) {
        onError(tr("Mỗi ảnh tối đa 5 MB.", "Each photo must be 5 MB or smaller."))
        continue
      }
      setFresh((old) => [...old, { file, preview: URL.createObjectURL(file) }])
    }
  }

  /** Adds the photo fields; the server only changes photos when `imagesField` is present. */
  function appendTo(form: FormData) {
    form.set("imagesField", "1")
    kept.forEach((image) => form.append("keepImages", image.id))
    fresh.forEach((image) => form.append("images", image.file))
  }

  const items = [
    ...kept.map((image) => ({ key: image.id, src: image.url, remove: () => setKept((old) => old.filter((i) => i.id !== image.id)) })),
    ...fresh.map((image) => ({
      key: image.preview,
      src: image.preview,
      remove: () => {
        URL.revokeObjectURL(image.preview)
        setFresh((old) => old.filter((i) => i.preview !== image.preview))
      },
    })),
  ]

  const previews =
    count > 0 ? (
      <ul className="m-0 mt-3 grid list-none grid-cols-4 gap-2 p-0">
        {items.map((image, index) => (
          <li key={image.key} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)]">
            {/* Local previews are blob: URLs, so a plain img is used here. */}
            <img src={image.src} alt={tr(`Ảnh ${index + 1}`, `Photo ${index + 1}`)} className="size-full object-cover" />
            <button
              type="button"
              onClick={image.remove}
              aria-label={tr(`Bỏ ảnh ${index + 1}`, `Remove photo ${index + 1}`)}
              className="absolute right-1 top-1 grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-black/60 text-white hover:bg-black/80"
            >
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
    ) : null

  const full = count >= MAX_POST_IMAGES
  const picker = (
    <>
      <label
        className={`flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold ${full ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-[#1677ff] hover:text-[#1677ff]"}`}
      >
        <ImagePlus size={15} />
        {tr("Ảnh", "Photo")} {count > 0 && `${count}/${MAX_POST_IMAGES}`}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={full}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            event.target.value = ""
            void pick(files)
          }}
        />
      </label>
      {cropper}
    </>
  )

  return { count, reset, appendTo, previews, picker }
}
