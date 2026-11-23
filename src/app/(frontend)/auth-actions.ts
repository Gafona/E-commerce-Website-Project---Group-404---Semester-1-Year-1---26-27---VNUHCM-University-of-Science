"use server"

import { getTr } from "@/lib/i18n-server"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { SUSPENDED_MESSAGE } from "@/access/roles"

export type AuthState = { ok: boolean; error?: string }

export async function loginAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const tr = await getTr()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) return { ok: false, error: tr("Vui lòng nhập email và mật khẩu.", "Enter your email and password.") }
  try {
    await appAuth.login(email, password)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === SUSPENDED_MESSAGE)
      return { ok: false, error: tr(SUSPENDED_MESSAGE, "This account has been suspended by BOAI.") }
    return { ok: false, error: tr("Email hoặc mật khẩu không đúng.", "Incorrect email or password.") }
  }
}

export async function registerAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const tr = await getTr()
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")
  if (name.length < 2 || name.length > 80) return { ok: false, error: tr("Tên phải có từ 2 đến 80 ký tự.", "Name must be between 2 and 80 characters.") }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: tr("Email không hợp lệ.", "Enter a valid email.") }
  if (password.length < 8 || password.length > 128) return { ok: false, error: tr("Mật khẩu phải có từ 8 đến 128 ký tự.", "Password must be 8 to 128 characters.") }
  if (password !== confirmPassword) return { ok: false, error: tr("Mật khẩu xác nhận không khớp.", "Passwords do not match.") }
  try {
    const payload = await getPayloadClient()
    await payload.create({ collection: "users", overrideAccess: false, data: { name, email, password } })
    await appAuth.login(email, password)
    return { ok: true }
  } catch {
    return { ok: false, error: tr("Không thể tạo tài khoản. Email có thể đã được sử dụng.", "Could not create the account. That email may already be in use.") }
  }
}

export async function logoutAction(): Promise<void> {
  await appAuth.logout()
}

export async function getSessionUserAction(): Promise<{ name: string; email: string; sellerStatus?: string; role?: string; avatarUrl: string | null } | null> {
  const user = await appAuth.currentUser()
  if (!user) return null
  // The session token carries ids only; read the avatar upload for its URL.
  const payload = await getPayloadClient()
  const account = await payload
    .findByID({ collection: "users", id: user.id, depth: 1, overrideAccess: false, user, select: { avatar: true } })
    .catch(() => null)
  const avatar = account?.avatar
  return {
    name: user.name,
    email: user.email,
    sellerStatus: (user as { sellerStatus?: string }).sellerStatus ?? "none",
    role: (user as { role?: string | null }).role ?? "member",
    avatarUrl: avatar && typeof avatar === "object" ? (avatar.url ?? null) : null,
  }
}
