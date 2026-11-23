import type {
  Access,
  CollectionAfterChangeHook,
  CollectionBeforeOperationHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeLoginHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldAccess,
} from "payload"
import { APIError } from "payload"
import { revalidatePath } from "next/cache"
import { isAppAdmin, isStaff, staffField, SUSPENDED_MESSAGE } from "../access/roles"
import { cleanupAccount } from "../hooks/cleanup"
import { notifyAccountChanges } from "../hooks/user-notifications"
import { syncProfileMedia } from "../hooks/sync-profile-media"
import { MAX_APPEALS } from "../lib/shop-ban"
import { ACCOUNT_NUMBER_PATTERN, BANKS } from "../lib/banks"
import { PROVINCES } from "../lib/provinces"
import { SHIPPING_ZONES } from "../lib/shipping"
import { isLang } from "../lib/i18n"
import { RESET_LIMIT_STATUS, RESET_LINK_MINUTES, RESET_REQUESTS_PER_HOUR } from "../lib/password-policy"
import { resetEmailHTML, resetEmailSubject, resetPasswordLink, siteOrigin } from "../lib/password-reset-email"
import { hit } from "../lib/rate-limit-core"

const isSelfOrAdmin: Access = ({ req }) => {
  if (isStaff(req.user)) return true
  if (req.user?.collection !== "users") return false
  return { id: { equals: req.user.id } }
}

// Only Payload CMS editors (Figma SSO) may grant or revoke the app admin role.
const cmsEditorField: FieldAccess = ({ req }) =>
  req.user?.collection === "admins"

const blockSuspendedLogin: CollectionBeforeLoginHook = ({ user }) => {
  if (user?.moderation?.suspended)
    throw new APIError(SUSPENDED_MESSAGE, 403, null, true)
  return user
}

/**
 * At most RESET_REQUESTS_PER_HOUR reset emails per address per hour, for the
 * site form and Payload's REST endpoint alike. It runs before the account
 * lookup, so unknown addresses are limited the same way (no enumeration).
 */
const limitResetRequests: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== "forgotPassword") return args
  const email = String(args?.data?.email ?? "").trim().toLowerCase()
  if (!email) return args
  const result = hit(`password-reset:${email}`, RESET_REQUESTS_PER_HOUR, 60 * 60_000)
  if (!result.ok) {
    throw new APIError(
      `Bạn đã yêu cầu đặt lại mật khẩu ${RESET_REQUESTS_PER_HOUR} lần trong 1 giờ. Vui lòng thử lại sau.`,
      RESET_LIMIT_STATUS,
      { retryAfterMs: result.retryAfterMs },
      true,
    )
  }
  return args
}

/** The site form passes the visitor's language and canonical origin through the request context. */
const resetContext = (req: { context?: Record<string, unknown>; headers?: Headers } | undefined) => {
  const lang = req?.context?.lang
  const origin = req?.context?.resetOrigin
  return {
    lang: isLang(lang) ? lang : ("vi" as const),
    origin: typeof origin === "string" ? origin : siteOrigin(req?.headers),
  }
}

// App admins may moderate members but never other app admins.
const protectAdminAccounts: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (
    operation === "update" &&
    isAppAdmin(req.user) &&
    originalDoc?.role === "admin" &&
    String(originalDoc.id) !== String(req.user!.id)
  ) {
    throw new APIError(
      "Không thể thay đổi tài khoản quản trị viên khác.",
      403,
      null,
      true,
    )
  }
  if (data?.moderation && isStaff(req.user)) {
    data.moderation = {
      ...data.moderation,
      moderatedAt: new Date().toISOString(),
    }
  }
  return data
}

const beforeAccountDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (isAppAdmin(req.user) && String(req.user!.id) !== String(id)) {
    const target = await req.payload.findByID({
      collection: "users",
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (target.role === "admin") {
      throw new APIError(
        "Không thể xóa tài khoản quản trị viên khác.",
        403,
        null,
        true,
      )
    }
  }
  await cleanupAccount(req, id)
}

const relationId = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: string | number }).id)
  return ""
}

