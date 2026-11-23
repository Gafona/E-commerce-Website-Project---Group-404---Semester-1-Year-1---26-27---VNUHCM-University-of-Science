import { TicketPercent } from "lucide-react"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { Badge, Empty, PageHead } from "../ui"
import { DiscountCodeForm, DiscountRowControls } from "../OrderControls"

export const metadata = { title: "Mã giảm giá | Quản trị BOAI" }

/** Admin-managed percentage codes: one per order, applied to goods only. */
export default async function DiscountCodesPage() {
  const admin = await requireAdmin()
  const payload = await db()
  const { docs } = await payload.find({ collection: "discount-codes", sort: "-createdAt", limit: 200, depth: 0, overrideAccess: false, user: admin })
  // How often each code was used on orders (parents carry the code).
  const used = docs.length
    ? (await payload.find({ collection: "orders", where: { and: [{ role: { equals: "parent" } }, { voucher: { in: docs.map((d) => d.code) } }, { status: { not_equals: "cancelled" } }] }, depth: 0, limit: 2000, pagination: false, overrideAccess: true, select: { voucher: true, discount: true } })).docs
    : []
  return (
    <>
      <PageHead eyebrow="Thương mại" title="Mã giảm giá" />
      <section className="sc-card mb-4 grid gap-3">
        <b className="text-[14px]">Tạo mã mới</b>
        <p className="m-0 text-[12px] leading-5 text-[var(--muted)]">Khách nhập mã ở bước thanh toán. Mỗi đơn dùng 1 mã, giảm theo % trên tiền hàng (không áp dụng phí ship). Phần giảm do BOAI chịu và được chia cho các shop theo tỷ lệ tiền hàng.</p>
        <DiscountCodeForm />
      </section>
      {docs.length ? (
        <section className="sc-card">
          <table className="sc-table">
            <thead>
              <tr><th>Mã</th><th>Giảm</th><th>Trạng thái</th><th>Đã dùng</th><th>Tạo lúc</th><th></th></tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const orders = used.filter((o) => o.voucher === doc.code)
                return (
                  <tr key={doc.id}>
                    <td className="font-mono text-[13px] font-bold">{doc.code}</td>
                    <td>{doc.percent}%</td>
                    <td>{doc.active ? <Badge tone="approved">Đang bật</Badge> : <Badge tone="rejected">Đã tắt</Badge>}</td>
                    <td>{orders.length} đơn{orders.length ? ` · −${new Intl.NumberFormat("vi-VN").format(orders.reduce((s, o) => s + (o.discount ?? 0), 0))}₫` : ""}</td>
                    <td>{fmtDate(doc.createdAt)}</td>
                    <td><DiscountRowControls id={String(doc.id)} code={doc.code} active={!!doc.active} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty icon={<TicketPercent size={22} />} title="Chưa có mã giảm giá" text="Tạo mã đầu tiên ở trên. Mã cũ cài sẵn trong code (BOAI10, CHAOBAN, FREESHIP) đã được gỡ." />
      )}
    </>
  )
}
