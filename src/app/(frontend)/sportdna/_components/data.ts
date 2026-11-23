// SportDNA — dữ liệu giao diện dùng chung (bậc kỹ năng, nhãn hiển thị).
// Không còn dữ liệu mẫu: kết quả, sản phẩm và cộng đồng đều đọc từ Payload.


import { RATING_TIERS } from "../../../../lib/rating/ratingConfig.ts"

// Ngân hàng câu hỏi/tình huống và chấm điểm nằm ở lib để server dùng chung.
export * from "../../../../lib/sportdna-assessment.ts"

export const BASE = "/sportdna"

// ---------- Skill / Evidence ----------

export type EvidenceLevel = "SELF_REPORTED_LEGACY" | "V1" | "V2" | "V3"

export type RadarAxis = {
  label: string
  origin: "scenario" | "quiz"
  source: string
  /** null => insufficient_data: faded center dot, never a fake value */
  value: number | null
}
// Section 3.1 — 10 skill tiers (blue badge). Tên/ranh giới lấy trực tiếp từ
// RATING_TIERS (ratingConfig.ts); chỉ giữ id cũ của mockup. Bậc đầu không có cận dưới (min 0).
const SKILL_TIER_IDS = [
  "tier_0_new",
  "tier_1_beginner",
  "tier_2_novice",
  "tier_3_developing",
  "tier_4_intermediate",
  "tier_5_upper_intermediate",
  "tier_6_advanced",
  "tier_7_competitive",
  "tier_8_expert",
  "tier_9_elite",
] as const
export type SkillTier = { id: (typeof SKILL_TIER_IDS)[number]; label: string; min: number; max: number | null }
export const SKILL_TIERS: readonly SkillTier[] = RATING_TIERS.map((tier, i) => ({
  id: SKILL_TIER_IDS[i],
  label: tier.name,
  min: tier.min ?? 0,
  max: tier.max,
}))
/** Bậc đầu bắt đầu từ 0, nên chỉ trả về null khi elo âm. */
export const skillTierOf = (elo: number): SkillTier | null =>
  [...SKILL_TIERS].reverse().find((t) => elo >= t.min) ?? null

// ---------- Community Reputation (CP) ----------

export type TierId = "NEWCOMER" | "ACTIVE_MEMBER" | "TRUSTED_MEMBER" | "CONTRIBUTOR" | "PILLAR"
export const TIERS: { id: TierId; label: string; min: number; max: number; blurb?: string }[] = [
  { id: "NEWCOMER", label: "Thành viên mới", min: 0, max: 99, blurb: "Bạn đang bắt đầu hành trình..." },
  { id: "ACTIVE_MEMBER", label: "Thành viên tích cực", min: 100, max: 299, blurb: "Bạn đã trở thành một thành viên tích cực..." },
  { id: "TRUSTED_MEMBER", label: "Thành viên uy tín", min: 300, max: 549 },
  { id: "CONTRIBUTOR", label: "Người đóng góp", min: 550, max: 799 },
  { id: "PILLAR", label: "Trụ cột cộng đồng", min: 800, max: 1000 },
]
export const tierOf = (id: TierId) => TIERS.find((x) => x.id === id)!

export type ModStatus = "PENDING" | "APPROVED" | "NEEDS_REVIEW" | "REJECTED" | "REVOKED"
export const MOD_LABEL: Record<ModStatus, { label: string; tip: string }> = {
  PENDING: { label: "Đang chờ duyệt", tip: "Chưa cộng vào uy tín. Tự động duyệt sau 7 ngày nếu không có báo cáo." },
  APPROVED: { label: "Đã duyệt", tip: "Đã cộng vào lifetime và uy tín hiện tại." },
  NEEDS_REVIEW: { label: "Đang xem xét", tip: "Đang được xem xét. Chưa cộng vào uy tín." },
  REJECTED: { label: "Bị từ chối", tip: "Không tính điểm. Bản ghi được xóa sau 90 ngày." },
  REVOKED: { label: "Đã thu hồi", tip: "Không tính điểm. Bản ghi giữ vĩnh viễn để kiểm toán." },
}

// ---------- Equipment Fit ----------

export type SourceQuality = "MANUFACTURER_VERIFIED" | "SELLER_PROVIDED" | "INFERRED" | "UNKNOWN"
export const SOURCE_LABEL: Record<SourceQuality, string> = {
  MANUFACTURER_VERIFIED: "Hãng xác nhận",
  SELLER_PROVIDED: "Người bán cung cấp",
  INFERRED: "Suy luận",
  UNKNOWN: "Không rõ",
}

export type Confidence = "high" | "medium" | "low" | "insufficient_data"

export const vnd = (n: number) => n.toLocaleString("vi-VN") + " ₫"
