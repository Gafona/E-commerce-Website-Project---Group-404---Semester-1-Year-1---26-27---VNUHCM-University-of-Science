export type SearchItem = {
  name: string
  slug: string
  brand: string
  category: string
  price: number
  image: string
}

export type ShopSearchItem = {
  id: string
  name: string
  avatar: string
  productCount: number
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()

export const matchesTaxonomyValue = (
  value: string,
  selected: string,
  mode: "exact" | "contains" = "exact",
) => {
  if (!selected) return true
  const normalizedValue = normalize(value)
  const normalizedSelected = normalize(selected)
  return mode === "contains"
    ? normalizedValue.includes(normalizedSelected)
    : normalizedValue === normalizedSelected
}

export function matchesSearch(
  item: Omit<SearchItem, "image" | "price" | "slug">,
  query: string,
) {
  const haystack = normalize(`${item.name} ${item.brand} ${item.category}`)
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}

export function matchesShop(shop: Pick<ShopSearchItem, "name">, query: string) {
  const haystack = normalize(shop.name)
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}
