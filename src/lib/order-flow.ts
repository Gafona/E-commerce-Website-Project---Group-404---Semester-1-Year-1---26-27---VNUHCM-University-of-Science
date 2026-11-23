/**
 * Order lifecycle shared by checkout, the buyer's order page, the seller
 * channel and the admin. A checkout creates one parent order (buyer, totals,
 * payment) and one child order per shop (that shop's items, shipping and
 * status). Orders placed before this flow have no role and show as before.
 */
export const ORDER_STATUSES = ["awaiting_payment", "pending", "shipping", "delivered", "cancelled"] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type OrderRole = "parent" | "child"

export const ORDER_STATUS_LABELS: Record<OrderStatus, { vi: string; en: string }> = {
  awaiting_payment: { vi: "Chờ thanh toán", en: "Awaiting payment" },
  pending: { vi: "Chờ shop xác nhận", en: "Awaiting shop" },
  shipping: { vi: "Đang giao", en: "Shipping" },
  delivered: { vi: "Hoàn tất", en: "Completed" },
  cancelled: { vi: "Đã hủy", en: "Cancelled" },
}

/** Values written by the old quote-based flow read as "awaiting shop" today. */
export function normalizeStatus(status: unknown): OrderStatus {
  if (status === "awaiting_quote" || status === "confirmed") return "pending"
  return (ORDER_STATUSES as readonly unknown[]).includes(status) ? (status as OrderStatus) : "pending"
}

export const statusText = (status: unknown, lang: "vi" | "en" = "vi") => ORDER_STATUS_LABELS[normalizeStatus(status)][lang]

/** Statuses in which a buyer (or the shop, or BOAI) may still cancel. */
export const CANCELLABLE: readonly OrderStatus[] = ["awaiting_payment", "pending"]
export const isCancellable = (status: unknown) => CANCELLABLE.includes(normalizeStatus(status))

/** Child code: parent code plus the shop's position in the order. */
export const childCode = (parentCode: string, index: number) => `${parentCode}-${index + 1}`

/**
 * Parent codes are BOAI + 8 letters/digits and are the transfer reference.
 * Match on text upper-cased with separators removed (banks add or drop spaces).
 */
export const ORDER_CODE_IN_TEXT = /BOAI[A-Z0-9]{8}/g
export const orderCodesIn = (text: unknown) =>
  [...new Set(String(text ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").match(ORDER_CODE_IN_TEXT) ?? [])]

/**
 * Parent status from its children: all cancelled → cancelled; every remaining
 * child delivered → delivered; any on its way (or already delivered) →
 * shipping; otherwise waiting for the shops. Unpaid orders stay unpaid.
 */
export function rollupStatus(current: unknown, children: { status?: unknown }[]): OrderStatus {
  const statuses = children.map((child) => normalizeStatus(child.status))
  if (!statuses.length) return normalizeStatus(current)
  const live = statuses.filter((status) => status !== "cancelled")
  if (!live.length) return "cancelled"
  if (normalizeStatus(current) === "awaiting_payment" || live.every((status) => status === "awaiting_payment")) return "awaiting_payment"
  if (live.every((status) => status === "delivered")) return "delivered"
  if (live.some((status) => status === "shipping" || status === "delivered")) return "shipping"
  return "pending"
}

/**
 * What BOAI owes the shop for one child order. With bank transfer BOAI holds
 * the buyer's money and pays goods + shipping (BOAI bears the discount). With
 * COD the shop collects cash itself, so BOAI only refunds the discount share.
 */
export function payoutFor(child: { payment?: unknown; subtotal?: unknown; shipping?: unknown; discount?: unknown }) {
  const subtotal = Number(child.subtotal ?? 0)
  const shipping = Number(child.shipping ?? 0)
  const discount = Number(child.discount ?? 0)
  return child.payment === "online" ? Math.max(0, subtotal + shipping) : Math.max(0, discount)
}
