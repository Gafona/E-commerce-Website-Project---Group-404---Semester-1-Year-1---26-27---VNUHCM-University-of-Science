import type { Access, CollectionConfig } from "payload"
import { revalidatePath } from "next/cache"
import { isStaff } from "../access/roles"
import { notifyNewReview } from "../hooks/commerce-notifications"
import { syncRatingAfterChange, syncRatingAfterDelete } from "../hooks/sync-product-rating"

const adminsOnly: Access = ({ req }) => req.user?.collection === "admins"
/** CMS editors and storefront moderators may remove reviews. */
const staffOnly: Access = ({ req }) => isStaff(req.user)

export const Reviews: CollectionConfig = {
  slug: "reviews",
  admin: {
    group: "BOAI Commerce",
    useAsTitle: "authorName",
    defaultColumns: ["product", "authorName", "rating", "createdAt"],
  },
  // Public reads; writes go through the review server action, which verifies
  // the signed-in customer.
  access: { read: () => true, create: adminsOnly, update: adminsOnly, delete: staffOnly },
  hooks: {
    // Product rating/count are always recomputed from these real reviews.
    afterChange: [notifyNewReview, syncRatingAfterChange],
    afterDelete: [
      syncRatingAfterDelete,
      () => {
        revalidatePath("/san-pham/[slug]", "page")
        revalidatePath("/cua-hang/[id]", "page")
      },
    ],
  },
  fields: [
    { name: "product", type: "relationship", relationTo: "products", required: true, index: true },
    { name: "author", type: "relationship", relationTo: "users", required: true, index: true },
    { name: "authorName", type: "text", required: true },
    { name: "rating", type: "number", required: true, min: 1, max: 5 },
    { name: "comment", type: "textarea", required: true },
    {
      name: "level",
      type: "select",
      options: [
        { label: "Mới chơi", value: "beginner" },
        { label: "Phong trào", value: "amateur" },
        { label: "Bán chuyên", value: "semi-pro" },
        { label: "Chuyên nghiệp", value: "pro" },
      ],
    },
    { name: "verifiedPurchase", type: "checkbox", defaultValue: false },
  ],
}
