import "server-only"
import type { Payload } from "payload"
import { detectProvince, resolveProvince, type Province } from "./provinces"
import {
  estimateKm,
  resolveShippingSettings,
  roadKm,
  SAME_PROVINCE_KM,
  shippingFeeFor,
  toPoint,
  type LatLng,
  type ShippingQuoteLine,
  type ShippingSettings,
} from "./shipping"

export async function getShippingSettings(payload: Payload): Promise<ShippingSettings> {
  const doc = await payload
    .findGlobal({ slug: "shipping-settings", depth: 0, overrideAccess: true })
    .catch(() => null)
  return resolveShippingSettings(doc)
}

export type ShopShipping = { shopName: string; origin: Province | null; warehouseAddress: string; point: LatLng | null }

/** Warehouse province, address and coordinates for each selling shop (server-only data). */
export async function shopShippingProfiles(payload: Payload, sellerIds: string[]) {
  const unique = [...new Set(sellerIds.filter(Boolean))]
  const result = new Map<string, ShopShipping>()
  if (!unique.length) return result
  const { docs } = await payload.find({
    collection: "users",
    where: { id: { in: unique } },
    depth: 0,
    limit: unique.length,
    overrideAccess: true,
    select: {
      name: true,
      seller: { shopName: true, warehouseProvince: true, warehouseAddress: true, warehouseLat: true, warehouseLng: true },
    },
  })
  for (const user of docs) {
    result.set(String(user.id), {
      shopName: user.seller?.shopName?.trim() || user.name,
      // Older shops only have a free-text warehouse address; infer its province.
      origin: resolveProvince(user.seller?.warehouseProvince) ?? detectProvince(user.seller?.warehouseAddress),
      warehouseAddress: user.seller?.warehouseAddress?.trim() ?? "",
      point: toPoint(user.seller?.warehouseLat, user.seller?.warehouseLng),
    })
  }
  return result
}

export type Destination = { province: Province; point: LatLng | null }

/**
 * One automatic shipping line per shop in the cart. Exact warehouse and
 * delivery points give the road distance; otherwise the provinces' centres
 * are used and the line is marked as an estimate. Products without a seller
 * ship from BOAI's own warehouse, which is also the fallback origin.
 */
export async function quoteShipping(
  payload: Payload,
  groups: { sellerId: string; subtotal: number }[],
  destination: Destination,
  settings?: ShippingSettings,
): Promise<{ settings: ShippingSettings; lines: ShippingQuoteLine[] }> {
  const resolved = settings ?? (await getShippingSettings(payload))
  const shops = await shopShippingProfiles(payload, groups.map((g) => g.sellerId))
  const boaiOrigin = resolveProvince(resolved.defaultOrigin)
  const lines = groups.map(({ sellerId, subtotal }) => {
    const shop = sellerId ? shops.get(sellerId) : undefined
    const origin = (sellerId ? shop?.origin : boaiOrigin) ?? boaiOrigin
    const originPoint = sellerId ? (shop?.point ?? null) : resolved.defaultOriginPoint
    const exact = !!(originPoint && destination.point)
    const distanceKm = exact
      ? roadKm(originPoint!, destination.point!)
      : (estimateKm(origin, destination.province) ?? SAME_PROVINCE_KM)
    return {
      key: sellerId || "boai",
      shopName: sellerId ? (shop?.shopName ?? "Shop") : "BOAI",
      subtotal,
      originProvince: origin?.name ?? "",
      distanceKm,
      fee: shippingFeeFor(distanceKm, resolved),
      estimated: !exact,
    }
  })
  return { settings: resolved, lines }
}
