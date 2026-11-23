"use server"

import sharp from "sharp"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { currentAdmin, db } from "./admin-lib"
import { getTr } from "@/lib/i18n-server"
import { isSafeAnnouncementHref } from "@/collections/SiteAnnouncements"
import { SITE_CONTENT, type ContentSectionDef } from "@/lib/site-content-schema"
import { isSiteImagePlacement } from "@/lib/site-image-placements"
import { resolveProvince } from "@/lib/provinces"
import { tariffIssue, toPoint } from "@/lib/shipping"
import { ACCOUNT_NUMBER_PATTERN, bankByCode, normalizeHolder } from "@/lib/banks"
import { cancelChildOrders, childrenOf, markParentPaid } from "@/lib/orders-server"
import { DISCOUNT_CODE_PATTERN, normalizeDiscountCode } from "@/collections/DiscountCodes"
import type { PaymentSetting, ShippingSetting } from "@/payload-types"
import { takenRanges } from "@/lib/recommendation-slots"
import { MAX_DAYS, MAX_LEAD_DAYS, MAX_PRICE_PER_DAY, MAX_SLOTS, POSITION_LABELS, RECOMMENDATION_POSITIONS, addDays, bookedOn, slotRange, vnDay } from "@/lib/recommendations"

export type AdminResult = { ok: boolean; error?: string; message?: string }

const DENIED: AdminResult = { ok: false, error: "Bạn không có quyền quản trị." }
const cleanId = (value: unknown) => (typeof value === "string" && /^[\w-]{1,64}$/.test(value) ? value : null)
const cleanNote = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "")
const failure = (error: unknown, fallback: string): AdminResult => {
  const message = error instanceof Error ? error.message : ""
  // Surface our own Vietnamese validation messages; hide internal errors.
  return { ok: false, error: /[À-ỹ]/.test(message) && message.length < 200 ? message : fallback }
}

// ---------- Seller applications ----------

