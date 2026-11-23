import { getPayloadClient } from "@/lib/payload"
import { applyActiveEventPricing, eventProductsFirst, getLiveWebsiteEvents } from "@/lib/event-pricing"
import { SiteHeader } from "../components/SiteHeader"
import { SaleCatalog, SaleIntro } from "./SaleCatalog"
import { localizedTitle } from "@/lib/i18n-server"
import { hasDiscount, maxDiscountOf } from "@/lib/pricing"

// Event prices switch on and off at exact times and units sell out, so this page renders per request.
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return localizedTitle("Sale & giảm giá — BOAI", "Sale & deals — BOAI")
}

export default async function SalePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [payload, query] = await Promise.all([getPayloadClient(), searchParams])
  const requestedEvent = typeof query["su-kien"] === "string" ? query["su-kien"] : null
  const result = await payload.find({
    collection: "products",
    depth: 1,
    pagination: false,
    sort: "-updatedAt",
    overrideAccess: false,
  })
  // Several platform events can run at once; each gets a filter chip.
  const [priced, liveEvents] = await Promise.all([applyActiveEventPricing(payload, result.docs), getLiveWebsiteEvents(payload, 20)])
  const saleProducts = eventProductsFirst(
    priced.filter((product) => hasDiscount(product.price, product.oldPrice)),
  )
  // The banner and the menu's "Sale −x%" both use the largest real discount shown here.
  const maxDiscount = maxDiscountOf(saleProducts)

  return (
    <main className="sale-page">
      <SiteHeader saleDiscount={maxDiscount} />
      <SaleIntro maxDiscount={maxDiscount} productCount={saleProducts.length} />
      <div id="deals">
        <SaleCatalog
          products={saleProducts.map((product) => ({
            id: String(product.id),
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            sport: product.sport,
            category: product.category,
            productType: product.productType ?? null,
            price: product.price,
            oldPrice: product.oldPrice!,
            image:
              typeof product.image === "object"
                ? (product.image.url ?? "")
                : "",
            imageAlt:
              typeof product.image === "object"
                ? product.image.alt
                : product.name,
            color: product.colors?.[0]?.name,
            shopName: product.sellerShopName ?? null,
            eventId: product.eventId ?? null,
            eventName: product.eventName ?? null,
            eventEndsAt: product.eventEndsAt ?? null,
            quotaLeft: product.eventDiscount ? (product.eventQuotaLeft ?? null) : null,
          }))}
          events={liveEvents.map((event) => ({ id: event.id, name: event.name, endsAt: event.endsAt, maxDiscount: event.maxDiscount }))}
          initialEvent={requestedEvent}
        />
      </div>
    </main>
  )
}
