"use server"

import { postRequestMessage } from "@/lib/shop-chat-server"

import { revalidatePath } from "next/cache"
import type { Media } from "@/payload-types"
import {
  ACCOUNT_NUMBER_PATTERN,
  bankByCode,
  normalizeHolder,
} from "@/lib/banks"
import { db, requireSeller, sellerOrders } from "./seller-lib"
import { missingSellerProfile, SELLER_PROFILE_SELECT } from "@/lib/seller-profile"
import { specTemplateFor } from "@/lib/product-specs"
import { resolveProvince } from "@/lib/provinces"
import { SHOP_TRANSITIONS, type CustomStatus } from "@/lib/custom-jersey"
import { isStandardCategory, typeForCategory } from "@/lib/product-types"
import { priceError } from "@/lib/pricing"
import { getTr } from "@/lib/i18n-server"
import { cancelChildOrders, restoreStock } from "@/lib/orders-server"
import { toPoint } from "@/lib/shipping"

export type SellerState = {
  ok: boolean
  error?: string
  message?: string
  href?: string
}

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

type Db = Awaited<ReturnType<typeof db>>
type SellerUser = Awaited<ReturnType<typeof requireSeller>>
type MediaID = Media["id"]
const MAX_IMAGES = 8
const MAX_COLORS = 12
const MAX_COLOR_IMAGES = 4
const HEX_COLOR = /^#[0-9a-f]{6}$/
const TAXONOMY_KINDS = new Set(["category", "brand"])

const cleanTaxonomyName = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 60)