export async function reviewSellerAction(userId: string, decision: "approved" | "rejected", note: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id || !["approved", "rejected"].includes(decision)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const reviewNote = cleanNote(note)
  if (decision === "rejected" && reviewNote.length < 5) return { ok: false, error: "Hãy ghi lý do từ chối (ít nhất 5 ký tự)." }
  try {
    const payload = await db()
    await payload.update({
      collection: "users",
      id,
      data: { sellerStatus: decision, sellerReviewNote: reviewNote || null },
      overrideAccess: false,
      user: admin,
    })
    // Keep the public community badge in sync with seller approval.
    const profiles = await payload.find({
      collection: "community-profiles",
      where: { account: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: admin,
    })
    if (profiles.docs[0]) {
      await payload.update({
        collection: "community-profiles",
        id: profiles.docs[0].id,
        data: { kind: decision === "approved" ? "shop" : "person" },
        overrideAccess: false,
        user: admin,
      })
    }
    return { ok: true, message: decision === "approved" ? "Đã duyệt người bán." : "Đã từ chối hồ sơ." }
  } catch (error) {
    return failure(error, "Không thể cập nhật hồ sơ người bán.")
  }
}

// ---------- Shop bans & appeals ----------

async function sellerTarget(id: string, admin: NonNullable<Awaited<ReturnType<typeof currentAdmin>>>) {
  const payload = await db()
  const target = await payload.findByID({ collection: "users", id, depth: 0, overrideAccess: false, user: admin, select: { sellerStatus: true, role: true } })
  return { payload, target }
}

export async function suspendSellerAction(userId: string, reason: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const note = cleanNote(reason)
  if (note.length < 10) return { ok: false, error: "Hãy ghi rõ lý do khóa (ít nhất 10 ký tự). Người bán sẽ thấy lý do này." }
  try {
    const { payload, target } = await sellerTarget(id, admin)
    if (target.sellerStatus !== "approved") return { ok: false, error: "Chỉ có thể khóa cửa hàng đang hoạt động." }
    await payload.update({
      collection: "users",
      id,
      data: { sellerStatus: "suspended", shopBan: { reason: note } },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã khóa cửa hàng. Sản phẩm của shop đã được ẩn." }
  } catch (error) {
    return failure(error, "Không thể khóa cửa hàng.")
  }
}

export async function reinstateSellerAction(userId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    const { payload, target } = await sellerTarget(id, admin)
    if (target.sellerStatus !== "suspended") return { ok: false, error: "Cửa hàng này không bị khóa." }
    await payload.update({
      collection: "users",
      id,
      data: {
        sellerStatus: "approved",
        shopBan: { reason: null, bannedAt: null, appealStatus: "none", appealMessage: null, appealSubmittedAt: null, appealResponse: null, appealCount: 0 },
      },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã mở khóa cửa hàng." }
  } catch (error) {
    return failure(error, "Không thể mở khóa cửa hàng.")
  }
}

export async function rejectAppealAction(userId: string, response: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const note = cleanNote(response)
  if (note.length < 10) return { ok: false, error: "Hãy phản hồi cho người bán (ít nhất 10 ký tự)." }
  try {
    const { payload, target } = await sellerTarget(id, admin)
    if (target.sellerStatus !== "suspended") return { ok: false, error: "Cửa hàng này không bị khóa." }
    await payload.update({
      collection: "users",
      id,
      data: { shopBan: { appealStatus: "rejected", appealResponse: note } },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã từ chối kháng cáo và gửi phản hồi." }
  } catch (error) {
    return failure(error, "Không thể cập nhật kháng cáo.")
  }
}

// ---------- Event registrations ----------

/**
 * Approve or reject a shop's event offer. With `itemId` only that product is
 * decided; otherwise approving covers every product still waiting and
 * rejecting covers every waiting or approved product.
 */
export async function reviewRegistrationAction(registrationId: string, decision: "approved" | "rejected", note: string, itemId?: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const tr = await getTr()
  const id = cleanId(registrationId)
  const row = itemId === undefined ? null : cleanId(itemId)
  if (!id || !["approved", "rejected"].includes(decision) || (itemId !== undefined && !row)) return { ok: false, error: tr("Yêu cầu không hợp lệ.", "Invalid request.") }
  const reviewNote = cleanNote(note)
  if (decision === "rejected" && reviewNote.length < 5) return { ok: false, error: tr("Hãy ghi lý do từ chối (ít nhất 5 ký tự).", "Enter a rejection reason (at least 5 characters).") }
  try {
    const payload = await db()
    const registration = await payload.findByID({ collection: "event-registrations", id, depth: 0, overrideAccess: false, user: admin })
    const targets = (registration.items ?? []).filter((line) =>
      row ? line.id === row && line.status !== "withdrawn" : decision === "approved" ? line.status === "pending" : line.status === "pending" || line.status === "approved",
    )
    // Registrations saved before per-product rows are decided as a whole.
    const legacy = !(registration.items ?? []).length
    if (!targets.length && !legacy) return { ok: false, error: tr("Không có sản phẩm nào cần xử lý.", "Nothing to review.") }
    await payload.update({
      collection: "event-registrations",
      id,
      data: legacy
        ? { reviewStatus: decision, reviewNote: reviewNote || null }
        : {
            items: targets.map((line) => ({ id: line.id, status: decision, reviewNote: decision === "rejected" ? reviewNote : null })) as never,
            ...(row ? {} : { reviewNote: decision === "rejected" ? reviewNote : null }),
          },
      context: { registrationReview: true },
      overrideAccess: false,
      user: admin,
    })
    return {
      ok: true,
      message:
        decision === "approved"
          ? tr(`Đã duyệt ${legacy ? "đăng ký" : `${targets.length} sản phẩm`}.`, `Approved ${legacy ? "the registration" : `${targets.length} product(s)`}.`)
          : tr(`Đã từ chối ${legacy ? "đăng ký" : `${targets.length} sản phẩm`}.`, `Rejected ${legacy ? "the registration" : `${targets.length} product(s)`}.`),
    }
  } catch (error) {
    return failure(error, tr("Không thể cập nhật đăng ký sự kiện.", "Couldn't update the event registration."))
  }
}

// ---------- Community content ----------

export async function setPostVisibilityAction(postId: string, visibility: "visible" | "hidden", reason = ""): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(postId)
  if (!id || !["visible", "hidden"].includes(visibility)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).update({
      collection: "community-posts",
      id,
      data: { visibility },
      context: { moderationReason: cleanNote(reason, 300) },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: visibility === "hidden" ? "Đã ẩn bài viết." : "Đã khôi phục bài viết." }
  } catch (error) {
    return failure(error, "Không thể cập nhật bài viết.")
  }
}

export async function deletePostAction(postId: string, reason = ""): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(postId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).delete({
      collection: "community-posts",
      id,
      context: { moderationReason: cleanNote(reason, 300) },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã xóa bài viết cùng bình luận và lượt thích." }
  } catch (error) {
    return failure(error, "Không thể xóa bài viết.")
  }
}

export async function deleteCommentAction(commentId: string, reason = ""): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(commentId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).delete({
      collection: "community-comments",
      id,
      context: { moderationReason: cleanNote(reason, 300) },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã xóa bình luận." }
  } catch (error) {
    return failure(error, "Không thể xóa bình luận.")
  }
}

// ---------- Members ----------

export type ModerationInput = { postingBanned: boolean; chatBanned: boolean; suspended: boolean; reason: string }

export async function updateModerationAction(userId: string, input: ModerationInput): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  if (id === String(admin.id)) return { ok: false, error: "Bạn không thể tự hạn chế tài khoản của mình." }
  const moderation = {
    postingBanned: input?.postingBanned === true,
    chatBanned: input?.chatBanned === true,
    suspended: input?.suspended === true,
    reason: cleanNote(input?.reason) || null,
  }
  const restricting = moderation.postingBanned || moderation.chatBanned || moderation.suspended
  if (restricting && !moderation.reason) return { ok: false, error: "Hãy ghi lý do hạn chế để lưu vết kiểm duyệt." }
  try {
    await (await db()).update({ collection: "users", id, data: { moderation }, overrideAccess: false, user: admin })
    return { ok: true, message: restricting ? "Đã cập nhật hạn chế tài khoản." : "Đã gỡ mọi hạn chế." }
  } catch (error) {
    return failure(error, "Không thể cập nhật thành viên.")
  }
}

export async function deleteMemberAction(userId: string, confirmEmail: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(userId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  if (id === String(admin.id)) return { ok: false, error: "Không thể xóa tài khoản đang đăng nhập." }
  try {
    const payload = await db()
    const target = await payload.findByID({ collection: "users", id, depth: 0, overrideAccess: false, user: admin, select: { email: true } })
    if (String(confirmEmail ?? "").trim().toLowerCase() !== target.email.toLowerCase()) {
      return { ok: false, error: "Email xác nhận không khớp." }
    }
    await payload.delete({ collection: "users", id, overrideAccess: false, user: admin })
    return { ok: true, message: "Đã xóa vĩnh viễn tài khoản và dữ liệu liên quan." }
  } catch (error) {
    return failure(error, "Không thể xóa tài khoản.")
  }
}

// ---------- Announcements (popup / site-wide banner) ----------

const THEMES = new Set(["brand", "dark", "sale", "light"])
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim()
// The form sends local datetime plus the browser's offset so schedules match the admin's clock.
const toIso = (local: string, offsetMinutes: number) => {
  if (!local) return null
  const parsed = new Date(`${local}:00.000Z`)
  if (!Number.isFinite(parsed.getTime())) return undefined
  return new Date(parsed.getTime() + offsetMinutes * 60_000).toISOString()
}

export async function saveAnnouncementAction(formData: FormData): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = field(formData, "id")
  if (id && !cleanId(id)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const title = field(formData, "title")
  const message = field(formData, "message")
  const displayType = field(formData, "displayType")
  const scope = field(formData, "scope")
  const theme = field(formData, "theme")
  const ctaLabel = field(formData, "ctaLabel")
  const ctaHref = field(formData, "ctaHref")
  const offset = Number(field(formData, "tzOffset")) || 0
  const startAt = toIso(field(formData, "startAt"), offset)
  const endAt = toIso(field(formData, "endAt"), offset)
  const active = formData.get("active") === "on"
  const removeImage = formData.get("removeImage") === "on"
  const image = formData.get("image")

  if (title.length < 3 || title.length > 120) return { ok: false, error: "Tiêu đề cần từ 3 đến 120 ký tự." }
  if (message.length < 5 || message.length > 600) return { ok: false, error: "Nội dung cần từ 5 đến 600 ký tự." }
  if (!["popup", "banner"].includes(displayType)) return { ok: false, error: "Kiểu hiển thị không hợp lệ." }
  if (!["home", "all"].includes(scope)) return { ok: false, error: "Phạm vi hiển thị không hợp lệ." }
  if (!THEMES.has(theme)) return { ok: false, error: "Màu sắc không hợp lệ." }
  if (ctaLabel.length > 40) return { ok: false, error: "Nhãn nút tối đa 40 ký tự." }
  if (Boolean(ctaLabel) !== Boolean(ctaHref)) return { ok: false, error: "Nút hành động cần có cả nhãn và đường dẫn." }
  if (ctaHref && (ctaHref.length > 300 || !isSafeAnnouncementHref(ctaHref))) return { ok: false, error: "Đường dẫn phải bắt đầu bằng / hoặc https://." }
  if (startAt === undefined || endAt === undefined) return { ok: false, error: "Thời gian hiển thị không hợp lệ." }
  if (startAt && endAt && new Date(endAt) <= new Date(startAt)) return { ok: false, error: "Thời điểm kết thúc phải sau thời điểm bắt đầu." }

  const hasFile = image instanceof File && image.size > 0
  if (hasFile && (!IMAGE_TYPES.has(image.type) || image.size > 5 * 1024 * 1024)) {
    return { ok: false, error: "Ảnh phải là JPG, PNG hoặc WebP, tối đa 5 MB." }
  }

  try {
    const payload = await db()
    let imageId: string | null | undefined = removeImage ? null : undefined
    if (hasFile) {
      const buffer = await sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer()
      const media = await payload.create({
        collection: "media",
        data: { alt: title },
        file: { data: buffer, mimetype: "image/webp", name: `announcement-${crypto.randomUUID()}.webp`, size: buffer.length },
        overrideAccess: false,
        user: admin,
      })
      imageId = String(media.id)
    }
    const data = {
      title,
      message,
      displayType: displayType as "popup" | "banner",
      scope: scope as "home" | "all",
      theme: theme as "brand" | "dark" | "sale" | "light",
      ctaLabel: ctaLabel || null,
      ctaHref: ctaHref || null,
      startAt,
      endAt,
      active,
      ...(imageId !== undefined ? { image: imageId } : {}),
    }
    if (id) {
      await payload.update({ collection: "site-announcements", id, data, overrideAccess: false, user: admin })
    } else {
      await payload.create({ collection: "site-announcements", data, overrideAccess: false, user: admin })
    }
    return { ok: true, message: id ? "Đã cập nhật thông báo." : "Đã tạo thông báo." }
  } catch (error) {
    return failure(error, "Không thể lưu thông báo.")
  }
}

export async function toggleAnnouncementAction(announcementId: string, active: boolean): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(announcementId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).update({ collection: "site-announcements", id, data: { active: active === true }, overrideAccess: false, user: admin })
    return { ok: true, message: active ? "Đã bật thông báo." : "Đã tắt thông báo." }
  } catch (error) {
    return failure(error, "Không thể cập nhật thông báo.")
  }
}

export async function deleteAnnouncementAction(announcementId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(announcementId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).delete({ collection: "site-announcements", id, overrideAccess: false, user: admin })
    return { ok: true, message: "Đã xóa thông báo." }
  } catch (error) {
    return failure(error, "Không thể xóa thông báo.")
  }
}

// ---------- Reviews & product comments ----------

export async function deleteReviewAdminAction(reviewId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(reviewId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    await (await db()).delete({ collection: "reviews", id, overrideAccess: false, user: admin })
    return { ok: true, message: "Đã xóa đánh giá." }
  } catch (error) {
    return failure(error, "Không thể xóa đánh giá.")
  }
}

export async function deleteProductCommentAdminAction(commentId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(commentId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    const payload = await db()
    await payload.delete({ collection: "product-comments", id, overrideAccess: false, user: admin })
    // Replies cannot outlive their thread.
    await payload.delete({ collection: "product-comments", where: { parent: { equals: id } }, overrideAccess: false, user: admin })
    return { ok: true, message: "Đã xóa bình luận và các trả lời." }
  } catch (error) {
    return failure(error, "Không thể xóa bình luận.")
  }
}

// ---------- Website copy ----------

export async function saveSiteContentAction(page: string, formData: FormData): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const sections = (SITE_CONTENT as readonly ContentSectionDef[]).filter((s) => s.page === page)
  if (!sections.length) return { ok: false, error: "Trang nội dung không hợp lệ." }
  const limit = { text: 200, textarea: 800, lines: 1000, url: 300, phone: 30 } as const
  const data: Record<string, Record<string, unknown>> = {}
  for (const section of sections) {
    const group: Record<string, unknown> = {}
    for (const field of section.fields) {
      const read = (lang: "vi" | "en") => {
        const raw = formData.get(`${section.key}.${field.key}.${lang}`)
        return typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : ""
      }
      const values = field.single ? [read("vi")] : [read("vi"), read("en")]
      for (const value of values) {
        if (value.length > limit[field.kind]) return { ok: false, error: `“${section.label} — ${field.label}” tối đa ${limit[field.kind]} ký tự.` }
        if (value && field.kind === "url" && !/^https:\/\/\S+$/i.test(value)) return { ok: false, error: `“${field.label}” phải bắt đầu bằng https://.` }
        if (value && field.kind === "phone" && !/^[\d\s+().-]{6,30}$/.test(value)) return { ok: false, error: `“${field.label}” không hợp lệ.` }
      }
      if (!field.optional && !values[0]) return { ok: false, error: `Vui lòng nhập “${section.label} — ${field.label}” (tiếng Việt).` }
      group[field.key] = field.single ? values[0] : { vi: values[0], en: values[1] }
    }
    data[section.key] = group
  }
  try {
    await (await db()).updateGlobal({
      slug: "site-content",
      data: data as never,
      overrideAccess: false,
      user: admin,
      context: { skipRevalidate: true },
    })
    // Refresh prerendered pages after responding; revalidating inside the action
    // would re-render the whole site before the editor hears back.
    after(() => revalidatePath("/", "layout"))
    return { ok: true, message: "Đã lưu nội dung. Website đã được cập nhật." }
  } catch (error) {
    return failure(error, "Không thể lưu nội dung.")
  }
}

// ---------- Website image library ----------

const MAX_SITE_IMAGE = 10 * 1024 * 1024
const cleanPlacements = (values: FormDataEntryValue[]) => [...new Set(values.filter(isSiteImagePlacement))]
const cleanHttps = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : ""
  return text && /^https:\/\/\S+$/i.test(text) && text.length <= 500 ? text : text ? undefined : ""
}

