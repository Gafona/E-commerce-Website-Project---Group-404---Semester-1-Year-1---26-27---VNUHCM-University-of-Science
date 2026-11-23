import { Suspense } from "react"
import { getTr } from "@/lib/i18n-server"
import { requireSeller } from "../seller-lib"
import { UnifiedInbox } from "../../components/UnifiedInbox"

export default async function SellerMessagesPage() {
  await requireSeller()
  const tr = await getTr()
  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Chăm sóc khách hàng", "Customer care")}</small>
          <h1>{tr("Tin nhắn", "Messages")}</h1>
        </div>
      </header>
      {/* Same shared inbox as /tin-nhan, opened on the shop's customer threads. */}
      <Suspense>
        <UnifiedInbox defaultFilter="selling" />
      </Suspense>
    </>
  )
}
