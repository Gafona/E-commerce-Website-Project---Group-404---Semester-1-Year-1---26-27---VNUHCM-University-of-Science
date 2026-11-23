import { findBySlug, getPayloadClient } from "@/lib/payload"
import { applyActiveEventPricing } from "@/lib/event-pricing"
import { OgFrame, clip, embedImage, ogImage } from "@/lib/og"

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`

/** 1200×630 product preview: photo, name, shop price (event price when one is live). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const found = await findBySlug("products", decodeURIComponent(slug), { depth: 1 }).catch(() => null)
  if (!found)
    return ogImage(
      <OgFrame eyebrow="Cửa hàng">
        <div style={{ display: "flex", alignItems: "center", fontSize: 64, fontWeight: 800 }}>Trang bị chính hãng cho lối chơi của bạn</div>
      </OgFrame>,
      300,
    )
  const [product] = await applyActiveEventPricing(await getPayloadClient(), [found])
  const media = typeof product.image === "object" && product.image ? product.image : null
  const photo = await embedImage(media?.url, new URL(request.url).origin)
  const off = product.oldPrice && product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  return ogImage(
    <OgFrame eyebrow={product.sport === "badminton" ? "Cầu lông" : "Bóng đá"} footer={product.eventName ? `Sự kiện: ${clip(product.eventName, 40)}` : undefined}>
      <div style={{ display: "flex", width: "100%", gap: 48, alignItems: "center" }}>
        <div style={{ display: "flex", width: 360, height: 360, background: "#ffffff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered into a PNG by the OG renderer, not the page
            <img src={photo} alt="" width={360} height={360} style={{ objectFit: "contain", width: 360, height: 360 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, color: "#071a33" }}>B</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#8fc1ff", letterSpacing: 2 }}>{clip(product.brand.toUpperCase(), 30)}</div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, lineHeight: 1.1 }}>{clip(product.name, 70)}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 8 }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 800 }}>{money(product.price)}</div>
            {off > 0 && product.oldPrice && <div style={{ display: "flex", fontSize: 30, color: "#9fb3cc", textDecoration: "line-through" }}>{money(product.oldPrice)}</div>}
            {off > 0 && <div style={{ display: "flex", fontSize: 30, fontWeight: 800, background: "#e5484d", padding: "4px 12px" }}>−{off}%</div>}
          </div>
        </div>
      </div>
    </OgFrame>,
  )
}
