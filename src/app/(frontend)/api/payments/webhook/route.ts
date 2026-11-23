import { timingSafeEqual } from "node:crypto"
import { getPayloadClient } from "@/lib/payload"
import { markParentPaid } from "@/lib/orders-server"
import { orderCodesIn } from "@/lib/order-flow"
import { incomingTransfers, providedSecret } from "@/lib/payment-webhook"

/**
 * Bank-transfer webhook (SePay, Casso v1/v2, PayOS). The shared secret comes
 * from PAYMENT_WEBHOOK_SECRET and may arrive as "Authorization: Apikey|Bearer
 * <secret>", "x-api-key", "secure-token" or "?token=". Each incoming transfer
 * whose content carries an order code (BOAI + 8 characters) and covers the
 * order total marks that order paid. PayOS checksum signatures are not checked.
 */
export const dynamic = "force-dynamic"

const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } })

function sameSecret(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim()
  if (!secret) return reply({ success: false, error: "Webhook chưa được cấu hình" }, 503)
  if (!sameSecret(providedSecret(request.headers, request.url), secret)) return reply({ success: false, error: "Sai khóa xác thực webhook" }, 401)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return reply({ success: false, error: "Dữ liệu không phải JSON" }, 400)
  }
  const transfers = incomingTransfers(body)
  const payload = await getPayloadClient()
  const results: Record<string, unknown>[] = []
  for (const transfer of transfers) {
    const codes = orderCodesIn(transfer.content)
    if (!codes.length) {
      results.push({ transactionId: transfer.transactionId, status: "no-order-code" })
      continue
    }
    if (transfer.transactionId) {
      const seen = await payload.count({ collection: "orders", where: { "paymentInfo.transactionId": { equals: transfer.transactionId } }, overrideAccess: true })
      if (seen.totalDocs) {
        results.push({ transactionId: transfer.transactionId, status: "duplicate" })
        continue
      }
    }
    const { docs } = await payload.find({
      collection: "orders",
      where: { and: [{ role: { equals: "parent" } }, { code: { in: codes } }] },
      depth: 0,
      limit: codes.length,
      overrideAccess: true,
    })
    for (const order of docs) {
      if (order.status !== "awaiting_payment") {
        results.push({ code: order.code, status: "not-awaiting-payment" })
        continue
      }
      if (transfer.amount < order.total) {
        results.push({ code: order.code, status: "amount-too-low", received: transfer.amount, expected: order.total })
        continue
      }
      const marked = await markParentPaid(payload, order, { source: "webhook", amount: transfer.amount, transactionId: transfer.transactionId })
      results.push({ code: order.code, status: marked.ok ? "paid" : "unchanged" })
    }
    if (!docs.length) results.push({ transactionId: transfer.transactionId, status: "order-not-found", codes })
  }
  // Providers retry on non-2xx, so unmatched transfers still get 200.
  return reply({ success: true, results })
}
