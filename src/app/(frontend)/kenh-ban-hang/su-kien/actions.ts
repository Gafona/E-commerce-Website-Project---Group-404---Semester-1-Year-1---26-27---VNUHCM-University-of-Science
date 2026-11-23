"use server"

import { db, requireSeller } from "../seller-lib"
import { getTr } from "@/lib/i18n-server"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT } from "@/lib/event-rules"
import { isRegistrationOpen } from "@/lib/event-dates"

export type RegistrationState = {
  ok: boolean
  error?: string
  message?: string
}

/** One product row sent by the seller form. */
export type SaleItemDraft = {
  /** Existing row id (missing for a newly added product). */
  id?: string
  product: string
  discountPercent: number
  /** Event-price units on offer; null = unlimited. */
  quota: number | null
  /** Take this product out of the event. */
  withdraw?: boolean
  /** Send a rejected or withdrawn product back to BOAI for review. */
  resubmit?: boolean
}

const ID = /^[\w-]{1,64}$/
const cleanId = (value: unknown) => (typeof value === "string" && ID.test(value.trim()) ? value.trim() : null)

const failure = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : ""
  // Surface our own validation messages (Vietnamese, from the collection hook); hide internal errors.
  return /[À-ỹ]/.test(message) && message.length < 220 ? message : fallback
}

/**
 * Create or update the current shop's registration for one platform event.
 * Each product has its own discount (within the event's ceiling) and an
 * optional quota; approved products can only be withdrawn.
 */
