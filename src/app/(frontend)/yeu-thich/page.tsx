import { SiteHeader } from "../components/SiteHeader"
import { SavedLists } from "../components/SavedLists"

import { localizedTitle } from "@/lib/i18n-server"
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  return localizedTitle("Yêu thích — BOAI", "Wishlist — BOAI")
}

export default function Page() {
  return (
    <main className="search-page">
      <SiteHeader />
      <SavedLists mode="favorites" />
    </main>
  )
}
