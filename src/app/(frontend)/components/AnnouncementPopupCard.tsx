"use client"

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react"
import Image from "next/image"
import { ArrowRight, X } from "lucide-react"
import { ANNOUNCEMENT_TONE, type AnnouncementTheme } from "@/lib/announcement-tones"
import { useShop } from "./ShopProvider"

/** Natural width of the storefront popup; the admin preview scales from this. */
export const POPUP_WIDTH = 760

export type PopupContent = {
  title: string
  message: string
  scope: string
  theme: AnnouncementTheme
  imageUrl: string | null
  imageAlt?: string
}

/**
 * The storefront announcement popup card. Used by the live site and by the
 * admin preview so both always render the same layout.
 */
export function AnnouncementPopupCard({
  content,
  cta,
  onDismiss,
  closeRef,
  preview = false,
}: {
  content: PopupContent
  /** Renders the call-to-action given the themed button classes (omit for none). */
  cta?: (className: string) => ReactNode
  onDismiss?: () => void
  closeRef?: Ref<HTMLButtonElement>
  /** Inert, non-animated rendering for the admin preview. */
  preview?: boolean
}) {
  const tone = ANNOUNCEMENT_TONE[content.theme]
  const { tr } = useShop()
  const inert = preview ? { tabIndex: -1, "aria-hidden": true as const } : {}
  return (
    <div
      role={preview ? undefined : "dialog"}
      aria-modal={preview ? undefined : true}
      aria-labelledby={preview ? undefined : "site-announcement-title"}
      className={`relative grid w-full max-w-[760px] overflow-hidden shadow-[0_30px_80px_rgba(3,11,23,.45)] ${content.imageUrl ? "md:grid-cols-[1fr_1.05fr]" : ""} ${tone.surface} ${preview ? "" : "animate-[announcement-in_.5s_cubic-bezier(.16,1,.3,1)]"}`}
    >
      {content.imageUrl && (
        <div className="relative min-h-[200px] md:min-h-[400px]">
          <Image
            src={content.imageUrl}
            alt={content.imageAlt ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            unoptimized={content.imageUrl.startsWith("blob:")}
            className="object-cover"
            preload={!preview}
          />
        </div>
      )}
      <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
        <span className={`text-[10px] font-extrabold tracking-[0.2em] uppercase ${tone.accent}`}>
          {content.scope === "all" ? tr("Sự kiện toàn BOAI", "BOAI-wide event") : tr("Thông báo từ BOAI", "News from BOAI")}
        </span>
        {/* Line height leaves room for stacked Vietnamese diacritics. */}
        <h2 id={preview ? undefined : "site-announcement-title"} className="m-0 font-[family-name:var(--display)] text-[clamp(34px,5vw,52px)] leading-[1.02] font-black break-words uppercase">
          {content.title}
        </h2>
        <p className="m-0 text-[13px] leading-6 whitespace-pre-line opacity-90">{content.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {cta?.(`inline-flex min-h-12 items-center gap-2 px-6 text-[11px] font-extrabold tracking-wider uppercase transition ${tone.button}`)}
          <button type="button" onClick={onDismiss} {...inert} className="min-h-12 px-2 text-[11px] font-bold tracking-wider uppercase opacity-75 transition hover:opacity-100">
            {tr("Để sau", "Later")}
          </button>
        </div>
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onDismiss}
        {...inert}
        className="absolute top-3 right-3 grid size-9 place-items-center bg-black/25 text-white transition hover:bg-black/45"
        aria-label={preview ? undefined : tr("Đóng pop-up", "Close pop-up")}
      >
        <X size={18} />
      </button>
    </div>
  )
}

/** Static CTA look for the preview (no navigation). */
export const previewCta = (label: string) => (className: string) => (
  <span className={className}>
    {label} <ArrowRight size={14} />
  </span>
)

/**
 * Renders children at the popup's real width and scales them down to fit the
 * available space, so the preview matches the live popup exactly.
 */
export function ScaledPreview({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)
  useEffect(() => {
    const update = () => {
      if (!outer.current || !inner.current) return
      const next = Math.min(1, outer.current.clientWidth / POPUP_WIDTH)
      setScale(next)
      setHeight(inner.current.offsetHeight * next)
    }
    update()
    const observer = new ResizeObserver(update)
    if (outer.current) observer.observe(outer.current)
    if (inner.current) observer.observe(inner.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={outer} className="relative w-full overflow-hidden" style={{ height }}>
      <div ref={inner} className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: POPUP_WIDTH, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
