"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"

export type AppealResult = { ok: boolean; error?: string }

export async function submitShopAppealAction(message: string): Promise<AppealResult> {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: "Vui lòng đăng nhập lại." }
  if (user.sellerStatus !== "suspended") return { ok: false, error: "Cửa hàng của bạn không bị khóa." }
  const text = typeof message === "string" ? message.replace(/\r\n/g, "\n").trim() : ""
  if (text.length < 20) return { ok: false, error: "Hãy giải thích chi tiết hơn (ít nhất 20 ký tự)." }
  if (text.length > 1000) return { ok: false, error: "Nội dung kháng cáo tối đa 1000 ký tự." }
  try {
    const payload = await getPayloadClient()
    // The Users hook enforces one pending appeal and the appeal limit.
    await payload.update({
      collection: "users",
      id: user.id,
      data: { shopBan: { appealMessage: text } },
      overrideAccess: false,
      user,
      depth: 0,
    })
    return { ok: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : ""
    return { ok: false, error: /[À-ỹ]/.test(reason) && reason.length < 200 ? reason : "Không thể gửi kháng cáo. Vui lòng thử lại." }
  }
}
