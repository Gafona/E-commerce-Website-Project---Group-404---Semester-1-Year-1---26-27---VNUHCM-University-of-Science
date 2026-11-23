/** Shared labels and rules for custom-jersey requests (client-safe). */
export const CUSTOM_STATUSES = ["pending", "quoted", "accepted", "in_production", "completed", "declined", "cancelled"] as const
export type CustomStatus = (typeof CUSTOM_STATUSES)[number]

export const CUSTOM_STATUS_LABELS: Record<CustomStatus, { vi: string; en: string; tone: string }> = {
  pending: { vi: "Chờ shop báo giá", en: "Awaiting quote", tone: "pending" },
  quoted: { vi: "Shop đã báo giá", en: "Quoted", tone: "confirmed" },
  accepted: { vi: "Đã chốt báo giá", en: "Quote accepted", tone: "confirmed" },
  in_production: { vi: "Đang sản xuất", en: "In production", tone: "shipping" },
  completed: { vi: "Đã may xong", en: "Production done", tone: "delivered" },
  declined: { vi: "Shop từ chối", en: "Declined", tone: "cancelled" },
  cancelled: { vi: "Đã hủy", en: "Cancelled", tone: "cancelled" },
}

/**
 * Statuses a shop may move a request to, one step at a time. "quoted" → "quoted"
 * is a re-quote. Accepting a quote is the customer's step, never the shop's.
 */
export const SHOP_TRANSITIONS: Record<CustomStatus, CustomStatus[]> = {
  pending: ["quoted", "declined"],
  quoted: ["quoted", "declined"],
  // Production starts only once the customer has placed the linked order.
  accepted: ["in_production", "declined"],
  in_production: ["completed"],
  completed: [],
  declined: [],
  cancelled: [],
}

/** Customer steps: accept a quote, send it back for negotiation (→ pending) or withdraw. */
export const CUSTOMER_TRANSITIONS: Record<CustomStatus, CustomStatus[]> = {
  pending: ["cancelled"],
  quoted: ["accepted", "pending", "cancelled"],
  accepted: ["cancelled"],
  in_production: [],
  completed: [],
  declined: [],
  cancelled: [],
}

/** Customers may withdraw a request until production starts (and no order is placed). */
export const CUSTOMER_CANCELLABLE: CustomStatus[] = ["pending", "quoted", "accepted"]

/** Labels for the shop's status buttons (the action that leads to each status). */
export const SHOP_ACTION_LABELS: Partial<Record<CustomStatus, { vi: string; en: string }>> = {
  quoted: { vi: "Gửi báo giá", en: "Send quote" },
  in_production: { vi: "Bắt đầu sản xuất", en: "Start production" },
  completed: { vi: "Đã may xong", en: "Mark production done" },
  declined: { vi: "Từ chối yêu cầu", en: "Decline request" },
}

/** Production timeline shown to both sides (declined/cancelled are terminal side exits). */
export const CUSTOM_FLOW: CustomStatus[] = ["pending", "quoted", "accepted", "in_production", "completed"]

export const MAX_SHOPS_PER_SEND = 5
export const MAX_CUSTOM_QUANTITY = 1000