export async function uploadSiteImageAction(formData: FormData): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
  const placements = cleanPlacements(formData.getAll("placements"))
  const title = cleanNote(formData.get("title"), 120)
  const author = cleanNote(formData.get("author"), 120)
  const sourceUrl = cleanHttps(formData.get("sourceUrl"))
  if (!files.length) return { ok: false, error: "Hãy chọn ít nhất một ảnh." }
  if (files.length > 6) return { ok: false, error: "Tối đa 6 ảnh mỗi lần tải." }
  if (!placements.length) return { ok: false, error: "Hãy chọn ít nhất một vị trí hiển thị." }
  if (sourceUrl === undefined) return { ok: false, error: "Liên kết nguồn phải bắt đầu bằng https://." }
  for (const file of files) {
    if (!IMAGE_TYPES.has(file.type)) return { ok: false, error: `“${file.name}” phải là JPG, PNG hoặc WebP.` }
    if (file.size > MAX_SITE_IMAGE) return { ok: false, error: `“${file.name}” vượt quá 10 MB.` }
  }
  try {
    const payload = await db()
    for (const [index, file] of files.entries()) {
      const name = title || file.name.replace(/\.[^.]+$/, "").slice(0, 100)
      const label = files.length > 1 && title ? `${title} ${index + 1}` : name
      const buffer = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
        .rotate()
        .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer()
      const media = await payload.create({
        collection: "media",
        data: { alt: label },
        file: { data: buffer, mimetype: "image/webp", name: `site-${crypto.randomUUID()}.webp`, size: buffer.length },
        overrideAccess: false,
        user: admin,
      })
      await payload.create({
        collection: "site-images",
        data: {
          title: label,
          image: String(media.id),
          placements,
          credit: { author: author || null, sourceUrl: sourceUrl || null },
          active: true,
        },
        overrideAccess: false,
        user: admin,
      })
    }
    return { ok: true, message: files.length > 1 ? `Đã tải lên ${files.length} ảnh.` : "Đã tải ảnh lên." }
  } catch (error) {
    return failure(error, "Không thể tải ảnh lên.")
  }
}

