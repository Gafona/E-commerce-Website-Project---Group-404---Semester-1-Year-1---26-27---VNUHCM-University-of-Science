import { SiteHeader } from "../components/SiteHeader"
import { CartView } from "./CartView"
import { localizedTitle } from "@/lib/i18n-server"

export async function generateMetadata() {
  return localizedTitle("Giỏ hàng — BOAI", "Cart — BOAI")
}

export default function CartPage() {
  return (
    <main className="search-page">
      <SiteHeader />
      <CartView />
    </main>
  )
}
