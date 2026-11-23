"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, ChevronDown, Store } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { updateCustomServiceAction } from "../actions"

export type CustomServiceValues = {
  enabled: boolean
  intro: string
  priceFrom: string
  minQuantity: string
  leadDays: string
}

/** Đăng ký nhận may áo custom: hiển thị shop ở trang /custom-ao để khách gửi mẫu. */
export function CustomServiceForm({ values }: { values: CustomServiceValues }) {
  const { tr } = useShop()
  const [state, action, pending] = useActionState(updateCustomServiceAction, { ok: false })
  const [open, setOpen] = useState(!values.enabled)

  return (
    <section className="sc-card mb-5 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`grid size-10 shrink-0 place-items-center ${values.enabled ? "bg-emerald-100 text-emerald-700" : "bg-[var(--soft-blue)] text-[var(--lime-dark)]"}`}>
          {values.enabled ? <CheckCircle2 size={19} /> : <Store size={19} />}
        </span>
        <span className="min-w-0 flex-1">
          <small className="block text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--muted)]">{tr("Đăng ký dịch vụ", "Service registration")}</small>
          <b className="block text-sm">
            {values.enabled
              ? tr("Shop đang nhận may áo custom", "Your shop is accepting custom orders")
              : tr("Đăng ký nhận may áo custom", "Register for custom orders")}
          </b>
        </span>
        <span className={`sc-badge ${values.enabled ? "delivered" : "pending"}`}>{values.enabled ? tr("Đang nhận", "Accepting") : tr("Chưa bật", "Off")}</span>
        <ChevronDown size={17} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form action={action} className="sc-form border-t border-[var(--line)] p-4">
          <label className="wide flex! cursor-pointer flex-row! items-start gap-3 border border-[var(--line)] bg-[var(--soft-blue)] p-3 normal-case!">
            <input type="checkbox" name="customEnabled" defaultChecked={values.enabled} className="mt-0.5 size-4 accent-[var(--lime)]" />
            <span className="text-xs font-normal leading-5">
              <b className="block text-[13px]">{tr("Hiển thị shop ở trang Custom áo", "Show my shop on the Custom page")}</b>
              {tr(
                "Khách thiết kế áo, quần xong có thể chọn shop của bạn để gửi mẫu. Yêu cầu sẽ hiện ngay bên dưới.",
                "Customers can pick your shop to send their kit design. Requests appear right below.",
              )}
            </span>
          </label>
          <label className="wide">
            {tr("Giới thiệu dịch vụ", "Service intro")}
            <textarea name="customIntro" rows={2} maxLength={300} defaultValue={values.intro} placeholder={tr("Ví dụ: In chuyển nhiệt, vải thun lạnh, tặng in tên số, may cả bộ áo quần…", "e.g. Sublimation print, cooling fabric, free names & numbers, full kits…")} />
          </label>
          <div className="wide grid gap-3 sm:grid-cols-3">
            <label>{tr("Giá từ (₫/áo)", "Price from (₫/pc)")}<input name="customPriceFrom" type="number" min={0} step={1000} inputMode="numeric" defaultValue={values.priceFrom} placeholder="120000" /></label>
            <label>{tr("Số lượng tối thiểu", "Minimum quantity")}<input name="customMinQuantity" type="number" min={1} max={1000} inputMode="numeric" defaultValue={values.minQuantity} /></label>
            <label>{tr("Thời gian làm (ngày)", "Lead time (days)")}<input name="customLeadDays" type="number" min={1} max={90} inputMode="numeric" defaultValue={values.leadDays} placeholder="7" /></label>
          </div>
          <div className="wide flex flex-wrap items-center gap-3">
            <button type="submit" className="boai-button primary" disabled={pending}>
              {pending ? tr("Đang lưu…", "Saving…") : tr("Lưu dịch vụ custom", "Save custom service")}
            </button>
            {state.error && <p role="alert" className="m-0 text-xs font-semibold text-[var(--sale)]">{state.error}</p>}
            {state.ok && state.message && <p role="status" className="m-0 text-xs font-semibold text-emerald-700">{state.message}</p>}
          </div>
        </form>
      )}
    </section>
  )
}