function buildSpecs(
  fd: FormData,
  sport: "football" | "badminton",
  category: string,
  brand: string,
) {
  const template = specTemplateFor(sport, category)
  const fixed = template.fields.map((field) => ({
    label: field.label,
    value: String(fd.get(`spec:${field.key}`) ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
  }))
  // Every specification is optional (rackets and shoes included); a filled-in
  // list field must still be one of its options.
  const invalid = template.fields.find((field, i) => field.options && fixed[i].value && !field.options.includes(fixed[i].value))
  if (invalid) return { error: `Vui lòng chọn “${invalid.label}” trong danh sách.` }
  return {
    specs: [
      { label: "Thương hiệu", value: brand },
      { label: "Danh mục", value: category },
      { label: "Môn thể thao", value: sport === "badminton" ? "Cầu lông" : "Bóng đá" },
      ...fixed.filter((spec) => spec.value),
    ],
  }
}

async function resolveProductTaxonomy(
  payload: Db,
  seller: SellerUser,
  sport: "football" | "badminton",
  kind: "category" | "brand",
  rawName: string,
) {
  if (!TAXONOMY_KINDS.has(kind)) throw new Error("Tag không hợp lệ.")
  const name = cleanTaxonomyName(rawName)
  if (name.length < 2) throw new Error("Tên tag cần ít nhất 2 ký tự.")
  const slug = `${sport}-${kind}-${slugify(name)}`
  const existing = await payload.find({
    collection: "product-taxonomies",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: seller,
  })
  if (existing.docs[0]) return existing.docs[0]
  try {
    return await payload.create({
      collection: "product-taxonomies",
      data: { name, slug, sport, kind },
      depth: 0,
      overrideAccess: false,
      user: seller,
    })
  } catch {
    const raced = await payload.find({
      collection: "product-taxonomies",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: seller,
    })
    if (raced.docs[0]) return raced.docs[0]
    throw new Error("Không thể tạo tag.")
  }
}

/**
 * Resolves the ordered photo list submitted by ImagePicker into media IDs.
 * `allowed` lists media IDs the seller may keep (the product's current photos).
 */
async function resolveImages(
  fd: FormData,
  alt: string,
  payload: Db,
  seller: SellerUser,
  allowed: MediaID[] = [],
  { prefix = "", required = true, max = MAX_IMAGES } = {},
): Promise<{ ids: MediaID[] } | { error: string }> {
  const files = fd
    .getAll(`${prefix}images`)
    .filter((f): f is File => f instanceof File && f.size > 0)
  const order = fd.getAll(`${prefix}imageOrder`).map(String)
  const tokens = order.length
    ? order
    : files.map((_, i) => `n:${i}`)
  if (!tokens.length)
    return required ? { error: "Vui lòng chọn ít nhất 1 ảnh sản phẩm." } : { ids: [] }
  if (tokens.length > max)
    return { error: `Tối đa ${max} ảnh cho mỗi ${prefix ? "màu" : "sản phẩm"}.` }
  for (const f of files) {
    if (!f.type.startsWith("image/")) return { error: `"${f.name}" không phải ảnh.` }
    if (f.size > 5_000_000) return { error: `"${f.name}" vượt quá 5MB.` }
  }
  const ids: MediaID[] = []
  const uploaded = new Map<number, MediaID>()
  for (const t of tokens) {
    const [kind, ref] = [t.slice(0, 2), t.slice(2)]
    if (kind === "e:") {
      if (!allowed.includes(ref)) return { error: "Ảnh không hợp lệ." }
      ids.push(ref)
    } else if (kind === "n:") {
      const i = Number(ref)
      const file = files[i]
      if (!Number.isInteger(i) || !file) return { error: "Ảnh không hợp lệ." }
      if (!uploaded.has(i)) {
        const media = await payload.create({
          collection: "media",
          data: { alt },
          file: {
            data: Buffer.from(await file.arrayBuffer()),
            mimetype: file.type,
            name: file.name,
            size: file.size,
          },
          overrideAccess: false,
          user: seller,
        })
        uploaded.set(i, media.id)
      }
      ids.push(uploaded.get(i)!)
    } else return { error: "Ảnh không hợp lệ." }
  }
  return { ids: [...new Set(ids)] }
}

/**
 * Reads the ColorVariantsField rows. All names/codes are validated before any
 * photo is uploaded so a rejected form leaves no orphan media.
 */
async function resolveColors(
  fd: FormData,
  productName: string,
  payload: Db,
  seller: SellerUser,
  allowed: MediaID[] = [],
): Promise<
  | { colors: { name: string; hex: string; image: MediaID | null; gallery: MediaID[] }[] }
  | { error: string }
> {
  const keys = [...new Set(fd.getAll("colorKey").map(String))].filter((k) =>
    /^[a-z0-9]{1,40}$/i.test(k),
  )
  if (!keys.length) return { colors: [{ name: "Mặc định", hex: "#111111", image: null, gallery: [] }] }
  if (keys.length > MAX_COLORS) return { error: `Tối đa ${MAX_COLORS} màu cho mỗi sản phẩm.` }
  const rows: { key: string; name: string; hex: string }[] = []
  const seen = new Set<string>()
  for (const key of keys) {
    const name = String(fd.get(`c-${key}:name`) ?? "").replace(/\s+/g, " ").trim()
    const hex = String(fd.get(`c-${key}:hex`) ?? "").trim().toLowerCase()
    if (!name || name.length > 40)
      return { error: "Vui lòng nhập tên cho từng màu (tối đa 40 ký tự)." }
    if (!HEX_COLOR.test(hex)) return { error: `Mã màu của “${name}” không hợp lệ.` }
    const id = name.toLocaleLowerCase("vi")
    if (seen.has(id)) return { error: `Màu “${name}” bị trùng tên.` }
    seen.add(id)
    rows.push({ key, name, hex })
  }
  const colors = []
  for (const row of rows) {
    const prefix = `c-${row.key}:`
    const images = await resolveImages(fd, `${productName} - ${row.name}`, payload, seller, allowed, {
      prefix,
      required: false,
      max: MAX_COLOR_IMAGES,
    })
    if ("error" in images) return images
    colors.push({ name: row.name, hex: row.hex, image: images.ids[0] ?? null, gallery: images.ids.slice(1) })
  }
  return { colors }
}

const mediaIds = (...values: unknown[]) =>
  values
    .flat()
    .map((m) => (m && typeof m === "object" ? (m as { id?: unknown }).id : m))
    .filter((m): m is string | number => m != null && m !== "")
    .map(String)

async function ownProduct(id: string) {
  const seller = await requireSeller()
  const payload = await db()
  const p = await payload.findByID({
    collection: "products",
    id,
    depth: 0,
    overrideAccess: false,
    user: seller,
  })
  const owner =
    typeof p.seller === "object" && p.seller ? p.seller.id : p.seller
  if (String(owner) !== String(seller.id)) throw new Error("forbidden")
  return { payload, seller, product: p }
}

export async function createProductAction(
  _p: SellerState,
  fd: FormData,
): Promise<SellerState> {
  // Profile edits stay available while an incomplete company shop is paused.
  const seller = await requireSeller({ allowIncomplete: true })
  const v = (k: string) => String(fd.get(k) ?? "").trim()
  const price = Number(v("price")),
    stock = Number(v("stock"))
  if (v("name").length < 3)
    return { ok: false, error: "Tên sản phẩm quá ngắn." }
  if (!(stock >= 0) || !Number.isInteger(stock))
    return { ok: false, error: "Tồn kho không hợp lệ." }
  const oldPriceInput = v("oldPrice") ? Number(v("oldPrice")) : null
  const invalidPrice = priceError(price, oldPriceInput, await getTr())
  if (invalidPrice) return { ok: false, error: invalidPrice }
  try {
    const payload = await db()
    const images = await resolveImages(fd, v("name"), payload, seller)
    if ("error" in images) return { ok: false, error: images.error }
    const [mainImage, ...gallery] = images.ids
    const colorResult = await resolveColors(fd, v("name"), payload, seller)
    if ("error" in colorResult) return { ok: false, error: colorResult.error }
    const desc = v("description") || v("name")
    const slug = `${slugify(v("name"))}-${Date.now().toString(36)}`
    const sport = v("sport") === "badminton" ? "badminton" : "football"
    const submittedCategory = cleanTaxonomyName(v("category"))
    const submittedBrand = cleanTaxonomyName(v("brand"))
    // Categories come from the fixed list only (Giày, Vợt, Quả cầu, Bóng, Quần áo, Túi & balo, Phụ kiện).
    if (!isStandardCategory(submittedCategory))
      return { ok: false, error: "Vui lòng chọn danh mục trong danh sách." }
    if (!submittedBrand)
      return { ok: false, error: "Vui lòng chọn hoặc tạo thương hiệu." }
    const [categoryTaxonomy, brandTaxonomy] = await Promise.all([
      resolveProductTaxonomy(payload, seller, sport, "category", submittedCategory),
      resolveProductTaxonomy(payload, seller, sport, "brand", submittedBrand),
    ])
    const category = categoryTaxonomy.name
    const brand = brandTaxonomy.name
    const builtSpecs = buildSpecs(fd, sport, category, brand)
    if ("error" in builtSpecs) return { ok: false, error: builtSpecs.error }
    await payload.create({
      collection: "products",
      overrideAccess: false,
      user: seller,
      data: {
        name: v("name"),
        slug,
        seller: String(seller.id),
        sport,
        category,
        categoryTaxonomy: categoryTaxonomy.id,
        productType: typeForCategory(submittedCategory),
        brand,
        brandTaxonomy: brandTaxonomy.id,
        price,
        oldPrice: oldPriceInput ?? undefined,
        stock,
        rating: 0,
        reviews: 0,
        match: 80,
        image: mainImage,
        gallery,
        shortDescription: desc.slice(0, 160),
        description: desc,
        colors: colorResult.colors,
        specs: builtSpecs.specs,
      },
    })
    revalidatePath("/kenh-ban-hang", "layout")
    revalidatePath("/")
    revalidatePath("/tim-kiem")
    revalidatePath("/sportdna")
    revalidatePath(`/san-pham/${slug}`)
    return {
      ok: true,
      message: "Đã xuất bản sản phẩm trực tiếp lên website.",
      href: `/san-pham/${slug}`,
    }
  } catch {
    return { ok: false, error: "Không thể đăng sản phẩm, thử lại sau." }
  }
}

/** Quick inventory edit (price, struck-through price, stock) with the same price rules as the full form. */
export async function updateProductAction(_p: SellerState, fd: FormData): Promise<SellerState> {
  const tr = await getTr()
  const id = String(fd.get("id"))
  let owned
  try {
    owned = await ownProduct(id)
  } catch {
    return { ok: false, error: tr("Không có quyền sửa sản phẩm này.", "You can't edit this product.") }
  }
  const { payload, seller } = owned
  const price = Number(fd.get("price"))
  const stock = Number(fd.get("stock"))
  const rawOld = String(fd.get("oldPrice") ?? "").trim()
  const oldPrice = rawOld ? Number(rawOld) : null
  if (!(stock >= 0) || !Number.isInteger(stock)) return { ok: false, error: tr("Tồn kho phải là số nguyên từ 0.", "Stock must be a whole number from 0.") }
  const invalidPrice = priceError(price, oldPrice, tr)
  if (invalidPrice) return { ok: false, error: invalidPrice }
  try {
    await payload.update({
      collection: "products",
      id,
      data: { price, stock, oldPrice },
      overrideAccess: false,
      user: seller,
    })
  } catch {
    return { ok: false, error: tr("Không thể lưu, vui lòng thử lại.", "Couldn't save, please try again.") }
  }
  revalidatePath("/kenh-ban-hang", "layout")
  return { ok: true, message: tr("Đã lưu.", "Saved.") }
}

export async function deleteProductAction(fd: FormData) {
  const id = String(fd.get("id"))
  const { payload, seller } = await ownProduct(id)
  await payload.delete({
    collection: "products",
    id,
    overrideAccess: false,
    user: seller,
  })
  revalidatePath("/kenh-ban-hang", "layout")
}

const relKey = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : ""

export type SellerOrderResult = { ok: true; message: string } | { ok: false; error: string }

/**
 * One step on a shop's order: "Xác nhận & giao hàng" (awaiting shop → shipping),
 * "Đã giao" (shipping → completed) or a cancellation with a reason (only while
 * awaiting the shop; after payment BOAI refunds the buyer). Called from a
 * client transition, so the page refreshes itself instead of revalidating here.
 */
export async function sellerOrderStepAction(id: string, step: "ship" | "deliver" | "cancel", reason = ""): Promise<SellerOrderResult> {
  const tr = await getTr()
  const seller = await requireSeller()
  const order = (await sellerOrders(seller.id)).find((o) => String(o.id) === String(id))
  if (!order) return { ok: false, error: tr("Không tìm thấy đơn hàng của shop.", "Order not found.") }
  const payload = await db()
  const changed = { ok: false as const, error: tr("Đơn hàng vừa được cập nhật. Vui lòng tải lại trang.", "The order just changed. Please reload the page.") }

  if (step === "cancel") {
    const note = String(reason ?? "").trim()
    if (note.length < 5) return { ok: false, error: tr("Vui lòng nhập lý do hủy (ít nhất 5 ký tự) để báo cho khách.", "Please give a reason (at least 5 characters) for the buyer.") }
    if (order.status !== "pending" && order.status !== "awaiting_payment")
      return { ok: false, error: tr("Chỉ hủy được đơn đang chờ xác nhận.", "Only orders awaiting confirmation can be cancelled.") }
    if (order.role === "child") {
      const parent = relKey(order.parentOrder)
        ? await payload.findByID({ collection: "orders", id: relKey(order.parentOrder), depth: 0, overrideAccess: true }).catch(() => null)
        : null
      if (order.status === "awaiting_payment") return { ok: false, error: tr("Đơn đang chờ khách thanh toán, chưa cần xử lý.", "This order is still awaiting payment.") }
      const count = await cancelChildOrders(payload, { parent, children: [order], by: "shop", reason: note })
      if (!count) return changed
      return { ok: true, message: parent?.paymentInfo?.paidAt ? tr("Đã hủy đơn. BOAI sẽ hoàn tiền cho khách.", "Order cancelled. BOAI will refund the buyer.") : tr("Đã hủy đơn và báo cho khách.", "Order cancelled and the buyer notified.") }
    }
    // Orders placed before shop splitting.
    if ((order.sellerPayments ?? []).some((entry) => entry.status === "paid"))
      return { ok: false, error: tr("Khách đã chuyển khoản. Hãy hoàn tiền cho khách trước khi hủy.", "The buyer has paid. Refund them before cancelling.") }
    const result = await payload.update({
      collection: "orders",
      where: { and: [{ id: { equals: order.id } }, { status: { in: ["pending", "awaiting_payment", "awaiting_quote", "confirmed"] } }] },
      overrideAccess: true,
      data: { status: "cancelled", cancellation: { by: "shop", reason: note.slice(0, 300), at: new Date().toISOString() } },
    })
    if (!result.docs.length) return changed
    await restoreStock(payload, order.items)
    return { ok: true, message: tr("Đã hủy đơn và báo cho khách.", "Order cancelled and the buyer notified.") }
  }

  if (step === "ship") {
    if (order.status !== "pending") return { ok: false, error: tr("Chỉ giao được đơn đang chờ xác nhận.", "Only orders awaiting confirmation can be shipped.") }
    if (!order.role && order.payment === "online" && (order.sellerPayments ?? []).some((entry) => entry.status !== "paid"))
      return { ok: false, error: tr("Khách chưa chuyển khoản đủ cho đơn này.", "The buyer hasn't paid this order in full yet.") }
    // Custom-made orders ship only after production is marked done on the request.
    if (order.customRequest) {
      const request = await payload.findByID({ collection: "custom-jersey-requests", id: relKey(order.customRequest), depth: 0, overrideAccess: true, select: { status: true } }).catch(() => null)
      if (request?.status !== "completed") return { ok: false, error: tr("Áo custom chưa may xong. Hãy cập nhật tiến độ trong mục Đặt may custom.", "The custom kit isn't finished. Update production in Custom orders.") }
    }
    const result = await payload.update({
      collection: "orders",
      where: { and: [{ id: { equals: order.id } }, { status: { in: ["pending", "awaiting_quote", "confirmed"] } }] },
      overrideAccess: true,
      data: { status: "shipping" },
    })
    if (!result.docs.length) return changed
    return { ok: true, message: tr("Đã xác nhận và chuyển đơn sang Đang giao.", "Confirmed and marked as shipping.") }
  }

  if (order.status !== "shipping") return { ok: false, error: tr("Chỉ đánh dấu đã giao cho đơn đang giao.", "Only shipping orders can be marked delivered.") }
  const result = await payload.update({
    collection: "orders",
    where: { and: [{ id: { equals: order.id } }, { status: { equals: "shipping" } }] },
    overrideAccess: true,
    data: { status: "delivered" },
  })
  if (!result.docs.length) return changed
  return { ok: true, message: tr("Đã đánh dấu giao thành công.", "Marked as delivered.") }
}

export async function editProductAction(
  _p: SellerState,
  fd: FormData,
): Promise<SellerState> {
  const id = String(fd.get("id"))
  let owned
  try {
    owned = await ownProduct(id)
  } catch {
    return {
      ok: false,
      error: "Không có quyền sửa (hoặc đang ở chế độ xem thử).",
    }
  }
  const { payload, seller } = owned
  const v = (k: string) => String(fd.get(k) ?? "").trim()
  const price = Number(v("price")),
    stock = Number(v("stock"))
  if (v("name").length < 3) return { ok: false, error: "Tên sản phẩm quá ngắn." }
  if (!(stock >= 0) || !Number.isInteger(stock)) return { ok: false, error: "Tồn kho không hợp lệ." }
  const oldPriceInput = v("oldPrice") ? Number(v("oldPrice")) : null
  const invalidPrice = priceError(price, oldPriceInput, await getTr())
  if (invalidPrice) return { ok: false, error: invalidPrice }
  const data: Record<string, unknown> = {
    name: v("name"),
    price,
    stock,
    oldPrice: oldPriceInput,
    sport: v("sport") === "badminton" ? "badminton" : "football",
    description: v("description") || v("name"),
    shortDescription: (v("description") || v("name")).slice(0, 160),
  }
  const sport = v("sport") === "badminton" ? "badminton" : "football"
  const submittedCategory = cleanTaxonomyName(v("category"))
  const submittedBrand = cleanTaxonomyName(v("brand"))
  if (!isStandardCategory(submittedCategory))
    return { ok: false, error: "Vui lòng chọn danh mục trong danh sách." }
  if (!submittedBrand)
    return { ok: false, error: "Vui lòng chọn hoặc tạo thương hiệu." }
  const [categoryTaxonomy, brandTaxonomy] = await Promise.all([
    resolveProductTaxonomy(payload, seller, sport, "category", submittedCategory),
    resolveProductTaxonomy(payload, seller, sport, "brand", submittedBrand),
  ])
  data.sport = sport
  data.category = categoryTaxonomy.name
  data.categoryTaxonomy = categoryTaxonomy.id
  data.productType = typeForCategory(submittedCategory)
  data.brand = brandTaxonomy.name
  data.brandTaxonomy = brandTaxonomy.id
  const builtSpecs = buildSpecs(fd, sport, categoryTaxonomy.name, brandTaxonomy.name)
  if ("error" in builtSpecs) return { ok: false, error: builtSpecs.error }
  data.specs = builtSpecs.specs
  // Only touch photos when the form includes the multi-image picker.
  if (fd.has("imagePicker")) {
    const current = [owned.product.image, ...(owned.product.gallery ?? [])]
      .map((m) => (m && typeof m === "object" ? m.id : m))
      .filter((m) => m != null)
      .map(String)
    const images = await resolveImages(fd, v("name"), payload, seller, current)
    if ("error" in images) return { ok: false, error: images.error }
    const [mainImage, ...gallery] = images.ids
    data.image = mainImage
    data.gallery = gallery
  }
  if (fd.has("colorsField")) {
    const product = owned.product
    const allowed = mediaIds(
      product.image,
      product.gallery ?? [],
      ...(product.colors ?? []).map((c) => [c.image, ...(c.gallery ?? [])]),
    )
    const colorResult = await resolveColors(fd, v("name"), payload, seller, allowed)
    if ("error" in colorResult) return { ok: false, error: colorResult.error }
    data.colors = colorResult.colors
  }
  await payload.update({
    collection: "products",
    id,
    data,
    overrideAccess: false,
    user: seller,
  })
  revalidatePath("/kenh-ban-hang", "layout")
  revalidatePath("/")
  revalidatePath("/tim-kiem")
  return { ok: true, message: "Đã lưu thay đổi." }
}

export async function updateShopAction(
  _p: SellerState,
  fd: FormData,
): Promise<SellerState> {
  // A paused (incomplete) shop must be able to save the missing details;
  // the default guard redirected it back here before anything was written.
  const seller = await requireSeller({ allowIncomplete: true })
  const v = (k: string) => String(fd.get(k) ?? "").trim()
  if (v("name").length < 2) return { ok: false, error: "Họ tên quá ngắn." }
  if (v("idNumber") && !/^\d{12}$/.test(v("idNumber")))
    return { ok: false, error: "Số CCCD phải gồm 12 chữ số." }
  const businessType = (
    ["individual", "household", "company"].includes(v("businessType"))
      ? v("businessType")
      : "individual"
  ) as "individual" | "household" | "company"

  // Payout account: all three parts together, or none.
  const bank = bankByCode(v("bankCode"))
  const accountNumber = v("bankAccountNumber").replace(/[\s.-]/g, "")
  const accountHolder = normalizeHolder(v("bankAccountHolder"))
  const anyPayout = Boolean(v("bankCode") || accountNumber || accountHolder)
  if (anyPayout) {
    if (!bank) return { ok: false, error: "Vui lòng chọn ngân hàng nhận tiền." }
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber))
      return { ok: false, error: "Số tài khoản gồm 6–19 chữ số." }
    if (accountHolder.length < 3)
      return { ok: false, error: "Vui lòng nhập tên chủ tài khoản." }
  }

  const warehouseProvince = resolveProvince(v("warehouseProvince"))
  // Companies may save blanks (their shop stays paused until complete); others still need a province.
  if (!warehouseProvince && businessType !== "company")
    return { ok: false, error: "Vui lòng chọn tỉnh/thành của kho để tính phí vận chuyển." }

  const payload = await db()
  const current = await payload.findByID({
    collection: "users",
    id: seller.id,
    overrideAccess: true,
  })
  try {
    await payload.update({
      collection: "users",
      id: seller.id,
      overrideAccess: true,
      data: {
        name: v("name"),
        phone: v("personalPhone"),
        address: v("address"),
        seller: {
          ...current.seller,
          businessType,
          idNumber: v("idNumber"),
          taxCode: v("taxCode"),
          businessLicense: v("businessLicense"),
          phone: v("shopPhone"),
          bankCode: bank?.code ?? null,
          bankAccountNumber: anyPayout ? accountNumber : "",
          bankAccountHolder: anyPayout ? accountHolder : "",
          bankAccount: bank
            ? `${bank.name} - ${accountNumber} - ${accountHolder}`
            : "",
          warehouseAddress: v("warehouseAddress"),
          warehouseProvince: (warehouseProvince?.code ?? null) as NonNullable<typeof current.seller>["warehouseProvince"],
          // Exact point from "Định vị kho"; empty or outside Vietnam clears it (province estimate).
          warehouseLat: toPoint(v("warehouseLat"), v("warehouseLng"))?.lat ?? null,
          warehouseLng: toPoint(v("warehouseLat"), v("warehouseLng"))?.lng ?? null,
          // customJersey giữ nguyên qua ...current.seller; cài đặt ở mục "Đặt may custom".
        },
      },
    })
  } catch {
    return { ok: false, error: "Không thể lưu hồ sơ, vui lòng kiểm tra lại thông tin." }
  }
  revalidatePath("/kenh-ban-hang", "layout")
  revalidatePath("/kenh-ban-hang/cai-dat")
  // Completeness pauses/unpauses a company shop on static storefront pages too.
  revalidatePath("/giam-gia")
  revalidatePath("/custom-ao")
  const saved = await payload.findByID({ collection: "users", id: seller.id, overrideAccess: true, depth: 0, select: SELLER_PROFILE_SELECT })
  const missing = missingSellerProfile(saved)
  if (missing.length)
    return { ok: true, message: `Đã lưu. Cửa hàng vẫn tạm dừng vì còn thiếu ${missing.length} thông tin bắt buộc.` }
  return { ok: true, message: "Đã cập nhật hồ sơ người bán." }
}