export async function updateSiteImageAction(imageId: string, input: { active: boolean; placements: string[] }): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(imageId)
  const placements = cleanPlacements(Array.isArray(input?.placements) ? input.placements : [])
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  if (!placements.length) return { ok: false, error: "Ảnh cần ít nhất một vị trí hiển thị." }
  try {
    await (await db()).update({
      collection: "site-images",
      id,
      data: { active: Boolean(input.active), placements },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: "Đã cập nhật ảnh." }
  } catch (error) {
    return failure(error, "Không thể cập nhật ảnh.")
  }
}

export async function deleteSiteImageAction(imageId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(imageId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    const payload = await db()
    const doc = await payload.findByID({ collection: "site-images", id, depth: 0, overrideAccess: false, user: admin })
    await payload.delete({ collection: "site-images", id, overrideAccess: false, user: admin })
    // Remove the file too unless another record still uses it.
    const mediaId = typeof doc.image === "object" ? doc.image.id : doc.image
    if (mediaId) {
      const stillUsed = await payload.count({ collection: "site-images", where: { image: { equals: mediaId } }, overrideAccess: false, user: admin })
      if (!stillUsed.totalDocs) {
        await payload.delete({ collection: "media", id: String(mediaId), overrideAccess: false, user: admin }).catch(() => undefined)
      }
    }
    return { ok: true, message: "Đã xóa ảnh." }
  } catch (error) {
    return failure(error, "Không thể xóa ảnh.")
  }
}

