"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createProductAction } from "../actions"
import { useShop } from "../../components/ShopProvider"
import { ImagePicker } from "./ImagePicker"
import { ColorVariantsField } from "./ColorVariantsField"
import { ProductTaxonomyFields } from "./ProductTaxonomyFields"
import { PriceFields } from "./PriceFields"
import type { ProductTaxonomyOption } from "@/lib/product-taxonomies"

export function ProductForm({
  taxonomies,
}: {
  taxonomies: ProductTaxonomyOption[]
}) {
  const [state, action, pending] = useActionState(createProductAction, {
    ok: false,
  })
  const { tr } = useShop()
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset()
      router.refresh()
    }
  }, [router, state.ok])
  return (
    <form ref={ref} action={action} className="sc-form">
      <label className="wide">
        {tr("Tên sản phẩm", "Product name")} *<input name="name" required />
      </label>
      <ProductTaxonomyFields
        key={state.href ?? "new"}
        taxonomies={taxonomies}
      />
      <PriceFields key={`price-${state.href ?? "new"}`} />
      <label>
        {tr("Tồn kho")} *
        <input name="stock" type="number" min="0" defaultValue="10" required />
      </label>
      <ImagePicker key={`images-${state.href ?? "new"}`} required />
      <ColorVariantsField key={`colors-${state.href ?? "new"}`} />
      <label className="wide">
        {tr("Mô tả", "Description")}
        <textarea name="description" rows={3} />
      </label>
      {state.error && <p className="auth-error wide">{state.error}</p>}
      {state.message && (
        <div className="sc-publish-success wide">
          <p className="sc-ok">{state.message}</p>
          {state.href && (
            <Link href={state.href} target="_blank">
              {tr("Xem sản phẩm trên website", "View product on website")} →
            </Link>
          )}
        </div>
      )}
      <button className="boai-button primary wide" disabled={pending}>
        {pending
          ? tr("Đang xuất bản...", "Publishing...")
          : tr("Đăng và xuất bản ngay", "Publish now")}
      </button>
    </form>
  )
}
