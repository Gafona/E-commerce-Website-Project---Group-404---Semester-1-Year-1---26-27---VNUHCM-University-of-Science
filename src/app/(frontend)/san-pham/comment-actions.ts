"use server"

import { getPayloadClient } from "@/lib/payload"
import { appAuth } from "@/lib/app-auth"
import { getTr } from "@/lib/i18n-server"

export type CommentResult = { ok: true } | { ok: false; error: string }

export async function postCommentAction(input: {
  productId: string
  body: string
  parentId?: string | null
}): Promise<CommentResult> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập để bình luận.", "Please sign in to comment.") }
  const body = String(input?.body ?? "").trim()
  if (body.length < 2) return { ok: false, error: tr("Bình luận quá ngắn.", "Comment is too short.") }
  if (body.length > 1000) return { ok: false, error: tr("Bình luận tối đa 1000 ký tự.", "Comments are limited to 1000 characters.") }
  const productId = String(input?.productId ?? "")
  if (!productId) return { ok: false, error: tr("Sản phẩm không hợp lệ.", "Invalid product.") }
  try {
    const payload = await getPayloadClient()
    await payload.create({
      collection: "product-comments",
      // Identity, seller badge and thread depth are enforced by the collection hook.
      data: { product: productId, body, parent: input.parentId ? String(input.parentId) : null } as never,
      overrideAccess: false,
      user,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error && /[À-ỹ]/.test(e.message) ? e.message : null
    return { ok: false, error: msg ?? tr("Không thể gửi bình luận, thử lại sau.", "Could not post comment, please try again.") }
  }
}

export async function deleteCommentAction(id: string): Promise<CommentResult> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập.", "Please sign in.") }
  try {
    const payload = await getPayloadClient()
    // Access rules limit deletes to the author; also drop replies to a removed root.
    await payload.delete({ collection: "product-comments", id: String(id), overrideAccess: false, user })
    await payload.delete({
      collection: "product-comments",
      where: { parent: { equals: String(id) } },
      overrideAccess: true,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: tr("Không thể xóa bình luận.", "Could not delete comment.") }
  }
}
