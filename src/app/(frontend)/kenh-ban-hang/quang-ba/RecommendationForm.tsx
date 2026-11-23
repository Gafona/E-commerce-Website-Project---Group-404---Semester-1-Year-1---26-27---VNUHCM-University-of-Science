"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck2, Loader2, Send } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import {
  MAX_DAYS,
  MAX_LEAD_DAYS,
  MIN_DAYS,
  POSITION_LABELS,
  RECOMMENDATION_POSITIONS,
  addDays,
  bookedOn,
  capacityMessage,
  firstFreeDay,
  formatDay,
  fullDays,
  isDay,
  type RecommendationPosition,
  type SlotRange,
} from "@/lib/recommendations"
import { requestRecommendationAction, type RecommendationResult } from "./actions"

type FormProduct = { id: string; name: string; sport: string }

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`
const input =
  "mt-1.5 block h-11 w-full border border-[var(--line)] bg-[var(--white)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--lime)]"

/** Book a homepage spot: position → product of that sport → dates → price per day. */
export function RecommendationForm({
  products,
  taken,
  slots,
  minPrice,
  today,
}: {
  products: FormProduct[]
  taken: Record<RecommendationPosition, SlotRange[]>
  slots: number
  minPrice: number
  today: string
}) {
  const { tr, lang } = useShop()
  const router = useRouter()
  const [position, setPosition] = useState<RecommendationPosition>(
    products.some((p) => p.sport === "football") || !products.some((p) => p.sport === "badminton") ? "football" : "badminton",
  )
  const choices = products.filter((p) => p.sport === position)
  const [productId, setProductId] = useState("")
  const [startDay, setStartDay] = useState(addDays(today, 1))
  const [days, setDays] = useState(7)
  const [price, setPrice] = useState(minPrice)
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [pending, start] = useTransition()

  const selected = choices.some((p) => p.id === productId) ? productId : ""
  const validDays = Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS
  const validStart = isDay(startDay) && startDay >= today && startDay <= addDays(today, MAX_LEAD_DAYS)
  const validPrice = Number.isInteger(price) && price >= minPrice
  const total = validDays && validPrice ? price * days : 0
  // Same rule the server applies, shown before sending: every day needs a free slot.
  const availability = useMemo(() => {
    if (!validStart || !validDays) return null
    const full = fullDays(taken[position], startDay, days, slots)
    return { full, nextFree: full.length ? firstFreeDay(taken[position], startDay, days, slots) : startDay }
  }, [taken, position, startDay, days, slots, validStart, validDays])
  const ready = !!selected && validStart && validDays && validPrice && !!availability && !availability.full.length

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready) return
    setResult(null)
    start(async () => {
      const res = await requestRecommendationAction({ productId: selected, position, startDay, days, pricePerDay: price }).catch(() => ({
        ok: false,
        error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again."),
      }))
      setResult(res)
      if (res.ok) {
        setProductId("")
        router.refresh()
      }
    })
  }

  const freeToday = (p: RecommendationPosition) => Math.max(0, slots - bookedOn(taken[p], today))

  return (
    <form onSubmit={submit} className="sc-card grid gap-5" aria-labelledby="dat-de-xuat">
      <div>
        <h2 id="dat-de-xuat" className="m-0 text-lg font-extrabold">{tr("Đặt suất đề xuất trên trang chủ", "Book a homepage spot")}</h2>
        <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">
          {tr(
            `Mỗi vị trí có ${slots} suất. Sản phẩm hiển thị với nhãn “Đề xuất” sau khi BOAI thu phí và duyệt; giá mỗi ngày cao hơn được xếp trước.`,
            `Each spot has ${slots} slots. Your product shows with a “Recommended” label once BOAI collects the fee and approves; a higher price per day ranks first.`,
          )}
        </p>
      </div>

      <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-2 text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">{tr("Vị trí", "Spot")}</legend>
        {RECOMMENDATION_POSITIONS.map((p) => {
          const label = POSITION_LABELS[p]
          const active = p === position
          return (
            <label
              key={p}
              className={`flex cursor-pointer items-start gap-3 border p-3 transition ${active ? "border-[var(--lime)] bg-[var(--soft-blue)]" : "border-[var(--line)] bg-[var(--white)] hover:border-[var(--ink)]"}`}
            >
              <input type="radio" name="position" className="mt-1" checked={active} onChange={() => setPosition(p)} />
              <span className="grid gap-0.5">
                <b className="text-sm">{lang === "en" ? label.en : label.vi}</b>
                <small className="text-[11px] text-[var(--muted)]">
                  {lang === "en" ? label.sportEn : label.sportVi} · {tr(`Hôm nay còn ${freeToday(p)}/${slots} suất`, `${freeToday(p)}/${slots} slots free today`)}
                </small>
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase sm:col-span-2">
          {tr("Sản phẩm", "Product")}
          {choices.length ? (
            <select className={input} value={selected} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">{tr("— Chọn sản phẩm —", "— Choose a product —")}</option>
              {choices.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <span className="mt-1.5 block border border-dashed border-[var(--line)] px-3 py-3 text-xs font-normal tracking-normal normal-case">
              {position === "football"
                ? tr("Shop chưa có sản phẩm bóng đá đang hiển thị.", "Your shop has no visible football products.")
                : tr("Shop chưa có sản phẩm cầu lông đang hiển thị.", "Your shop has no visible badminton products.")}
            </span>
          )}
        </label>
        <label className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
          {tr("Ngày bắt đầu", "Start date")}
          <input className={input} type="date" value={startDay} min={today} max={addDays(today, MAX_LEAD_DAYS)} onChange={(e) => setStartDay(e.target.value)} required />
        </label>
        <label className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
          {tr(`Số ngày (${MIN_DAYS}–${MAX_DAYS})`, `Days (${MIN_DAYS}–${MAX_DAYS})`)}
          <input className={input} type="number" inputMode="numeric" min={MIN_DAYS} max={MAX_DAYS} step={1} value={Number.isNaN(days) ? "" : days} onChange={(e) => setDays(e.target.valueAsNumber)} required />
        </label>
        <label className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase sm:col-span-2">
          {tr("Giá mỗi ngày (₫)", "Price per day (₫)")}
          <input className={input} type="number" inputMode="numeric" min={minPrice} step={1000} value={Number.isNaN(price) ? "" : price} onChange={(e) => setPrice(e.target.valueAsNumber)} required />
          <span className="mt-1 block text-[11px] font-normal tracking-normal text-[var(--muted)] normal-case">
            {tr(`Tối thiểu ${money(minPrice)}/ngày.`, `At least ${money(minPrice)}/day.`)}
          </span>
        </label>
      </div>

      <div className="grid gap-2 border border-[var(--line)] bg-[var(--paper)] p-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[var(--muted)]">
            {validStart && validDays
              ? `${formatDay(startDay)} – ${formatDay(addDays(startDay, days - 1))} · ${tr(`${days} ngày`, `${days} days`)}`
              : tr("Chọn ngày và số ngày", "Choose the dates")}
          </span>
          <b className="text-base">
            {tr("Tổng phí", "Total fee")}: {total ? money(total) : "—"}
          </b>
        </div>
        {availability &&
          (availability.full.length ? (
            <p role="alert" className="m-0 flex flex-wrap items-center gap-2 text-xs text-[#a42626]">
              {capacityMessage(slots, availability.nextFree, lang)}
              {availability.nextFree && (
                <button type="button" className="text-link" onClick={() => setStartDay(availability.nextFree!)}>
                  {tr(`Chọn ngày ${formatDay(availability.nextFree)}`, `Use ${formatDay(availability.nextFree)}`)}
                </button>
              )}
            </p>
          ) : (
            <p className="m-0 flex items-center gap-1.5 text-xs text-[#1d7a38]">
              <CalendarCheck2 size={14} /> {tr("Còn suất trống cho cả khoảng ngày đã chọn.", "Slots are free for every selected day.")}
            </p>
          ))}
      </div>

      {result && !result.ok && (
        <p role="alert" className="auth-error">
          {result.error}{" "}
          {result.suggestDay && (
            <button type="button" className="text-link" onClick={() => setStartDay(result.suggestDay!)}>
              {tr(`Chọn ngày ${formatDay(result.suggestDay)}`, `Use ${formatDay(result.suggestDay)}`)}
            </button>
          )}
        </p>
      )}
      {result?.ok && <p role="status" className="sc-ok m-0">{result.message}</p>}

      <div className="flex justify-end">
        <button className="boai-button primary" disabled={!ready || pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {pending ? tr("Đang gửi…", "Sending…") : tr("Gửi yêu cầu đề xuất", "Send request")}
        </button>
      </div>
    </form>
  )
}
