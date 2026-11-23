"use server"

import { currentAdmin, db } from "../admin-lib"
import {
  EVENT_FONT_FAMILIES,
  type EventFontFamily,
} from "@/lib/event-typography"
import { getTr } from "@/lib/i18n-server"
import { eventWindow, isEventClock } from "@/lib/event-dates"
import { MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT } from "@/lib/event-rules"
import { isProductType, type ProductTypeId } from "@/lib/product-types"

export type EventState = {
  ok: boolean
  error?: string
  message?: string
  href?: string
}

const CATEGORIES = new Set(["seasonal", "sport"])
const SEASONAL_OCCASIONS = new Set([
  "back-to-school",
  "summer-sale",
  "tet",
  "seasonal-other",
])
const SPORT_OCCASIONS = new Set([
  "world-cup",
  "euro",
  "sea-games",
  "asian-games",
  "sport-other",
])
const OCCASIONS = new Set([...SEASONAL_OCCASIONS, ...SPORT_OCCASIONS])
const CUSTOM_OCCASIONS = new Set(["seasonal-other", "sport-other"])
const STATUSES = new Set(["draft", "scheduled", "active", "paused", "ended"])
const FONT_FAMILIES = new Set<string>(EVENT_FONT_FAMILIES)
const TEXT_POSITIONS = new Set([
  "top-left",
  "center-left",
  "center",
  "bottom-left",
  "bottom-center",
])

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim()

const isoDay = (value: string, endOfDay = false) =>
  `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`

const parseTypography = (
  formData: FormData,
  prefix: "title" | "slogan" | "description",
  min: number,
  max: number,
) => {
  const fontFamily = text(formData, `${prefix}FontFamily`)
  const color = text(formData, `${prefix}Color`)
  const fontSize = Number(text(formData, `${prefix}FontSize`))
  if (!FONT_FAMILIES.has(fontFamily)) {
    return { error: `Phông chữ ${prefix} không hợp lệ.` } as const
  }
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return { error: `Màu chữ ${prefix} không hợp lệ.` } as const
  }
  if (!Number.isInteger(fontSize) || fontSize < min || fontSize > max) {
    return { error: `Cỡ chữ ${prefix} phải từ ${min}px đến ${max}px.` } as const
  }
  return {
    value: {
      fontFamily: fontFamily as EventFontFamily,
      color,
      fontSize,
    },
  } as const
}