export async function saveRegistrationAction(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const seller = await requireSeller()
  const tr = await getTr()
  const eventId = cleanId(formData.get("eventId"))
  if (!eventId) return { ok: false, error: tr("Thiếu thông tin sự kiện.", "The event is missing.") }
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get("items") ?? "[]"))
  } catch {
    raw = null
  }
  if (!Array.isArray(raw)) return { ok: false, error: tr("Dữ liệu đăng ký không hợp lệ.", "Invalid registration data.") }
  if (raw.length > 100) return { ok: false, error: tr("Mỗi đăng ký được chọn tối đa 100 sản phẩm.", "Up to 100 products per registration.") }

  try {
    const payload = await db()
    const scoped = { user: seller, overrideAccess: false } as const
    const event = await payload.findByID({ collection: "events", id: eventId, depth: 0, ...scoped }).catch(() => null)
    if (!event) return { ok: false, error: tr("Sự kiện không tồn tại.", "This event doesn't exist.") }
    if (!isRegistrationOpen(event)) return { ok: false, error: tr("Sự kiện này không còn nhận đăng ký.", "This event no longer accepts registrations.") }
    const cap = Math.min(MAX_EVENT_DISCOUNT, Number(event.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT))

    const drafts: SaleItemDraft[] = []
    const seen = new Set<string>()
    for (const entry of raw as Record<string, unknown>[]) {
      const product = cleanId(entry?.product)
      const discountPercent = Number(entry?.discountPercent)
      const quota = entry?.quota === null || entry?.quota === undefined || entry?.quota === "" ? null : Number(entry.quota)
      if (!product || seen.has(product)) return { ok: false, error: tr("Danh sách sản phẩm không hợp lệ.", "Invalid product list.") }
      seen.add(product)
      if (!Number.isInteger(discountPercent) || discountPercent < MIN_EVENT_DISCOUNT || discountPercent > cap)
        return { ok: false, error: tr(`Mức giảm phải là số nguyên từ ${MIN_EVENT_DISCOUNT}% đến ${cap}%.`, `Discounts must be whole numbers from ${MIN_EVENT_DISCOUNT}% to ${cap}%.`) }
      if (quota !== null && !(Number.isInteger(quota) && quota >= 1 && quota <= 100000))
        return { ok: false, error: tr("Số suất phải từ 1 đến 100.000, hoặc để trống nếu không giới hạn.", "Units must be 1 to 100,000, or empty for unlimited.") }
      drafts.push({
        id: cleanId(entry?.id) ?? undefined,
        product,
        discountPercent,
        quota,
        withdraw: entry?.withdraw === true,
        resubmit: entry?.resubmit === true,
      })
    }

    const owned = drafts.length
      ? await payload.count({ collection: "products", ...scoped, where: { and: [{ id: { in: drafts.map((d) => d.product) } }, { seller: { equals: seller.id } }] } })
      : { totalDocs: 0 }
    if (owned.totalDocs !== drafts.length) return { ok: false, error: tr("Chỉ được chọn sản phẩm thuộc cửa hàng của bạn.", "Only your own shop's products can be registered.") }

    const existing = (
      await payload.find({
        collection: "event-registrations",
        ...scoped,
        depth: 0,
        limit: 1,
        where: { and: [{ event: { equals: eventId } }, { seller: { equals: seller.id } }] },
      })
    ).docs[0]
    const sent = new Map(drafts.map((d) => [d.product, d]))
    // Rows the form didn't send: unreviewed ones are dropped, reviewed ones keep their history.
    const kept = (existing?.items ?? []).flatMap((line) => {
      const productId = String(typeof line.product === "object" && line.product ? line.product.id : line.product)
      if (sent.has(productId)) return []
      return line.status === "pending" ? [] : [{ id: line.id ?? undefined, product: productId, discountPercent: line.discountPercent, quota: line.quota ?? null }]
    })
    const items = [
      ...kept,
      ...drafts.map((d) => ({
        ...(d.id ? { id: d.id } : {}),
        product: d.product,
        discountPercent: d.discountPercent,
        quota: d.quota,
        ...(d.withdraw ? { status: "withdrawn" } : {}),
        ...(d.resubmit ? { resubmit: true } : {}),
      })),
    ]
    if (!items.length || !drafts.some((d) => !d.withdraw) && !existing)
      return { ok: false, error: tr("Hãy chọn ít nhất một sản phẩm tham gia.", "Choose at least one product.") }

    if (existing) {
      await payload.update({ collection: "event-registrations", id: existing.id, data: { items } as never, ...scoped })
    } else {
      // Owner and review state are set server-side by the collection hook.
      await payload.create({ collection: "event-registrations", data: { event: eventId, seller: seller.id, items } as never, ...scoped })
    }
    return {
      ok: true,
      message: existing
        ? tr("Đã lưu. Sản phẩm mới hoặc gửi lại sẽ chờ BOAI duyệt; sản phẩm đã duyệt giữ nguyên.", "Saved. New or re-sent products wait for BOAI review; approved products stay live.")
        : tr("Đã gửi đăng ký. Giá sự kiện áp dụng cho từng sản phẩm sau khi BOAI duyệt.", "Registration sent. Each product gets the event price once BOAI approves it."),
    }
  } catch (error) {
    return { ok: false, error: failure(error, tr("Không thể gửi đăng ký. Vui lòng thử lại.", "Couldn't submit the registration. Please try again.")) }
  }
}

/** Take every product of this registration out of the event (history and sold counts are kept). */
export async function withdrawRegistrationAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const tr = await getTr()
  const registrationId = cleanId(id)
  if (!registrationId) return { ok: false, error: tr("Thiếu mã đăng ký.", "The registration is missing.") }
  try {
    const seller = await requireSeller()
    const payload = await db()
    const scoped = { user: seller, overrideAccess: false } as const
    const registration = await payload.findByID({ collection: "event-registrations", id: registrationId, depth: 0, ...scoped })
    const items = (registration.items ?? []).map((line) => ({
      id: line.id ?? undefined,
      product: String(typeof line.product === "object" && line.product ? line.product.id : line.product),
      discountPercent: line.discountPercent,
      quota: line.quota ?? null,
      status: "withdrawn",
    }))
    if (!items.length) {
      await payload.delete({ collection: "event-registrations", id: registrationId, ...scoped })
      return { ok: true }
    }
    await payload.update({ collection: "event-registrations", id: registrationId, data: { items } as never, ...scoped })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: failure(error, tr("Không thể rút đăng ký này.", "Couldn't withdraw this registration.")) }
  }
}
