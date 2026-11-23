import { SiteHeader } from "../components/SiteHeader"
import { NotificationCenter } from "./NotificationCenter"
import { localizedTitle } from "@/lib/i18n-server"

export async function generateMetadata() {
  return localizedTitle("Thông báo — BOAI", "Notifications — BOAI")
}

// Static shell; the signed-in feed loads in the browser.
export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <SiteHeader />
      <NotificationCenter />
    </main>
  )
}
