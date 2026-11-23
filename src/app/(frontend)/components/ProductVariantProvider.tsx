"use client"

import { createContext, useContext, useMemo, useState } from "react"

export type GalleryImage = {
  id: string
  url: string
  alt: string
}

type ColorVariant = {
  name: string
  images: GalleryImage[]
}

type ProductVariantContextValue = {
  selectedColor?: string
  setSelectedColor: (color: string) => void
  images: GalleryImage[]
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null)

export function ProductVariantProvider({
  variants,
  defaultColor,
  fallbackImages,
  children,
}: {
  variants: ColorVariant[]
  defaultColor?: string
  fallbackImages: GalleryImage[]
  children: React.ReactNode
}) {
  const [selectedColor, setSelectedColor] = useState(defaultColor ?? variants[0]?.name)
  const selectedImages = variants.find((variant) => variant.name === selectedColor)?.images
  const images = selectedImages?.length ? selectedImages : fallbackImages
  const value = useMemo(
    () => ({ selectedColor, setSelectedColor, images }),
    [selectedColor, images],
  )

  return <ProductVariantContext.Provider value={value}>{children}</ProductVariantContext.Provider>
}

export function useProductVariant() {
  return useContext(ProductVariantContext)
}
