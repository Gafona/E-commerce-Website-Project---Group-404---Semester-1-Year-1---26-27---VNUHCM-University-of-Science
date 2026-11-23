import "server-only"
import type { Payload } from "payload"
import { bankByCode, normalizeHolder, ACCOUNT_NUMBER_PATTERN } from "./banks"

export type PaymentAccount = {
  ready: boolean
  bankCode: string
  bankName: string
  bin: string
  accountNumber: string
  accountName: string
}

/** BOAI's receiving account (VietQR); `ready` is false until an admin fills it in. */
export async function getPaymentAccount(payload: Payload): Promise<PaymentAccount> {
  const doc = (await payload.findGlobal({ slug: "payment-settings", depth: 0, overrideAccess: true }).catch(() => null)) as
    | { bankCode?: string | null; accountNumber?: string | null; accountName?: string | null }
    | null
  const bank = bankByCode(doc?.bankCode)
  const accountNumber = String(doc?.accountNumber ?? "").trim()
  const accountName = normalizeHolder(String(doc?.accountName ?? ""))
  return {
    ready: !!bank && ACCOUNT_NUMBER_PATTERN.test(accountNumber) && accountName.length >= 3,
    bankCode: bank?.code ?? "",
    bankName: bank?.name ?? "",
    bin: bank?.bin ?? "",
    accountNumber,
    accountName,
  }
}

/** True when the bank webhook can confirm payments automatically. */
export const webhookConfigured = () => Boolean(process.env.PAYMENT_WEBHOOK_SECRET?.trim())