// ---------- Shipping tariff (automatic distance-based fees) ----------

export type ShippingTariffInput = {
  firstFee: number
  firstKm: number
  perKm: number
  adjustPercent: number
  defaultOrigin: string
  originLat?: number | null
  originLng?: number | null
}

/** Saves the km tariff every checkout uses (validated again by the global's hook). */
export async function saveShippingTariffAction(input: ShippingTariffInput): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const issue = tariffIssue(input ?? {})
  if (issue) return { ok: false, error: issue[0] }
  const origin = resolveProvince(input?.defaultOrigin)
  if (!origin) return { ok: false, error: "Vui lòng chọn tỉnh/thành của kho BOAI." }
  const point = toPoint(input?.originLat, input?.originLng)
  if ((input?.originLat != null || input?.originLng != null) && !point)
    return { ok: false, error: "Tọa độ kho BOAI không hợp lệ (cần nằm trong lãnh thổ Việt Nam)." }
  try {
    await (await db()).updateGlobal({
      slug: "shipping-settings",
      overrideAccess: false,
      user: admin,
      data: {
        firstFee: Math.round(Number(input.firstFee)),
        firstKm: Number(input.firstKm),
        perKm: Math.round(Number(input.perKm)),
        adjustPercent: Math.round(Number(input.adjustPercent)),
        defaultOriginProvince: origin.code as ShippingSetting["defaultOriginProvince"],
        originLat: point?.lat ?? null,
        originLng: point?.lng ?? null,
      },
    })
    return { ok: true, message: "Đã lưu biểu phí vận chuyển. Đơn mới sẽ tính theo biểu phí này." }
  } catch (error) {
    return failure(error, "Không thể lưu biểu phí vận chuyển.")
  }
}

