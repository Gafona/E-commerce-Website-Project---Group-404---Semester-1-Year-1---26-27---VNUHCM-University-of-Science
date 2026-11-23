import config from "@payload-config"
import { cookies } from "next/headers"
import { getPayload } from "payload"
import { isSuspended } from "@/access/roles"

const SESSION_COOKIE = "boai-session"
/** Pre-CHIPS Lax cookie; still honoured so existing sessions survive, then cleared. */
const LEGACY_SESSION_COOKIE = "app-session"

/**
 * The Make preview runs inside a cross-site iframe on figma.com. A Lax or
 * non-Secure cookie set there is never sent back, so the login "succeeds" but
 * every following request looks signed out. Mirror the platform's own admin
 * session cookie: SameSite=None + Secure + Partitioned (CHIPS), which also
 * works unchanged when the published site is opened directly.
 */
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  partitioned: true,
  path: "/",
} as const

export function createAppAuth(collection: "users") {
  return {
    async currentUser() {
      const store = await cookies()
      const token = store.get(SESSION_COOKIE)?.value || store.get(LEGACY_SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })
      if (!user || user.collection !== collection) return null
      // A suspended account loses every existing session immediately.
      if (isSuspended(user)) return null
      return user
    },

    async login(email: string, password: string) {
      const payload = await getPayload({ config })
      const result = await payload.login({
        collection,
        data: { email, password },
      })

      if (!result.token) throw new Error("Không thể tạo phiên đăng nhập.")

      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, result.token, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 7,
      })
      if (cookieStore.has(LEGACY_SESSION_COOKIE)) cookieStore.delete(LEGACY_SESSION_COOKIE)

      return result.user
    },

    async logout() {
      const cookieStore = await cookies()
      // A partitioned cookie is only cleared by a Set-Cookie with matching attributes.
      cookieStore.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 })
      cookieStore.delete(LEGACY_SESSION_COOKIE)
    },
  }
}

export const appAuth = createAppAuth("users")
