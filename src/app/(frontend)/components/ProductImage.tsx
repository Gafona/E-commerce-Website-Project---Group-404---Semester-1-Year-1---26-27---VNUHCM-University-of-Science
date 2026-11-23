"use client"

import Image from "next/image"
import { ImageOff } from "lucide-react"

type Props = {
  src?: string | null
  alt?: string | null
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  className?: string
  preload?: boolean
}

/** next/image for product photos; a neutral placeholder (never an empty src) when a product has no image. */
export function ProductImage({ src, alt, fill, width, height, sizes, className = "", preload }: Props) {
  const label = alt?.trim() || ""
  if (!src) {
    return (
      <span
        role="img"
        aria-label={label || "Chưa có ảnh"}
        className={`${fill ? "absolute inset-0" : "inline-flex"} grid place-items-center bg-[var(--paper)] text-[var(--muted)] ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <ImageOff size={22} aria-hidden />
      </span>
    )
  }
  return fill ? (
    <Image src={src} alt={label} fill sizes={sizes} className={className} preload={preload} />
  ) : (
    <Image src={src} alt={label} width={width ?? 96} height={height ?? 96} sizes={sizes} className={className} preload={preload} />
  )
}