// ---------- Orders: payment, cancellation, refunds, payouts ----------

/** "Đã nhận tiền": BOAI saw the transfer in its account; the shops get the order. */
export async function confirmOrderPaymentAction(orderId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(orderId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const payload = await db()
  const order = await payload.findByID({ collection: "orders", id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!order || order.role !== "parent" || order.payment !== "online") return { ok: false, error: "Không tìm thấy đơn chuyển khoản này." }
  if (order.status !== "awaiting_payment") return { ok: false, error: "Đơn không còn ở trạng thái chờ thanh toán." }
  const result = await markParentPaid(payload, order, { source: "manual" })
  if (!result.ok) return { ok: false, error: "Đơn vừa được cập nhật. Vui lòng tải lại trang." }
  return { ok: true, message: `Đã xác nhận thanh toán đơn ${order.code}. Các shop đã được báo để giao hàng.` }
}

/** BOAI cancels a whole order (every part still cancellable) or one shop's part. */
export async function adminCancelOrderAction(orderId: string, reason: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(orderId)
  const note = cleanNote(reason, 300)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  if (note.length < 5) return { ok: false, error: "Vui lòng nhập lý do hủy (ít nhất 5 ký tự)." }
  const payload = await db()
  const order = await payload.findByID({ collection: "orders", id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!order?.role) return { ok: false, error: "Chỉ hủy được đơn theo luồng mới tại đây." }
  const parentId = order.parentOrder && typeof order.parentOrder === "object" ? String(order.parentOrder.id) : String(order.parentOrder ?? "")
  const parent =
    order.role === "parent" ? order : parentId ? await payload.findByID({ collection: "orders", id: parentId, depth: 0, overrideAccess: true }).catch(() => null) : null
  const targets = order.role === "parent" ? await childrenOf(payload, order.id) : [order]
  const changed = await cancelChildOrders(payload, { parent, children: targets, by: "admin", reason: note, batch: order.role === "parent" })
  if (!changed) return { ok: false, error: "Không còn phần đơn nào có thể hủy (đã giao hoặc đã hủy)." }
  const refund = parent?.payment === "online" && !!parent?.paymentInfo?.paidAt
  return { ok: true, message: refund ? `Đã hủy ${changed} phần đơn. Cần hoàn tiền cho khách trong 3–5 ngày làm việc.` : `Đã hủy ${changed} phần đơn.` }
}

/** Records that BOAI refunded a cancelled, already-paid shop order. */
export async function markRefundedAction(orderId: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(orderId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const payload = await db()
  const order = await payload.findByID({ collection: "orders", id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!order?.refund?.due) return { ok: false, error: "Đơn này không cần hoàn tiền." }
  if (order.refund.refundedAt) return { ok: false, error: "Đơn này đã được đánh dấu hoàn tiền." }
  await payload.update({
    collection: "orders",
    id,
    overrideAccess: true,
    depth: 0,
    data: { refund: { ...order.refund, refundedAt: new Date().toISOString() } },
  })
  return { ok: true, message: `Đã ghi nhận hoàn tiền cho đơn ${order.code}.` }
}

/** Records a manual payout to the shop for a completed child order. */
export async function markPayoutPaidAction(orderId: string, note = ""): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const id = cleanId(orderId)
  if (!id) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const payload = await db()
  const order = await payload.findByID({ collection: "orders", id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!order || order.role !== "child") return { ok: false, error: "Không tìm thấy đơn của shop." }
  if (order.status !== "delivered") return { ok: false, error: "Chỉ chi cho shop khi đơn đã hoàn tất." }
  if (!order.payout?.amount || order.payout.status !== "unpaid") return { ok: false, error: "Đơn này không có khoản chờ chi." }
  const result = await payload.update({
    collection: "orders",
    where: { and: [{ id: { equals: id } }, { "payout.status": { equals: "unpaid" } }] },
    overrideAccess: true,
    depth: 0,
    data: { payout: { ...order.payout, status: "paid", paidAt: new Date().toISOString(), note: cleanNote(note, 200) || order.payout.note } },
  })
  if (!result.docs.length) return { ok: false, error: "Khoản chi vừa được cập nhật. Vui lòng tải lại trang." }
  return { ok: true, message: `Đã ghi nhận chi ${new Intl.NumberFormat("vi-VN").format(order.payout.amount)}₫ cho ${order.shopName ?? "shop"}.` }
}

// ---------- BOAI receiving account (VietQR) ----------

export type PaymentAccountInput = { bankCode: string; accountNumber: string; accountName: string }

export async function savePaymentAccountAction(input: PaymentAccountInput): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const bank = bankByCode(input?.bankCode)
  const accountNumber = String(input?.accountNumber ?? "").replace(/\s/g, "")
  const accountName = normalizeHolder(String(input?.accountName ?? ""))
  if (!bank) return { ok: false, error: "Vui lòng chọn ngân hàng." }
  if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) return { ok: false, error: "Số tài khoản gồm 6–19 chữ số." }
  if (accountName.length < 3) return { ok: false, error: "Vui lòng nhập tên chủ tài khoản (viết hoa không dấu)." }
  try {
    await (await db()).updateGlobal({
      slug: "payment-settings",
      overrideAccess: false,
      user: admin,
      data: { bankCode: bank.code as PaymentSetting["bankCode"], accountNumber, accountName },
    })
    return { ok: true, message: "Đã lưu tài khoản nhận tiền của BOAI. Mã VietQR của đơn mới sẽ dùng tài khoản này." }
  } catch (error) {
    return failure(error, "Không thể lưu tài khoản nhận tiền.")
  }
}

// ---------- Discount codes ----------

export async function createDiscountCodeAction(input: { code: string; percent: number }): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const code = normalizeDiscountCode(input?.code)
  const percent = Number(input?.percent)
  if (!DISCOUNT_CODE_PATTERN.test(code)) return { ok: false, error: "Mã gồm 3–20 ký tự chữ in hoa hoặc số (A–Z, 0–9), không dấu, không khoảng trắng." }
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) return { ok: false, error: "Mức giảm là số nguyên từ 1 đến 100%." }
  const payload = await db()
  const existing = await payload.count({ collection: "discount-codes", where: { code: { equals: code } }, overrideAccess: false, user: admin })
  if (existing.totalDocs) return { ok: false, error: `Mã ${code} đã tồn tại.` }
  try {
    await payload.create({ collection: "discount-codes", overrideAccess: false, user: admin, data: { code, percent, active: true } })
    return { ok: true, message: `Đã tạo mã ${code} giảm ${percent}%.` }
  } catch (error) {
    return failure(error, "Không thể tạo mã giảm giá.")
  }
}

export async function toggleDiscountCodeAction(id: string, active: boolean): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const clean = cleanId(id)
  if (!clean) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    const doc = await (await db()).update({ collection: "discount-codes", id: clean, overrideAccess: false, user: admin, data: { active: !!active } })
    return { ok: true, message: active ? `Đã bật mã ${doc.code}.` : `Đã tắt mã ${doc.code}.` }
  } catch (error) {
    return failure(error, "Không thể cập nhật mã.")
  }
}

