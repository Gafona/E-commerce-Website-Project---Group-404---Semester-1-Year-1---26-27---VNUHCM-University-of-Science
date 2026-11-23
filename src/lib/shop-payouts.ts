import "server-only"
import type { Payload } from "payload"
import { bankByCode } from "./banks"

export type ShopPayout = {
  sellerId: string
  shopName: string
  ready: boolean
  bankCode: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

export const sellerIdOf = (value: unknown) =>
  value && typeof value === "object" && "id" in value
    ? String((value as { id: string }).id)
    : value
      ? String(value)
      : ""

/** Payout accounts for the shops selling these products (server-only data). */
export async function shopPayouts(payload: Payload, sellerIds: string[]) {
  const unique = [...new Set(sellerIds.filter(Boolean))]
  const result = new Map<string, ShopPayout>()
  if (!unique.length) return result
  const { docs } = await payload.find({
    collection: "users",
    where: { id: { in: unique } },
    depth: 0,
    limit: unique.length,
    overrideAccess: true,
    select: { name: true, sellerStatus: true, seller: { shopName: true, bankCode: true, bankAccountNumber: true, bankAccountHolder: true } },
  })
  for (const user of docs) {
    const bank = bankByCode(user.seller?.bankCode)
    const accountNumber = user.seller?.bankAccountNumber?.trim() ?? ""
    const accountHolder = user.seller?.bankAccountHolder?.trim() ?? ""
    result.set(String(user.id), {
      sellerId: String(user.id),
      shopName: user.seller?.shopName?.trim() || user.name,
      ready: user.sellerStatus === "approved" && !!bank && !!accountNumber && !!accountHolder,
      bankCode: bank?.code ?? "",
      bankName: bank?.name ?? "",
      accountNumber,
      accountHolder,
    })
  }
  return result
}
