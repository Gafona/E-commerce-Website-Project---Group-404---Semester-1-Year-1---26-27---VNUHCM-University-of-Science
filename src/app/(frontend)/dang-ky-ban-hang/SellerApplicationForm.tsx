"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, CreditCard, MapPin, Phone, Store } from "lucide-react"
import { submitSellerApplication } from "./actions"
import { useShop } from "../components/ShopProvider"
import { provincesByRegion, REGION_LABELS } from "@/lib/provinces"

const REGIONS = provincesByRegion()

export function SellerApplicationForm({ rejected = false }: { rejected?: boolean }) {
  const { tr } = useShop()
  const router = useRouter()
  const [state, action, pending] = useActionState(submitSellerApplication, { ok: false })

  useEffect(() => {
    if (!state.ok) return
    if (state.href) router.push(state.href)
    else router.refresh()
  }, [router, state.href, state.ok])

  return (
    <form action={action} className="auth-form">
      {rejected && <p className="form-error">{tr("Hồ sơ trước đó chưa được duyệt. Bạn có thể cập nhật và gửi lại.", "Your previous application was not approved. Update it and submit again.")}</p>}
      <label className="auth-field">
        <span>{tr("Tên cửa hàng", "Shop name")}</span>
        <div><Store size={18} /><input name="shopName" minLength={2} maxLength={80} required /></div>
      </label>
      <label className="auth-field">
        <span>{tr("Loại hình kinh doanh", "Business type")}</span>
        <div><Building2 size={18} /><select name="businessType" defaultValue="individual"><option value="individual">{tr("Cá nhân", "Individual")}</option><option value="household">{tr("Hộ kinh doanh", "Household business")}</option><option value="company">{tr("Doanh nghiệp", "Company")}</option></select></div>
      </label>
      <label className="auth-field">
        <span>{tr("Số điện thoại cửa hàng", "Shop phone")}</span>
        <div><Phone size={18} /><input name="phone" inputMode="tel" minLength={9} maxLength={12} required /></div>
      </label>
      <label className="auth-field">
        <span>{tr("Địa chỉ kho", "Warehouse address")}</span>
        <div><MapPin size={18} /><input name="warehouseAddress" minLength={8} maxLength={300} required /></div>
      </label>
      <label className="auth-field">
        <span>{tr("Tỉnh / thành phố của kho", "Warehouse province / city")}</span>
        <div>
          <MapPin size={18} />
          <select name="warehouseProvince" defaultValue="" required>
            <option value="" disabled>{tr("— Chọn tỉnh / thành phố —", "— Choose a province —")}</option>
            {REGIONS.map(({ region, provinces }) => (
              <optgroup key={region} label={tr(REGION_LABELS[region].vi, REGION_LABELS[region].en)}>
                {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </label>
      <label className="auth-field">
        <span>{tr("Số CCCD (không bắt buộc)", "ID number (optional)")}</span>
        <div><CreditCard size={18} /><input name="idNumber" inputMode="numeric" minLength={12} maxLength={12} /></div>
      </label>
      <label className="auth-field">
        <span>{tr("Mã số thuế (không bắt buộc)", "Tax code (optional)")}</span>
        <div><Building2 size={18} /><input name="taxCode" inputMode="numeric" minLength={10} maxLength={13} /></div>
      </label>
      {state.error && <p className="form-error" role="alert">{tr(state.error)}</p>}
      <button className="boai-button primary full" disabled={pending}>{pending ? tr("Đang gửi…", "Submitting…") : tr("Gửi hồ sơ xét duyệt", "Submit for review")}</button>
    </form>
  )
}