export async function deleteDiscountCodeAction(id: string): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const clean = cleanId(id)
  if (!clean) return { ok: false, error: "Yêu cầu không hợp lệ." }
  try {
    // Orders keep their own copy of the code and amount, so deleting it changes no order.
    const doc = await (await db()).delete({ collection: "discount-codes", id: clean, overrideAccess: false, user: admin })
    return { ok: true, message: `Đã xóa mã ${doc.code}.` }
  } catch (error) {
    return failure(error, "Không thể xóa mã.")
  }
}

// ---------- Paid recommendations ----------

/** "Đã thu phí & Duyệt" or reject (the shop sees the reason). The collection re-checks free slots. */
export async function reviewRecommendationAction(id: string, decision: "approved" | "rejected", reason = ""): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const clean = cleanId(id)
  if (!clean || !["approved", "rejected"].includes(decision)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const note = cleanNote(reason)
  if (decision === "rejected" && note.length < 5) return { ok: false, error: "Hãy ghi lý do từ chối (ít nhất 5 ký tự)." }
  try {
    const doc = await (await db()).update({
      collection: "recommendation-requests",
      id: clean,
      data: decision === "approved" ? { status: "approved" } : { status: "rejected", rejectReason: note },
      overrideAccess: false,
      user: admin,
    })
    return { ok: true, message: decision === "approved" ? `Đã ghi nhận phí và duyệt ${doc.code}.` : `Đã từ chối ${doc.code}.` }
  } catch (error) {
    return failure(error, "Không thể cập nhật yêu cầu đề xuất.")
  }
}

