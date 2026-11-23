import type { Payload } from "payload"

export type ProductTaxonomyOption = {
  id: string
  name: string
  sport: "football" | "badminton"
  kind: "category" | "brand"
}

export async function listProductTaxonomies(
  payload: Payload,
): Promise<ProductTaxonomyOption[]> {
  const { docs } = await payload.find({
    collection: "product-taxonomies",
    depth: 0,
    limit: 100,
    pagination: false,
    sort: "name",
    overrideAccess: false,
  })
  return docs.map((item) => ({
    id: String(item.id),
    name: item.name,
    sport: item.sport,
    kind: item.kind,
  }))
}
