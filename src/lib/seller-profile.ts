// Basic profile a company seller must complete before any selling feature works.
// Saving with blanks is allowed; the shop is simply paused until everything is filled in.

type ProfileCarrier = {
  name?: string | null
  phone?: string | null
  seller?: {
    businessType?: string | null
    shopName?: string | null
    idNumber?: string | null
    taxCode?: string | null
    businessLicense?: string | null
    phone?: string | null
    warehouseAddress?: string | null
    warehouseProvince?: string | null
    bankCode?: string | null
    bankAccountNumber?: string | null
    bankAccountHolder?: string | null
  } | null
}

const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0

export const COMPANY_REQUIRED_FIELDS: { key: string; label: string; labelEn: string; ok: (u: ProfileCarrier) => boolean }[] = [
  { key: "name", label: "Họ tên người đại diện", labelEn: "Representative name", ok: (u) => filled(u.name) },
  { key: "personalPhone", label: "Số điện thoại người đại diện", labelEn: "Representative phone", ok: (u) => filled(u.phone) },
  { key: "shopName", label: "Tên cửa hàng", labelEn: "Shop name", ok: (u) => filled(u.seller?.shopName) },
  { key: "idNumber", label: "Số CCCD người đại diện", labelEn: "Representative ID number", ok: (u) => filled(u.seller?.idNumber) },
  { key: "taxCode", label: "Mã số thuế", labelEn: "Tax number", ok: (u) => filled(u.seller?.taxCode) },
  { key: "businessLicense", label: "Số giấy phép kinh doanh", labelEn: "Business license number", ok: (u) => filled(u.seller?.businessLicense) },
  { key: "shopPhone", label: "Số điện thoại cửa hàng", labelEn: "Store phone", ok: (u) => filled(u.seller?.phone) },
  { key: "warehouseAddress", label: "Địa chỉ kho / lấy hàng", labelEn: "Warehouse address", ok: (u) => filled(u.seller?.warehouseAddress) },
  { key: "warehouseProvince", label: "Tỉnh / thành của kho", labelEn: "Warehouse province", ok: (u) => filled(u.seller?.warehouseProvince) },
  {
    key: "bank",
    label: "Tài khoản ngân hàng nhận tiền",
    labelEn: "Payout bank account",
    ok: (u) => filled(u.seller?.bankCode) && filled(u.seller?.bankAccountNumber) && filled(u.seller?.bankAccountHolder),
  },
]

export const isCompanySeller = (user: ProfileCarrier | null | undefined) => user?.seller?.businessType === "company"

/** Missing basic fields for company sellers; always empty for other seller types. */
export function missingSellerProfile(user: ProfileCarrier | null | undefined) {
  if (!user || !isCompanySeller(user)) return []
  return COMPANY_REQUIRED_FIELDS.filter((field) => !field.ok(user))
}

export const isSellerProfileIncomplete = (user: ProfileCarrier | null | undefined) => missingSellerProfile(user).length > 0

/** Fields Payload must select to evaluate completeness. */
export const SELLER_PROFILE_SELECT = {
  name: true,
  phone: true,
  seller: {
    businessType: true,
    shopName: true,
    idNumber: true,
    taxCode: true,
    businessLicense: true,
    phone: true,
    warehouseAddress: true,
    warehouseProvince: true,
    bankCode: true,
    bankAccountNumber: true,
    bankAccountHolder: true,
  },
} as const
