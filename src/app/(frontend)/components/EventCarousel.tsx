"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import type { LiveEventSummary } from "@/lib/event-pricing"
import { useShop } from "./ShopProvider"

/** CSS variables the event theme rules read (hero copy, midpage banner, page tint). */
export function eventStyle(event: LiveEventSummary): CSSProperties {
  return {
    "--event-background": event.backgroundColor,
    "--event-text-color": event.textColor,
    "--event-title-color": event.titleTypography.color,
    "--event-title-size": `${event.titleTypography.fontSize}px`,
    "--event-slogan-color": event.sloganTypography.color,
    "--event-slogan-size": `${event.sloganTypography.fontSize}px`,
    "--event-description-color": event.descriptionTypography.color,
    "--event-description-size": `${event.descriptionTypography.fontSize}px`,
  } as CSSProperties
}

/**
 * Rotates through `count` slides every `intervalMs`. Stops while hovered or
 * focused, while the tab is hidden, and entirely for reduced-motion visitors.
 * Always starts on slide 0 so server and browser render the same markup.
 */
export function useRotation(count: number, intervalMs = 7000) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [])
  useEffect(() => {
    if (count < 2 || paused || reduced) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((current) => (current + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [count, paused, reduced, intervalMs])
  const safeIndex = count ? index % count : 0
  const go = useCallback((next: number) => setIndex(next), [])
  const bind = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  }
  return { index: safeIndex, go, bind }
}

/** One dot per event; the current one is wider. Hidden when there is a single event. */
export function EventDots({ events, index, onSelect, className = "" }: { events: LiveEventSummary[]; index: number; onSelect: (index: number) => void; className?: string }) {
  const { tr } = useShop()
  if (events.length < 2) return null
  return (
    <div className={`flex items-center gap-2 ${className}`} role="group" aria-label={tr("Chọn sự kiện", "Choose an event")}>
      {events.map((event, i) => (
        <button
          key={event.id}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={tr(`Sự kiện ${i + 1}/${events.length}: ${event.name}`, `Event ${i + 1} of ${events.length}: ${event.name}`)}
          aria-current={i === index ? "true" : undefined}
          className={`h-2.5 rounded-full border border-current transition-all ${i === index ? "w-8 bg-current" : "w-2.5 bg-transparent opacity-70 hover:opacity-100"}`}
        />
      ))}
    </div>
  )
}
