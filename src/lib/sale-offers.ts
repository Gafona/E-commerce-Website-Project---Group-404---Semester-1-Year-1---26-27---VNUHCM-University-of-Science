// Pure sale-offer rules shared by storefront pricing and checkout (client-safe, testable).
import type { Event } from "@/payload-types"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT } from "./event-rules.ts"

type EventDoc = Pick<Event, "id" | "name" | "maxDiscount"> & Partial<Event>

const idOf = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (value && typeof value === "object" && "id" in value) return String((value as { id: string | number }).id)
  return ""
}

/** One approved product offer inside a shop's event registration. */
export type SaleOffer<E extends EventDoc = EventDoc> = {
  productId: string
  percent: number
  event: E
  sellerId: string
  registrationId: string
  /** Row id inside the registration (null for registrations saved before per-product rows). */
  itemId: string | null
  /** Event-price units still available; null = unlimited. */
  quotaLeft: number | null
}

export type RegistrationDoc = {
  id: string | number
  event?: unknown
  seller?: unknown
  reviewStatus?: string | null
  discountPercent?: number | null
  products?: unknown[] | null
  items?:
    | {
        id?: string | null
        product?: unknown
        discountPercent?: number | null
        quota?: number | null
        sold?: number | null
        status?: string | null
      }[]
    | null
}

/**
 * Approved offers of the given registrations. Each product line carries its own
 * discount (capped by the event's ceiling) and an optional quota; a line whose
 * quota is used up stops giving the event price.
 */
export function approvedOffers<E extends EventDoc>(registrations: RegistrationDoc[], eventsById: Map<string, E>): SaleOffer<E>[] {
  const offers: SaleOffer<E>[] = []
  for (const registration of registrations) {
    const event = eventsById.get(idOf(registration.event))
    const sellerId = idOf(registration.seller)
    if (!event || !sellerId) continue
    const cap = Math.min(MAX_EVENT_DISCOUNT, Number(event.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT))
    const lines = registration.items?.length
      ? registration.items
      : // Registrations saved before per-product rows: one discount for every product.
        registration.reviewStatus === "approved"
        ? (registration.products ?? []).map((product) => ({
            id: null,
            product,
            discountPercent: registration.discountPercent ?? 0,
            quota: null,
            sold: 0,
            status: "approved",
          }))
        : []
    for (const line of lines) {
      if (line.status !== "approved") continue
      const quotaLeft = line.quota ? Math.max(0, line.quota - Number(line.sold ?? 0)) : null
      if (quotaLeft === 0) continue
      const percent = Math.min(cap, Number(line.discountPercent ?? 0))
      if (!(percent >= MIN_EVENT_DISCOUNT)) continue
      offers.push({
        productId: idOf(line.product),
        percent,
        event,
        sellerId,
        registrationId: String(registration.id),
        itemId: line.id ?? null,
        quotaLeft,
      })
    }
  }
  return offers
}

/** Highest live offer per product. */
export function bestOffers<E extends EventDoc>(offers: SaleOffer<E>[]) {
  const best = new Map<string, SaleOffer<E>>()
  for (const offer of offers) {
    const current = best.get(offer.productId)
    if (!current || offer.percent > current.percent) best.set(offer.productId, offer)
  }
  return best
}
