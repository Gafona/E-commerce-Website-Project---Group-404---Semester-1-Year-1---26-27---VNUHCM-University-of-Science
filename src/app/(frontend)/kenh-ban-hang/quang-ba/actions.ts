"use server"

import { appAuth } from "@/lib/app-auth"
import { getLang } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { checkNewRequest } from "@/lib/recommendation-slots"

export type RecommendationResult = { ok: boolean; error?: string; message?: string; suggestDay?: string | null }

const cleanId = (value: unknown) => (typeof value === "string" && /^[\w-]{1,64}$/.test(value) ? value : "")
const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`

async function session() {
  const [user, lang] = await Promise.all([appAuth.currentUser(), getLang()])
  const t = (vi: string, en: string) => (lang === "en" ? en : vi)
  const seller = user && user.collection === "users" && user.sellerStatus === "approved" ? user : null
  return { seller, lang, t }
}

/** A shop books a homepage spot; it stays "Chờ duyệt" until BOAI has collected the fee. */
export async function requestRecommendationAction(input: {
  productId: string
  position: string
  startDay: string
  days: number
  pricePerDay: number
}): Promise<RecommendationResult> {
  const { seller, lang, t } = await session()
  if (!seller) return { ok: false, error: t("Hãy đăng nhập bằng tài khoản người bán đã được duyệt.", "Sign in with an approved seller account.") }
  const payload = await getPayloadClient()
  const productId = cleanId(input?.productId)
  const check = await checkNewRequest(
    payload,
    { sellerId: String(seller.id), productId, position: input?.position, startDay: input?.startDay, days: input?.days, pricePerDay: input?.pricePerDay },
    lang,
  ).catch(() => null)
  if (!check) return { ok: false, error: t("Chưa kiểm tra được suất trống, vui lòng thử lại.", "Couldn't check free slots right now. Please try again.") }
  if (!check.ok) return { ok: false, error: check.error, suggestDay: check.suggestDay ?? null }
  try {
    const { position, startDay, days, pricePerDay, total } = check.value
    const doc = await payload.create({
      collection: "recommendation-requests",
      data: { product: productId, seller: seller.id, position, startDay, days, pricePerDay, status: "pending" },
      overrideAccess: false,
      user: seller,
    })
    return {
      ok: true,
      message: t(
        `Đã gửi yêu cầu ${doc.code}. Chuyển ${money(total)} theo hướng dẫn bên dưới để BOAI duyệt.`,
        `Request ${doc.code} sent. Transfer ${money(total)} as shown below so BOAI can approve it.`,
      ),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    // The collection repeats every check; its (Vietnamese) message explains a race such as a spot just filling up.
    return { ok: false, error: /[À-ỹ]/.test(message) && message.length < 240 ? message : t("Không thể gửi yêu cầu, vui lòng thử lại.", "Couldn't send the request. Please try again.") }
  }
}

/** Only requests still waiting for review can be withdrawn. */
export async function cancelRecommendationAction(id: string): Promise<RecommendationResult> {
  const { seller, t } = await session()
  if (!seller) return { ok: false, error: t("Hãy đăng nhập bằng tài khoản người bán đã được duyệt.", "Sign in with an approved seller account.") }
  const requestId = cleanId(id)
  if (!requestId) return { ok: false, error: t("Yêu cầu không hợp lệ.", "Invalid request.") }
  try {
    const payload = await getPayloadClient()
    await payload.update({ collection: "recommendation-requests", id: requestId, data: { status: "cancelled" }, overrideAccess: false, user: seller })
    return { ok: true, message: t("Đã hủy yêu cầu đề xuất.", "Recommendation request cancelled.") }
  } catch {
    return { ok: false, error: t("Không thể hủy: yêu cầu đã được xử lý hoặc không còn tồn tại.", "Can't cancel: the request was already handled or no longer exists.") }
  }
}
