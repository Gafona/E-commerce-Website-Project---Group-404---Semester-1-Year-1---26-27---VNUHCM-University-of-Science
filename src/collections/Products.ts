import type {
  Access,
  CollectionAfterChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  FieldHook,
  PayloadRequest,
  Where,
} from "payload"
import { ValidationError } from "payload"
import { revalidatePath } from "next/cache"
import { isStaff } from "../access/roles"
import { isSellerProfileIncomplete, SELLER_PROFILE_SELECT } from "../lib/seller-profile"
import { notifyFollowers, notifyUsers, shopNameOf } from "../lib/notifications"
import { PRODUCT_TYPES, isStandardCategory, normalizeCategory, typeForCategory } from "../lib/product-types"
import { priceError } from "../lib/pricing"

/** Revalidate storefront paths; a no-op outside a Next.js request (CLI, seeds). */
const safeRevalidate = (...paths: (string | false | null | undefined)[]) => {
  for (const path of paths) {
    if (!path) continue
    try {
      revalidatePath(path)
    } catch {
      return
    }
  }
}

const relationId = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: string | number }).id)
  return ""
}

/**
 * Reads the selling shop's current public name, so listings always show the
 * latest name after a rename. Lookups are shared per request.
 */
const readSellerShopName: FieldHook = async ({ siblingData, req }) => {
  const id = relationId(siblingData?.seller)
  if (!id) return null
  const context = req.context as {
    shopNames?: Map<string, Promise<string | null>>
  }
  context.shopNames ??= new Map()
  let pending = context.shopNames.get(id)
  if (!pending) {
    pending = req.payload
      .findByID({
        collection: "users",
        id,
        depth: 0,
        overrideAccess: true,
        select: { name: true, seller: { shopName: true }, sellerStatus: true },
        req,
      })
      .then((user) =>
        user.sellerStatus === "approved"
          ? user.seller?.shopName?.trim() || user.name?.trim() || null
          : null,
      )
      .catch(() => null)
    context.shopNames.set(id, pending)
  }
  return pending
}

const validateTaxonomy = async ({
  id,
  sport,
  kind,
  req,
}: {
  id: unknown
  sport: unknown
  kind: "category" | "brand"
  req: Parameters<CollectionBeforeValidateHook>[0]["req"]
}) => {
  const taxonomyId = relationId(id)
  if (!taxonomyId) return
  const taxonomy = await req.payload.findByID({
    collection: "product-taxonomies",
    id: taxonomyId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (taxonomy.kind !== kind || taxonomy.sport !== sport) {
    throw new Error(
      kind === "category"
        ? "Danh mục không phù hợp với môn thể thao đã chọn."
        : "Thương hiệu không phù hợp với môn thể thao đã chọn.",
    )
  }
}

// Products of a suspended shop, or of a company shop whose basic profile is
// incomplete, disappear from every public listing.
const suspendedSellerIds = async (req: PayloadRequest) => {
  const ctx = req.context as { suspendedSellers?: Promise<string[]> }
  ctx.suspendedSellers ??= req.payload
    .find({
      collection: "users",
      where: {
        or: [
          { sellerStatus: { equals: "suspended" } },
          { and: [{ sellerStatus: { equals: "approved" } }, { "seller.businessType": { equals: "company" } }] },
        ],
      },
      limit: 1000,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { sellerStatus: true, ...SELLER_PROFILE_SELECT },
      req,
    })
    .then((res) => res.docs.filter((doc) => doc.sellerStatus === "suspended" || isSellerProfileIncomplete(doc)).map((doc) => String(doc.id)))
    .catch(() => [])
  return ctx.suspendedSellers
}

/** Listings switched off with "Ẩn khỏi cửa hàng" (older rows have no value yet). */
export const NOT_HIDDEN: Where = { or: [{ hidden: { equals: false } }, { hidden: { exists: false } }] }

const readProducts: Access = async ({ req }) => {
  if (req.user?.collection === "admins" || isStaff(req.user)) return true
  const suspended = await suspendedSellerIds(req)
  const visible: Where = suspended.length ? { and: [NOT_HIDDEN, { seller: { not_in: suspended } }] } : NOT_HIDDEN
  // Sellers always see their own listings, hidden or not.
  if (req.user?.collection === "users") return { or: [visible, { seller: { equals: req.user.id } }] }
  return visible
}

const announceNewProduct: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "create" || !doc?.seller) return doc
  const shop = await shopNameOf(req, doc.seller)
  const href = doc.slug ? `/san-pham/${doc.slug}` : "/kenh-ban-hang/san-pham"
  const image = relationId(doc.image) || null
  await notifyUsers(req, [doc.seller], {
    category: "shop",
    kind: "product-created",
    title: "Sản phẩm mới đã được đăng",
    message: `“${doc.name}” đã hiển thị trên BOAI và được gửi tới người theo dõi ${shop}.`,
    href,
    image,
  })
  await notifyFollowers(req, doc.seller, {
    category: "shop",
    kind: "follow-product",
    title: `${shop} vừa ra mắt sản phẩm mới`,
    message: doc.name,
    href,
    actorName: shop,
    image,
  })
  return doc
}

