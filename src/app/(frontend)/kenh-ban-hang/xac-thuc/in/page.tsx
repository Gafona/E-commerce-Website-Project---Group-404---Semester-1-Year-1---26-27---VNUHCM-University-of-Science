import { headers } from "next/headers"
import { notFound } from "next/navigation"
import QRCode from "qrcode"
import { db, requireSeller } from "../../seller-lib"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { PrintButton } from "./PrintButton"

export async function generateMetadata() {
  return localizedTitle("In mã xác thực | BOAI", "Print authenticity codes | BOAI")
}

/** Absolute origin of this deployment (QR codes must open the public check page). */
async function siteOrigin() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto.split(",")[0]}://${host.split(",")[0]}`
}

export default async function PrintCodesPage({ searchParams }: { searchParams: Promise<{ lo?: string }> }) {
  const seller = await requireSeller()
  const tr = await getTr()
  const { lo = "" } = await searchParams
  if (!/^[A-Z0-9-]{4,40}$/.test(lo)) notFound()
  const payload = await db()
  const { docs } = await payload.find({
    collection: "authenticity-codes",
    where: { and: [{ seller: { equals: seller.id } }, { batchId: { equals: lo } }] },
    sort: "createdAt",
    limit: 500,
    depth: 1,
    overrideAccess: false,
    user: seller,
  })
  if (!docs.length) notFound()
  const origin = await siteOrigin()
  const cards = await Promise.all(
    docs.map(async (doc) => {
      const url = `${origin}/xac-thuc/${encodeURIComponent(doc.code)}`
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 120 })
      const product = doc.product && typeof doc.product === "object" ? doc.product.name : ""
      return { id: String(doc.id), code: doc.code, product, svg, revoked: doc.status !== "active" }
    }),
  )
  return (
    <div className="auth-print">
      <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <small className="text-[var(--muted)]">{tr("Lô", "Batch")} {lo} · {cards.length} {tr("mã", "codes")}</small>
          <h1 className="m-0 font-[family-name:var(--display)] text-3xl font-extrabold uppercase">{tr("In mã xác thực", "Print codes")}</h1>
        </div>
        <PrintButton />
      </header>
      <ul className="m-0 grid list-none grid-cols-2 gap-0 p-0 sm:grid-cols-3 print:grid-cols-3">
        {cards.map((c) => (
          <li key={c.id} className="flex break-inside-avoid items-center gap-3 border border-dashed border-[#999] bg-white p-3 text-black">
            <span className="block size-[96px] shrink-0 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <span className="min-w-0">
              <b className="block font-mono text-[13px] tracking-wide">{c.code}</b>
              <small className="mt-1 block truncate text-[10px]">{c.product}</small>
              <small className="mt-1 block text-[9px] leading-tight">{tr("Quét QR để kiểm tra hàng chính hãng", "Scan to verify authenticity")}</small>
              {c.revoked && <small className="mt-1 block text-[9px] font-bold text-red-600">{tr("ĐÃ THU HỒI", "REVOKED")}</small>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
