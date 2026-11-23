"use client"

import { useActionState, useState } from "react"
import { updateShopAction } from "../actions"
import { useShop } from "../../components/ShopProvider"
import { BANKS } from "@/lib/banks"
import { provincesByRegion, REGION_LABELS } from "@/lib/provinces"
import { WarehouseLocator } from "./WarehouseLocator"

const REGIONS = provincesByRegion()

export function SellerProfileForm({ s, missing = [] }: { s: Record<string, string>; missing?: string[] }) {
  const [state, action, pending] = useActionState(updateShopAction, { ok: false })
  const { tr } = useShop()
  const [businessType, setBusinessType] = useState(s.businessType || "individual")
  const isCompany = businessType === "company"
  // Company sellers may save blanks, but these fields must be filled for the shop to operate.
  const mark = (key: string) =>
    isCompany ? (
      <span className={`ml-1 text-[10px] font-bold ${missing.includes(key) ? "text-[#a42626]" : "text-[var(--muted)]"}`} title={tr("Bắt buộc để doanh nghiệp hoạt động", "Required for company shops to operate")}>
        {missing.includes(key) ? tr("● còn thiếu", "● missing") : "●"}
      </span>
    ) : null
  return (
    <form action={action} className="sc-settings">
      <section className="sc-card sc-form-section">
        <div className="sc-section-head">
          <div><small>{tr("Người đại diện", "Representative")}</small><h3>{tr("Thông tin liên hệ", "Contact information")}</h3></div>
        </div>
        <div className="sc-form">
          <label>{tr("Họ và tên")} *{mark("name")}<input name="name" defaultValue={s.name} required /></label>
          <label>{tr("Số điện thoại cá nhân", "Personal phone")}{mark("personalPhone")}<input name="personalPhone" defaultValue={s.personalPhone} /></label>
          <label className="wide">{tr("Địa chỉ liên hệ", "Contact address")}<input name="address" defaultValue={s.address} /></label>
        </div>
      </section>

      <section className="sc-card sc-form-section">
        <div className="sc-section-head">
          <div><small>{tr("Hồ sơ pháp lý", "Legal profile")}</small><h3>{tr("Thông tin doanh nghiệp", "Business information")}</h3></div>
          {isCompany && missing.length > 0 ? (
            <span className="sc-badge pending">{tr("Chưa đủ thông tin", "Incomplete")}</span>
          ) : (
            <span className="sc-badge">{tr("Đã khai báo", "Submitted")}</span>
          )}
        </div>
        {isCompany && (
          <p className="m-0 mb-3 text-xs leading-5 text-[var(--muted)]">
            {tr(
              "Doanh nghiệp cần điền đủ các mục có dấu ● để cửa hàng hoạt động. Bạn vẫn có thể lưu khi còn bỏ trống, nhưng mọi chức năng bán hàng sẽ tạm dừng cho tới khi đủ thông tin.",
              "Companies must fill in every field marked ● for the shop to operate. You can still save with blanks, but all selling features stay paused until the profile is complete.",
            )}
          </p>
        )}
        <div className="sc-form">
          <label>{tr("Loại hình kinh doanh", "Business type")}
            <select name="businessType" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="individual">{tr("Cá nhân", "Individual")}</option>
              <option value="household">{tr("Hộ kinh doanh", "Household business")}</option>
              <option value="company">{tr("Doanh nghiệp", "Company")}</option>
            </select>
          </label>
          <label>{tr("Số CCCD / định danh", "Identity number")}{mark("idNumber")}<input name="idNumber" inputMode="numeric" defaultValue={s.idNumber} /></label>
          <label>{tr("Mã số thuế", "Tax number")}{mark("taxCode")}<input name="taxCode" defaultValue={s.taxCode} /></label>
          <label>{tr("Số giấy phép kinh doanh", "Business license number")}{mark("businessLicense")}<input name="businessLicense" defaultValue={s.businessLicense} /></label>
        </div>
      </section>

      <section className="sc-card sc-form-section">
        <div className="sc-section-head"><div><small>{tr("Hiển thị và giao nhận", "Storefront & fulfillment")}</small><h3>{tr("Cửa hàng & vận hành", "Store & operations")}</h3></div></div>
        <div className="sc-form">
          <label>{tr("Số điện thoại cửa hàng", "Store phone")}{mark("shopPhone")}<input name="shopPhone" defaultValue={s.shopPhone} /></label>
          <label className="wide">{tr("Địa chỉ kho / lấy hàng", "Warehouse / pickup address")}{mark("warehouseAddress")}<textarea name="warehouseAddress" rows={3} defaultValue={s.warehouseAddress} /></label>
        </div>
      </section>

      <section className="sc-card sc-form-section">
        <div className="sc-section-head">
          <div><small>{tr("Giao hàng", "Delivery")}</small><h3>{tr("Vị trí kho", "Warehouse location")}</h3></div>
          {!s.provinceSaved && <span className="sc-badge pending">{tr("Cần xác nhận tỉnh kho", "Confirm warehouse province")}</span>}
        </div>
        <div className="sc-form">
          <label className="wide">{tr("Tỉnh / thành phố của kho", "Warehouse province / city")}{isCompany ? mark("warehouseProvince") : " *"}
            <select name="warehouseProvince" defaultValue={s.warehouseProvince} required={!isCompany}>
              <option value="">{tr("— Chọn tỉnh / thành phố —", "— Choose a province —")}</option>
              {REGIONS.map(({ region, provinces }) => (
                <optgroup key={region} label={tr(REGION_LABELS[region].vi, REGION_LABELS[region].en)}>
                  {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <WarehouseLocator initial={s.warehouseLat && s.warehouseLng ? { lat: Number(s.warehouseLat), lng: Number(s.warehouseLng), label: s.warehouseAddress } : null} />
          <p className="wide m-0 text-xs leading-5 text-[var(--muted)]">
            {tr(
              "Phí ship được tính tự động lúc khách đặt hàng, theo khoảng cách từ kho của bạn tới địa chỉ nhận. Kho đã định vị cho phí chính xác; chưa định vị thì BOAI ước tính theo tỉnh/thành.",
              "Shipping is priced automatically at checkout from the distance between your warehouse and the delivery address. A located warehouse gives exact fees; otherwise BOAI estimates by province.",
            )}
          </p>
        </div>
      </section>

      <section className="sc-card sc-form-section">
        <div className="sc-section-head"><div><small>{tr("Đối soát doanh thu", "Revenue reconciliation")}</small><h3>{tr("Tài khoản nhận tiền từ BOAI", "Account for BOAI payouts")}</h3></div></div>
        <div className="sc-form">
          <label>{tr("Ngân hàng", "Bank")}{mark("bank")}
            <select name="bankCode" defaultValue={s.bankCode}>
              <option value="">{tr("— Chọn ngân hàng —", "— Select a bank —")}</option>
              {BANKS.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </select>
          </label>
          <label>{tr("Số tài khoản", "Account number")}<input name="bankAccountNumber" inputMode="numeric" defaultValue={s.bankAccountNumber} placeholder="0123456789" /></label>
          <label className="wide">{tr("Chủ tài khoản", "Account holder")}<input name="bankAccountHolder" defaultValue={s.bankAccountHolder} placeholder="NGUYEN VAN A" className="uppercase" /></label>
          <p className="wide m-0 text-xs leading-5 text-[var(--muted)]">{tr("Khách chuyển khoản vào tài khoản của BOAI. Khi đơn của shop hoàn tất, BOAI chuyển tiền hàng vào đúng tài khoản này; theo dõi từng khoản trong mục Tiền chờ nhận.", "Customers pay by bank transfer into BOAI's account. When your part of an order is completed, BOAI pays you into this account; track each payout under Pending payouts.")}</p>
        </div>
      </section>

      {state.error && <p className="auth-error wide">{state.error}</p>}
      {state.message && <p className="sc-ok wide">{state.message}</p>}
      <div className="sc-settings-actions">
        <small>{tr("Thông tin sẽ được cập nhật cho hồ sơ người bán của bạn.", "Your seller profile will be updated with this information.")}</small>
        <button className="boai-button primary" disabled={pending}>{pending ? tr("Đang lưu...", "Saving...") : tr("Lưu tất cả thay đổi", "Save all changes")}</button>
      </div>
    </form>
  )
}
