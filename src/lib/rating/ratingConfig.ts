// Cấu hình Match Rating: bảng bậc chuẩn (dùng chung cho quiz SportDNA và MR, E1b)
// và mọi hằng GIẢ ĐỊNH của engine MR.

// GIẢ ĐỊNH: quần thể phân phối chuẩn, trung bình 1000, độ lệch chuẩn 250.
export const RATING_POPULATION_MEAN = 1000 // GIẢ ĐỊNH
export const RATING_POPULATION_SD = 250 // GIẢ ĐỊNH

// GIẢ ĐỊNH: bậc đầu không có cận dưới; dùng mốc này để tính progress rồi kẹp vào [0, 1].
export const FIRST_TIER_PROGRESS_FLOOR = 600 // GIẢ ĐỊNH

export type RatingTierColor = "gray" | "green" | "orange" | "red" | "purple"

export type RatingTierId =
  | "tier_1"
  | "tier_2"
  | "tier_3"
  | "tier_4"
  | "tier_5"
  | "tier_6"
  | "tier_7"
  | "tier_8"
  | "tier_9"
  | "tier_10"

export type RatingTier = {
  id: RatingTierId
  name: string
  /** Cận dưới (bao gồm). null = không có cận dưới. */
  min: number | null
  /** Cận trên hiển thị (bao gồm, theo bảng). null = không có cận trên. */
  max: number | null
  color: RatingTierColor
}

// GIẢ ĐỊNH: ranh giới bậc theo bảng Lead (E1).
export const RATING_TIERS: readonly RatingTier[] = [
  { id: "tier_1", name: "Mới tập chơi", min: null, max: 799, color: "gray" },
  { id: "tier_2", name: "Phong trào yếu", min: 800, max: 999, color: "gray" },
  { id: "tier_3", name: "Trung bình", min: 1000, max: 1199, color: "gray" },
  { id: "tier_4", name: "Trung bình khá", min: 1200, max: 1399, color: "green" },
  { id: "tier_5", name: "Khá", min: 1400, max: 1599, color: "green" },
  { id: "tier_6", name: "Khá +", min: 1600, max: 1799, color: "orange" },
  { id: "tier_7", name: "Bán chuyên", min: 1800, max: 1999, color: "orange" },
  { id: "tier_8", name: "Chuyên nghiệp", min: 2000, max: 2199, color: "red" },
  { id: "tier_9", name: "Bán chuyên Quốc gia", min: 2200, max: 2399, color: "red" },
  { id: "tier_10", name: "Huyền thoại", min: 2400, max: null, color: "purple" },
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Trả bậc của BR. BR có thể là số thực: bậc được chọn theo cận dưới của bậc kế
 * tiếp (vd 999.6 vẫn thuộc tier_2 vì < 1000).
 * progress = (br − min) / (max − min), kẹp [0, 1]. Bậc cuối: progress = 0.
 * Bậc đầu: min = FIRST_TIER_PROGRESS_FLOOR rồi kẹp [0, 1].
 */
export function resolveRatingTier(br: number) {
  let index = 0
  for (let i = 0; i < RATING_TIERS.length; i++) {
    const min = RATING_TIERS[i].min
    if (min === null || br >= min) index = i
  }
  const tier = RATING_TIERS[index]
  let progress = 0
  if (tier.max !== null) {
    const min = tier.min ?? FIRST_TIER_PROGRESS_FLOOR
    progress = clamp01((br - min) / (tier.max - min))
  }
  return {
    id: tier.id,
    name: tier.name,
    min: tier.min,
    max: tier.max,
    color: tier.color,
    progress,
  }
}

// ---------- Hằng của engine MR (E1b: gom về một nơi) ----------

/** K gốc theo loại trận. */
export const K_BASE = { friendly: 10, community: 24, official: 32 } as const // GIẢ ĐỊNH
/** Hệ số K lâm thời nhân vào K gốc trong các trận đầu. */
export const PROVISIONAL_K_MULTIPLIER = 2 // GIẢ ĐỊNH
/** Số trận đầu được coi là lâm thời (K × 2, áp trần tăng). */
export const PROVISIONAL_MATCHES = 10 // GIẢ ĐỊNH
/** Trần tổng mức tăng MR trong các trận lâm thời. */
export const PROVISIONAL_GROWTH_CAP = 400 // GIẢ ĐỊNH
/** Trần |tổng ΔR| của một người trong một giải. */
export const TOURNAMENT_DELTA_CAP = 80 // GIẢ ĐỊNH

/** Điều kiện gỡ trần BR (cap1: 1199; cap2: AR + 200). */
export const CAP_CONFIG = { cap1: 1199, cap2Margin: 200, v3ToRemove: 5, v2For1: 10, opp1: 3, v2For2: 20, opp2: 5 } // GIẢ ĐỊNH

/** Trọng số n_eff cho trận V1 (giao hữu), V2 (cộng đồng), V3 (chính thức). */
export const N_EFF_WEIGHTS = { v1: 0.2, v2: 0.5, v3: 1.0 } as const // GIẢ ĐỊNH
/** Hằng bão hòa trong w = n_eff / (n_eff + BLEND_SATURATION). */
export const BLEND_SATURATION = 10 // GIẢ ĐỊNH

/** Farm: cặp đối thủ đã gặp ít nhất ngần này lần trong cửa sổ thì ΔR = 0. */
export const FARM_MIN_PRIOR_MEETINGS = 2 // GIẢ ĐỊNH
/** Cửa sổ xét farm (ngày). */
export const FARM_WINDOW_DAYS = 30 // GIẢ ĐỊNH

/** Giảm phát hai chiều: chỉ dịch khi |mean − mục tiêu| vượt ngưỡng này. */
export const DRIFT_THRESHOLD = 50 // GIẢ ĐỊNH
/** Mục tiêu trung bình khi giảm phát = trung bình quần thể. */
export const DRIFT_TARGET_MEAN = RATING_POPULATION_MEAN // GIẢ ĐỊNH

/** Khóa xử lý đóng giải cũ hơn mốc này coi như bị bỏ lại và được giành lại. */
export const PROCESSING_LOCK_STALE_MS = 10 * 60 * 1000 // GIẢ ĐỊNH: 10 phút