/** Đăng ký / cập nhật dịch vụ nhận may áo custom (hiển thị shop ở trang /custom-ao). */
export async function updateCustomServiceAction(
  _p: SellerState,
  fd: FormData,
): Promise<SellerState> {
  const seller = await requireSeller()
  const v = (k: string) => String(fd.get(k) ?? "").trim()
  const intNum = (key: string, min: number, max: number) => {
    const raw = v(key).replace(/[^\d]/g, "")
    if (!raw) return null
    const n = Number(raw)
    return n >= min && n <= max ? n : NaN
  }
  const priceFrom = intNum("customPriceFrom", 0, 10_000_000)
  const minQuantity = intNum("customMinQuantity", 1, 1000)
  const leadDays = intNum("customLeadDays", 1, 90)
  if (Number.isNaN(priceFrom)) return { ok: false, error: "Giá áo custom không hợp lệ." }
  if (Number.isNaN(minQuantity)) return { ok: false, error: "Số lượng tối thiểu từ 1 đến 1000 áo." }
  if (Number.isNaN(leadDays)) return { ok: false, error: "Thời gian làm từ 1 đến 90 ngày." }
  const payload = await db()
  const current = await payload.findByID({ collection: "users", id: seller.id, overrideAccess: true })
  try {
    await payload.update({
      collection: "users",
      id: seller.id,
      overrideAccess: true,
      data: {
        seller: {
          ...current.seller,
          customJersey: {
            enabled: fd.get("customEnabled") === "on",
            intro: v("customIntro").slice(0, 300),
            priceFrom,
            // Left empty = not set (shown as “Chưa cập nhật”); checks still use 1.
            minQuantity: minQuantity ?? null,
            leadDays,
          },
        },
      },
    })
  } catch {
    return { ok: false, error: "Không thể lưu dịch vụ custom, vui lòng thử lại." }
  }
  revalidatePath("/kenh-ban-hang/custom-ao")
  revalidatePath("/custom-ao")
  return { ok: true, message: fd.get("customEnabled") === "on" ? "Đã bật nhận may custom. Shop đã hiện ở trang Custom áo." : "Đã lưu. Shop đang tạm ẩn khỏi trang Custom áo." }
}

