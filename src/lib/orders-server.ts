import "server-only"
import { randomInt } from "node:crypto"
import { createPayloadRequest, type Payload } from "payload"
import type { Order } from "@/payload-types"
import { announceNewOrder } from "@/hooks/commerce-notifications"
import { splitTotal } from "./banks"
import { discountAmount } from "./discount-codes"
import { CANCELLABLE, childCode, isCancellable, payoutFor } from "./order-flow"
import { quoteShipping, type Destination } from "./shipping-server"

export type OrderLineInput = {
  product?: string
  /** Selling shop; empty for products BOAI sells itself. */
  seller?: string
  name: string
  color?: string
  size?: string
  price: number
  originalPrice?: number
  eventDiscount?: number
  eventName?: string
  eventRegistration?: string
  eventItemId?: string
  quantity: number
  stringing?: boolean
}

export type OrderTreeInput = {
  customer?: string | null
  fullName: string
  phone: string
  email?: string
  address: string
  destination: Destination
  note?: string
  payment: "cod" | "online"
  preorder?: boolean
  lines: OrderLineInput[]
  discount?: { code: string; percent: number } | null
  /** Accepted custom-jersey request the (single) shop order fulfils. */
  customRequest?: string
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** BOAI + 6 time-based + 2 random characters (8 after the prefix, the transfer reference). */
export function newOrderCode() {
  const time = Date.now().toString(36).toUpperCase().slice(-6).padStart(6, "0")
  const tail = Array.from({ length: 2 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
  return `BOAI${time}${tail}`
}

const lineTotal = (line: { price: number; quantity: number }) => line.price * line.quantity

/**
 * Creates the parent order plus one child order per shop. Shipping is priced
 * per shop from the warehouse to the delivery point, the discount is shared
 * across shops in proportion to their goods, and the buyer and shops are
 * notified only once everything exists (a failed checkout leaves nothing).
 */
export async function createOrderTree(payload: Payload, input: OrderTreeInput) {
  const groups: { sellerId: string; lines: OrderLineInput[]; subtotal: number }[] = []
  for (const line of input.lines) {
    const sellerId = line.seller ?? ""
    let group = groups.find((g) => g.sellerId === sellerId)
    if (!group) groups.push((group = { sellerId, lines: [], subtotal: 0 }))
    group.lines.push(line)
    group.subtotal += lineTotal(line)
  }
  const quote = await quoteShipping(
    payload,
    groups.map((g) => ({ sellerId: g.sellerId, subtotal: g.subtotal })),
    input.destination,
  )
  const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0)
  const discount = input.discount ? discountAmount(subtotal, input.discount.percent) : 0
  const shares = splitTotal(groups.map((g) => ({ key: g.sellerId || "boai", subtotal: g.subtotal })), discount)
  const shipping = quote.lines.reduce((sum, line) => sum + line.fee, 0)
  const code = newOrderCode()
  const status = input.payment === "online" ? "awaiting_payment" : "pending"
  const point = input.destination.point
  const common = {
    customer: input.customer || undefined,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email || undefined,
    address: input.address,
    shippingProvince: input.destination.province.name,
    deliveryLat: point?.lat,
    deliveryLng: point?.lng,
    note: input.note || undefined,
    payment: input.payment,
    preorder: !!input.preorder,
    voucher: input.discount?.code,
    discountPercent: input.discount?.percent,
  }
  // Announced below once the whole tree exists.
  const quiet = { skipNotifications: true }
  const parent = await payload.create({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    context: quiet,
    data: {
      ...common,
      code,
      role: "parent",
      items: [],
      itemCount: input.lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      discount,
      shipping,
      total: subtotal - discount + shipping,
      status,
    },
  })
  const children: Order[] = []
  try {
    for (const [index, group] of groups.entries()) {
      const line = quote.lines[index]
      const share = shares.get(group.sellerId || "boai") ?? 0
      const payout = payoutFor({ payment: input.payment, subtotal: group.subtotal, shipping: line.fee, discount: share })
      children.push(
        await payload.create({
          collection: "orders",
          overrideAccess: true,
          depth: 0,
          context: quiet,
          data: {
            ...common,
            code: childCode(code, index),
            role: "child",
            parentOrder: parent.id,
            seller: group.sellerId || undefined,
            shopName: line.shopName,
            items: group.lines,
            itemCount: group.lines.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: group.subtotal,
            discount: share,
            shipping: line.fee,
            distanceKm: line.distanceKm,
            shippingEstimated: line.estimated,
            total: group.subtotal - share + line.fee,
            status,
            customRequest: input.customRequest || undefined,
            payout: { amount: payout, status: payout > 0 ? "unpaid" : "void" },
          },
        }),
      )
    }
  } catch (error) {
    for (const child of children)
      await payload.delete({ collection: "orders", id: child.id, overrideAccess: true, context: quiet }).catch(() => null)
    await payload.delete({ collection: "orders", id: parent.id, overrideAccess: true, context: quiet }).catch(() => null)
    throw error
  }
  try {
    const req = await createPayloadRequest({ payload })
    await announceNewOrder(req, parent, children)
  } catch (error) {
    console.error("createOrderTree: announce failed", error)
  }
  return { parent, children, quote }
}

const relId = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : ""

export async function childrenOf(payload: Payload, parentId: string | number) {
  const { docs } = await payload.find({
    collection: "orders",
    where: { parentOrder: { equals: parentId } },
    sort: "code",
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
  })
  return docs
}

/** The order a code points at: a parent with its children, a child's parent tree, or a legacy order. */
export async function loadOrderTree(payload: Payload, code: string) {
  const clean = code.trim().toUpperCase().slice(0, 44)
  if (!clean) return null
  const { docs } = await payload.find({ collection: "orders", where: { code: { equals: clean } }, depth: 0, limit: 1, overrideAccess: true })
  let order = docs[0]
  if (!order) return null
  if (order.role === "child" && relId(order.parentOrder)) {
    const parent = await payload.findByID({ collection: "orders", id: relId(order.parentOrder), depth: 0, overrideAccess: true }).catch(() => null)
    if (parent) order = parent
  }
  const children = order.role === "parent" ? await childrenOf(payload, order.id) : []
  return { order, children }
}

/** Puts cancelled units back on the shelf (custom-made lines have no product). */
export async function restoreStock(payload: Payload, items: Order["items"]) {
  await Promise.all(
    (items ?? []).map(async (item) => {
      const id = relId(item.product)
      if (!id) return
      const product = await payload.findByID({ collection: "products", id, depth: 0, overrideAccess: true, select: { stock: true } }).catch(() => null)
      if (product)
        await payload
          .update({ collection: "products", id, overrideAccess: true, data: { stock: Number(product.stock ?? 0) + item.quantity } })
          .catch((error) => console.error("restoreStock failed", error))
    }),
  )
}

export type CancelActor = "customer" | "shop" | "admin"

/**
 * Cancels the given child orders that are still cancellable. After BOAI has
 * the buyer's money the child is flagged for a refund; its payout is voided.
 * Conditional writes make concurrent clicks harmless. Returns how many changed.
 */
export async function cancelChildOrders(
  payload: Payload,
  input: { parent: Order | null; children: Order[]; by: CancelActor; reason?: string; batch?: boolean },
) {
  const paid = input.parent?.payment === "online" && !!input.parent?.paymentInfo?.paidAt
  const at = new Date().toISOString()
  let changed = 0
  for (const child of input.children) {
    if (!isCancellable(child.status)) continue
    const result = await payload.update({
      collection: "orders",
      where: { and: [{ id: { equals: child.id } }, { status: { in: [...CANCELLABLE] } }] },
      overrideAccess: true,
      depth: 0,
      context: input.batch ? { cancelBatch: true } : {},
      data: {
        status: "cancelled",
        cancellation: { by: input.by, reason: input.reason?.trim().slice(0, 300) || undefined, at },
        ...(paid ? { refund: { due: true, amount: child.total } } : {}),
        payout: { ...(child.payout ?? {}), status: "void" },
      },
    })
    if (!result.docs.length) continue
    changed++
    await restoreStock(payload, child.items)
  }
  return changed
}

/**
 * Marks a transfer order as paid (admin check or bank webhook): the parent and
 * its children move to "awaiting shop". Only an unpaid parent changes, so a
 * repeated webhook or double click is a no-op.
 */
export async function markParentPaid(
  payload: Payload,
  parent: Order,
  info: { source: "manual" | "webhook"; amount?: number; transactionId?: string },
) {
  if (parent.role !== "parent" || parent.status !== "awaiting_payment") return { ok: false as const }
  const result = await payload.update({
    collection: "orders",
    where: { and: [{ id: { equals: parent.id } }, { status: { equals: "awaiting_payment" } }] },
    overrideAccess: true,
    depth: 0,
    context: { skipRollup: true },
    data: {
      status: "pending",
      paymentInfo: {
        claimedAt: parent.paymentInfo?.claimedAt ?? undefined,
        paidAt: new Date().toISOString(),
        paidAmount: info.amount ?? parent.total,
        source: info.source,
        transactionId: info.transactionId?.slice(0, 120) || undefined,
      },
    },
  })
  if (!result.docs.length) return { ok: false as const }
  await payload.update({
    collection: "orders",
    where: { and: [{ parentOrder: { equals: parent.id } }, { status: { equals: "awaiting_payment" } }] },
    overrideAccess: true,
    depth: 0,
    context: { skipRollup: true },
    data: { status: "pending" },
  })
  return { ok: true as const, order: result.docs[0] }
}
