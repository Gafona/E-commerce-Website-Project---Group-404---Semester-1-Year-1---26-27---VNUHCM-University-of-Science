import Link from "next/link"
import { db, requireAdmin } from "../admin-lib"
import { PageHead } from "../ui"
import { getShippingSettings } from "@/lib/shipping-server"
import { TariffForm } from "./TariffForm"

export const metadata = { title: "Biểu phí vận chuyển | Quản trị BOAI" }

/** Tariff for the automatic per-shop shipping fee (no manual quotes any more). */
export default async function ShippingTariffPage() {
  await requireAdmin()
  const settings = await getShippingSettings(await db())
  return (
    <>
      <PageHead eyebrow="Thương mại" title="Biểu phí vận chuyển">
        <Link href="/quan-tri/don-hang" className="text-[12px] font-bold text-[var(--lime-dark)]">Xem đơn hàng →</Link>
      </PageHead>
      <section className="sc-card">
        <TariffForm
          initial={{
            firstFee: String(settings.firstFee),
            firstKm: String(settings.firstKm),
            perKm: String(settings.perKm),
            adjustPercent: String(settings.adjustPercent),
            defaultOrigin: settings.defaultOrigin,
            originLat: settings.defaultOriginPoint ? String(settings.defaultOriginPoint.lat) : "",
            originLng: settings.defaultOriginPoint ? String(settings.defaultOriginPoint.lng) : "",
          }}
        />
      </section>
    </>
  )
}
