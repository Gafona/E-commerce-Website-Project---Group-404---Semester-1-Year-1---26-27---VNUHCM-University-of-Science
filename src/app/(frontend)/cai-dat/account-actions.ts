"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getTr } from "@/lib/i18n-server"
import { hit } from "@/lib/rate-limit"
import { isAppAdmin } from "@/access/roles"
import { passwordIssue } from "@/lib/password-policy"
import type { User } from "@/payload-types"

type AppUser = User & { collection: "users" }
type Result = { ok: true; message: string } | { ok: false; error: string }

const ACTIVE_ORDER = ["awaiting_payment", "pending", "shipping"]
/** Custom-made kits still being quoted, accepted or sewn: the other side needs this account. */
const ACTIVE_CUSTOM = ["pending", "quoted", "accepted", "in_production"]

/** Re-checks the current password without touching the session cookie. */
async function passwordMatches(email: string, password: string) {
  try {
    const result = await (await getPayloadClient()).login({ collection: "users", data: { email, password } })
    return !!result.user
  } catch {
    return false
  }
}

export async function changePasswordAction(input: { current: string; next: string; confirm: string }): Promise<Result> {
  const tr = await getTr()
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập lại.", "Please sign in again.") }
  const current = String(input?.current ?? "")
  const next = String(input?.next ?? "")
  if (!current) return { ok: false, error: tr("Vui lòng nhập mật khẩu hiện tại.", "Enter your current password.") }
  const issue = passwordIssue(next)
  if (issue) return { ok: false, error: tr(...issue) }
  if (next !== String(input?.confirm ?? "")) return { ok: false, error: tr("Mật khẩu xác nhận không khớp.", "Passwords do not match.") }
  if (next === current) return { ok: false, error: tr("Mật khẩu mới phải khác mật khẩu hiện tại.", "Choose a password different from the current one.") }
  if (!hit(`password-change:${user.id}`, 5, 15 * 60_000).ok) return { ok: false, error: tr("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.", "Too many attempts. Try again in 15 minutes.") }
  if (!(await passwordMatches(user.email, current))) return { ok: false, error: tr("Mật khẩu hiện tại không đúng.", "Your current password is incorrect.") }
  try {
    await (await getPayloadClient()).update({ collection: "users", id: user.id, data: { password: next }, overrideAccess: false, user, depth: 0 })
    // Start a fresh session with the new password (older sessions may be invalidated).
    await appAuth.login(user.email, next)
    return { ok: true, message: tr("Đã đổi mật khẩu.", "Password changed.") }
  } catch {
    return { ok: false, error: tr("Không thể đổi mật khẩu. Vui lòng thử lại.", "Couldn't change the password. Please try again.") }
  }
}

/**
 * Permanently deletes the signed-in account. The Users beforeDelete hook runs
 * cleanupAccount (community content, shop products, designs, assessments,
 * notifications...). Orders stay as anonymous-by-account sales records.
 */
export async function deleteAccountAction(input: { password: string; confirmText: string }): Promise<Result> {
  const tr = await getTr()
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập lại.", "Please sign in again.") }
  if (isAppAdmin(user)) return { ok: false, error: tr("Tài khoản quản trị không thể tự xóa. Hãy liên hệ BOAI.", "Admin accounts can't delete themselves. Contact BOAI.") }
  const phrase = String(input?.confirmText ?? "").trim().toUpperCase()
  if (phrase !== "XOA" && phrase !== "XÓA" && phrase !== "DELETE") return { ok: false, error: tr("Gõ XOA để xác nhận.", "Type DELETE to confirm.") }
  if (!hit(`account-delete:${user.id}`, 5, 15 * 60_000).ok) return { ok: false, error: tr("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.", "Too many attempts. Try again in 15 minutes.") }
  if (!(await passwordMatches(user.email, String(input?.password ?? "")))) return { ok: false, error: tr("Mật khẩu không đúng.", "Incorrect password.") }
  const payload = await getPayloadClient()
  // Open orders must finish first so buyers and shops are not left without a counterpart.
  const products = await payload.find({ collection: "products", where: { seller: { equals: user.id } }, depth: 0, pagination: false, select: {}, overrideAccess: true })
  const productIds = products.docs.map((p) => p.id)
  const open = await payload.count({
    collection: "orders",
    where: {
      and: [
        { status: { in: ACTIVE_ORDER } },
        {
          or: [
            { customer: { equals: user.id } },
            { "items.seller": { equals: user.id } },
            ...(productIds.length ? [{ "items.product": { in: productIds } }] : []),
          ],
        },
      ],
    },
    overrideAccess: true,
  })
  if (open.totalDocs)
    return {
      ok: false,
      error: tr(
        `Bạn còn ${open.totalDocs} đơn hàng chưa hoàn tất. Hãy hoàn tất hoặc hủy các đơn này trước khi xóa tài khoản.`,
        `You still have ${open.totalDocs} open order(s). Complete or cancel them before deleting your account.`,
      ),
    }
  const custom = await payload.count({
    collection: "custom-jersey-requests",
    where: { and: [{ status: { in: ACTIVE_CUSTOM } }, { or: [{ customer: { equals: user.id } }, { shop: { equals: user.id } }] }] },
    overrideAccess: true,
  })
  if (custom.totalDocs)
    return {
      ok: false,
      error: tr(
        `Bạn còn ${custom.totalDocs} yêu cầu may áo custom đang xử lý. Hãy hoàn tất hoặc hủy chúng trước khi xóa tài khoản.`,
        `You still have ${custom.totalDocs} custom kit request(s) in progress. Finish or cancel them before deleting your account.`,
      ),
    }
  try {
    await payload.delete({ collection: "users", id: user.id, overrideAccess: false, user })
    await appAuth.logout()
    return { ok: true, message: tr("Tài khoản đã được xóa.", "Your account has been deleted.") }
  } catch (error) {
    console.error("deleteAccountAction failed", error)
    return { ok: false, error: tr("Không thể xóa tài khoản. Vui lòng thử lại hoặc liên hệ BOAI.", "Couldn't delete the account. Try again or contact BOAI.") }
  }
}
