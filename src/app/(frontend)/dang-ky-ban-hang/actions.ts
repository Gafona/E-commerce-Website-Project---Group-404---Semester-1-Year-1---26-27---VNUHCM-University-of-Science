"use server"

import config from "@payload-config"
import { getPayload } from "payload"
import { appAuth } from "@/lib/app-auth"
import type { User } from "@/payload-types"
import { resolveProvince } from "@/lib/provinces"

export type SellerApplicationState = {
  ok: boolean
  error?: string
  message?: string
  href?: string
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim()

export async function submitSellerApplication(
  _previous: SellerApplicationState,
  formData: FormData,
): Promise<SellerApplicationState> {
  const user = (await appAuth.currentUser()) as (User & { collection: "users" }) | null
  if (!user) return { ok: false, error: "Vui lòng đăng nhập trước khi đăng ký bán hàng.", href: "/dang-nhap" }
  if (user.sellerStatus === "approved") return { ok: true, message: "Tài khoản đã được duyệt.", href: "/kenh-ban-hang" }
  if (user.sellerStatus === "pending") return { ok: false, error: "Hồ sơ của bạn đang chờ duyệt." }
  if (user.sellerStatus === "suspended") return { ok: false, error: "Cửa hàng của bạn đang bị khóa. Hãy gửi kháng cáo tới BOAI.", href: "/khoa-cua-hang" }

  const shopName = text(formData, "shopName")
  const businessType = text(formData, "businessType")
  const phone = text(formData, "phone").replace(/\s+/g, "")
  const warehouseAddress = text(formData, "warehouseAddress")
  const idNumber = text(formData, "idNumber")
  const taxCode = text(formData, "taxCode")

  if (shopName.length < 2 || shopName.length > 80) return { ok: false, error: "Tên cửa hàng phải có từ 2–80 ký tự." }
  if (!["individual", "household", "company"].includes(businessType)) return { ok: false, error: "Loại hình kinh doanh không hợp lệ." }
  if (!/^[0-9+]{9,12}$/.test(phone)) return { ok: false, error: "Số điện thoại không hợp lệ." }
  if (warehouseAddress.length < 8 || warehouseAddress.length > 300) return { ok: false, error: "Địa chỉ kho phải có từ 8–300 ký tự." }
  const warehouseProvince = resolveProvince(text(formData, "warehouseProvince"))
  if (!warehouseProvince) return { ok: false, error: "Vui lòng chọn tỉnh/thành phố của kho." }
  if (idNumber && !/^\d{12}$/.test(idNumber)) return { ok: false, error: "Số CCCD phải gồm đúng 12 chữ số." }
  if (taxCode && !/^\d{10}(?:\d{3})?$/.test(taxCode)) return { ok: false, error: "Mã số thuế phải gồm 10 hoặc 13 chữ số." }

  const payload = await getPayload({ config })
  try {
    await payload.update({
      collection: "users",
      id: user.id,
      overrideAccess: false,
      user,
      data: {
        phone,
        sellerStatus: "pending",
        seller: {
          ...user.seller,
          shopName,
          businessType: businessType as "individual" | "household" | "company",
          phone,
          warehouseAddress,
          warehouseProvince: warehouseProvince.code as NonNullable<User["seller"]>["warehouseProvince"],
          idNumber: idNumber || undefined,
          taxCode: taxCode || undefined,
        },
      },
    })
    return { ok: true, message: "Đã gửi hồ sơ. BOAI sẽ duyệt tài khoản trước khi bạn bắt đầu bán hàng." }
  } catch {
    return { ok: false, error: "Không thể gửi hồ sơ lúc này. Vui lòng thử lại." }
  }
}
