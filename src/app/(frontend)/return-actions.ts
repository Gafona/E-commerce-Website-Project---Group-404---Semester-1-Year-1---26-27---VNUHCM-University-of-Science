"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getTr } from "@/lib/i18n-server"
import { pickImages, uploadUserImages } from "@/lib/user-uploads"
import { RETURN_SELLER_TRANSITIONS, canRequestReturn, type ReturnStatus } from "@/lib/returns"
import type { User } from "@/payload-types"
import { isAppAdmin } from "@/access/roles"

type AppUser = User & { collection: "users" }
type Result = { ok: true; message: string } | { ok: false; error: string }

const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")
const errorText = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : ""
  return /[À-ỹ]/.test(message) && message.length < 200 ? message : fallback
}

/**
 * Customer return/exchange request for a delivered order (within 30 days).
 * Lines from different shops become one request per shop.
 */
export async function createReturnRequestAction(formData: FormData): Promise<Result> {
  const tr = await getTr()
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập để yêu cầu đổi trả.", "Please sign in to request a return.") }
  const orderId = String(formData.get("order") ?? "")
  if (!/^[\w-]{1,64}$/.test(orderId)) return { ok: false, error: tr("Đơn hàng không hợp lệ.", "Invalid order.") }
  let lines: { lineId: string; quantity: number }[] = []
  try {
    const parsed = JSON.parse(String(formData.get("items") ?? "[]"))
    lines = (Array.isArray(parsed) ? parsed : [])
      .filter((row) => typeof row?.lineId === "string" && Number(row.quantity) > 0)
      .map((row) => ({ lineId: String(row.lineId).slice(0, 64), quantity: Math.floor(Number(row.quantity)) }))
      .slice(0, 50)
  } catch {
    return { ok: false, error: tr("Danh sách sản phẩm không hợp lệ.", "Invalid item list.") }
  }
  if (!lines.length) return { ok: false, error: tr("Hãy chọn ít nhất một sản phẩm cần đổi trả.", "Choose at least one item.") }
  const picked = pickImages(formData.getAll("photos"), 5)
  if ("error" in picked) return { ok: false, error: tr(picked.error!, "Up to 5 JPG, PNG or WebP photos, 5 MB each.") }

  const payload = await getPayloadClient()
  const order = await payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: false, user }).catch(() => null)
  if (!order) return { ok: false, error: tr("Không tìm thấy đơn hàng của bạn.", "Order not found.") }
  if (!canRequestReturn(order)) return { ok: false, error: tr("Đơn hàng đã quá hạn đổi trả 30 ngày hoặc chưa giao thành công.", "This order is past the 30-day window or not delivered yet.") }

  // Resolve each line's shop (stored on the line, or via its product for older orders).
  const productIds = [...new Set((order.items ?? []).filter((i) => !i.seller && i.product).map((i) => relId(i.product)))]
  const productSellers = new Map<string, string>()
  if (productIds.length) {
    const { docs } = await payload.find({ collection: "products", where: { id: { in: productIds } }, limit: productIds.length, depth: 0, overrideAccess: true, select: { seller: true } })
    for (const p of docs) productSellers.set(String(p.id), relId(p.seller))
  }
  const groups = new Map<string, { lineId: string; quantity: number }[]>()
  for (const line of lines) {
    const item = (order.items ?? []).find((i) => i.id === line.lineId)
    if (!item) return { ok: false, error: tr("Sản phẩm không thuộc đơn hàng này.", "An item does not belong to this order.") }
    const seller = relId(item.seller) || productSellers.get(relId(item.product)) || ""
    if (!seller) return { ok: false, error: tr("Sản phẩm do BOAI bán: vui lòng gọi hotline để đổi trả.", "BOAI-sold items: please call the hotline for returns.") }
    groups.set(seller, [...(groups.get(seller) ?? []), line])
  }

  try {
    const photos = picked.images.length ? await uploadUserImages(user, picked.images, `Ảnh đổi trả đơn ${order.code}`) : []
    const codes: string[] = []
    for (const [seller, items] of groups) {
      const doc = await payload.create({
        collection: "return-requests",
        overrideAccess: false,
        user,
        data: {
          order: order.id,
          seller,
          items: items as never,
          type: formData.get("type") === "exchange" ? "exchange" : "return",
          reason: String(formData.get("reason") ?? "") as never,
          description: String(formData.get("description") ?? ""),
          photos,
        } as never,
      })
      codes.push(String(doc.code))
    }
    return {
      ok: true,
      message: tr(
        `Đã gửi yêu cầu ${codes.map((c) => `#${c}`).join(", ")}. Shop sẽ phản hồi và bạn sẽ nhận thông báo.`,
        `Request ${codes.map((c) => `#${c}`).join(", ")} sent. The shop will respond and you'll be notified.`,
      ),
    }
  } catch (error) {
    return { ok: false, error: errorText(error, tr("Không thể gửi yêu cầu đổi trả.", "Couldn't send the return request.")) }
  }
}

