"use server"

import { headers } from "next/headers"
import { SUSPENDED_MESSAGE } from "@/access/roles"
import { getLang, getTr } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { clientIp, hit } from "@/lib/rate-limit"
import {
  looksLikeResetToken,
  passwordIssue,
  RESET_LIMIT_STATUS,
  RESET_REQUESTS_PER_HOUR,
} from "@/lib/password-policy"
import { siteOrigin } from "@/lib/password-reset-email"

export type ForgotState = { status: "idle" | "sent" | "error"; message?: string; email?: string; sentAt?: number }
export type ResetResult = { ok: true } | { ok: false; error: string; expired?: boolean }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const statusOf = (error: unknown) =>
  error && typeof error === "object" && "status" in error ? Number((error as { status: unknown }).status) : 0

/**
 * Emails a single-use reset link. The reply is identical whether or not the
 * address has an account, so the form cannot be used to discover members.
 */
export async function requestPasswordResetAction(_previous: ForgotState, formData: FormData): Promise<ForgotState> {
  const tr = await getTr()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!email) return { status: "error", email, message: tr("Vui lòng nhập email đã đăng ký.", "Enter the email you signed up with.") }
  if (email.length > 254 || !EMAIL.test(email))
    return { status: "error", email, message: tr("Email không hợp lệ. Ví dụ: ban@example.com", "That email doesn't look right. Example: you@example.com") }
  // Stops one device spraying many addresses; the per-address hourly cap is enforced by the Users collection.
  if (!hit(`password-reset-ip:${await clientIp()}`, 20, 60 * 60_000).ok)
    return { status: "error", email, message: tr("Thiết bị này đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.", "Too many requests from this device. Try again in an hour.") }
  try {
    const payload = await getPayloadClient()
    await payload.forgotPassword({
      collection: "users",
      data: { email },
      overrideAccess: false,
      context: { lang: await getLang(), resetOrigin: siteOrigin(await headers()) },
    })
  } catch (error) {
    if (statusOf(error) === RESET_LIMIT_STATUS) {
      const waitMs = Number((error as { data?: { retryAfterMs?: number } }).data?.retryAfterMs) || 60 * 60_000
      const minutes = Math.max(1, Math.ceil(waitMs / 60_000))
      return {
        status: "error",
        email,
        message: tr(
          `Bạn đã yêu cầu ${RESET_REQUESTS_PER_HOUR} lần trong 1 giờ. Vui lòng thử lại sau khoảng ${minutes} phút.`,
          `You've asked ${RESET_REQUESTS_PER_HOUR} times in the last hour. Try again in about ${minutes} min.`,
        ),
      }
    }
    // Delivery failures are logged but answered like success so the reply never reveals an account.
    console.error("requestPasswordResetAction failed", error)
  }
  return { status: "sent", email, sentAt: Date.now() }
}

export async function resetPasswordAction(input: { token: string; password: string; confirm: string }): Promise<ResetResult> {
  const tr = await getTr()
  const token = String(input?.token ?? "")
  const password = String(input?.password ?? "")
  const expired = {
    ok: false as const,
    expired: true,
    error: tr(
      "Liên kết đã hết hạn hoặc đã được dùng. Hãy gửi lại liên kết mới.",
      "This link has expired or was already used. Request a new one.",
    ),
  }
  if (!looksLikeResetToken(token)) return expired
  const issue = passwordIssue(password)
  if (issue) return { ok: false, error: tr(...issue) }
  if (password !== String(input?.confirm ?? "")) return { ok: false, error: tr("Mật khẩu xác nhận không khớp.", "Passwords do not match.") }
  if (!hit(`password-reset-submit:${await clientIp()}`, 20, 15 * 60_000).ok)
    return { ok: false, error: tr("Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.", "Too many attempts. Try again in 15 minutes.") }
  try {
    const payload = await getPayloadClient()
    // Payload checks the token and expiry, stores the new hash, ends every other session
    // and expires the token, so the link works only once.
    await payload.resetPassword({ collection: "users", data: { token, password }, overrideAccess: false })
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === SUSPENDED_MESSAGE)
      return { ok: false, error: tr(SUSPENDED_MESSAGE, "This account has been suspended by BOAI.") }
    if (statusOf(error) === 403) return expired
    console.error("resetPasswordAction failed", error)
    return { ok: false, error: tr("Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại.", "Couldn't reset the password right now. Please try again.") }
  }
}
