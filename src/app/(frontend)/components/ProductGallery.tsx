"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useShop } from "./ShopProvider"
import { type GalleryImage, useProductVariant } from "./ProductVariantProvider"

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const { tr } = useShop()
  const variant = useProductVariant()
  const activeImages = variant?.images ?? images
  const [index, setIndex] = useState(0)
  const count = activeImages.length
  const go = (step: number) => setIndex((i) => (i + step + count) % count)

  useEffect(() => {
    setIndex(0)
  }, [variant?.selectedColor])

  // Arrow keys switch photos while the detail page is open.
  useEffect(() => {
    if (count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return
      if (e.key === "ArrowLeft") go(-1)
      if (e.key === "ArrowRight") go(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  if (!count) return null
  const current = activeImages[index] ?? activeImages[0]

  return (
    <>
      <div className="pg-stage" style={count < 2 ? { bottom: 0 } : undefined}>
        <Image key={current.id} src={current.url} alt={current.alt} fill sizes="(max-width: 760px) 100vw, 50vw" preload />
      </div>
      {count > 1 && (
        <>
          <button className="pg-arrow prev" onClick={() => go(-1)} aria-label={tr("Ảnh trước", "Previous image")}><ChevronLeft size={20} /></button>
          <button className="pg-arrow next" onClick={() => go(1)} aria-label={tr("Ảnh sau", "Next image")}><ChevronRight size={20} /></button>
          <span className="pg-count">{index + 1} / {count}</span>
          <div className="pg-thumbs">
            {activeImages.map((img, i) => (
              <button key={img.id} className={i === index ? "active" : ""} onClick={() => setIndex(i)} aria-label={img.alt} aria-current={i === index}>
                <Image src={img.url} alt="" fill sizes="72px" />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