export type RenameShopResult =
  | { ok: true; name: string }
  | { ok: false; error: string }

/** Renames the signed-in seller's shop; the name is shown on every listing. */
export async function renameShopAction(raw: string): Promise<RenameShopResult> {
  const seller = await requireSeller({ allowIncomplete: true })
  const name = String(raw ?? "").replace(/\s+/g, " ").trim()
  if (name.length < 2) return { ok: false, error: "Tên shop cần ít nhất 2 ký tự." }
  if (name.length > 60) return { ok: false, error: "Tên shop tối đa 60 ký tự." }
  const payload = await db()
  const key = name.toLocaleLowerCase("vi")
  const { docs } = await payload.find({
    collection: "users",
    where: { sellerStatus: { equals: "approved" } },
    limit: 1000,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { seller: { shopName: true } },
  })
  const taken = docs.some(
    (user) =>
      String(user.id) !== String(seller.id) &&
      user.seller?.shopName?.trim().toLocaleLowerCase("vi") === key,
  )
  if (taken) return { ok: false, error: "Tên shop này đã có người sử dụng." }
  const current = await payload.findByID({
    collection: "users",
    id: seller.id,
    depth: 0,
    overrideAccess: true,
  })
  try {
    await payload.update({
      collection: "users",
      id: seller.id,
      overrideAccess: true,
      data: { seller: { ...current.seller, shopName: name } },
    })
  } catch {
    return { ok: false, error: "Không thể đổi tên shop, vui lòng thử lại." }
  }
  return { ok: true, name }
}

