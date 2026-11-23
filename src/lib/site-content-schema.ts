/**
 * Single source of truth for admin-editable website copy.
 * The Payload `site-content` global, the /quan-tri editor and the typed
 * frontend accessor are all generated from this list.
 */
export type ContentFieldKind = "text" | "textarea" | "lines" | "url" | "phone"

export type ContentFieldDef = {
  key: string
  label: string
  kind: ContentFieldKind
  /** Bilingual fields store `{ vi, en }`; single fields store one string. */
  single?: boolean
  /** Optional fields may be left blank to hide the element on the site. */
  optional?: boolean
  help?: string
  vi: string
  en?: string
}

export type ContentSectionDef = {
  key: string
  label: string
  page: ContentPage
  description?: string
  fields: readonly ContentFieldDef[]
}

export type ContentPage = "general" | "home" | "auth" | "community"

export const CONTENT_PAGES: { key: ContentPage; label: string }[] = [
  { key: "general", label: "Chung toàn website" },
  { key: "home", label: "Trang chủ" },
  { key: "auth", label: "Đăng nhập & đăng ký" },
  { key: "community", label: "Cộng đồng" },
]

export const SITE_CONTENT = [
  {
    key: "topbar",
    label: "Thanh thông tin đầu trang chủ",
    page: "general",
    fields: [
      { key: "left", label: "Bên trái", kind: "text", optional: true, vi: "Phí giao hàng tính theo khoảng cách", en: "Delivery fee based on distance" },
      { key: "center", label: "Ở giữa", kind: "text", optional: true, vi: "ĐỔI TRẢ DỄ DÀNG TRONG 30 NGÀY", en: "EASY 30-DAY RETURNS" },
    ],
  },
  {
    key: "contact",
    label: "Liên hệ & mạng xã hội",
    page: "general",
    description: "Để trống liên kết nào thì liên kết đó được ẩn khỏi website.",
    fields: [
      { key: "hotline", label: "Hotline", kind: "phone", single: true, optional: true, vi: "1900 8868" },
      { key: "zalo", label: "Zalo", kind: "url", single: true, optional: true, vi: "https://zalo.me" },
      { key: "facebook", label: "Facebook", kind: "url", single: true, optional: true, vi: "https://facebook.com" },
      { key: "tiktok", label: "TikTok", kind: "url", single: true, optional: true, vi: "https://tiktok.com" },
      { key: "instagram", label: "Instagram", kind: "url", single: true, optional: true, vi: "" },
      { key: "youtube", label: "YouTube", kind: "url", single: true, optional: true, vi: "" },
    ],
  },
  {
    key: "footer",
    label: "Chân trang",
    page: "general",
    fields: [
      { key: "tagline", label: "Khẩu hiệu", kind: "text", vi: "Trang bị đúng chất cho người chơi Việt.", en: "Real gear for Vietnamese players." },
      { key: "copyright", label: "Dòng bản quyền", kind: "text", help: "Năm hiện tại được thêm tự động.", vi: "BOAI. Play your own game.", en: "BOAI. Play your own game." },
    ],
  },
  {
    key: "commerce",
    label: "Mua sắm",
    page: "general",
    fields: [
      { key: "cartNote", label: "Ghi chú dưới giỏ hàng", kind: "text", optional: true, vi: "Phí vận chuyển tính theo khoảng cách · Đổi trả trong 30 ngày", en: "Distance-based shipping · 30-day returns" },
      { key: "trending", label: "Gợi ý tìm kiếm phổ biến", kind: "lines", single: true, optional: true, help: "Mỗi dòng một từ khóa.", vi: "Yonex\nGiày bóng đá\nVợt cầu lông\nNike\nÁo đấu" },
    ],
  },
  {
    key: "homeHero",
    label: "Ảnh bìa (hero)",
    page: "home",
    description: "Khi có sự kiện đặt ở vị trí hero, nội dung sự kiện sẽ thay thế phần chữ này.",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ phía trên", kind: "text", optional: true, vi: "MÙA GIẢI MỚI / 2026", en: "NEW SEASON / 2026" },
      { key: "title1", label: "Tiêu đề dòng 1", kind: "text", vi: "VƯỢT GIỚI HẠN.", en: "BREAK LIMITS." },
      { key: "title2", label: "Tiêu đề dòng 2", kind: "text", optional: true, vi: "CHẤT RIÊNG LÊN TIẾNG.", en: "MAKE YOUR MARK." },
      { key: "text", label: "Mô tả", kind: "textarea", optional: true, vi: "Trang bị chính hãng được chọn theo lối chơi của bạn. Từ sân cỏ đến sân cầu, BOAI giúp bạn chơi tốt hơn mỗi ngày.", en: "Authentic gear picked for the way you play. From the pitch to the court, BOAI helps you play better every day." },
      { key: "primaryCta", label: "Nút chính", kind: "text", vi: "Mua sắm ngay", en: "Shop now" },
      { key: "secondaryCta", label: "Nút phụ (SportDNA)", kind: "text", vi: "Khám phá SportDNA", en: "Discover SportDNA" },
      { key: "statTitle", label: "Thẻ phù hợp — tiêu đề", kind: "text", vi: "Dành cho chính bạn", en: "Made for you" },
      { key: "statText", label: "Thẻ phù hợp — mô tả", kind: "text", vi: "Gợi ý bởi BOAI SportDNA", en: "Picked by BOAI SportDNA" },
    ],
  },
  {
    key: "homeFootball",
    label: "Khối bóng đá",
    page: "home",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "TRANG BỊ SÂN CỎ", en: "PITCH GEAR" },
      { key: "title", label: "Tiêu đề", kind: "text", vi: "Bóng đá", en: "Football" },
      { key: "text", label: "Mô tả", kind: "textarea", vi: "Tốc độ, kiểm soát và bản lĩnh. Chọn đúng trang bị cho từng vị trí và mặt sân.", en: "Speed, control and nerve. Pick the right gear for every position and surface." },
    ],
  },
  {
    key: "homeBadminton",
    label: "Khối cầu lông",
    page: "home",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "TỐC ĐỘ TRÊN KHÔNG", en: "SPEED IN THE AIR" },
      { key: "title", label: "Tiêu đề", kind: "text", vi: "Cầu lông", en: "Badminton" },
      { key: "text", label: "Mô tả", kind: "textarea", vi: "Từ cú smash uy lực đến pha phản tạt chớp nhoáng. Khám phá trang bị dành cho phong cách của bạn.", en: "From thunderous smashes to lightning drives. Find gear built for your style." },
    ],
  },
  {
    key: "homeAthletes",
    label: "Khối vận động viên truyền cảm hứng",
    page: "home",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "CẢM HỨNG TỪ NHỮNG BIỂU TƯỢNG", en: "INSPIRED BY ICONS" },
      { key: "title", label: "Tiêu đề", kind: "text", vi: "Dấu ấn huyền thoại.", en: "The mark of legends." },
      { key: "text", label: "Mô tả", kind: "textarea", optional: true, vi: "Mỗi phong cách thi đấu là một cách định nghĩa giới hạn mới. Khám phá tinh thần đã làm nên những tên tuổi lớn của bóng đá và cầu lông.", en: "Every playing style redraws the limit. Explore the qualities behind some of football and badminton's biggest names." },
      { key: "disclaimer", label: "Ghi chú cuối khối", kind: "textarea", optional: true, vi: "Hình ảnh tư liệu được ghi nguồn trên từng thẻ. Nội dung mang tính truyền cảm hứng, không hàm ý các vận động viên tài trợ hoặc chứng thực BOAI.", en: "Editorial imagery credited on each card. This inspirational feature does not imply athlete sponsorship or endorsement of BOAI." },
    ],
  },
  {
    key: "homeDna",
    label: "Khối SportDNA",
    page: "home",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "CÁ NHÂN HÓA BẰNG DỮ LIỆU", en: "DATA-DRIVEN PERSONALIZATION" },
      { key: "title1", label: "Tiêu đề dòng 1", kind: "text", vi: "Đừng chọn đại.", en: "Don't guess." },
      { key: "title2", label: "Tiêu đề dòng 2", kind: "text", vi: "Hãy chọn", en: "Choose" },
      { key: "accent", label: "Chữ nhấn màu", kind: "text", optional: true, vi: "đúng.", en: "right." },
      { key: "text", label: "Mô tả", kind: "textarea", vi: "Phân tích trình độ, vị trí và lối chơi để tìm trang bị có độ tương thích cao nhất.", en: "We analyze your level, position and play style to find the best-matching gear." },
      { key: "cta", label: "Nút", kind: "text", vi: "Đo trình độ của tôi", en: "Measure my level" },
    ],
  },
  {
    key: "homeSale",
    label: "Khối flash sale",
    page: "home",
    description: "Chỉ hiện khi có sản phẩm giảm giá. Dùng {count} để chèn số sản phẩm đang giảm.",
    fields: [
      { key: "stamp", label: "Chữ trên tem", kind: "text", vi: "CUỐI TUẦN", en: "WEEKEND" },
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "FLASH SALE ĐANG DIỄN RA", en: "FLASH SALE NOW LIVE" },
      { key: "title", label: "Tiêu đề (trước % giảm)", kind: "text", vi: "Giảm đến", en: "Save up to" },
      { key: "text", label: "Mô tả", kind: "textarea", vi: "{count} sản phẩm bóng đá và cầu lông đang có giá tốt. Số lượng ưu đãi có hạn.", en: "{count} football and badminton products are marked down. Limited sale quantities." },
      { key: "cta", label: "Nút", kind: "text", vi: "Xem sản phẩm giảm giá", en: "Shop the sale" },
    ],
  },
  {
    key: "homeCatalog",
    label: "Khối tất cả sản phẩm",
    page: "home",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "KHO SẢN PHẨM BOAI", en: "BOAI CATALOG" },
      { key: "title", label: "Tiêu đề", kind: "text", vi: "Tất cả trang bị", en: "All gear" },
    ],
  },
  {
    key: "homeBenefits",
    label: "Cam kết dịch vụ",
    page: "home",
    fields: [
      { key: "b1Title", label: "Cam kết 1 — tiêu đề", kind: "text", optional: true, vi: "Chính hãng 100%", en: "100% authentic" },
      { key: "b1Text", label: "Cam kết 1 — mô tả", kind: "text", optional: true, vi: "Xác thực minh bạch", en: "Transparent verification" },
      { key: "b2Title", label: "Cam kết 2 — tiêu đề", kind: "text", optional: true, vi: "Giao hàng toàn quốc", en: "Nationwide delivery" },
      { key: "b2Text", label: "Cam kết 2 — mô tả", kind: "text", optional: true, vi: "Phí theo khoảng cách, báo trước khi giao", en: "Distance-based fee, quoted before shipping" },
      { key: "b3Title", label: "Cam kết 3 — tiêu đề", kind: "text", optional: true, vi: "Tư vấn đúng chuyên môn", en: "Expert advice" },
      { key: "b3Text", label: "Cam kết 3 — mô tả", kind: "text", optional: true, vi: "Đội ngũ yêu thể thao", en: "A team that loves sport" },
    ],
  },
  {
    key: "login",
    label: "Trang đăng nhập",
    page: "auth",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ trên ảnh", kind: "text", vi: "THÀNH VIÊN BOAI", en: "BOAI MEMBERS" },
      { key: "title1", label: "Tiêu đề dòng 1", kind: "text", vi: "VƯỢT GIỚI HẠN.", en: "BREAK LIMITS." },
      { key: "title2", label: "Tiêu đề dòng 2", kind: "text", optional: true, vi: "CHẤT RIÊNG LÊN TIẾNG.", en: "MAKE YOUR MARK." },
      { key: "text", label: "Mô tả trên ảnh", kind: "textarea", optional: true, vi: "Một tài khoản cho toàn bộ hành trình: từ tìm đúng trang bị đến theo dõi từng đơn hàng.", en: "One account for your whole journey, from finding the right gear to tracking every order." },
      { key: "points", label: "Lợi ích (mỗi dòng một ý)", kind: "lines", optional: true, vi: "Đồng bộ giỏ hàng và yêu thích\nLưu SportDNA và thiết kế áo\nTheo dõi đơn trên mọi thiết bị", en: "Sync cart and wishlist\nSave SportDNA and jersey designs\nTrack orders on every device" },
      { key: "heading", label: "Tiêu đề form", kind: "text", vi: "Chào mừng trở lại", en: "Welcome back" },
      { key: "subheading", label: "Mô tả form", kind: "textarea", optional: true, vi: "Tiếp tục với thiết kế, giỏ hàng và SportDNA đã lưu.", en: "Continue with your saved designs, cart and SportDNA." },
    ],
  },
  {
    key: "register",
    label: "Trang đăng ký",
    page: "auth",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ trên ảnh", kind: "text", vi: "BOAI SPORTDNA™", en: "BOAI SPORTDNA™" },
      { key: "title1", label: "Tiêu đề dòng 1", kind: "text", vi: "VƯỢT GIỚI HẠN.", en: "BREAK LIMITS." },
      { key: "title2", label: "Tiêu đề dòng 2", kind: "text", optional: true, vi: "CHẤT RIÊNG LÊN TIẾNG.", en: "MAKE YOUR MARK." },
      { key: "text", label: "Mô tả trên ảnh", kind: "textarea", optional: true, vi: "Tạo hồ sơ thể thao cá nhân và mở khóa trải nghiệm mua sắm theo đúng lối chơi của bạn.", en: "Build your sports profile and unlock a shopping experience shaped around your game." },
      { key: "points", label: "Lợi ích (mỗi dòng một ý)", kind: "lines", optional: true, vi: "Gợi ý trang bị theo SportDNA\nLưu thiết kế áo dài hạn\nKhôi phục dữ liệu trên mọi thiết bị", en: "SportDNA-powered gear picks\nKeep jersey designs long-term\nRestore your data on every device" },
      { key: "heading", label: "Tiêu đề form", kind: "text", vi: "Tạo tài khoản", en: "Create account" },
      { key: "subheading", label: "Mô tả form", kind: "textarea", optional: true, vi: "Chỉ mất một phút. Bạn có thể bổ sung số điện thoại và địa chỉ sau khi đăng ký.", en: "It only takes a minute. Add your phone and delivery address after signing up." },
    ],
  },
  {
    key: "communityHero",
    label: "Ảnh bìa cộng đồng",
    page: "community",
    fields: [
      { key: "eyebrow", label: "Dòng nhỏ", kind: "text", vi: "BOAI COMMUNITY", en: "BOAI COMMUNITY" },
      { key: "title1", label: "Tiêu đề dòng 1", kind: "text", vi: "Cùng đam mê.", en: "Same passion." },
      { key: "title2", label: "Tiêu đề dòng 2 (màu nhấn)", kind: "text", optional: true, vi: "Thêm kết nối.", en: "More connection." },
      { key: "text", label: "Mô tả", kind: "textarea", optional: true, vi: "Một góc sân chung để kể chuyện trang bị, hỏi người có kinh nghiệm và tìm thấy đồng đội cùng chất.", en: "Your shared space for gear stories, honest advice and people who play your way." },
      { key: "tagline", label: "Dòng cạnh avatar thành viên", kind: "text", optional: true, vi: "Gặp nhau trên sân. Gắn kết ở đây.", en: "Meet on the pitch. Connect here." },
      { key: "cta", label: "Nút", kind: "text", vi: "Chia sẻ câu chuyện", en: "Share your story" },
    ],
  },
] as const satisfies readonly ContentSectionDef[]

