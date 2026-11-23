import "server-only"

import type { Event, Product } from "@/payload-types"
import { getPublicShop, type PublicShop } from "@/lib/shops"
import type { Payload } from "payload"
import { currentEventDayBounds, effectiveEventStatus, eventWindow } from "@/lib/event-dates"
import { salePrice } from "@/lib/event-rules"
import { approvedOffers, bestOffers, type RegistrationDoc } from "@/lib/sale-offers"
import type { EventFontFamily, EventTypography } from "@/lib/event-typography"

export type PricedProduct = Product & {
  eventDiscount?: number
  eventName?: string
  eventId?: string
  /** Regular price before the event discount (price snapshot for orders). */
  eventOriginalPrice?: number
  /** When the event price stops (ISO). */
  eventEndsAt?: string
  eventRegistrationId?: string
  eventItemId?: string | null
  /** Event-price units left; null = unlimited. */
  eventQuotaLeft?: number | null
  eventVisual?: {
    slogan: string | null
    description: string
    backgroundColor: string
    textColor: string
    fontFamily: EventFontFamily
    fontSize: number
    titleTypography: EventTypography
    sloganTypography: EventTypography
    descriptionTypography: EventTypography
    textPosition: "top-left" | "center-left" | "center" | "bottom-left" | "bottom-center"
    image: string | null
    imageAlt: string
  }
  /** Shop whose approved event registration applies to this product. */
  eventShop?: { id: string; name: string; avatar: string | null }
}

export type EventVisual = NonNullable<PricedProduct["eventVisual"]>
type EventDoc = Event

/** Banner/theme values for an event, with typography fallbacks applied. */
export function eventVisualOf(event: EventDoc): EventVisual {
  const campaignImage =
    event.campaignImage && typeof event.campaignImage === "object"
      ? event.campaignImage
      : null
  return {
    slogan: event.slogan ?? null,
    description: event.description,
    backgroundColor: event.backgroundColor ?? "#071a33",
    textColor: event.textColor ?? "#ffffff",
    fontFamily: event.fontFamily ?? "display",
    fontSize: event.fontSize ?? 16,
    titleTypography: {
      fontFamily:
        event.titleTypography?.fontFamily ?? event.fontFamily ?? "display",
      color: event.titleTypography?.color ?? event.textColor ?? "#ffffff",
      fontSize: event.titleTypography?.fontSize ?? 80,
    },
    sloganTypography: {
      fontFamily:
        event.sloganTypography?.fontFamily ?? event.fontFamily ?? "display",
      color: event.sloganTypography?.color ?? event.textColor ?? "#ffffff",
      fontSize: event.sloganTypography?.fontSize ?? 28,
    },
    descriptionTypography: {
      fontFamily:
        event.descriptionTypography?.fontFamily ?? event.fontFamily ?? "body",
      color: event.descriptionTypography?.color ?? event.textColor ?? "#ffffff",
      fontSize: event.descriptionTypography?.fontSize ?? 14,
    },
    textPosition: event.textPosition ?? "center-left",
    image: campaignImage?.url ?? null,
    imageAlt: campaignImage?.alt ?? event.name,
  }
}

const idOf = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (value && typeof value === "object" && "id" in value) {
    return String((value as { id: string | number }).id)
  }
  return ""
}

/** Events whose exact start/end window (Vietnam time) contains `now`. */
export async function liveEvents(payload: Payload, limit: number, now = new Date()) {
  const today = currentEventDayBounds(now)
  const { docs } = await payload.find({
    collection: "events",
    depth: 1,
    limit,
    sort: "-updatedAt",
    overrideAccess: true,
    where: {
      and: [
        // "Scheduled" events switch on by themselves when their start time comes.
        { status: { in: ["scheduled", "active"] } },
        { startDate: { less_than_equal: today.end } },
        { endDate: { greater_than_equal: today.start } },
      ],
    },
  })
  return docs.filter((event) => effectiveEventStatus(event, now) === "active")
}

