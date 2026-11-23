import { appAuth } from "@/lib/app-auth"
import { SUSPENDED_MESSAGE } from "@/access/roles"

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json(
      { ok: false, error: "Yêu cầu đăng nhập không hợp lệ." },
      { status: 415 },
    )
  }

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return Response.json(
      { ok: false, error: "Yêu cầu đăng nhập không hợp lệ." },
      { status: 400 },
    )
  }

  const email =
    input && typeof input === "object" && "email" in input
      ? String(input.email).trim().toLowerCase()
      : ""
  const password =
    input && typeof input === "object" && "password" in input
      ? String(input.password)
      : ""

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return Response.json(
      { ok: false, error: "Email hoặc mật khẩu không đúng." },
      { status: 400 },
    )
  }

  try {
    await appAuth.login(email, password)
    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === SUSPENDED_MESSAGE)
      return Response.json({ ok: false, error: SUSPENDED_MESSAGE }, { status: 403 })
    return Response.json(
      { ok: false, error: "Email hoặc mật khẩu không đúng." },
      { status: 401 },
    )
  }
}
