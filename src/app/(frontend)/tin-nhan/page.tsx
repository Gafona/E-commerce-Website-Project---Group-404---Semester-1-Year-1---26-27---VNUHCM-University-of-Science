import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { appAuth } from "@/lib/app-auth"
import { getTr } from "@/lib/i18n-server"
import { SiteHeader } from "../components/SiteHeader"
import { UnifiedInbox } from "../components/UnifiedInbox"

// Private, per-account conversations.
export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const tr = await getTr()
  return { title: tr("Tin nhắn — BOAI", "Messages — BOAI"), robots: { index: false, follow: false } }
}

export default async function MessagesPage() {
  const user = await appAuth.currentUser()
  if (!user) redirect("/dang-nhap?next=%2Ftin-nhan")
  const tr = await getTr()
  return (
    <main className="search-page">
      <SiteHeader />
      <section className="page-shell flow-page">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> {tr("Về trang chính", "Back to home")}
        </Link>
        <div className="eyebrow mt-4">{tr("HỘP THƯ", "INBOX")}</div>
        <h1 className="flow-title">{tr("Tin nhắn", "Messages")}</h1>
        <p className="hint -mt-2 mb-4">
          {tr(
            "Mọi cuộc trò chuyện ở một nơi: shop bạn mua hàng, khách của shop bạn, bạn bè trong cộng đồng và trao đổi may áo custom.",
            "Every conversation in one place: shops you buy from, your shop's customers, community friends and custom kit threads.",
          )}
        </p>
        <Suspense>
          <UnifiedInbox />
        </Suspense>
      </section>
    </main>
  )
}