type Sections = (typeof SITE_CONTENT)[number]
export type ContentKey = {
  [S in Sections as S["key"]]: `${S["key"]}.${S["fields"][number]["key"]}`
}[Sections["key"]]

export type BiText = { vi: string; en: string }
export type ResolvedContent = Record<ContentKey, BiText>

export const isBilingual = (field: ContentFieldDef) => !field.single

/** Stored global document → flat map; required blanks fall back to schema copy. */
export function resolveContent(doc: unknown): ResolvedContent {
  const root = (doc && typeof doc === "object" ? doc : {}) as Record<string, unknown>
  const out = {} as Record<string, BiText>
  for (const section of SITE_CONTENT as readonly ContentSectionDef[]) {
    const group = (root[section.key] ?? {}) as Record<string, unknown>
    for (const field of section.fields) {
      const raw = group[field.key]
      let vi = ""
      let en = ""
      if (field.single) {
        vi = typeof raw === "string" ? raw.trim() : ""
        en = vi
      } else if (raw && typeof raw === "object") {
        const v = raw as { vi?: unknown; en?: unknown }
        vi = typeof v.vi === "string" ? v.vi.trim() : ""
        en = typeof v.en === "string" ? v.en.trim() : ""
      }
      // Never stored yet (null) → schema copy; deliberately cleared optional → hidden.
      const neverSaved = raw === undefined || raw === null
      if (!vi && (neverSaved || !field.optional)) vi = field.vi
      if (!en && !field.single) en = neverSaved || !field.optional ? (field.en ?? vi) : vi
      out[`${section.key}.${field.key}`] = { vi, en: en || vi }
    }
  }
  return out as ResolvedContent
}

/** Picks the visitor's language, with `{name}` placeholder support. */
export function pickText(value: BiText, lang: "vi" | "en", vars?: Record<string, string | number>) {
  let text = lang === "en" ? value.en || value.vi : value.vi
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

export const toLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