// Shop names are denormalized into static storefront pages; refresh them on rename.
const refreshRenamedShop: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  const before = previousDoc?.seller?.shopName ?? ""
  const after = doc?.seller?.shopName ?? ""
  // A shop ban/unban also hides or restores every product on static pages.
  // Custom-jersey settings feed the static /custom-ao shop list.
  const customChanged =
    JSON.stringify(previousDoc?.seller?.customJersey ?? null) !== JSON.stringify(doc?.seller?.customJersey ?? null)
  if (before === after && previousDoc?.sellerStatus === doc?.sellerStatus && !customChanged) return doc
  try {
    revalidatePath("/")
    revalidatePath("/giam-gia")
    revalidatePath("/tim-kiem")
    revalidatePath(`/cua-hang/${doc.id}`)
    revalidatePath("/custom-ao")
    revalidatePath("/san-pham/[slug]", "page")
  } catch {
    // Outside a Next.js request (CLI/seed) there is nothing to revalidate.
  }
  return doc
}

// Suspended sellers may file an appeal; everything else about the ban is staff-owned.
const enforceShopAppeal: CollectionBeforeValidateHook = ({ data, originalDoc, req, operation }) => {
  // resetPassword re-runs beforeValidate on the stored user without an originalDoc; nothing to enforce then.
  if (!data || operation !== "update" || !originalDoc) return data
  // Userless writes only come from trusted server code (CLI, seeds, jobs).
  if (!req.user || isStaff(req.user)) {
    if (data.sellerStatus === "suspended" && originalDoc?.sellerStatus !== "suspended") {
      data.shopBan = {
        ...(originalDoc?.shopBan ?? {}),
        ...(data.shopBan ?? {}),
        bannedAt: new Date().toISOString(),
        appealStatus: "none",
        appealMessage: null,
        appealSubmittedAt: null,
        appealResponse: null,
        appealCount: 0,
      }
    }
    return data
  }
  const current = originalDoc?.shopBan ?? {}
  const submitted = data.shopBan?.appealMessage
  // Payload fills group fields on every update; only a new appeal text counts.
  if (typeof submitted !== "string" || submitted.trim() === String(current.appealMessage ?? "").trim()) {
    if (data.shopBan !== undefined) data.shopBan = current
    return data
  }
  if (originalDoc?.sellerStatus !== "suspended") {
    throw new APIError("Chỉ cửa hàng đang bị khóa mới có thể gửi kháng cáo.", 400, null, true)
  }
  if (current.appealStatus === "pending") {
    throw new APIError("Kháng cáo trước của bạn vẫn đang chờ xử lý.", 400, null, true)
  }
  const count = Number(current.appealCount ?? 0)
  if (count >= MAX_APPEALS) {
    throw new APIError("Bạn đã dùng hết số lần kháng cáo cho lần khóa này.", 400, null, true)
  }
  const message = submitted.replace(/\r\n/g, "\n").trim()
  if (message.length < 20 || message.length > 1000) {
    throw new APIError("Nội dung kháng cáo cần từ 20 đến 1000 ký tự.", 400, null, true)
  }
  data.shopBan = {
    ...current,
    appealMessage: message,
    appealStatus: "pending",
    appealSubmittedAt: new Date().toISOString(),
    appealCount: count + 1,
  }
  return data
}

// Appeal fields are writable by staff, or by the suspended account itself.
const appealField: FieldAccess = ({ req, doc }) =>
  isStaff(req.user) ||
  (req.user?.collection === "users" &&
    String(doc?.id ?? "") === String(req.user.id) &&
    doc?.sellerStatus === "suspended")