/** Seller confirms that the buyer's bank transfer for their share has arrived. */
export async function confirmTransferAction(fd: FormData) {
  const seller = await requireSeller()
  const id = String(fd.get("id") ?? "")
  const payload = await db()
  const order = await payload
    .findByID({ collection: "orders", id, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!order || order.status === "cancelled") return
  let changed = false
  const sellerPayments = (order.sellerPayments ?? []).map((entry) => {
    const owner =
      typeof entry.seller === "object" ? entry.seller.id : entry.seller
    if (String(owner) !== String(seller.id) || entry.status === "paid")
      return entry
    changed = true
    return { ...entry, status: "paid" as const, paidAt: new Date().toISOString() }
  })
  if (!changed) return
  // The order succeeds only once every shop in it has received its transfer.
  const fullyPaid = sellerPayments.every((entry) => entry.status === "paid")
  await payload.update({
    collection: "orders",
    id,
    overrideAccess: true,
    data: {
      sellerPayments,
      // Fully paid legacy orders now wait for the shop to confirm and ship.
      ...(fullyPaid && order.status === "awaiting_payment"
        ? { status: "pending" as const }
        : {}),
    },
  })
  revalidatePath("/kenh-ban-hang", "layout")
}

// ---------- Custom-jersey requests ----------

export type CustomRequestStep = "quote" | "decline" | "start" | "complete"
export type CustomRequestUpdate = { step: CustomRequestStep; quotePrice?: string; sellerReply?: string }

const STEP_TARGET: Record<CustomRequestStep, CustomStatus> = {
  quote: "quoted",
  decline: "declined",
  start: "in_production",
  complete: "completed",
}

/**
 * The shop moves a custom request one step at a time (quote → production →
 * done, or decline). Accepting a quote is the customer's step. Every change is
 * notified to the customer and summarised in their chat thread.
 */
export async function updateCustomRequestAction(id: string, input: CustomRequestUpdate): Promise<SellerState> {
  const seller = await requireSeller()
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: "Yêu cầu không hợp lệ." }
  const step = input?.step
  if (!step || !(step in STEP_TARGET)) return { ok: false, error: "Thao tác không hợp lệ." }
  const payload = await db()
  const { docs } = await payload.find({
    collection: "custom-jersey-requests",
    user: seller,
    overrideAccess: false,
    where: { and: [{ id: { equals: id } }, { shop: { equals: seller.id } }] },
    limit: 1,
    depth: 0,
  })
  const request = docs[0]
  if (!request) return { ok: false, error: "Không tìm thấy yêu cầu." }
  const from = request.status as CustomStatus
  const to = STEP_TARGET[step]
  if (!SHOP_TRANSITIONS[from]?.includes(to)) return { ok: false, error: "Yêu cầu không ở bước cho phép thao tác này." }
  const rawPrice = String(input?.quotePrice ?? "").replace(/[^\d]/g, "")
  const quotePrice = rawPrice ? Number(rawPrice) : null
  if (step === "quote" && (!quotePrice || quotePrice > 10_000_000)) return { ok: false, error: "Nhập giá mỗi áo hợp lệ trước khi báo giá." }
  const sellerReply = String(input?.sellerReply ?? "").trim().slice(0, 500)
  if (step === "decline" && sellerReply.length < 5) return { ok: false, error: "Nhập lý do từ chối để khách hiểu (ít nhất 5 ký tự)." }
  try {
    await payload.update({
      collection: "custom-jersey-requests",
      id,
      user: seller,
      overrideAccess: false,
      data: {
        status: to,
        ...(step === "quote" ? { quotePrice, sellerReply: sellerReply || null } : {}),
        ...(step === "decline" ? { sellerReply } : {}),
      },
    })
    const unit = (request.art as { pants?: { enabled?: boolean } } | null)?.pants?.enabled ? "bộ" : "áo"
    const vndText = (n: number) => `${n.toLocaleString("vi-VN")}₫`
    const message =
      step === "quote"
        ? `Báo giá yêu cầu #${request.code}: ${vndText(quotePrice!)}/${unit}, tạm tính ${vndText(quotePrice! * request.quantity)} cho ${request.quantity} ${unit}.${sellerReply ? ` ${sellerReply}` : ""}`
        : step === "decline"
          ? `Shop xin phép từ chối yêu cầu #${request.code}: ${sellerReply}`
          : step === "start"
            ? `Shop đã bắt đầu sản xuất yêu cầu #${request.code}.`
            : `Áo của yêu cầu #${request.code} đã may xong, shop sẽ giao theo đơn hàng.`
    await postRequestMessage(payload, request, seller, message)
    // The client refreshes the route after success (no revalidatePath inside a transition action).
    return {
      ok: true,
      message:
        step === "quote"
          ? from === "quoted" ? "Đã gửi báo giá mới cho khách." : "Đã gửi báo giá cho khách."
          : step === "decline"
            ? "Đã từ chối yêu cầu."
            : step === "start"
              ? "Đã chuyển sang đang sản xuất."
              : "Đã đánh dấu may xong. Hãy giao hàng trong mục Đơn hàng.",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return { ok: false, error: /[À-ỹ]/.test(message) && message.length < 200 ? message : "Không thể cập nhật yêu cầu." }
  }
}
