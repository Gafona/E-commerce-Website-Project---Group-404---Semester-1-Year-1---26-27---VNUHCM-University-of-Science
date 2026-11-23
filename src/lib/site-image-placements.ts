export const SITE_IMAGE_PLACEMENTS = [
  { value: "home-hero", label: "Trang chủ — ảnh bìa", hint: "Ngang, tối thiểu 1800px. Bị thay bởi ảnh sự kiện khi có sự kiện ở hero." },
  { value: "home-football", label: "Trang chủ — khối bóng đá", hint: "Dọc hoặc vuông." },
  { value: "home-badminton", label: "Trang chủ — khối cầu lông", hint: "Dọc hoặc vuông." },
  { value: "login", label: "Trang đăng nhập", hint: "Dọc, chủ thể ở giữa." },
  { value: "register", label: "Trang đăng ký", hint: "Dọc, chủ thể ở giữa." },
  { value: "community-cover", label: "Cộng đồng — ảnh bìa", hint: "Ngang rộng." },
] as const

export type SiteImagePlacement = (typeof SITE_IMAGE_PLACEMENTS)[number]["value"]

export const isSiteImagePlacement = (value: unknown): value is SiteImagePlacement =>
  SITE_IMAGE_PLACEMENTS.some((p) => p.value === value)
