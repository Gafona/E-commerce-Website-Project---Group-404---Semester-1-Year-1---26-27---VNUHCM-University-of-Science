import Link from "next/link"
import { ArrowLeft, Shirt } from "lucide-react"
import { appAuth } from "@/lib/app-auth"
import { SiteHeader } from "../components/SiteHeader"
import { CheckoutForm } from "./CheckoutForm"
import { detectProvince, resolveProvince } from "@/lib/provinces"
import { toPoint } from "@/lib/shipping"
import { getTr } from "@/lib/i18n-server"
import { getCustomCheckoutAction } from "../custom-order-actions"

export const dynamic = "force-dynamic"

export async function generateMetadata() {
  const tr = await getTr()
  return {
    title: tr("Thanh toán — BOAI", "Checkout — BOAI"),
    robots: { index: false, follow: false },
    referrer: "strict-origin-when-cross-origin" as const,
  }
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ "yeu-cau"?: string }> }) {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  const requestId = (await searchParams)["yeu-cau"]
  // Checkout for an accepted custom-jersey quote (the cart is left untouched).
  const custom = typeof requestId === "string" ? await getCustomCheckoutAction(requestId) : null
  const deliveryAddress =
    user?.addresses?.find((item) => item.isDefault) ?? user?.addresses?.[0]
  const address = deliveryAddress
    ? [
        deliveryAddress.addressLine,
        deliveryAddress.ward,
        deliveryAddress.district,
        deliveryAddress.province,
      ]
        .filter(Boolean)
        .join(", ")
    : (user?.address ?? "")
  const province = deliveryAddress
    ? (resolveProvince(deliveryAddress.province) ?? detectProvince(address))
    : detectProvince(address)

  if (custom && !custom.ok) {
    return (
      <main className="search-page">
        <SiteHeader />
        <section className="page-shell flow-page narrow">
          <div className="empty-state">
            <Shirt size={30} />
            <h3>{tr("Chưa thể đặt đơn cho yêu cầu này", "This request can't be ordered yet")}</h3>
            <p>{custom.error}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {custom.orderCode ? (
                <Link className="boai-button primary" href={`/don-hang?ma=${encodeURIComponent(custom.orderCode)}`}>
                  {tr("Xem đơn hàng", "View order")}
                </Link>
              ) : null}
              <Link className="boai-button" href={`/custom-ao?yeu-cau=${encodeURIComponent(String(requestId))}`}>
                <ArrowLeft size={15} /> {tr("Về yêu cầu may áo", "Back to the request")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="search-page">
      <SiteHeader />
      <CheckoutForm
        defaults={{
          fullName: deliveryAddress?.recipientName ?? (custom?.ok ? custom.request.contactName : user?.name) ?? "",
          email: user?.email ?? "",
          phone: deliveryAddress?.phone ?? (custom?.ok ? custom.request.contactPhone : user?.phone) ?? "",
          address,
          province: province?.code ?? "",
          // Saved addresses located with "Định vị" give an exact shipping fee straight away.
          point: (() => {
            const saved = toPoint(deliveryAddress?.lat, deliveryAddress?.lng)
            return saved ? { ...saved, label: address } : null
          })(),
        }}
        loggedIn={!!user}
        custom={custom?.ok ? custom.request : null}
      />
    </main>
  )
}
