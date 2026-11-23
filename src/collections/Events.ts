import type {
  Access,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload"
import { revalidatePath } from "next/cache"
import { isStaff, staffAccess } from "../access/roles"
import { deleteWhere } from "../hooks/cleanup"
import { effectiveEventStatus, eventWindow, isEventClock } from "@/lib/event-dates"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT } from "@/lib/event-rules"
import { PRODUCT_TYPES } from "@/lib/product-types"
import { notifyEventChanges } from "../hooks/commerce-notifications"
import {
  DEFAULT_EVENT_TYPOGRAPHY,
  EVENT_FONT_OPTIONS,
} from "@/lib/event-typography"

// Platform-wide campaigns: only BOAI admins manage them; sellers and visitors
// can read every non-draft event (calendar, banners).
const readEvents: Access = ({ req }) =>
  isStaff(req.user) ? true : { status: { not_equals: "draft" } }

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
const CUSTOM_OCCASIONS = new Set(["seasonal-other", "sport-other"])

const validateEvent: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data
  // Userless writes only reach this hook through trusted overrideAccess calls.
  if (req.user && !isStaff(req.user)) {
    throw new Error("Chỉ quản trị viên BOAI mới có thể quản lý sự kiện.")
  }
  const current = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

  const category = String(current.category ?? "")
  const occasion = String(current.occasion ?? "")
  const validOccasion =
    (category === "seasonal" && SEASONAL_OCCASIONS.has(occasion)) ||
    (category === "sport" && SPORT_OCCASIONS.has(occasion))
  if (!validOccasion)
    throw new Error("Chủ đề sự kiện không khớp với loại sự kiện.")

  if (CUSTOM_OCCASIONS.has(occasion)) {
    const customOccasion = String(current.customOccasion ?? "").trim()
    if (customOccasion.length < 2 || customOccasion.length > 80) {
      throw new Error(
        category === "sport"
          ? "Hãy nhập tên giải thể thao từ 2 đến 80 ký tự."
          : "Hãy nhập tên mùa vụ từ 2 đến 80 ký tự.",
      )
    }
    data.customOccasion = customOccasion
  } else {
    data.customOccasion = null
  }

  const start = new Date(String(current.startDate ?? ""))
  const end = new Date(String(current.endDate ?? ""))
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ.")
  }
  if (end.getTime() < start.getTime()) {
    throw new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.")
  }
  for (const key of ["startTime", "endTime"] as const) {
    if (current[key] === undefined || current[key] === null || current[key] === "") continue
    if (!isEventClock(current[key])) throw new Error("Giờ bắt đầu/kết thúc phải có dạng HH:mm (ví dụ 20:00).")
  }
  const timing = {
    status: String(current.status ?? "draft"),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    startTime: (current.startTime as string | null | undefined) ?? null,
    endTime: (current.endTime as string | null | undefined) ?? null,
  }
  const span = eventWindow(timing)
  if (!(span.end > span.start)) {
    throw new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu.")
  }
  // Saving an event whose end time has passed records it as ended.
  if (
    effectiveEventStatus(timing) === "ended" &&
    (current.status === "scheduled" || current.status === "active" || current.status === "paused")
  ) {
    data.status = "ended"
  }
  return data
}

