import "server-only"
import { redirect } from "next/navigation"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { isAppAdmin } from "@/access/roles"
import type { User } from "@/payload-types"

export type AppAdmin = User & { collection: "users" }

/** Session check for pages: unauthenticated visitors go to login, members go home. */
export async function requireAdmin(): Promise<AppAdmin> {
  const user = await appAuth.currentUser()
  if (!user) redirect("/dang-nhap?next=%2Fquan-tri")
  if (!isAppAdmin(user)) redirect("/")
  return user as AppAdmin
}

/** Session check for actions: never redirects, returns null when not allowed. */
export async function currentAdmin(): Promise<AppAdmin | null> {
  const user = await appAuth.currentUser()
  return isAppAdmin(user) ? (user as AppAdmin) : null
}

export const db = getPayloadClient

export const fmtDate = (value?: string | null, withTime = false) =>
  value
    ? new Date(value).toLocaleString("vi-VN", withTime
        ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }
        : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" })
    : "—"

export const BUSINESS_TYPE: Record<string, string> = {
  individual: "Cá nhân",
  household: "Hộ kinh doanh",
  company: "Doanh nghiệp",
}

export const REVIEW_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "Chờ duyệt", tone: "pending" },
  approved: { label: "Đã duyệt", tone: "delivered" },
  rejected: { label: "Từ chối", tone: "cancelled" },
  suspended: { label: "Đã khóa", tone: "cancelled" },
  none: { label: "Chưa đăng ký", tone: "" },
}
