import type { Metadata } from "next"
import { SiteHeader } from "../components/SiteHeader"
import { JerseyStudio } from "./JerseyStudio"
import { getPayloadClient } from "@/lib/payload"
import { listCustomJerseyShops } from "@/lib/shops"
import { jerseyFontVariables } from "./jersey-fonts"

export const metadata: Metadata = {
  title: "Custom áo thi đấu — BOAI",
  description: "Tự thiết kế áo thi đấu mặt trước, mặt sau và gửi mẫu cho các shop nhận may custom.",
}

// Static shell; the shop list is revalidated when a shop changes its custom-order settings.
export const dynamic = "force-static"

export default async function CustomJerseyPage() {
  const shops = await listCustomJerseyShops(await getPayloadClient())
  return (
    <main className={`min-h-screen bg-[var(--paper)] ${jerseyFontVariables}`}>
      <SiteHeader />
      <JerseyStudio shops={shops} />
    </main>
  )
}
