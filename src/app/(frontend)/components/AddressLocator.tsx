"use client"

import { useState } from "react"
import { Check, Crosshair, Loader2, MapPin, X } from "lucide-react"
import { useShop } from "./ShopProvider"

export type LocatedPoint = { lat: number; lng: number; label?: string }
type Suggestion = { label: string; lat: number; lng: number; province: string | null }

/**
 * "Định vị" control for an address: searches OpenStreetMap through our proxy
 * when pressed, lists up to five matches, and hands back the chosen point.
 * Without a point, shipping falls back to a province-to-province estimate.
 */
export function AddressLocator({
  query,
  value,
  onChange,
  onProvince,
  label,
}: {
  /** Address text to search (street, ward, district, province). */
  query: string
  value: LocatedPoint | null
  onChange: (point: LocatedPoint | null) => void
  /** Optional: fill an empty province select from the chosen match. */
  onProvince?: (code: string) => void
  label?: string
}) {
  const { tr } = useShop()
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [results, setResults] = useState<Suggestion[]>([])
  const [message, setMessage] = useState("")
  const ready = query.replace(/[\s,]+/g, " ").trim().length >= 6

  const search = async () => {
    if (!ready) {
      setState("error")
      setMessage(tr("Nhập số nhà, đường, phường/xã và tỉnh/thành trước khi định vị.", "Enter the street, ward and province before locating."))
      return
    }
    setState("loading")
    setMessage("")
    try {
      const response = await fetch(`/api/dia-chi/goi-y?q=${encodeURIComponent(query)}`)
      const data = (await response.json()) as { results?: Suggestion[]; error?: string }
      if (!response.ok) {
        setState("error")
        setMessage(
          data.error === "limit" || data.error === "busy"
            ? tr("Đang có nhiều yêu cầu định vị. Vui lòng thử lại sau ít phút.", "Too many lookups right now. Please try again in a few minutes.")
            : tr("Không kết nối được dịch vụ bản đồ. Phí ship sẽ được ước tính theo tỉnh/thành.", "The map service is unavailable. Shipping will be estimated by province."),
        )
        return
      }
      setResults(data.results ?? [])
      setState("done")
    } catch {
      setState("error")
      setMessage(tr("Mất kết nối. Phí ship sẽ được ước tính theo tỉnh/thành.", "Connection lost. Shipping will be estimated by province."))
    }
  }

  if (value) {
    return (
      <div className="flex items-start gap-2 border border-[var(--line)] bg-[var(--soft-blue)] px-3 py-2 text-[11px] leading-5">
        <Check size={14} className="mt-0.5 shrink-0 text-[#0a8a4a]" />
        <span className="min-w-0 flex-1">
          <b className="block">{tr("Đã định vị chính xác", "Exact location set")}</b>
          <span className="block break-words text-[var(--muted)]">{value.label || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setState("idle")
          }}
          className="inline-flex shrink-0 items-center gap-1 font-bold text-[var(--lime-dark)]"
        >
          <X size={12} /> {tr("Bỏ", "Clear")}
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={search}
        disabled={state === "loading"}
        className="inline-flex w-fit items-center gap-1.5 border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-[11px] font-bold text-[var(--lime-dark)] hover:border-[var(--lime)] disabled:opacity-60"
      >
        {state === "loading" ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
        {state === "loading" ? tr("Đang tìm vị trí…", "Finding location…") : (label ?? tr("Định vị địa chỉ để tính phí chính xác", "Locate the address for an exact fee"))}
      </button>
      {state === "error" && message && <p className="m-0 text-[11px] font-semibold text-[var(--sale)]" role="alert">{message}</p>}
      {state === "done" && !results.length && (
        <p className="m-0 text-[11px] text-[var(--muted)]" role="status">
          {tr("Không tìm thấy vị trí khớp. Hãy ghi rõ hơn (số nhà, đường, phường/xã) hoặc để BOAI ước tính theo tỉnh/thành.", "No matching place. Add more detail (street, ward) or let BOAI estimate by province.")}
        </p>
      )}
      {state === "done" && results.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0" aria-label={tr("Gợi ý địa chỉ", "Address suggestions")}>
          {results.map((item) => (
            <li key={`${item.lat},${item.lng}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: item.lat, lng: item.lng, label: item.label })
                  if (item.province) onProvince?.(item.province)
                  setState("idle")
                  setResults([])
                }}
                className="flex w-full items-start gap-2 border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-left text-[11px] leading-5 hover:border-[var(--lime)]"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--lime-dark)]" />
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
