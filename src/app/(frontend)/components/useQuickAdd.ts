"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { needsSize } from "@/lib/product-size"
import { useShop } from "./ShopProvider"

/** What a product card knows about a product; enough to add it or send the buyer to pick a size. */
export type QuickProduct = {
  id: string
  slug: string
  name: string
  brand: string
  sport: string
  price: number
  image: string
  category: string
  /** Default colour (the product page preselects the first colour too). */
  color?: string
}

/**
 * Shared behaviour for "Add to bag" / "Buy now" buttons outside the product page.
 * Shoes and apparel need a size, so they open the product page with the size
 * picker highlighted instead of adding an incomplete line.
 */
export function useQuickAdd() {
  const shop = useShop()
  const router = useRouter()
  const { tr } = shop

  const sizeFirst = useCallback(
    (product: QuickProduct) => {
      shop.notify(tr("Vui lòng chọn kích thước", "Please choose a size"))
      const params = new URLSearchParams({ chon: "size" })
      if (product.color) params.set("mau", product.color)
      router.push(`/san-pham/${product.slug}?${params}`)
    },
    [router, shop, tr],
  )

  const line = (product: QuickProduct) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    sport: product.sport,
    price: product.price,
    image: product.image,
    color: product.color,
  })

  const add = useCallback(
    (product: QuickProduct) => {
      if (needsSize(product.category)) return sizeFirst(product)
      shop.add(line(product))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shop, sizeFirst],
  )

  const buyNow = useCallback(
    (product: QuickProduct) => {
      if (needsSize(product.category)) return sizeFirst(product)
      const existing = shop.findLine(line(product))
      if (existing) {
        // Never bump a line the buyer already has; say so and go to checkout.
        shop.notify(tr(`${product.name} đã có trong giỏ (số lượng ${existing.quantity}), chuyển sang thanh toán`, `${product.name} is already in your cart (quantity ${existing.quantity}), going to checkout`))
        router.push("/thanh-toan")
        return
      }
      const result = shop.add(line(product))
      if (result.status === "added") router.push("/thanh-toan")
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, shop, sizeFirst, tr],
  )

  return { add, buyNow }
}