/** Registrations of the given events that may contain approved product lines. */
async function eventRegistrations(
  payload: Payload,
  eventIds: (string | number)[],
  productIds?: (string | number)[],
) {
  if (!eventIds.length) return []
  const { docs } = await payload.find({
    collection: "event-registrations",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    where: {
      and: [
        { event: { in: eventIds } },
        // A registration still under review can already have approved products.
        { reviewStatus: { in: ["approved", "pending"] } },
        ...(productIds ? [{ products: { in: productIds } }] : []),
      ],
    },
  })
  return docs as RegistrationDoc[]
}

export type LiveEventSummary = EventVisual & {
  id: string
  name: string
  /** Highest discount among approved shop offers (0 when none yet). */
  maxDiscount: number
  shopCount: number
  displayPlacement: "hero" | "midpage" | "both"
  /** When the event prices stop (ISO). */
  endsAt: string
}

/**
 * Platform events running right now: several can overlap. Soonest-ending first
 * (at most `limit`, for the homepage carousel), each with its best shop discount.
 */
export async function getLiveWebsiteEvents(payload: Payload, limit = 5): Promise<LiveEventSummary[]> {
  const events = (await liveEvents(payload, 50))
    .sort((a, b) => eventWindow(a).end - eventWindow(b).end)
    .slice(0, limit)
  if (!events.length) return []
  const offers = approvedOffers(
    await eventRegistrations(payload, events.map((event) => event.id)),
    new Map(events.map((event) => [String(event.id), event])),
  )
  return events.map((event) => {
    const own = offers.filter((offer) => String(offer.event.id) === String(event.id))
    return {
      ...eventVisualOf(event),
      id: String(event.id),
      name: event.name,
      maxDiscount: own.reduce((max, offer) => Math.max(max, offer.percent), 0),
      shopCount: new Set(own.map((offer) => offer.sellerId)).size,
      displayPlacement: event.displayPlacement ?? "hero",
      endsAt: new Date(eventWindow(event).end).toISOString(),
    }
  })
}

export async function applyActiveEventPricing(
  payload: Payload,
  products: Product[],
): Promise<PricedProduct[]> {
  if (!products.length) return []
  const events = await liveEvents(payload, 50)
  const registrations = await eventRegistrations(
    payload,
    events.map((event) => event.id),
    products.map((product) => product.id),
  )
  if (!registrations.length) return products

  const eventsById = new Map(events.map((event) => [String(event.id), event]))
  const best = bestOffers(approvedOffers(registrations, eventsById))
  const visuals = new Map<string, EventVisual>()
  const shops = new Map<string, Promise<PublicShop | null>>()
  for (const { sellerId } of best.values()) {
    if (!shops.has(sellerId)) shops.set(sellerId, getPublicShop(payload, sellerId))
  }
  const shopById = new Map(
    await Promise.all(
      [...shops].map(async ([id, shop]) => [id, await shop] as const),
    ),
  )

  return products.map((product) => {
    const match = best.get(String(product.id))
    // Registered products must still belong to the registering shop.
    if (!match || idOf(product.seller) !== match.sellerId) return product
    const key = String(match.event.id)
    if (!visuals.has(key)) visuals.set(key, eventVisualOf(match.event))
    const shop = shopById.get(match.sellerId)
    const originalPrice = product.price
    return {
      ...product,
      price: salePrice(originalPrice, match.percent),
      oldPrice: Math.max(product.oldPrice ?? 0, originalPrice),
      eventOriginalPrice: originalPrice,
      eventDiscount: match.percent,
      eventName: match.event.name,
      eventId: key,
      eventEndsAt: new Date(eventWindow(match.event).end).toISOString(),
      eventRegistrationId: match.registrationId,
      eventItemId: match.itemId,
      eventQuotaLeft: match.quotaLeft,
      eventVisual: visuals.get(key),
      eventShop: shop
        ? { id: shop.id, name: shop.name, avatar: shop.avatarUrl }
        : undefined,
    }
  })
}

/** Stable sort that puts products registered in a live event first. */
export function eventProductsFirst<T extends { eventDiscount?: number }>(
  products: T[],
): T[] {
  return products
    .map((product, index) => ({ product, index }))
    .sort(
      (a, b) =>
        Number(!!b.product.eventDiscount) - Number(!!a.product.eventDiscount) ||
        a.index - b.index,
    )
    .map(({ product }) => product)
}
