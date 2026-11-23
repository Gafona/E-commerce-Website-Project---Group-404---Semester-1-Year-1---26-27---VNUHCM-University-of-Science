"use server"

import { randomUUID } from "node:crypto"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getTr } from "@/lib/i18n-server"
import { AUTH_BATCH_MAX, generateAuthCode } from "@/lib/authenticity"
import type { User } from "@/payload-types"

type Seller = User & { collection: "users" }
export type GenerateResult = { ok: true; batchId: string; created: number; message: string } | { ok: false; error: string }

async function currentSeller() {
  const user = (await appAuth.currentUser()) as Seller | null
  return user && user.sellerStatus === "approved" ? user : null
}

/** Random, non-guessable codes for one of the shop's products (collection hook re-checks ownership). */
export async function generateAuthCodesAction(input: { productId: string; quantity: number; batch?: string }): Promise<GenerateResult> {
  const tr = await getTr()
  const seller = await currentSeller()
  if (!seller) return { ok: false, error: tr("Chỉ shop đã được duyệt mới tạo được mã.", "Only approved shops can create codes.") }
  const productId = String(input?.productId ?? "")
  const quantity = Math.floor(Number(input?.quantity))
  if (!/^[\w-]{1,64}$/.test(productId)) return { ok: false, error: tr("Hãy chọn sản phẩm.", "Choose a product.") }
  if (!(quantity >= 1 && quantity <= AUTH_BATCH_MAX))
    return { ok: false, error: tr(`Số lượng từ 1 đến ${AUTH_BATCH_MAX} mã mỗi lần.`, `Between 1 and ${AUTH_BATCH_MAX} codes per batch.`) }
  const payload = await getPayloadClient()
  const owned = await payload.count({
    collection: "products",
    where: { and: [{ id: { equals: productId } }, { seller: { equals: seller.id } }] },
    overrideAccess: true,
  })
  if (!owned.totalDocs) return { ok: false, error: tr("Sản phẩm không thuộc shop của bạn.", "This product isn't in your shop.") }
  const batchId = randomUUID().slice(0, 8).toUpperCase()
  const label = String(input?.batch ?? "").trim().slice(0, 60) || tr(`Lô ${new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`, `Batch ${new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Ho_Chi_Minh" })}`)
  let created = 0
  for (let i = 0; i < quantity; i++) {
    // A collision is astronomically unlikely (60 random bits); retry once anyway.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await payload.create({
          collection: "authenticity-codes",
          data: { code: generateAuthCode(), product: productId, batch: label, batchId, status: "active" } as never,
          overrideAccess: false,
          user: seller,
          depth: 0,
        })
        created++
        break
      } catch (error) {
        if (attempt === 1) console.error("generateAuthCodesAction: create failed", error)
      }
    }
  }
  if (!created) return { ok: false, error: tr("Không tạo được mã. Thử lại sau.", "Couldn't create codes. Try again later.") }
  return {
    ok: true,
    batchId,
    created,
    message: tr(`Đã tạo ${created} mã trong lô ${batchId}.`, `Created ${created} codes in batch ${batchId}.`),
  }
}

/** Revoke a leaked code, or restore it. */
export async function setAuthCodeStatusAction(id: string, status: "active" | "revoked"): Promise<{ ok: boolean; error?: string }> {
  const tr = await getTr()
  const seller = await currentSeller()
  if (!seller) return { ok: false, error: tr("Bạn không có quyền.", "Not allowed.") }
  if (!/^[\w-]{1,64}$/.test(String(id)) || (status !== "active" && status !== "revoked")) return { ok: false, error: tr("Yêu cầu không hợp lệ.", "Invalid request.") }
  try {
    // Collection access limits sellers to their own codes.
    await (await getPayloadClient()).update({ collection: "authenticity-codes", id, data: { status }, overrideAccess: false, user: seller, depth: 0 })
    return { ok: true }
  } catch {
    return { ok: false, error: tr("Không thể cập nhật mã.", "Couldn't update the code.") }
  }
}