// App users may only use an image they uploaded themselves as their avatar.
const validateAvatarOwnership: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (req.user?.collection !== "users" || !data) return data
  for (const field of ["avatar", "cover"] as const) {
    const avatarId = relationId(data[field])
    if (!avatarId || avatarId === relationId(originalDoc?.[field])) continue
    const media = await req.payload
      .findByID({
        collection: "media",
        id: avatarId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      .catch(() => null)
    if (
      !media ||
      relationId(media.communityOwner) !== String(req.user.id) ||
      !media.mimeType?.startsWith("image/")
    ) {
      throw new Error("Ảnh hồ sơ không hợp lệ.")
    }
  }
  return data
}

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "name",
  },
  auth: {
    forgotPassword: {
      expiration: RESET_LINK_MINUTES * 60_000,
      // Payload's own per-account floor between emails; the hourly cap lives in limitResetRequests.
      minRequestInterval: 15_000,
      generateEmailSubject: ({ req } = {}) => resetEmailSubject(resetContext(req).lang),
      generateEmailHTML: ({ req, token, user } = {}) => {
        const { lang, origin } = resetContext(req)
        return resetEmailHTML({ link: resetPasswordLink(origin, String(token ?? "")), name: user?.name, lang })
      },
    },
  },
  hooks: {
    beforeOperation: [limitResetRequests],
    beforeValidate: [protectAdminAccounts, validateAvatarOwnership, enforceShopAppeal],
    beforeLogin: [blockSuspendedLogin],
    beforeDelete: [beforeAccountDelete],
    afterChange: [refreshRenamedShop, notifyAccountChanges, syncProfileMedia],
  },
  access: {
    create: () => true,
    delete: isSelfOrAdmin,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
  },
  fields: [
    {
      name: "role",
      label: "Vai trò",
      type: "select",
      defaultValue: "member",
      saveToJWT: true,
      index: true,
      options: [
        { label: "Thành viên", value: "member" },
        { label: "Quản trị viên BOAI", value: "admin" },
      ],
      access: { create: cmsEditorField, update: cmsEditorField },
      admin: {
        position: "sidebar",
        description: "Quản trị viên truy cập bảng điều khiển /quan-tri.",
      },
    },
    {
      name: "moderation",
      label: "Kiểm duyệt",
      type: "group",
      access: { create: staffField, update: staffField },
      fields: [
        {
          name: "postingBanned",
          label: "Cấm đăng bài / bình luận",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "chatBanned",
          label: "Cấm nhắn tin",
          type: "checkbox",
          defaultValue: false,
        },
        {
          name: "suspended",
          label: "Khóa tài khoản",
          type: "checkbox",
          defaultValue: false,
        },
        { name: "reason", label: "Lý do", type: "textarea", maxLength: 500 },
        {
          name: "moderatedAt",
          label: "Cập nhật lúc",
          type: "date",
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: "sellerStatus",
      type: "select",
      defaultValue: "none",
      options: [
        { label: "Chưa đăng ký", value: "none" },
        { label: "Chờ duyệt", value: "pending" },
        { label: "Đã duyệt", value: "approved" },
        { label: "Từ chối", value: "rejected" },
        { label: "Đã khóa cửa hàng", value: "suspended" },
      ],
      // Sellers may only submit/resubmit an application. Approval and bans stay admin-only.
      access: {
        update: ({ req, siblingData, doc }) =>
          isStaff(req.user) ||
          (req.user?.collection === "users" &&
            siblingData?.sellerStatus === "pending" &&
            !["approved", "suspended"].includes(String(doc?.sellerStatus ?? ""))),
        create: () => false,
      },
    },
    {
      name: "sellerReviewNote",
      label: "Ghi chú duyệt người bán",
      type: "textarea",
      maxLength: 500,
      access: { create: staffField, update: staffField },
    },
    {
      name: "shopBan",
      label: "Khóa cửa hàng & kháng cáo",
      type: "group",
      admin: { condition: (data) => data?.sellerStatus === "suspended" || Boolean(data?.shopBan?.reason) },
      fields: [
        { name: "reason", label: "Lý do khóa", type: "textarea", maxLength: 500, access: { create: staffField, update: staffField } },
        { name: "bannedAt", label: "Khóa lúc", type: "date", access: { create: staffField, update: staffField }, admin: { readOnly: true } },
        {
          name: "appealStatus",
          label: "Trạng thái kháng cáo",
          type: "select",
          defaultValue: "none",
          options: [
            { label: "Chưa kháng cáo", value: "none" },
            { label: "Đang chờ xử lý", value: "pending" },
            { label: "Đã từ chối", value: "rejected" },
          ],
          access: { create: staffField, update: appealField },
        },
        { name: "appealMessage", label: "Nội dung kháng cáo", type: "textarea", maxLength: 1000, access: { create: staffField, update: appealField } },
        { name: "appealSubmittedAt", label: "Gửi kháng cáo lúc", type: "date", access: { create: staffField, update: appealField }, admin: { readOnly: true } },
        { name: "appealCount", label: "Số lần kháng cáo", type: "number", min: 0, access: { create: staffField, update: appealField }, admin: { readOnly: true } },
        { name: "appealResponse", label: "Phản hồi của BOAI", type: "textarea", maxLength: 500, access: { create: staffField, update: staffField } },
      ],
    },
    {
      name: "notificationsSeenAt",
      label: "Xem thông báo lần cuối",
      type: "date",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "notificationPrefs",
      label: "Tùy chọn thông báo",
      type: "group",
      fields: [
        { name: "following", label: "Shop & người tôi theo dõi", type: "checkbox", defaultValue: true },
        { name: "community", label: "Bình luận, lượt theo dõi, lời mời kết bạn", type: "checkbox", defaultValue: true },
        { name: "orders", label: "Đơn hàng", type: "checkbox", defaultValue: true },
        { name: "messages", label: "Tin nhắn (thông báo nổi & trình duyệt)", type: "checkbox", defaultValue: true },
        { name: "promotions", label: "Sự kiện & khuyến mãi của BOAI", type: "checkbox", defaultValue: true },
      ],
    },
    {
      name: "seller",
      type: "group",
      fields: [
        {
          name: "shopName",
          label: "Tên cửa hàng",
          type: "text",
          maxLength: 60,
          hooks: {
            beforeValidate: [
              ({ value }) =>
                typeof value === "string"
                  ? value.replace(/\s+/g, " ").trim()
                  : value,
            ],
          },
          validate: (value: unknown) =>
            !value ||
            (typeof value === "string" && value.trim().length >= 2) ||
            "Tên cửa hàng cần ít nhất 2 ký tự.",
        },
        {
          name: "businessType",
          type: "select",
          options: [
            { label: "Cá nhân", value: "individual" },
            { label: "Hộ kinh doanh", value: "household" },
            { label: "Doanh nghiệp", value: "company" },
          ],
        },
        { name: "idNumber", type: "text", label: "Số CCCD" },
        { name: "taxCode", type: "text", label: "Mã số thuế" },
        {
          name: "businessLicense",
          type: "text",
          label: "Số giấy phép kinh doanh",
        },
        {
          name: "bankCode",
          type: "select",
          label: "Ngân hàng nhận tiền",
          options: BANKS.map((bank) => ({ label: bank.name, value: bank.code })),
        },
        {
          name: "bankAccountNumber",
          type: "text",
          label: "Số tài khoản nhận tiền",
          validate: (value: unknown) =>
            !value ||
            (typeof value === "string" && ACCOUNT_NUMBER_PATTERN.test(value)) ||
            "Số tài khoản gồm 6–19 chữ số.",
        },
        {
          name: "bankAccountHolder",
          type: "text",
          label: "Chủ tài khoản",
          maxLength: 80,
        },
        {
          name: "bankAccount",
          type: "text",
          label: "Tài khoản ngân hàng (tóm tắt)",
          admin: {
            readOnly: true,
            description: "Tự động tạo từ ngân hàng, số tài khoản và chủ tài khoản.",
          },
        },
        { name: "warehouseAddress", type: "textarea", label: "Địa chỉ kho" },
        {
          name: "warehouseProvince",
          type: "select",
          label: "Tỉnh / thành của kho",
          options: PROVINCES.map((p) => ({ label: p.name, value: p.code })),
          admin: { description: "Dùng để tính phí vận chuyển theo vùng." },
        },
        {
          type: "row",
          fields: [
            { name: "warehouseLat", type: "number", label: "Vĩ độ kho", admin: { description: "Từ nút “Định vị kho” trong Kênh người bán." } },
            { name: "warehouseLng", type: "number", label: "Kinh độ kho" },
          ],
        },
        {
          name: "shippingRates",
          type: "group",
          // Legacy: shops no longer set their own rates (distance pricing by BOAI). Kept to preserve stored values.
          admin: { hidden: true },
          fields: [
            {
              type: "row",
              fields: SHIPPING_ZONES.map((zone) => ({
                name: zone,
                type: "number" as const,
                min: 0,
                admin: { width: "33%" },
              })),
            },
          ],
        },
        { name: "phone", type: "text" },
        {
          name: "customJersey",
          type: "group",
          label: "Nhận may áo custom",
          admin: { description: "Shop bật mục này sẽ xuất hiện ở trang Custom áo để khách gửi mẫu." },
          fields: [
            { name: "enabled", type: "checkbox", label: "Nhận đặt may áo custom", defaultValue: false },
            { name: "intro", type: "textarea", label: "Giới thiệu dịch vụ", maxLength: 300 },
            {
              type: "row",
              fields: [
                { name: "priceFrom", type: "number", label: "Giá từ (₫/áo)", min: 0, max: 10000000, admin: { width: "33%" } },
                { name: "minQuantity", type: "number", label: "Số lượng tối thiểu", min: 1, max: 1000, defaultValue: 1, admin: { width: "33%" } },
                { name: "leadDays", type: "number", label: "Thời gian làm (ngày)", min: 1, max: 90, admin: { width: "33%" } },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "avatar",
      label: "Ảnh đại diện",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "cover",
      label: "Ảnh bìa hồ sơ",
      type: "upload",
      relationTo: "media",
      access: { create: staffField },
    },
    {
      name: "favoriteSport",
      type: "select",
      options: [
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
      ],
    },
    { name: "phone", type: "text" },
    { name: "address", type: "textarea" },
    {
      name: "addresses",
      type: "array",
      label: "Địa chỉ giao hàng",
      maxRows: 8,
      fields: [
        { name: "label", type: "text", required: true, label: "Tên địa chỉ" },
        {
          name: "recipientName",
          type: "text",
          required: true,
          label: "Người nhận",
        },
        { name: "phone", type: "text", required: true, label: "Số điện thoại" },
        {
          name: "addressLine",
          type: "textarea",
          required: true,
          label: "Địa chỉ chi tiết",
        },
        { name: "ward", type: "text", label: "Phường / Xã" },
        {
          name: "district",
          type: "text",
          required: true,
          label: "Quận / Huyện",
        },
        {
          name: "province",
          type: "text",
          required: true,
          label: "Tỉnh / Thành phố",
        },
        {
          // Set from the "Định vị" address search; exact points give exact shipping fees.
          type: "row",
          fields: [
            { name: "lat", type: "number", label: "Vĩ độ", admin: { readOnly: true } },
            { name: "lng", type: "number", label: "Kinh độ", admin: { readOnly: true } },
          ],
        },
        {
          name: "isDefault",
          type: "checkbox",
          defaultValue: false,
          label: "Địa chỉ mặc định",
        },
      ],
    },
    { name: "bio", type: "textarea" },
    {
      name: "level",
      type: "select",
      options: [
        { label: "Mới chơi", value: "beginner" },
        { label: "Phong trào", value: "amateur" },
        { label: "Bán chuyên", value: "semi-pro" },
        { label: "Chuyên nghiệp", value: "pro" },
      ],
    },
    {
      name: "shoppingState",
      type: "group",
      label: "Trạng thái mua sắm",
      fields: [
        {
          name: "cart",
          type: "array",
          maxRows: 50,
          fields: [
            {
              name: "product",
              type: "relationship",
              relationTo: "products",
              required: true,
            },
            {
              name: "quantity",
              type: "number",
              required: true,
              min: 1,
              max: 20,
            },
            { name: "color", type: "text", maxLength: 40 },
            { name: "size", type: "text", maxLength: 20 },
            { name: "stringing", type: "checkbox" },
          ],
        },
        {
          name: "favorites",
          type: "relationship",
          relationTo: "products",
          hasMany: true,
          maxRows: 100,
        },
        {
          name: "compare",
          type: "relationship",
          relationTo: "products",
          hasMany: true,
          maxRows: 2,
        },
        { name: "theme", type: "select", options: ["light", "dark"] },
        { name: "language", type: "select", options: ["vi", "en"] },
        {
          name: "searchHistory",
          type: "array",
          maxRows: 10,
          fields: [
            { name: "query", type: "text", required: true, maxLength: 100 },
          ],
        },
      ],
    },
    {
      name: "sportDnaProfiles",
      type: "array",
      maxRows: 2,
      validate: (value: unknown) => {
        if (!Array.isArray(value)) return true
        const sports = value.map((row) =>
          row && typeof row === "object"
            ? (row as { sport?: unknown }).sport
            : undefined,
        )
        return (
          sports.length === new Set(sports).size ||
          "Mỗi môn thể thao chỉ được có một hồ sơ."
        )
      },
      fields: [
        {
          name: "sport",
          type: "select",
          required: true,
          options: ["football", "badminton"],
        },
        {
          name: "role",
          type: "select",
          required: true,
          options: [
            "striker",
            "midfielder",
            "defender",
            "goalkeeper",
            "attack",
            "defense",
            "allround",
          ],
        },
        { name: "level", type: "number", required: true, min: 0, max: 3 },
        { name: "freq", type: "number", required: true, min: 0, max: 2 },
        {
          name: "surface",
          type: "select",
          required: true,
          options: ["ag", "fg", "ic", "mat", "wood", "outdoor"],
        },
        {
          name: "budget",
          type: "number",
          required: true,
          min: 0,
          max: 100000000,
        },
        {
          name: "skills",
          type: "array",
          minRows: 1,
          maxRows: 4,
          fields: [
            { name: "name", type: "text", required: true, maxLength: 40 },
            { name: "value", type: "number", required: true, min: 1, max: 10 },
          ],
        },
      ],
    },
    {
      name: "equipmentPreferences",
      type: "group",
      label: "SportDNA Equipment Fit",
      fields: [
        {
          name: "footballSurface",
          type: "select",
          options: ["ag", "fg", "ic"],
        },
        {
          name: "badmintonPlaystyle",
          type: "select",
          options: ["attack", "defense", "allround"],
        },
        {
          // Badminton foot shape (also the legacy shared value before per-sport needs).
          name: "footShape",
          type: "select",
          options: ["narrow", "standard", "wide"],
        },
        // Badminton budget (also the legacy shared value before per-sport needs).
        { name: "budget", type: "number", min: 0, max: 100000000 },
        {
          name: "stringTensionLbs",
          type: "number",
          min: 15,
          max: 35,
        },
        {
          name: "footballFootShape",
          type: "select",
          options: ["narrow", "standard", "wide"],
        },
        {
          name: "footballPosition",
          type: "select",
          options: ["goalkeeper", "defender", "midfielder", "striker"],
        },
        { name: "footballBudget", type: "number", min: 0, max: 100000000 },
        // Racket handle size the player is used to (G4 thicker → G6 thinner).
        { name: "badmintonGripSize", type: "select", options: ["G4", "G5", "G6"] },
        { name: "savedAt", type: "date", admin: { readOnly: true } },
      ],
    },
  ],
}
