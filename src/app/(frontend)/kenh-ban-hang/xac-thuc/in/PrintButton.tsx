"use client"

import { Printer } from "lucide-react"
import { useShop } from "../../../components/ShopProvider"

export function PrintButton() {
  const { tr } = useShop()
  return (
    <button type="button" className="boai-button primary" onClick={() => window.print()}>
      <Printer size={16} /> {tr("In trang này", "Print this page")}
    </button>
  )
}