export async function saveRecommendationSettingsAction(input: { slots: number; minPrice: number }): Promise<AdminResult> {
  const admin = await currentAdmin()
  if (!admin) return DENIED
  const slots = Number(input?.slots)
  const minPrice = Number(input?.minPrice)
  if (!Number.isInteger(slots) || slots < 1 || slots > MAX_SLOTS) return { ok: false, error: `Số suất mỗi vị trí là số nguyên từ 1 đến ${MAX_SLOTS}.` }
  if (!Number.isInteger(minPrice) || minPrice < 1000 || minPrice > MAX_PRICE_PER_DAY)
    return { ok: false, error: `Giá tối thiểu mỗi ngày từ 1.000₫ đến ${MAX_PRICE_PER_DAY.toLocaleString("vi-VN")}₫.` }
  try {
    const payload = await db()
    // Fewer slots than already-approved bookings would hide spots shops have paid for.
    const today = vnDay(Date.now())
    for (const position of RECOMMENDATION_POSITIONS) {
      const approved = await takenRanges(payload, { position, from: slotRange(today, 1).startsAt, statuses: ["approved"] })
      let busiest = 0
      for (let i = 0; i <= MAX_LEAD_DAYS + MAX_DAYS; i++) busiest = Math.max(busiest, bookedOn(approved, addDays(today, i)))
      if (busiest > slots)
        return { ok: false, error: `Vị trí “${POSITION_LABELS[position].vi}” đã có ${busiest} đề xuất được duyệt chạy cùng ngày; không thể giảm xuống ${slots} suất.` }
    }
    await payload.updateGlobal({ slug: "recommendation-settings", data: { slotsPerPosition: slots, minPricePerDay: minPrice }, overrideAccess: false, user: admin })
    return { ok: true, message: "Đã lưu cài đặt đề xuất." }
  } catch (error) {
    return failure(error, "Không thể lưu cài đặt đề xuất.")
  }
}
