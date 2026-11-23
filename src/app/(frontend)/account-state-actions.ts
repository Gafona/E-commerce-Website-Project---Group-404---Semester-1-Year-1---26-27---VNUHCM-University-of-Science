"use server"

import type { Answers, Profiles } from "@/lib/sportdna"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"

export type AccountStateInput = {
  cart: { id: string; quantity: number; color?: string; size?: string; stringing?: boolean }[]
  favorites: string[]
  compare: string[]
  theme: "light" | "dark"
  language: "vi" | "en"
  searchHistory: string[]
  /** Legacy quiz profiles; omit to keep what the account already has. */
  sportDna?: Profiles
}

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""
const idOf = (value: unknown) => typeof value === "object" && value && "id" in value ? String(value.id) : String(value ?? "")

function validProfile(value: Answers | undefined, sport: "football" | "badminton"): value is Answers {
  const roles = sport === "football" ? ["striker", "midfielder", "defender", "goalkeeper"] : ["attack", "defense", "allround"]
  const surfaces = sport === "football" ? ["ag", "fg", "ic"] : ["mat", "wood", "outdoor"]
  return Boolean(value && value.sport === sport && roles.includes(value.role) && Number.isInteger(value.level) && value.level >= 0 && value.level <= 3 && Number.isInteger(value.freq) && value.freq >= 0 && value.freq <= 2 && surfaces.includes(value.surface) && value.budget >= 0 && value.budget <= 100000000)
}

export async function loadAccountStateAction() {
  const user = await appAuth.currentUser()
  if (!user) return { authenticated: false as const }
  const payload = await getPayloadClient()
  // Depth 2 resolves cart products and their Media image so a different
  // device receives a complete renderable cart snapshot.
  const account = await payload.findByID({ collection: "users", id: user.id, user, overrideAccess: false, depth: 2 })
  const state = account.shoppingState
  const profiles: Profiles = {}
  for (const row of account.sportDnaProfiles ?? []) {
    const sport = row.sport
    profiles[sport] = { sport, role: row.role, level: row.level, freq: row.freq, surface: row.surface, budget: row.budget, skills: Object.fromEntries((row.skills ?? []).map((skill) => [skill.name, skill.value])) }
  }
  return {
    authenticated: true as const,
    userId: String(user.id),
    hasRemoteState: Boolean(state?.cart?.length || state?.favorites?.length || state?.compare?.length || state?.searchHistory?.length || account.sportDnaProfiles?.length),
    state: {
      cart: (state?.cart ?? []).flatMap((row) => {
        const p = typeof row.product === "object" ? row.product : null
        if (!p) return []
        const image = typeof p.image === "object" && p.image ? p.image.url ?? "" : ""
        const key = [p.id, row.color, row.size, row.stringing ? "s" : ""].join("|")
        return [{ key, id: String(p.id), slug: p.slug, name: p.name, brand: p.brand, sport: p.sport, price: p.price, image, quantity: row.quantity, color: row.color ?? undefined, size: row.size ?? undefined, stringing: Boolean(row.stringing) }]
      }),
      favorites: (state?.favorites ?? []).flatMap((p) => typeof p === "object" ? [p.slug] : []),
      compare: (state?.compare ?? []).flatMap((p) => typeof p === "object" ? [p.slug] : []),
      theme: state?.theme ?? "light",
      language: state?.language ?? "vi",
      searchHistory: (state?.searchHistory ?? []).map((row) => row.query),
      sportDna: profiles,
    },
  }
}

export async function saveAccountStateAction(input: AccountStateInput) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const }
  const payload = await getPayloadClient()
  const cart = Array.isArray(input.cart) ? input.cart.slice(0, 50).filter((row) => typeof row?.id === "string" && Number.isInteger(row.quantity) && row.quantity >= 1 && row.quantity <= 20) : []
  const slugs = [...new Set([...(input.favorites ?? []), ...(input.compare ?? [])].map((slug) => text(slug, 120)).filter(Boolean))]
  const productIds = [...new Set(cart.map((row) => row.id))]
  const [byId, bySlug] = await Promise.all([
    productIds.length ? payload.find({ collection: "products", where: { id: { in: productIds } }, limit: 50, depth: 0, overrideAccess: false, user }) : { docs: [] },
    slugs.length ? payload.find({ collection: "products", where: { slug: { in: slugs } }, limit: 102, depth: 0, overrideAccess: false, user }) : { docs: [] },
  ])
  const allowedIds = new Set(byId.docs.map((p) => String(p.id)))
  const slugToId = new Map(bySlug.docs.map((p) => [p.slug, p.id]))
  const profiles = (["football", "badminton"] as const).flatMap((sport) => {
    const profile = input.sportDna?.[sport]
    if (!validProfile(profile, sport)) return []
    const skills = Object.entries(profile.skills).slice(0, 4).filter(([name, value]) => text(name, 40) && Number.isInteger(value) && value >= 1 && value <= 10).map(([name, value]) => ({ name: text(name, 40), value }))
    return skills.length ? [{
      sport,
      role: profile.role as "striker" | "midfielder" | "defender" | "goalkeeper" | "attack" | "defense" | "allround",
      level: profile.level,
      freq: profile.freq,
      surface: profile.surface as "ag" | "fg" | "ic" | "mat" | "wood" | "outdoor",
      budget: profile.budget,
      skills,
    }] : []
  })
  await payload.update({
    collection: "users", id: user.id, user, overrideAccess: false,
    data: {
      shoppingState: {
        cart: cart.filter((row) => allowedIds.has(row.id)).map((row) => ({ product: row.id, quantity: row.quantity, color: text(row.color, 40) || null, size: text(row.size, 20) || null, stringing: Boolean(row.stringing) })),
        favorites: (input.favorites ?? []).map((slug) => slugToId.get(text(slug, 120))).filter((id): id is string => id !== undefined).slice(0, 100),
        compare: (input.compare ?? []).map((slug) => slugToId.get(text(slug, 120))).filter((id): id is string => id !== undefined).slice(-2),
        theme: input.theme === "dark" ? "dark" : "light",
        language: input.language === "en" ? "en" : "vi",
        searchHistory: (input.searchHistory ?? []).map((query) => text(query, 100)).filter(Boolean).slice(0, 10).map((query) => ({ query })),
      },
      // Only replace stored legacy profiles when the caller explicitly sends them.
      ...(input.sportDna ? { sportDnaProfiles: profiles } : {}),
    },
    // Cart/theme writes never change name or photos; skip the profile-media sync.
    context: { skipProfileSync: true },
  })
  return { ok: true as const }
}

export async function saveSportDnaAction(profiles: Profiles) {
  const loaded = await loadAccountStateAction()
  if (!loaded.authenticated) return { ok: false as const }
  return saveAccountStateAction({ ...loaded.state, sportDna: profiles })
}
