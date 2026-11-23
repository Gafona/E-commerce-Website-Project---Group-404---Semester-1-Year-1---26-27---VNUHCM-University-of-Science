import "server-only"
import type { ReturnRequest } from "@/payload-types"
import { returnHandlingDue, type ReturnReason, type ReturnStatus, type ReturnType } from "./returns"

/** Serializable return request for the seller centre and admin lists. */
export type ReturnView = {
  id: string
  code: string
  orderCode: string
  customerName: string
  shopName: string
  status: ReturnStatus
  type: ReturnType
  reason: ReturnReason
  description: string
  sellerNote: string | null
  createdAt: string
  resolvedAt: string | null
  items: { id: string; name: string; size: string | null; color: string | null; price: number; quantity: number }[]
  photos: { url: string; alt: string }[]
  history: { status: ReturnStatus; at: string; note: string | null }[]
  handling: { due: string; overdue: boolean } | null
  refund: number
}

export function toReturnView(doc: ReturnRequest, now = Date.now()): ReturnView {
  const items = (doc.items ?? []).map((row, i) => ({
    id: row.id ?? `${doc.id}-${i}`,
    name: row.name,
    size: row.size ?? null,
    color: row.color ?? null,
    price: Number(row.price ?? 0),
    quantity: Number(row.quantity ?? 0),
  }))
  const history = (doc.history ?? []).map((h) => ({ status: h.status as ReturnStatus, at: h.at, note: h.note ?? null }))
  return {
    id: String(doc.id),
    code: doc.code ?? String(doc.id),
    orderCode: doc.orderCode ?? "",
    customerName: doc.customerName ?? "",
    shopName: doc.shopName ?? "",
    status: doc.status as ReturnStatus,
    type: (doc.type ?? "return") as ReturnType,
    reason: doc.reason as ReturnReason,
    description: doc.description ?? "",
    sellerNote: doc.sellerNote ?? null,
    createdAt: doc.createdAt,
    resolvedAt: doc.resolvedAt ?? null,
    items,
    photos: (doc.photos ?? []).flatMap((photo) =>
      photo && typeof photo === "object" && photo.url ? [{ url: photo.url, alt: photo.alt || `Ảnh minh chứng #${doc.code ?? ""}` }] : [],
    ),
    history,
    handling: returnHandlingDue({ status: doc.status, createdAt: doc.createdAt, history }, now),
    refund: items.reduce((sum, row) => sum + row.price * row.quantity, 0),
  }
}
