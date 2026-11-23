"use client"

import { useMemo, useState } from "react"
import type { ProductTaxonomyOption } from "@/lib/product-taxonomies"
import { useShop } from "../../components/ShopProvider"
import { ProductSpecFields } from "./ProductSpecFields"
import { PRODUCT_TYPES, normalizeCategory } from "@/lib/product-types"

type Sport = "football" | "badminton"

function TagPicker({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string
  name: "category" | "brand"
  options: ProductTaxonomyOption[]
  value: string
  onChange: (value: string) => void
}) {
  const { tr } = useShop()
  return (
    <fieldset className="sc-taxonomy-field">
      <legend>{label}</legend>
      <div className="sc-tag-options" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={value === option.name ? "active" : ""}
            onClick={() => onChange(option.name)}
          >
            {option.name}
          </button>
        ))}
      </div>
      <input
        name={name}
        value={value}
        maxLength={60}
        required
        onChange={(event) => onChange(event.target.value)}
        placeholder={tr(
          "Chọn tag hoặc nhập tag mới…",
          "Choose or create a tag…",
        )}
        aria-label={tr(`Tag ${label.toLowerCase()}`, `${label} tag`)}
      />
      <small>
        {tr(
          "Không thấy tag phù hợp? Nhập tên mới để tạo và đồng bộ cho mọi người bán.",
          "Type a new name to create and share it with every seller.",
        )}
      </small>
    </fieldset>
  )
}

export function ProductTaxonomyFields({
  taxonomies,
  defaultSport = "football",
  defaultCategory = "",
  defaultBrand = "",
  defaultSpecs = {},
  defaultProductType = null,
}: {
  taxonomies: ProductTaxonomyOption[]
  defaultSport?: string
  defaultCategory?: string
  defaultBrand?: string
  defaultSpecs?: Record<string, string>
  /** Stored product type; empty means "detect from category & name". */
  defaultProductType?: string | null
}) {
  const { tr } = useShop()
  const [sport, setSport] = useState<Sport>(
    defaultSport === "badminton" ? "badminton" : "football",
  )
  // Existing listings with a legacy free-text category start on its standard name.
  const [category, setCategory] = useState<string>(
    defaultCategory ? normalizeCategory({ category: defaultCategory, productType: defaultProductType }) : "",
  )
  const [brand, setBrand] = useState(defaultBrand)
  const available = useMemo(
    () => taxonomies.filter((item) => item.sport === sport),
    [sport, taxonomies],
  )

  const chooseSport = (next: Sport) => {
    setSport(next)
    setBrand("")
  }

  return (
    <>
      <label>
        {tr("Môn", "Sport")}
        <select
          name="sport"
          value={sport}
          onChange={(event) => chooseSport(event.target.value as Sport)}
        >
          <option value="football">{tr("Bóng đá")}</option>
          <option value="badminton">{tr("Cầu lông")}</option>
        </select>
      </label>
      <label>
        {tr("Danh mục", "Category")} *
        <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} required>
          <option value="" disabled>
            {tr("— Chọn danh mục —", "— Choose a category —")}
          </option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type.id} value={type.vi}>
              {tr(type.vi, type.en)}
            </option>
          ))}
        </select>
      </label>
      <TagPicker
        label={tr("Thương hiệu", "Brand")}
        name="brand"
        options={available.filter((item) => item.kind === "brand")}
        value={brand}
        onChange={setBrand}
      />
      <ProductSpecFields sport={sport} category={category} values={defaultSpecs} />
    </>
  )
}
