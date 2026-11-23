"use client"

import { useEffect, useRef, useState } from "react"
import { AddressLocator, type LocatedPoint } from "../../components/AddressLocator"
import { useShop } from "../../components/ShopProvider"

/**
 * Exact warehouse point for automatic shipping fees. Reads the warehouse
 * address and province from the surrounding (uncontrolled) form and submits
 * the chosen coordinates as hidden fields.
 */
export function WarehouseLocator({ initial }: { initial: LocatedPoint | null }) {
  const { tr } = useShop()
  const ref = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState<LocatedPoint | null>(initial)
  const [query, setQuery] = useState("")
  const pickedFor = useRef<string | null>(null)

  useEffect(() => {
    const form = ref.current?.closest("form")
    if (!form) return
    const read = () => {
      const address = (form.elements.namedItem("warehouseAddress") as HTMLTextAreaElement | null)?.value ?? ""
      const select = form.elements.namedItem("warehouseProvince") as HTMLSelectElement | null
      const province = select && select.value ? (select.selectedOptions[0]?.textContent ?? "") : ""
      return [address.replace(/\s+/g, " ").trim(), province].filter(Boolean).join(", ")
    }
    const sync = () => {
      const next = read()
      setQuery(next)
      // A point located for another address no longer applies.
      if (pickedFor.current !== null && next !== pickedFor.current) {
        setPoint(null)
        pickedFor.current = null
      }
    }
    pickedFor.current = initial ? read() : null
    setQuery(read())
    form.addEventListener("input", sync)
    form.addEventListener("change", sync)
    return () => {
      form.removeEventListener("input", sync)
      form.removeEventListener("change", sync)
    }
  }, [initial])

  return (
    <div ref={ref} className="wide grid gap-1.5">
      <input type="hidden" name="warehouseLat" value={point?.lat ?? ""} />
      <input type="hidden" name="warehouseLng" value={point?.lng ?? ""} />
      <AddressLocator
        query={query}
        value={point}
        onChange={(next) => {
          setPoint(next)
          pickedFor.current = next ? query : null
        }}
        label={tr("Định vị kho để tính phí ship chính xác", "Locate the warehouse for exact shipping fees")}
      />
    </div>
  )
}
