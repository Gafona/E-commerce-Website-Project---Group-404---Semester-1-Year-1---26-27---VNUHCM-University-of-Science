/** Shared rules for return / exchange requests (client-safe). */
export const RETURN_WINDOW_DAYS = 30

export const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "completed", "cancelled"] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]

export const RETURN_STATUS_LABELS: Record<ReturnStatus, { vi: string; en: string; tone: string }> = {
  requested: { vi: "Chờ shop xử lý", en: "Awaiting shop", tone: "pending" },
  approved: { vi: "Đã chấp nhận · gửi hàng về shop", en: "Approved · send the item back", tone: "confirmed" },
  rejected: { vi: "Shop từ chối", en: "Rejected", tone: "cancelled" },
  received: { vi: "Shop đã nhận hàng trả", en: "Item received", tone: "shipping" },
  completed: { vi: "Đã hoàn tất", en: "Completed", tone: "delivered" },
  cancelled: { vi: "Đã hủy yêu cầu", en: "Cancelled", tone: "cancelled" },
}

/** Seller steps, one at a time. */
export const RETURN_SELLER_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received"],
  received: ["completed"],
  rejected: [],
  completed: [],
  cancelled: [],
}

export const RETURN_REASONS = ["wrong_size", "defective", "wrong_item", "not_as_described", "changed_mind", "other"] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]
export const RETURN_REASON_LABELS: Record<ReturnReason, { vi: string; en: string }> = {
  wrong_size: { vi: "Không vừa size", en: "Wrong size" },
  defective: { vi: "Sản phẩm lỗi, hư hỏng", en: "Defective or damaged" },
  wrong_item: { vi: "Giao sai sản phẩm / màu", en: "Wrong item or colour" },
  not_as_described: { vi: "Không đúng mô tả", en: "Not as described" },
  changed_mind: { vi: "Đổi ý, không còn nhu cầu", en: "Changed my mind" },
  other: { vi: "Lý do khác", en: "Other" },
}

export const RETURN_TYPES = ["return", "exchange"] as const
export type ReturnType = (typeof RETURN_TYPES)[number]
export const RETURN_TYPE_LABELS: Record<ReturnType, { vi: string; en: string }> = {
  return: { vi: "Trả hàng, hoàn tiền", en: "Return for refund" },
  exchange: { vi: "Đổi sản phẩm (size/màu)", en: "Exchange (size/colour)" },
}

/** Delivery date for the return window; older orders without it fall back to their last update. */
export function deliveredAtOf(order: { status?: string | null; deliveredAt?: string | null; updatedAt?: string | null }) {
  if (order.status !== "delivered") return null
  return order.deliveredAt ?? order.updatedAt ?? null
}

export function returnDeadline(order: { status?: string | null; deliveredAt?: string | null; updatedAt?: string | null }) {
  const delivered = deliveredAtOf(order)
  return delivered ? new Date(new Date(delivered).getTime() + RETURN_WINDOW_DAYS * 86_400_000) : null
}

export const canRequestReturn = (order: Parameters<typeof returnDeadline>[0], now = Date.now()) => {
  const deadline = returnDeadline(order)
  return !!deadline && deadline.getTime() >= now
}

/** Shops must act on a waiting step within this many working days (Mon–Fri, Vietnam time). */
export const RETURN_HANDLING_BUSINESS_DAYS = 3
const VN_OFFSET = 7 * 3_600_000

export function addBusinessDays(start: Date | string, days: number) {
  const d = new Date(new Date(start).getTime() + VN_OFFSET)
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) left--
  }
  return new Date(d.getTime() - VN_OFFSET)
}

/**
 * Handling deadline for steps that wait on the shop: a new request (approve or
 * reject) and a received item (refund / send the exchange). Null otherwise.
 */
export function returnHandlingDue(
  request: { status: string; createdAt: string; history?: { status?: string | null; at?: string | null }[] | null },
  now = Date.now(),
) {
  if (request.status !== "requested" && request.status !== "received") return null
  const since =
    request.status === "received"
      ? [...(request.history ?? [])].reverse().find((h) => h.status === "received")?.at ?? request.createdAt
      : request.createdAt
  const due = addBusinessDays(since, RETURN_HANDLING_BUSINESS_DAYS)
  return { due: due.toISOString(), overdue: due.getTime() < now }
}
