import { getPayloadClient } from "@/lib/payload"
import { appAuth } from "@/lib/app-auth"
import {
  applyActiveEventPricing,
  eventProductsFirst,
  getLiveWebsiteEvents,
} from "@/lib/event-pricing"
import { Storefront, type AthleteStoryCard } from "./components/Storefront"
import { listPublicShops } from "@/lib/shops"
import { getSiteImages } from "@/lib/site-images"
import { recommendationSettings, runningRecommendations } from "@/lib/recommendation-slots"

export default async function HomePage() {
  const [payload, user] = await Promise.all([
    getPayloadClient(),
    appAuth.currentUser(),
  ])
  const result = await payload.find({
    collection: "products",
    depth: 1,
    pagination: false,
    sort: "-match",
    overrideAccess: false,
  })
  const [pricedProducts, liveEvents, shops, athleteResult, images, running, recommendation] = await Promise.all([
    applyActiveEventPricing(payload, result.docs),
    // Several platform events can run at once; the homepage rotates up to five.
    getLiveWebsiteEvents(payload, 5),
    listPublicShops(payload, result.docs),
    payload.find({
      collection: "athlete-stories",
      depth: 1,
      limit: 8,
      sort: "sortOrder",
      overrideAccess: false,
      user,
      where: { active: { equals: true } },
    }),
    getSiteImages(["home-hero", "home-football", "home-badminton"] as const),
    // Paid "Đề xuất" spots: approved by BOAI and running today, ranked by price per day.
    runningRecommendations(payload),
    recommendationSettings(payload),
  ])
  const athleteStories: AthleteStoryCard[] = athleteResult.docs.flatMap(
    (story) => {
      const media = typeof story.image === "object" ? story.image : null
      if (!media?.url) return []
      return [
        {
          id: story.id,
          name: story.name,
          sport: story.sport,
          traitsVi: story.traitsVi,
          traitsEn: story.traitsEn || story.traitsVi,
          imageUrl: media.url,
          imageAlt: media.alt || story.name,
          objectPosition: `${media.focalX ?? 50}% ${media.focalY ?? 50}%`,
          creditAuthor: story.credit?.author ?? null,
          creditUrl: story.credit?.sourceUrl ?? null,
          license: story.credit?.license ?? null,
          licenseUrl: story.credit?.licenseUrl ?? null,
        },
      ]
    },
  )
  // Approved event registrations lead every list; paid spots are placed by the Storefront sections.
  const products = eventProductsFirst([...pricedProducts].sort((a, b) => b.match - a.match))

  return (
    <Storefront
      products={products}
      recommended={{
        football: running.football.map((spot) => spot.productId),
        badminton: running.badminton.map((spot) => spot.productId),
      }}
      recommendationSlots={recommendation.slots}
      shops={shops}
      athleteStories={athleteStories}
      images={{
        hero: images["home-hero"] ?? null,
        football: images["home-football"] ?? null,
        badminton: images["home-badminton"] ?? null,
      }}
      user={user ? { name: user.name, email: user.email } : null}
      activeEvents={liveEvents}
    />
  )
}
