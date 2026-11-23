"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { useShop } from "./ShopProvider"

export function ExploreMenu({
  active = false,
  onSelect,
}: {
  active?: boolean
  onSelect?: () => void
}) {
  const { t, tr } = useShop()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", closeOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  const select = () => {
    setOpen(false)
    onSelect?.()
  }

  return (
    <div className="explore-menu" ref={ref}>
      <button
        className={`nav-item explore-trigger${active ? " active" : ""}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t("navExplore")}
        <ChevronDown className="explore-chevron" size={14} />
      </button>
      {open && (
        <div className="explore-dropdown" role="menu">
          <Link href="/#bong-da" role="menuitem" onClick={select}>{t("navFootball")}</Link>
          <Link href="/#cau-long" role="menuitem" onClick={select}>{t("navBadminton")}</Link>
          <Link href="/tim-kiem" role="menuitem" onClick={select}>{t("navAll")}</Link>
          <Link href="/cong-dong" role="menuitem" onClick={select}>{tr("Cộng đồng BOAI", "BOAI Community")}</Link>
        </div>
      )}
    </div>
  )
}
