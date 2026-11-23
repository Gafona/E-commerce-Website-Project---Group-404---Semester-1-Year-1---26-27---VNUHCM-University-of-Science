"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { editProductAction } from "../../actions"
import { useShop } from "../../../components/ShopProvider"
import { ImagePicker } from "../ImagePicker"
import { ColorVariantsField, type ColorVariantValue } from "../ColorVariantsField"
import { ProductTaxonomyFields } from "../ProductTaxonomyFields"
import { PriceFields } from "../PriceFields"
import type { ProductTaxonomyOption } from "@/lib/product-taxonomies"

type P = {
  id: string | number
  name: string
  sport: string
  category: string
  brand: string
  price: number
  oldPrice?: number | null
  stock: number
  description: string
  specs: Record<string, string>
  productType?: string | null
  images: Array<{ id: string; url: string }>
  colors: ColorVariantValue[]
}

export function EditForm({
  p,
  taxonomies,
}: {
  p: P
  taxonomies: ProductTaxonomyOption[]
}) {
  const [state, action, pending] = useActionState(editProductAction, {
    ok: false,
  })
  const { tr } = useShop()
  const router = useRouter()
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [router, state.ok])
  return (
    <form action={action} className="sc-form">
      <input type="hidden" name="id" value={p.id} />
      <label className="wide">
        {tr("Tên sản phẩm", "Product name")} *
        <input name="name" defaultValue={p.name} required />
      </label>
      <ProductTaxonomyFields
        taxonomies={taxonomies}
        defaultSport={p.sport}
        defaultCategory={p.category}
        defaultBrand={p.brand}
        defaultSpecs={p.specs}
        defaultProductType={p.productType}
      />
      <PriceFields defaultPrice={p.price} defaultOldPrice={p.oldPrice} />
      <label>
        {tr("Tồn kho")} *
        <input
          name="stock"
          type="number"
          min="0"
          defaultValue={p.stock}
          required
        />
      </label>
      <ImagePicker
        key={p.images.map((i) => i.id).join()}
        existing={p.images}
        required
      />
      <ColorVariantsField
        key={p.colors.map((c) => `${c.id}:${c.images.map((i) => i.id).join(".")}`).join()}
        initial={p.colors}
      />
      <label className="wide">
        {tr("Mô tả", "Description")}
        <textarea name="description" rows={5} defaultValue={p.description} />
      </label>
      {state.error && <p className="auth-error wide">{state.error}</p>}
      {state.message && <p className="sc-ok wide">{state.message}</p>}
      <button className="boai-button primary wide" disabled={pending}>
        {pending
          ? tr("Đang lưu...", "Saving...")
          : tr("Lưu thay đổi", "Save changes")}
      </button>
    </form>
  )
}