export const Products: CollectionConfig = {
  slug: "products",
  access: {
    create: ({ req }) =>
      req.user?.collection === "admins" ||
      (req.user?.collection === "users" &&
        req.user.sellerStatus === "approved" &&
        !isSellerProfileIncomplete(req.user)),
    delete: ({ req }) =>
      req.user?.collection === "admins"
        ? true
        : req.user?.collection === "users"
          ? { seller: { equals: req.user.id } }
          : false,
    read: readProducts,
    update: ({ req }) =>
      req.user?.collection === "admins"
        ? true
        : req.user?.collection === "users" && !isSellerProfileIncomplete(req.user)
          ? { seller: { equals: req.user.id } }
          : false,
  },
  hooks: {
    afterChange: [
      announceNewProduct,
      ({ doc, previousDoc }) => {
        safeRevalidate("/", "/giam-gia", "/tim-kiem", previousDoc?.slug && `/san-pham/${previousDoc.slug}`, doc.slug && `/san-pham/${doc.slug}`)
      },
    ],
    afterDelete: [
      ({ doc }) => {
        safeRevalidate("/", "/giam-gia", "/tim-kiem", doc?.slug && `/san-pham/${doc.slug}`)
      },
    ],
    beforeValidate: [
      // Price rule enforced for every writer (seller form, admin, scripts):
      // at least 10.000₫, and a struck-through price only when it is higher.
      ({ data, originalDoc, operation }) => {
        if (!data) return data
        if (operation !== "create" && !("price" in data) && !("oldPrice" in data)) return data
        const price = Number(data.price ?? originalDoc?.price)
        const rawOld = "oldPrice" in data ? data.oldPrice : originalDoc?.oldPrice
        const error = priceError(price, rawOld === null || rawOld === undefined || rawOld === "" ? null : Number(rawOld))
        if (error) throw new ValidationError({ collection: "products", errors: [{ message: error, path: "price" }] })
        return data
      },
      // Category is always one of the standard names and productType its id,
      // so filters and counts never drift from what sellers picked.
      ({ data, originalDoc }) => {
        if (!data) return data
        const touched = !originalDoc || data.category !== undefined || data.name !== undefined || data.productType !== undefined
        if (!touched) return data
        const category = normalizeCategory({
          category: data.category ?? originalDoc?.category,
          name: data.name ?? originalDoc?.name,
          productType: isStandardCategory(data.category) ? undefined : (data.productType ?? originalDoc?.productType),
        })
        if (data.category !== undefined || !originalDoc) data.category = category
        data.productType = typeForCategory(category)
        return data
      },
      async ({ data, originalDoc, req }) => {
        const sport = data?.sport ?? originalDoc?.sport
        await Promise.all([
          validateTaxonomy({
            id: data?.categoryTaxonomy ?? originalDoc?.categoryTaxonomy,
            sport,
            kind: "category",
            req,
          }),
          validateTaxonomy({
            id: data?.brandTaxonomy ?? originalDoc?.brandTaxonomy,
            sport,
            kind: "brand",
            req,
          }),
        ])
        return data
      },
    ],
  },
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "name",
    defaultColumns: ["name", "sport", "brand", "price", "stock"],
  },
  fields: [
    { name: "name", type: "text", required: true },
    // Set when a marketplace seller owns this listing; empty = BOAI-owned.
    { name: "seller", type: "relationship", relationTo: "users", index: true },
    {
      name: "sellerShopName",
      label: "Shop đăng bán",
      type: "text",
      virtual: true,
      admin: { readOnly: true, position: "sidebar" },
      hooks: { afterRead: [readSellerShopName] },
    },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    {
      name: "hidden",
      label: "Ẩn khỏi cửa hàng",
      type: "checkbox",
      defaultValue: false,
      index: true,
      admin: {
        position: "sidebar",
        description: "Sản phẩm ẩn không hiện ở trang chủ, tìm kiếm, giảm giá và trang shop (dữ liệu vẫn được giữ).",
      },
    },
    {
      name: "sport",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Bóng đá", value: "football" },
        { label: "Cầu lông", value: "badminton" },
      ],
    },
    {
      name: "category",
      label: "Danh mục",
      type: "text",
      required: true,
      admin: { description: "Một trong: Giày, Vợt, Quả cầu, Bóng, Quần áo, Túi & balo, Phụ kiện (tên khác được tự chuẩn hóa)." },
    },
    {
      name: "productType",
      label: "Loại sản phẩm",
      type: "select",
      index: true,
      options: PRODUCT_TYPES.map((t) => ({ label: t.vi, value: t.id })),
      admin: {
        position: "sidebar",
        description: "Tự đặt theo danh mục chuẩn; dùng cho bộ lọc Loại.",
      },
    },
    {
      name: "categoryTaxonomy",
      label: "Tag danh mục",
      type: "relationship",
      relationTo: "product-taxonomies",
      index: true,
      filterOptions: ({ siblingData }) => {
        const { sport } = siblingData as { sport?: string }
        return {
          kind: { equals: "category" },
          ...(sport ? { sport: { equals: sport } } : {}),
        } satisfies Where
      },
    },
    { name: "brand", type: "text", required: true, index: true },
    {
      name: "brandTaxonomy",
      label: "Tag thương hiệu",
      type: "relationship",
      relationTo: "product-taxonomies",
      index: true,
      filterOptions: ({ siblingData }) => {
        const { sport } = siblingData as { sport?: string }
        return {
          kind: { equals: "brand" },
          ...(sport ? { sport: { equals: sport } } : {}),
        } satisfies Where
      },
    },
    { name: "price", type: "number", required: true, min: 0 },
    { name: "oldPrice", type: "number", min: 0 },
    // Legacy self-serve promotion (free, never paid). Replaced by the paid
    // "recommendation-requests" collection; kept hidden so stored values are not lost.
    {
      name: "promotionEnabled",
      type: "checkbox",
      defaultValue: false,
      index: true,
      label: "Ưu tiên đề xuất (cũ, không còn dùng)",
      admin: { hidden: true },
    },
    {
      name: "promotionBudget",
      type: "number",
      min: 50000,
      label: "Ngân sách đề xuất (cũ)",
      admin: { hidden: true },
    },
    {
      name: "promotionEndsAt",
      type: "date",
      label: "Đề xuất đến (cũ)",
      admin: { hidden: true },
    },
    { name: "stock", type: "number", required: true, defaultValue: 0, min: 0 },
    {
      name: "rating",
      label: "Điểm sao trung bình",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      max: 5,
      admin: { readOnly: true, description: "Tự tính từ đánh giá thật của khách (làm tròn 1 chữ số thập phân)." },
    },
    {
      name: "reviews",
      label: "Số đánh giá",
      type: "number",
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true, description: "Tự đếm từ đánh giá thật của khách." },
    },
    { name: "match", type: "number", required: true, min: 0, max: 100 },
    { name: "tag", type: "text" },
    { name: "image", type: "upload", relationTo: "media", required: true },
    // Extra product photos and feature banners shown on the detail page.
    { name: "gallery", type: "upload", relationTo: "media", hasMany: true },
    { name: "shortDescription", type: "textarea", required: true },
    { name: "description", type: "textarea", required: true },
    {
      name: "colors",
      type: "array",
      minRows: 1,
      fields: [
        { name: "name", type: "text", required: true },
        { name: "hex", type: "text", required: true },
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          admin: { description: "Ảnh chính khi khách chọn màu này." },
        },
        {
          name: "gallery",
          type: "upload",
          relationTo: "media",
          hasMany: true,
          admin: { description: "Các ảnh bổ sung khi khách chọn màu này." },
        },
      ],
    },
    {
      name: "specs",
      type: "array",
      minRows: 1,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "value", type: "text", required: true },
      ],
    },
    {
      name: "features",
      type: "array",
      fields: [{ name: "feature", type: "text", required: true }],
    },
    {
      name: "equipmentProfile",
      type: "group",
      label: "SportDNA Equipment Fit",
      admin: {
        description:
          "Thông số chuẩn hóa dùng để tính độ phù hợp. Để trống sẽ fallback về bảng specs.",
      },
      fields: [
        {
          name: "kind",
          type: "select",
          options: [
            { label: "Vợt cầu lông", value: "badminton_racket" },
            { label: "Giày bóng đá", value: "football_shoes" },
            { label: "Giày cầu lông", value: "badminton_shoes" },
            { label: "Quả bóng", value: "football_ball" },
            { label: "Ống cầu", value: "shuttlecock" },
            { label: "Phụ kiện", value: "accessory" },
          ],
        },
        {
          name: "surface",
          type: "select",
          options: [
            { label: "Cỏ nhân tạo TF/AG", value: "ag" },
            { label: "Cỏ tự nhiên FG", value: "fg" },
            { label: "Futsal / trong nhà IC", value: "ic" },
            { label: "Sân cầu trong nhà", value: "indoor" },
            { label: "Đa mặt sân", value: "multi" },
          ],
        },
        {
          name: "balance",
          type: "select",
          options: [
            { label: "Nặng đầu", value: "head_heavy" },
            { label: "Cân bằng", value: "even" },
            { label: "Nhẹ đầu", value: "head_light" },
          ],
        },
        {
          name: "shaftFlex",
          type: "select",
          options: [
            { label: "Dẻo", value: "flexible" },
            { label: "Trung bình", value: "medium" },
            { label: "Cứng", value: "stiff" },
            { label: "Siêu cứng", value: "extra_stiff" },
          ],
        },
        {
          name: "weightClass",
          type: "select",
          options: ["3U", "4U", "5U", "6U"],
        },
        {
          name: "maxTensionLbs",
          type: "number",
          min: 15,
          max: 40,
          label: "Mức căng tối đa (lbs)",
        },
        {
          name: "footWidth",
          type: "select",
          options: [
            { label: "Form thon", value: "narrow" },
            { label: "Form tiêu chuẩn", value: "standard" },
            { label: "Form bè", value: "wide" },
          ],
        },
      ],
    },
  ],
}
