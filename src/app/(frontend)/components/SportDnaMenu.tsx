"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { useShop } from "./ShopProvider"
import { useSportDnaContext } from "./MatchBadge"
import { strongestSport } from "@/lib/sportdna-strength"

// Menu SportDNA trong header chính (thay cho thanh điều hướng riêng của SportDNA).
export function SportDnaMenu({ onSelect }: { onSelect?: () => void }) {
  const { tr } = useShop()
  const { profiles, runs } = useSportDnaContext()
  // Gear suggestions open on the sport the player is strongest in.
  const best = strongestSport(profiles, runs)
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = path.startsWith("/sportdna")

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

  const groups = [
    {
      label: tr("Đánh giá", "Assessment"),
      items: [
        { href: "/sportdna/kiem-tra/cau-long", label: tr("Cầu lông", "Badminton") },
        { href: "/sportdna/kiem-tra/bong-da", label: tr("Bóng đá", "Football") },
      ],
    },
    {
      label: tr("Hồ sơ", "Profile"),
      items: [
        { href: "/tai-khoan#the-thao", label: tr("Hồ sơ thể thao", "Sports profile") },
        { href: best ? `/tim-kiem?mon=${best}` : "/tim-kiem", label: tr("Thiết bị hợp với bạn", "Gear that fits you") },
        { href: "/cong-dong", label: tr("Cộng đồng", "Community") },
      ],
    },
  ]

  return (
    <div className="explore-menu" ref={ref}>
      <button
        className={`nav-item explore-trigger${active ? " active" : ""}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(!open)}
      >
        SportDNA
        <ChevronDown className="explore-chevron" size={14} />
      </button>
      {open && (
        <div className="explore-dropdown dna-dropdown" role="menu">
          <Link href="/sportdna" role="menuitem" onClick={select} className="dna-dropdown-hub">
            {tr("Tổng quan SportDNA", "SportDNA overview")}
          </Link>
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <p className="dna-dropdown-label">{g.label}</p>
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  role="menuitem"
                  onClick={select}
                  aria-current={!it.href.includes("#") && !it.href.includes("?") && path.startsWith(it.href) ? "page" : undefined}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