async function parseEvent(formData: FormData) {
  const admin = await currentAdmin()
  if (!admin) return { error: "Bạn không có quyền quản lý sự kiện." } as const
  const name = text(formData, "name")
  const slogan = text(formData, "slogan")
  const description = text(formData, "description")
  const category = text(formData, "category")
  const occasion = text(formData, "occasion")
  const customOccasion = text(formData, "customOccasion")
  const status = text(formData, "status")
  const backgroundColor = text(formData, "backgroundColor")
  const textColor = text(formData, "textColor")
  const fontFamily = text(formData, "fontFamily")
  const fontSize = Number(text(formData, "fontSize"))
  const textPosition = text(formData, "textPosition")
  const displayPlacement = text(formData, "displayPlacement")
  const startDate = text(formData, "startDate")
  const endDate = text(formData, "endDate")
  const startTime = text(formData, "startTime") || "00:00"
  const endTime = text(formData, "endTime") || "23:59"
  const maxDiscount = Number(text(formData, "maxDiscount"))
  const allowedProductTypes = [...new Set(formData.getAll("allowedProductTypes").map(String))]
  const campaignImage = formData.get("campaignImage")
  const tr = await getTr()

  if (name.length < 3 || name.length > 100) {
    return { error: "Tên sự kiện cần từ 3 đến 100 ký tự." } as const
  }
  if (slogan.length > 180) {
    return { error: "Khẩu hiệu tối đa 180 ký tự." } as const
  }
  if (description.length < 10 || description.length > 3000) {
    return { error: "Mô tả cần từ 10 đến 3.000 ký tự." } as const
  }
  if (!CATEGORIES.has(category) || !OCCASIONS.has(occasion)) {
    return { error: "Loại hoặc chủ đề sự kiện không hợp lệ." } as const
  }
  if (
    (category === "seasonal" && !SEASONAL_OCCASIONS.has(occasion)) ||
    (category === "sport" && !SPORT_OCCASIONS.has(occasion))
  ) {
    return { error: "Chủ đề không thuộc loại sự kiện đã chọn." } as const
  }
  const needsCustomOccasion = CUSTOM_OCCASIONS.has(occasion)
  if (
    needsCustomOccasion &&
    (customOccasion.length < 2 || customOccasion.length > 80)
  ) {
    return {
      error:
        category === "sport"
          ? "Hãy nhập tên giải thể thao từ 2 đến 80 ký tự."
          : "Hãy nhập tên mùa vụ từ 2 đến 80 ký tự.",
    } as const
  }
  if (!STATUSES.has(status)) {
    return { error: "Trạng thái sự kiện không hợp lệ." } as const
  }
  if (!/^#[0-9a-f]{6}$/i.test(backgroundColor)) {
    return { error: "Màu nền sự kiện không hợp lệ." } as const
  }
  if (!/^#[0-9a-f]{6}$/i.test(textColor)) {
    return { error: "Màu chữ sự kiện không hợp lệ." } as const
  }
  if (!FONT_FAMILIES.has(fontFamily)) {
    return { error: "Phông chữ sự kiện không hợp lệ." } as const
  }
  if (!Number.isInteger(fontSize) || fontSize < 10 || fontSize > 120) {
    return { error: "Cỡ chữ chung phải từ 10px đến 120px." } as const
  }
  const titleTypography = parseTypography(formData, "title", 10, 120)
  if ("error" in titleTypography)
    return { error: titleTypography.error } as const
  const sloganTypography = parseTypography(formData, "slogan", 10, 120)
  if ("error" in sloganTypography)
    return { error: sloganTypography.error } as const
  const descriptionTypography = parseTypography(
    formData,
    "description",
    10,
    120,
  )
  if ("error" in descriptionTypography)
    return { error: descriptionTypography.error } as const
  if (!TEXT_POSITIONS.has(textPosition)) {
    return { error: "Vị trí chữ sự kiện không hợp lệ." } as const
  }
  if (!["hero", "midpage", "both"].includes(displayPlacement)) {
    return { error: "Vị trí hiển thị sự kiện không hợp lệ." } as const
  }
  if (
    campaignImage instanceof File &&
    campaignImage.size &&
    (!campaignImage.type.startsWith("image/") || campaignImage.size > 5_000_000)
  ) {
    return {
      error: "Ảnh sự kiện phải là ảnh hợp lệ và không quá 5MB.",
    } as const
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return { error: "Vui lòng chọn đủ ngày bắt đầu và kết thúc." } as const
  }
  if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
    return { error: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." } as const
  }
  if (!isEventClock(startTime) || !isEventClock(endTime)) {
    return { error: tr("Giờ bắt đầu và kết thúc phải có dạng HH:mm.", "Start and end times must be HH:mm.") } as const
  }
  const span = eventWindow({ startDate, endDate, startTime, endTime })
  if (!(span.end > span.start)) {
    return { error: tr("Thời điểm kết thúc phải sau thời điểm bắt đầu.", "The end must be after the start.") } as const
  }
  if (!Number.isInteger(maxDiscount) || maxDiscount < MIN_EVENT_DISCOUNT || maxDiscount > MAX_EVENT_DISCOUNT) {
    return {
      error: tr(
        `Trần % giảm phải là số nguyên từ ${MIN_EVENT_DISCOUNT} đến ${MAX_EVENT_DISCOUNT}.`,
        `The discount ceiling must be a whole number from ${MIN_EVENT_DISCOUNT} to ${MAX_EVENT_DISCOUNT}.`,
      ),
    } as const
  }
  if (!allowedProductTypes.every((type) => isProductType(type))) {
    return { error: tr("Nhóm sản phẩm không hợp lệ.", "Invalid product group.") } as const
  }
  const payload = await db()

  let campaignImageId: string | undefined
  if (campaignImage instanceof File && campaignImage.size) {
    const media = await payload.create({
      collection: "media",
      data: { alt: `Ảnh sự kiện ${name}` },
      file: {
        data: Buffer.from(await campaignImage.arrayBuffer()),
        mimetype: campaignImage.type,
        name: campaignImage.name,
        size: campaignImage.size,
      },
      overrideAccess: true,
    })
    campaignImageId = String(media.id)
  }

  return {
    admin,
    payload,
    data: {
      name,
      slogan: slogan || undefined,
      description,
      ...(campaignImageId ? { campaignImage: campaignImageId } : {}),
      backgroundColor,
      textColor,
      fontFamily: fontFamily as EventFontFamily,
      fontSize,
      titleTypography: titleTypography.value,
      sloganTypography: sloganTypography.value,
      descriptionTypography: descriptionTypography.value,
      textPosition:
        textPosition as "top-left" | "center-left" | "center" | "bottom-left" | "bottom-center",
      displayPlacement: displayPlacement as "hero" | "midpage" | "both",
      category: category as "seasonal" | "sport",
      occasion:
        occasion as "back-to-school" | "summer-sale" | "tet" | "seasonal-other" | "world-cup" | "euro" | "sea-games" | "asian-games" | "sport-other",
      customOccasion: needsCustomOccasion ? customOccasion : null,
      startDate: isoDay(startDate),
      endDate: isoDay(endDate, true),
      startTime,
      endTime,
      maxDiscount,
      allowedProductTypes: allowedProductTypes as ProductTypeId[],
      status: status as "draft" | "scheduled" | "active" | "paused" | "ended",
    },
  } as const
}

export async function saveEventAction(
  _previous: EventState,
  formData: FormData,
): Promise<EventState> {
  try {
    const parsed = await parseEvent(formData)
    if ("error" in parsed) return { ok: false, error: parsed.error }
    const id = text(formData, "id")
    const scoped = { user: parsed.admin, overrideAccess: false } as const

    if (id) {
      await parsed.payload.update({ collection: "events", id, data: parsed.data, ...scoped })
    } else {
      await parsed.payload.create({ collection: "events", data: parsed.data, ...scoped })
    }

    return {
      ok: true,
      message: id ? "Đã lưu thay đổi sự kiện." : "Đã tạo sự kiện.",
      href: "/quan-tri/su-kien",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return {
      ok: false,
      error: /[À-ỹ]/.test(message) && message.length < 200
        ? message
        : "Không thể lưu sự kiện. Vui lòng thử lại.",
    }
  }
}

export async function deleteEventAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!id || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: "Thiếu mã sự kiện." }
  const admin = await currentAdmin()
  if (!admin) return { ok: false, error: "Bạn không có quyền quản lý sự kiện." }
  try {
    await (await db()).delete({ collection: "events", id, user: admin, overrideAccess: false })
    return { ok: true }
  } catch {
    return { ok: false, error: "Không thể xóa sự kiện này." }
  }
}
