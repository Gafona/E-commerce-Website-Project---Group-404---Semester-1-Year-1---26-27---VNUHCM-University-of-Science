"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { CommunityPostImage } from "@/lib/community"
import { useShop } from "../components/ShopProvider"

/** Facebook-style photo grid for a community post, with a simple lightbox. */
export function PostImages({ images, compact = false }: { images: CommunityPostImage[]; compact?: boolean }) {
  const { tr } = useShop()
  const [open, setOpen] = useState<number | null>(null)
  const count = images.length

  useEffect(() => {
    if (open === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null)
      if (event.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % count))
      if (event.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + count) % count))
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, count])

  if (!count) return null
  const single = count === 1 ? images[0] : null
  // A single photo keeps its own shape (clamped); several share a tidy grid.
  const singleRatio = single ? Math.min(Math.max(single.width / single.height, 0.75), 1.9) : 1

  return (
    <>
      <div
        className={`mt-4 grid gap-1 overflow-hidden rounded-xl ${count === 1 ? "" : "grid-cols-2"} ${count === 3 ? "grid-rows-2" : ""}`}
        style={count === 3 ? { aspectRatio: "4 / 3" } : undefined}
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpen(index)}
            aria-label={tr(`Xem ảnh ${index + 1}/${count}`, `View photo ${index + 1} of ${count}`)}
            className={`relative block overflow-hidden bg-[var(--paper)] ${count === 3 && index === 0 ? "row-span-2" : ""}`}
            style={count === 1 ? { aspectRatio: String(singleRatio), maxHeight: compact ? 260 : 520 } : count === 3 ? undefined : { aspectRatio: "1 / 1" }}
          >
            <Image
              src={image.url}
              alt=""
              fill
              sizes={count === 1 ? "(max-width: 768px) 100vw, 640px" : "(max-width: 768px) 50vw, 320px"}
              className="object-cover transition duration-300 hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tr("Xem ảnh", "Photo viewer")}
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 p-4"
          onClick={(event) => event.target === event.currentTarget && setOpen(null)}
        >
          <button type="button" onClick={() => setOpen(null)} aria-label={tr("Đóng", "Close")} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          {count > 1 && (
            <>
              <button type="button" onClick={() => setOpen((open - 1 + count) % count)} aria-label={tr("Ảnh trước", "Previous photo")} className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft size={22} />
              </button>
              <button type="button" onClick={() => setOpen((open + 1) % count)} aria-label={tr("Ảnh sau", "Next photo")} className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div className="relative h-[85vh] w-full max-w-5xl">
            <Image src={images[open].url} alt="" fill sizes="100vw" className="object-contain" />
          </div>
          {count > 1 && <span className="absolute bottom-5 text-xs font-semibold text-white/70">{open + 1} / {count}</span>}
        </div>
      )}
    </>
  )
}
