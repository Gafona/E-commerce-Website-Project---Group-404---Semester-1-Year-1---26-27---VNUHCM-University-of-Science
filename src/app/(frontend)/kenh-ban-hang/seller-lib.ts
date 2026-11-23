import "server-only"
import config from "@payload-config"
import { getPayload } from "payload"
import { appAuth } from "@/lib/app-auth"
import { redirect } from "next/navigation"
import type { User } from "@/payload-types"
import { isSellerProfileIncomplete } from "@/lib/seller-profile"

export type Seller = User & {
  collection: "users"
}

export const INCOMPLETE_PROFILE_PATH = "/kenh-ban-hang/cai-dat?thieu-thong-tin=1"

/**
 * Approved seller session. Company sellers with an incomplete basic profile are
 * paused: everything except profile settings redirects to the settings page.
 */
export async function requireSeller(options: { allowIncomplete?: boolean } = {}): Promise<Seller> {
  const user = (await appAuth.currentUser()) as Seller | null
  if (!user) redirect("/dang-nhap?next=%2Fkenh-ban-hang")
  // A banned shop only sees the ban reason and the appeal form.
  if (user.sellerStatus === "suspended") redirect("/khoa-cua-hang")
  if (user.sellerStatus !== "approved") redirect("/dang-ky-ban-hang")
  if (!options.allowIncomplete && isSellerProfileIncomplete(user)) redirect(INCOMPLETE_PROFILE_PATH)
  return user
}

export const db = () => getPayload({ config })

export async function sellerProducts(sellerId: Seller["id"]) {
  const payload = await db()
  const res = await payload.find({ collection: "products", where: { seller: { equals: sellerId } }, limit: 500, depth: 1, sort: "-createdAt", overrideAccess: true })
  return res.docs
}

export async function sellerProduct(sellerId: Seller["id"], id: string) {
  return (await sellerProducts(sellerId)).find((p) => String(p.id) === id) ?? null
}

/** Platform events a seller may see (access rules hide drafts). */
export async function sellerEventCalendar(seller: Seller) {
  const payload = await db()
  const res = await payload.find({
    collection: "events",
    user: seller,
    overrideAccess: false,
    depth: 1,
    limit: 200,
    sort: "startDate",
  })
  return res.docs
}

export async function sellerRegistrations(seller: Seller) {
  const payload = await db()
  const res = await payload.find({
    collection: "event-registrations",
    user: seller,
    overrideAccess: false,
    depth: 0,
    limit: 500,
    pagination: false,
  })
  return res.docs
}

/** Seller-facing order statuses (old quote-flow values read as "Chờ xác nhận"). */
export const STATUS: Record<string, string> = { awaiting_payment: "Chờ khách thanh toán", pending: "Chờ xác nhận", shipping: "Đang giao", delivered: "Hoàn tất", cancelled: "Đã hủy" }

const relKey = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : ""

/**
 * The shop's own orders: its child orders from the parent/child flow, plus
 * older orders containing its lines (with only those lines kept). Parent
 * orders never appear here.
 */
export async function sellerOrders(sellerId: Seller["id"]) {
  const payload = await db()
  const ids = (await sellerProducts(sellerId)).map((p) => p.id)
  const mine = String(sellerId)
  const res = await payload.find({
    collection: "orders",
    where: {
      and: [
        { role: { not_equals: "parent" } },
        {
          or: [
            { seller: { equals: sellerId } },
            { "items.seller": { equals: sellerId } },
            ...(ids.length ? [{ "items.product": { in: ids } }] : []),
          ],
        },
      ],
    },
    limit: 500,
    depth: 0,
    sort: "-createdAt",
    overrideAccess: true,
  })
  return res.docs.map((o) => {
    const items = o.role === "child" ? (o.items ?? []) : (o.items ?? []).filter((i) => relKey(i.seller) === mine || ids.includes(i.product as never))
    // Legacy statuses from the old quote flow read as "awaiting confirmation".
    const status = o.status === ("awaiting_quote" as string) || o.status === ("confirmed" as string) ? "pending" : o.status
    return { ...o, status, items, sellerTotal: items.reduce((s, i) => s + i.price * i.quantity, 0) }
  })
}

export const vnd = (n: number) => n.toLocaleString("vi-VN") + "₫"
