import Link from "next/link"
import { db, requireSeller } from "../seller-lib"
import { SellerProfileForm } from "./SellerProfileForm"
import { getTr } from "@/lib/i18n-server"
import { ShopRenameForm } from "../../components/ShopRenameForm"
import { detectProvince, resolveProvince } from "@/lib/provinces"
import { missingSellerProfile } from "@/lib/seller-profile"

export default async function ShopSettings() {
  const seller = await requireSeller({ allowIncomplete: true })
  const tr = await getTr()
  const payload = await db()
  const user = await payload.findByID({ collection: "users", id: seller.id, overrideAccess: false, user: seller })
  const info = user.seller ?? {}
  // Older shops only saved a free-text address; preselect the province we can infer.
  const province = resolveProvince(info.warehouseProvince) ?? detectProvince(info.warehouseAddress)
  const s = {
    name: String(user.name ?? ""),
    personalPhone: String(user.phone ?? ""),
    address: String(user.address ?? ""),
    shopName: String(info.shopName ?? ""),
    businessType: String(info.businessType ?? ""),
    idNumber: String(info.idNumber ?? ""),
    taxCode: String(info.taxCode ?? ""),
    businessLicense: String(info.businessLicense ?? ""),
    shopPhone: String(info.phone ?? ""),
    bankCode: String(info.bankCode ?? ""),
    bankAccountNumber: String(info.bankAccountNumber ?? ""),
    bankAccountHolder: String(info.bankAccountHolder ?? ""),
    warehouseAddress: String(info.warehouseAddress ?? ""),
    warehouseProvince: province?.code ?? "",
    provinceSaved: info.warehouseProvince ? "1" : "",
    warehouseLat: info.warehouseLat != null ? String(info.warehouseLat) : "",
    warehouseLng: info.warehouseLng != null ? String(info.warehouseLng) : "",
  }
  return (
    <>
      <header className="sc-head"><div><small>{tr("Tài khoản người bán", "Seller account")}</small><h1>{tr("Hồ sơ & cài đặt", "Profile & settings")}</h1></div></header>
      <section className="sc-card sc-form-section mb-5">
        <div className="sc-section-head">
          <div><small>{tr("Thương hiệu cửa hàng", "Store identity")}</small><h3>{tr("Đổi tên shop", "Rename your shop")}</h3></div>
          <Link className="boai-button" href={`/cua-hang/${seller.id}`}>{tr("Xem trang shop", "View shop page")}</Link>
        </div>
        <ShopRenameForm name={s.shopName || user.name} />
      </section>
      <SellerProfileForm s={s} missing={missingSellerProfile(user).map((field) => field.key)} />
    </>
  )
}
