"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, Megaphone, X } from "lucide-react"
import type { LiveAnnouncement } from "@/lib/announcements"
import { ANNOUNCEMENT_TONE } from "@/lib/announcement-tones"
import { AnnouncementPopupCard } from "./AnnouncementPopupCard"
import { useShop } from "./ShopProvider"
import { liveFeed } from "@/lib/live-feed"

const STORAGE_KEY = "boai-dismissed-announcements"
// Operational consoles stay free of marketing overlays.
const HIDDEN_PREFIXES = ["/quan-tri", "/kenh-ban-hang", "/admin"]

const keyOf = (item: LiveAnnouncement) => `${item.id}:${item.version}`

function readDismissed(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return new Set(Array.isArray(raw) ? raw.map(String) : [])
  } catch {
    return new Set()
  }
}

function CtaLink({ item, className, onClick }: { item: LiveAnnouncement; className: string; onClick?: () => void }) {
  if (!item.ctaHref || !item.ctaLabel) return null
  const external = item.ctaHref.startsWith("http")
  return external ? (
    <a href={item.ctaHref} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {item.ctaLabel} <ArrowRight size={14} />
    </a>
  ) : (
    <Link href={item.ctaHref} className={className} onClick={onClick}>
      {item.ctaLabel} <ArrowRight size={14} />
    </Link>
  )
}

export function SiteAnnouncements() {
  const pathname = usePathname()
  const [items, setItems] = useState<LiveAnnouncement[]>([])
  const [dismissed, setDismissed] = useState<Set<string> | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const { tr } = useShop()

  useEffect(() => {
    setDismissed(readDismissed())
    liveFeed<LiveAnnouncement[]>("announcements").then(setItems).catch(() => setItems([]))
  }, [])

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const eligible = items.filter((item) => item.scope === "all" || pathname === "/")
  const visible = dismissed && !hidden ? eligible.filter((item) => !dismissed.has(keyOf(item))) : []
  const banner = visible.find((item) => item.displayType === "banner")
  const popup = visible.find((item) => item.displayType === "popup")

  const dismiss = useCallback((item: LiveAnnouncement) => {
    setDismissed((current) => {
      const next = new Set(current ?? [])
      next.add(keyOf(item))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next].slice(-50)))
      } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    if (!popup) return setPopupOpen(false)
    const timer = window.setTimeout(() => setPopupOpen(true), 700)
    return () => window.clearTimeout(timer)
  }, [popup?.id, popup?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!popupOpen || !popup) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && dismiss(popup)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [popupOpen, popup, dismiss])

  return (
    <>
      {banner && (
        <div className={`relative z-40 ${ANNOUNCEMENT_TONE[banner.theme].surface}`} role="region" aria-label={tr("Thông báo", "Announcement")}>
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 pr-12 text-[12px] sm:justify-center">
            <Megaphone size={15} className="shrink-0" aria-hidden />
            <p className="m-0 min-w-0">
              <b className="font-extrabold uppercase tracking-wide">{banner.title}</b>
              <span className="mx-2 opacity-50">/</span>
              <span className="opacity-90">{banner.message}</span>
            </p>
            <CtaLink item={banner} className="inline-flex shrink-0 items-center gap-1 font-extrabold underline underline-offset-4" />
          </div>
          <button
            type="button"
            onClick={() => dismiss(banner)}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center opacity-80 transition hover:opacity-100"
            aria-label={tr("Đóng thông báo", "Close announcement")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {popup && popupOpen && (
        <div
          className="fixed inset-0 z-[200] grid place-items-center bg-[#030b17]/70 p-4 backdrop-blur-sm"
          onClick={(event) => event.target === event.currentTarget && dismiss(popup)}
        >
          <AnnouncementPopupCard
            content={popup}
            closeRef={closeRef}
            onDismiss={() => dismiss(popup)}
            cta={(className) => <CtaLink item={popup} onClick={() => dismiss(popup)} className={className} />}
          />
        </div>
      )}
    </>
  )
}
