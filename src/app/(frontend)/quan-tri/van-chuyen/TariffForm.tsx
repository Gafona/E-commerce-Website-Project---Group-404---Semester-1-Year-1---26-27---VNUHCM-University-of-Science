"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { saveShippingTariffAction } from "../actions"
import { btn, Feedback, inputClass, useAdminAction } from "../AdminControls"
import {
  LONG_FROM_KM,
  LONG_PER_KM,
  MAX_ADJUST_PERCENT,
  MIN_ADJUST_PERCENT,
  PREVIEW_KMS,
  shippingFeeFor,
  tariffIssue,
  TARIFF_LIMITS,
} from "@/lib/shipping"
import { provincesByRegion, REGION_LABELS } from "@/lib/provinces"

const money = new Intl.NumberFormat("vi-VN")
const REGIONS = provincesByRegion()

type Values = { firstFee: string; firstKm: string; perKm: string; adjustPercent: string; defaultOrigin: string; originLat: string; originLng: string }

/** Admin tariff editor with the same validation as the server and a live fee preview. */
export function TariffForm({ initial }: { initial: Values }) {
  const { pending, result, run } = useAdminAction()
  const [values, setValues] = useState<Values>(initial)
  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues({ ...values, [key]: e.target.value })
  const numbers = {
    firstFee: Number(values.firstFee),
    firstKm: Number(values.firstKm),
    perKm: Number(values.perKm),
    adjustPercent: Number(values.adjustPercent),
  }
  const issue = tariffIssue({ firstFee: values.firstFee, firstKm: values.firstKm, perKm: values.perKm, adjustPercent: values.adjustPercent })
  const preview = useMemo(() => (issue ? null : PREVIEW_KMS.map((km) => ({ km, fee: shippingFeeFor(km, numbers) }))), [issue, numbers.firstFee, numbers.firstKm, numbers.perKm, numbers.adjustPercent])
  const label = "grid gap-1 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (issue) return
        run(() =>
          saveShippingTariffAction({
            ...numbers,
            defaultOrigin: values.defaultOrigin,
            originLat: values.originLat.trim() ? Number(values.originLat) : null,
            originLng: values.originLng.trim() ? Number(values.originLng) : null,
          }),
        )
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>
          Phí mở đầu (₫)
          <input className={inputClass} type="number" min={TARIFF_LIMITS.firstFee.min} max={TARIFF_LIMITS.firstFee.max} step={1000} value={values.firstFee} onChange={set("firstFee")} required />
        </label>
        <label className={label}>
          Cho số km đầu
          <input className={inputClass} type="number" min={TARIFF_LIMITS.firstKm.min} max={TARIFF_LIMITS.firstKm.max} step={0.5} value={values.firstKm} onChange={set("firstKm")} required />
        </label>
        <label className={label}>
          Mỗi km tiếp theo (₫)
          <input className={inputClass} type="number" min={TARIFF_LIMITS.perKm.min} max={TARIFF_LIMITS.perKm.max} step={500} value={values.perKm} onChange={set("perKm")} required />
        </label>
        <label className={label}>
          Điều chỉnh (%)
          <input className={inputClass} type="number" min={MIN_ADJUST_PERCENT} max={MAX_ADJUST_PERCENT} step={1} value={values.adjustPercent} onChange={set("adjustPercent")} required />
        </label>
      </div>
      <p className="m-0 text-[11px] leading-5 text-[var(--muted)]">
        Phí ship của mỗi shop = biểu phí theo khoảng cách (đường chim bay giữa kho và địa chỉ nhận × 1,3) × (1 + điều chỉnh/100), làm tròn đến 1.000₫. Từ km thứ {LONG_FROM_KM} mỗi km tính {money.format(LONG_PER_KM)}₫ (cố định). Khi thiếu tọa độ, hệ thống dùng khoảng cách giữa trung tâm hai tỉnh và ghi “Phí ước tính”.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>
          Kho của BOAI (hàng BOAI tự bán)
          <select className={inputClass} value={values.defaultOrigin} onChange={set("defaultOrigin")} required>
            {REGIONS.map(({ region, provinces }) => (
              <optgroup key={region} label={REGION_LABELS[region].vi}>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className={label}>
          Vĩ độ kho BOAI (tùy chọn)
          <input className={inputClass} inputMode="decimal" value={values.originLat} onChange={set("originLat")} placeholder="VD: 10.762622" />
        </label>
        <label className={label}>
          Kinh độ kho BOAI (tùy chọn)
          <input className={inputClass} inputMode="decimal" value={values.originLng} onChange={set("originLng")} placeholder="VD: 106.660172" />
        </label>
      </div>
      <section aria-label="Xem trước phí" className="border border-[var(--line)] bg-[var(--paper)] p-4">
        <b className="text-[12px]">Xem trước phí ship</b>
        {preview ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {preview.map(({ km, fee }) => (
              <div key={km} className="border border-[var(--line)] bg-[var(--white)] px-3 py-2">
                <small className="block text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">{km} km</small>
                <b className="text-lg tabular-nums">{money.format(fee)}₫</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 mt-2 text-[12px] font-semibold text-[#a42626]" role="alert">{issue?.[0]}</p>
        )}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !!issue} className={`${btn.base} ${btn.dark} min-h-10 px-5`}>
          {pending && <Loader2 size={13} className="animate-spin" />} Lưu biểu phí
        </button>
        <Feedback result={result} />
      </div>
    </form>
  )
}