const refreshStorefront = () => {
  revalidatePath("/")
  revalidatePath("/giam-gia")
  revalidatePath("/tim-kiem")
  revalidatePath("/san-pham/[slug]", "page")
  revalidatePath("/cua-hang/[id]", "page")
}

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "name",
    defaultColumns: [
      "name",
      "category",
      "status",
      "startDate",
      "endDate",
    ],
  },
  access: {
    create: staffAccess,
    read: readEvents,
    update: staffAccess,
    delete: staffAccess,
  },
  hooks: {
    beforeValidate: [validateEvent],
    // Shop registrations belong to the event; remove them in the same transaction.
    beforeDelete: [
      async ({ id, req }) => {
        await deleteWhere(req, "event-registrations", { event: { equals: id } })
      },
    ],
    afterChange: [refreshStorefront, notifyEventChanges],
    afterDelete: [refreshStorefront],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      maxLength: 100,
    },
    {
      name: "slogan",
      type: "text",
      maxLength: 180,
    },
    {
      name: "description",
      type: "textarea",
      required: true,
      maxLength: 3000,
    },
    {
      name: "campaignImage",
      label: "Ảnh nổi bật sự kiện",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "backgroundColor",
      label: "Màu nền website",
      type: "text",
      defaultValue: "#071a33",
      maxLength: 7,
      validate: (value: unknown) =>
        !value || /^#[0-9a-f]{6}$/i.test(String(value))
          ? true
          : "Màu nền phải có định dạng #RRGGBB.",
    },
    {
      name: "textColor",
      label: "Màu chữ thông tin sự kiện",
      type: "text",
      defaultValue: "#ffffff",
      maxLength: 7,
      validate: (value: unknown) =>
        !value || /^#[0-9a-f]{6}$/i.test(String(value))
          ? true
          : "Màu chữ phải có định dạng #RRGGBB.",
    },
    {
      name: "fontFamily",
      label: "Phông chữ thông tin sự kiện",
      type: "select",
      defaultValue: "display",
      options: EVENT_FONT_OPTIONS,
    },
    {
      name: "fontSize",
      label: "Cỡ chữ chung (px)",
      type: "number",
      defaultValue: DEFAULT_EVENT_TYPOGRAPHY.shared.fontSize,
      min: 10,
      max: 120,
    },
    {
      type: "group",
      name: "titleTypography",
      label: "Kiểu chữ tên sự kiện",
      fields: [
        {
          name: "fontFamily",
          type: "select",
          options: EVENT_FONT_OPTIONS,
        },
        {
          name: "color",
          type: "text",
          maxLength: 7,
          validate: (value: unknown) =>
            !value || /^#[0-9a-f]{6}$/i.test(String(value))
              ? true
              : "Màu chữ phải có định dạng #RRGGBB.",
        },
        { name: "fontSize", type: "number", min: 10, max: 120 },
      ],
    },
    {
      type: "group",
      name: "sloganTypography",
      label: "Kiểu chữ khẩu hiệu",
      fields: [
        {
          name: "fontFamily",
          type: "select",
          options: EVENT_FONT_OPTIONS,
        },
        {
          name: "color",
          type: "text",
          maxLength: 7,
          validate: (value: unknown) =>
            !value || /^#[0-9a-f]{6}$/i.test(String(value))
              ? true
              : "Màu chữ phải có định dạng #RRGGBB.",
        },
        { name: "fontSize", type: "number", min: 10, max: 120 },
      ],
    },
    {
      type: "group",
      name: "descriptionTypography",
      label: "Kiểu chữ mô tả",
      fields: [
        {
          name: "fontFamily",
          type: "select",
          options: EVENT_FONT_OPTIONS,
        },
        {
          name: "color",
          type: "text",
          maxLength: 7,
          validate: (value: unknown) =>
            !value || /^#[0-9a-f]{6}$/i.test(String(value))
              ? true
              : "Màu chữ phải có định dạng #RRGGBB.",
        },
        { name: "fontSize", type: "number", min: 10, max: 120 },
      ],
    },
    {
      name: "textPosition",
      label: "Vị trí khối thông tin sự kiện",
      type: "select",
      defaultValue: "center-left",
      options: [
        { label: "Trên bên trái", value: "top-left" },
        { label: "Giữa bên trái", value: "center-left" },
        { label: "Chính giữa", value: "center" },
        { label: "Dưới bên trái", value: "bottom-left" },
        { label: "Dưới chính giữa", value: "bottom-center" },
      ],
    },
    {
      name: "displayPlacement",
      label: "Vị trí nổi bật trên website",
      type: "select",
      defaultValue: "hero",
      options: [
        { label: "Đầu website", value: "hero" },
        { label: "Giữa website", value: "midpage" },
        { label: "Cả hai vị trí", value: "both" },
      ],
    },
    {
      name: "category",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Seasonal event", value: "seasonal" },
        { label: "Sport event", value: "sport" },
      ],
    },
    {
      name: "occasion",
      type: "select",
      required: true,
      options: [
        { label: "Back to school", value: "back-to-school" },
        { label: "Summer sale", value: "summer-sale" },
        { label: "Tết", value: "tet" },
        { label: "Mùa vụ khác", value: "seasonal-other" },
        { label: "World Cup", value: "world-cup" },
        { label: "Euro", value: "euro" },
        { label: "SEA Games", value: "sea-games" },
        { label: "Asian Games", value: "asian-games" },
        { label: "Giải thể thao khác", value: "sport-other" },
      ],
    },
    {
      name: "customOccasion",
      label: "Tên chủ đề tự nhập",
      type: "text",
      maxLength: 80,
      admin: {
        condition: (_, siblingData) =>
          siblingData?.occasion === "seasonal-other" ||
          siblingData?.occasion === "sport-other",
        description:
          "Bắt buộc khi chọn “Mùa vụ khác” hoặc “Giải thể thao khác”.",
      },
    },
    {
      name: "startDate",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "endDate",
      type: "date",
      required: true,
      index: true,
      admin: { date: { pickerAppearance: "dayOnly" } },
    },
    {
      // Vietnam clock times: the event switches on and off at these minutes by itself.
      name: "startTime",
      label: "Giờ bắt đầu (HH:mm, giờ Việt Nam)",
      type: "text",
      defaultValue: "00:00",
      maxLength: 5,
      validate: (value: unknown) =>
        !value || isEventClock(value) ? true : "Giờ phải có dạng HH:mm.",
    },
    {
      name: "endTime",
      label: "Giờ kết thúc (HH:mm, giờ Việt Nam)",
      type: "text",
      defaultValue: "23:59",
      maxLength: 5,
      validate: (value: unknown) =>
        !value || isEventClock(value) ? true : "Giờ phải có dạng HH:mm.",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      index: true,
      options: [
        { label: "Bản nháp", value: "draft" },
        { label: "Đã lên lịch", value: "scheduled" },
        { label: "Đang diễn ra", value: "active" },
        { label: "Tạm dừng", value: "paused" },
        { label: "Đã kết thúc", value: "ended" },
      ],
    },
    {
      name: "maxDiscount",
      label: "Trần % giảm cho shop",
      type: "number",
      min: MIN_EVENT_DISCOUNT,
      max: MAX_EVENT_DISCOUNT,
      defaultValue: DEFAULT_EVENT_MAX_DISCOUNT,
      admin: { description: "Shop không được đăng ký mức giảm cao hơn trần này." },
    },
    {
      name: "allowedProductTypes",
      label: "Nhóm sản phẩm được tham gia",
      type: "select",
      hasMany: true,
      options: PRODUCT_TYPES.map((t) => ({ label: t.vi, value: t.id })),
      admin: { description: "Để trống: mọi nhóm sản phẩm đều được đăng ký." },
    },
  ],
}
