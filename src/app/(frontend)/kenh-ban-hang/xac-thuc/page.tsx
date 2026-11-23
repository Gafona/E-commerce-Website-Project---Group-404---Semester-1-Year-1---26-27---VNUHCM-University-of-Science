import Link from "next/link"
import { Printer, ShieldCheck } from "lucide-react"
import { db, requireSeller, sellerProducts } from "../seller-lib"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { AUTH_CHECK_WARN_AT } from "@/lib/authenticity"
import { CodeStatusButton, GenerateCodesForm } from "./CodeControls"

export async function generateMetadata() {
  return localizedTitle("Mã xác thực | Kênh người bán BOAI", "Authenticity codes | BOAI Seller Centre")
}

const relId = (value: unknown) => (value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : value ? String(value) : "")

export default async function SellerAuthCodesPage({ searchParams }: { searchParams: Promise<{ lo?: string }> }) {
  const seller = await requireSeller()
  const tr = await getTr()
  const { lo = "" } = await searchParams
  const payload = await db()
  const [products, codes] = await Promise.all([
    sellerProducts(seller.id),
    payload.find({
      collection: "authenticity-codes",
      where: { seller: { equals: seller.id } },
      sort: "-createdAt",
      limit: 3000,
      depth: 0,
      select: { code: true, product: true, batch: true, batchId: true, status: true, checkCount: true, firstCheckedAt: true, createdAt: true },
      overrideAccess: false,
      user: seller,
    }),
  ])
  const productName = new Map(products.map((p) => [String(p.id), p.name]))
  const batches = new Map<string, { id: string; label: string; product: string; total: number; checked: number; flagged: number; revoked: number; createdAt: string }>()
  for (const c of codes.docs) {
    const id = c.batchId || `legacy-${relId(c.product)}`
    const row = batches.get(id) ?? { id, label: c.batch ?? "", product: productName.get(relId(c.product)) ?? tr("Sản phẩm đã xóa", "Deleted product"), total: 0, checked: 0, flagged: 0, revoked: 0, createdAt: c.createdAt }
    row.total++
    if ((c.checkCount ?? 0) > 0) row.checked++
    if ((c.checkCount ?? 0) >= AUTH_CHECK_WARN_AT) row.flagged++
    if (c.status === "revoked") row.revoked++
    batches.set(id, row)
  }
  const selected = lo ? codes.docs.filter((c) => (c.batchId || `legacy-${relId(c.product)}`) === lo) : []
  const date = (v?: string | null) => (v ? new Date(v).toLocaleString(tr("vi-VN", "en-GB"), { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—")

  return (
    <>
      <header className="sc-head">
        <div>
          <small>{tr("Chống hàng giả", "Anti-counterfeit")}</small>
          <h1>{tr("Mã xác thực", "Authenticity codes")}</h1>
        </div>
        <Link className="boai-button" href="/xac-thuc" target="_blank">{tr("Trang kiểm tra công khai", "Public check page")}</Link>
      </header>
      <p className="mb-3 mt-0 max-w-3xl text-xs leading-5 text-[var(--muted)]">
        {tr(
          "Mỗi mã gồm 12 ký tự ngẫu nhiên (không thể đoán). In mã kèm QR, dán lên sản phẩm. Khách quét QR hoặc nhập mã ở trang Kiểm tra mã xác thực. Mã bị tra từ 3 lần trở lên sẽ hiện cảnh báo cho khách; hãy thu hồi mã nếu nghi bị sao chép.",
          "Each code has 12 random characters (not guessable). Print codes with QR and attach them to products. Customers scan or type the code on the public check page. From the 3rd lookup a warning is shown; revoke a code if you suspect it was copied.",
        )}
      </p>
      {products.length ? (
        <GenerateCodesForm products={products.map((p) => ({ id: String(p.id), name: p.name }))} />
      ) : (
        <p className="sc-card p-5 text-xs">{tr("Thêm sản phẩm trước khi tạo mã.", "Add a product before creating codes.")} <Link href="/kenh-ban-hang/san-pham" className="font-bold">{tr("Thêm sản phẩm", "Add product")}</Link></p>
      )}

      <section className="sc-card mt-4 p-0">
        <h3 className="m-0 border-b border-[var(--line)] px-5 py-3">{tr("Các lô đã tạo", "Batches")}</h3>
        {batches.size ? (
          <table className="sc-table">
            <thead>
              <tr>
                <th>{tr("Lô", "Batch")}</th>
                <th>{tr("Sản phẩm", "Product")}</th>
                <th>{tr("Số mã", "Codes")}</th>
                <th>{tr("Đã được tra", "Checked")}</th>
                <th>{tr("Ngày tạo", "Created")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...batches.values()].map((b) => (
                <tr key={b.id} className={b.id === lo ? "bg-[var(--soft-blue)]" : ""}>
                  <td><Link href={`/kenh-ban-hang/xac-thuc?lo=${encodeURIComponent(b.id)}`} className="font-bold">{b.id.startsWith("legacy-") ? tr("Mã cũ", "Older codes") : b.id}</Link>{b.label && <small className="block text-[var(--muted)]">{b.label}</small>}</td>
                  <td>{b.product}</td>
                  <td>{b.total}{b.revoked ? <small className="block text-[var(--sale)]">{tr(`${b.revoked} đã thu hồi`, `${b.revoked} revoked`)}</small> : null}</td>
                  <td>{b.checked}{b.flagged ? <small className="block font-bold text-[var(--sale)]">{tr(`${b.flagged} mã tra ≥ ${AUTH_CHECK_WARN_AT} lần`, `${b.flagged} checked ≥ ${AUTH_CHECK_WARN_AT}×`)}</small> : null}</td>
                  <td>{date(b.createdAt)}</td>
                  <td>
                    {!b.id.startsWith("legacy-") && (
                      <Link className="inline-flex items-center gap-1 text-[11px] font-bold" href={`/kenh-ban-hang/xac-thuc/in?lo=${encodeURIComponent(b.id)}`} target="_blank">
                        <Printer size={13} /> {tr("In mã + QR", "Print + QR")}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="sc-empty flex items-center gap-2 px-5"><ShieldCheck size={16} /> {tr("Chưa có mã nào.", "No codes yet.")}</p>
        )}
      </section>

      {selected.length > 0 && (
        <section className="sc-card mt-4 p-0">
          <h3 className="m-0 border-b border-[var(--line)] px-5 py-3">{tr("Mã trong lô", "Codes in batch")} {lo.startsWith("legacy-") ? "" : lo}</h3>
          <table className="sc-table">
            <thead>
              <tr>
                <th>{tr("Mã", "Code")}</th>
                <th>{tr("Trạng thái", "Status")}</th>
                <th>{tr("Số lần tra", "Lookups")}</th>
                <th>{tr("Lần tra đầu", "First check")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {selected.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.code}</td>
                  <td><span className={`sc-badge ${c.status === "active" ? "delivered" : "cancelled"}`}>{c.status === "active" ? tr("Hiệu lực", "Active") : tr("Đã thu hồi", "Revoked")}</span></td>
                  <td className={(c.checkCount ?? 0) >= AUTH_CHECK_WARN_AT ? "font-bold text-[var(--sale)]" : ""}>{c.checkCount ?? 0}</td>
                  <td>{date(c.firstCheckedAt)}</td>
                  <td><CodeStatusButton id={String(c.id)} status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
