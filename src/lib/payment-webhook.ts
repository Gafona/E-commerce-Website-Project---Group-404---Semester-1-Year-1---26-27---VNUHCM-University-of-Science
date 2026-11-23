/**
 * Normalizes bank-transfer webhook payloads (SePay, Casso v1/v2, PayOS) into
 * incoming transfers. Outgoing transfers and non-positive amounts are dropped.
 */
export type IncomingTransfer = { amount: number; content: string; transactionId: string }
type Json = Record<string, unknown>

const text = (...values: unknown[]) => values.filter((v) => typeof v === "string" || typeof v === "number").join(" ")

export function incomingTransfers(body: unknown): IncomingTransfer[] {
  if (!body || typeof body !== "object") return []
  const root = body as Json
  let list: IncomingTransfer[] = []
  if (root.transferAmount !== undefined) {
    // SePay: flat object with transferAmount / transferType ("in" | "out").
    if (String(root.transferType ?? "in").toLowerCase() === "out") return []
    list = [{ amount: Number(root.transferAmount), content: text(root.content, root.description, root.code), transactionId: String(root.referenceCode ?? root.id ?? "") }]
  } else if (Array.isArray(root.data)) {
    // Casso v1: { error: 0, data: [ { amount, description, tid } ] }.
    list = (root.data as Json[]).map((entry) => ({
      amount: Number(entry?.amount),
      content: text(entry?.description, entry?.content),
      transactionId: String(entry?.tid ?? entry?.reference ?? entry?.id ?? ""),
    }))
  } else if (root.data && typeof root.data === "object") {
    // Casso v2 and PayOS: { data: { amount, description, reference | orderCode } }.
    const data = root.data as Json
    list = [{
      amount: Number(data.amount),
      content: text(data.description, data.content, data.orderCode),
      transactionId: String(data.reference ?? data.transactionId ?? data.id ?? data.tid ?? data.paymentLinkId ?? ""),
    }]
  } else if (root.amount !== undefined) {
    list = [{ amount: Number(root.amount), content: text(root.description, root.content), transactionId: String(root.id ?? "") }]
  }
  return list.filter((t) => Number.isFinite(t.amount) && t.amount > 0)
}

/** Shared-secret check input: "Authorization: Apikey|Bearer|Token <s>", x-api-key, secure-token or ?token=. */
export function providedSecret(headers: Headers, url: string) {
  const auth = headers.get("authorization")?.trim() ?? ""
  const scheme = /^(?:apikey|bearer|token)\s+(.+)$/i.exec(auth)
  return (scheme?.[1] ?? headers.get("x-api-key") ?? headers.get("secure-token") ?? new URL(url).searchParams.get("token") ?? "").trim()
}