export async function cancelReturnRequestAction(id: string): Promise<Result> {
  const tr = await getTr()
  const user = (await appAuth.currentUser()) as AppUser | null
  if (!user) return { ok: false, error: tr("Vui lòng đăng nhập.", "Please sign in.") }
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: tr("Yêu cầu không hợp lệ.", "Invalid request.") }
  try {
    await (await getPayloadClient()).update({ collection: "return-requests", id, overrideAccess: false, user, data: { status: "cancelled" } })
    return { ok: true, message: tr("Đã hủy yêu cầu đổi trả.", "Return request cancelled.") }
  } catch (error) {
    return { ok: false, error: errorText(error, tr("Không thể hủy yêu cầu.", "Couldn't cancel the request.")) }
  }
}

/**
 * The owning shop (or an app admin) handles a return one step at a time:
 * approve/reject → received → completed. Rejections need a reason the customer sees.
 * Customer notifications are sent by the collection's afterChange hook.
 */
export async function updateReturnRequestAction(id: string, input: { status: ReturnStatus; sellerNote?: string }): Promise<Result> {
  const tr = await getTr()
  const user = (await appAuth.currentUser()) as AppUser | null
  const admin = isAppAdmin(user)
  if (!user || (!admin && user.sellerStatus !== "approved")) return { ok: false, error: tr("Bạn không có quyền xử lý yêu cầu này.", "You can't handle this request.") }
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: tr("Yêu cầu không hợp lệ.", "Invalid request.") }
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "return-requests",
    where: admin ? { id: { equals: id } } : { and: [{ id: { equals: id } }, { seller: { equals: user.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const request = docs[0]
  if (!request) return { ok: false, error: tr("Không tìm thấy yêu cầu.", "Request not found.") }
  if (!RETURN_SELLER_TRANSITIONS[request.status as ReturnStatus]?.includes(input?.status))
    return { ok: false, error: tr("Yêu cầu không ở bước cho phép thao tác này.", "This step isn't available for the request.") }
  const sellerNote = String(input?.sellerNote ?? "").replace(/\r\n/g, "\n").trim().slice(0, 500)
  if (input.status === "rejected" && sellerNote.length < 5)
    return { ok: false, error: tr("Nhập lý do từ chối để khách hiểu (ít nhất 5 ký tự).", "Enter a rejection reason for the customer (at least 5 characters).") }
  try {
    await payload.update({ collection: "return-requests", id, overrideAccess: false, user, data: { status: input.status, ...(sellerNote ? { sellerNote } : {}) } })
    return { ok: true, message: tr("Đã cập nhật yêu cầu đổi trả và báo cho khách.", "Return updated and the customer notified.") }
  } catch (error) {
    return { ok: false, error: errorText(error, tr("Không thể cập nhật yêu cầu.", "Couldn't update the request.")) }
  }
}
