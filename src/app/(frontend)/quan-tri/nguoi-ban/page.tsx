import { Store } from "lucide-react"
import { BUSINESS_TYPE, db, fmtDate, REVIEW_LABEL, requireAdmin } from "../admin-lib"
import { ReviewControls, ShopBanControls } from "../AdminControls"
import { Badge, Empty, PageHead, param, type SearchParams, Tabs } from "../ui"
import { missingSellerProfile } from "@/lib/seller-profile"

export const metadata = { title: "Duyệt người bán | Quản trị BOAI" }

const STATUSES = ["pending", "approved", "suspended", "rejected"] as const

export default async function SellerReviewPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const requested = param((await searchParams).status)
  const status = STATUSES.find((s) => s === requested) ?? "pending"
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const counts = await Promise.all(
    STATUSES.map((s) => payload.count({ collection: "users", where: { sellerStatus: { equals: s } }, ...scoped })),
  )
  const { docs } = await payload.find({
    collection: "users",
    where: { sellerStatus: { equals: status } },
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    ...scoped,
  })

  return (
    <>
      <PageHead eyebrow="Kiểm duyệt" title="Người đăng ký bán" />
      <Tabs
        active={status}
        items={STATUSES.map((s, i) => ({ key: s, href: `/quan-tri/nguoi-ban?status=${s}`, label: REVIEW_LABEL[s].label, count: counts[i].totalDocs }))}
      />
      {docs.length ? (
        <section className="sc-card overflow-x-auto p-0">
          <table className="sc-table min-w-[920px]">
            <thead>
              <tr>
                <th className="pl-5">Cửa hàng</th>
                <th>Loại hình</th>
                <th>Giấy tờ</th>
                <th>Liên hệ & kho</th>
                <th>Cập nhật</th>
                <th className="pr-5 text-right">Quyết định</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="pl-5">
                    <b className="block text-[13px]">{user.seller?.shopName || "—"}</b>
                    <small>{user.name} · {user.email}</small>
                    {status === "approved" && missingSellerProfile(user).length > 0 && (
                      <div className="mt-1.5" title={missingSellerProfile(user).map((f) => f.label).join(", ")}>
                        <Badge tone="pending">Tạm dừng · thiếu {missingSellerProfile(user).length} thông tin</Badge>
                      </div>
                    )}
                    {status === "suspended" && (
                      <div className="mt-2 grid max-w-[300px] gap-1.5 text-[11px] leading-4">
                        <p className="m-0 border-l-2 border-[#a42626] pl-2"><b className="text-[#a42626]">Lý do khóa:</b> {user.shopBan?.reason || "—"}</p>
                        {user.shopBan?.appealStatus === "pending" ? (
                          <p className="m-0 border-l-2 border-[#1677ff] bg-[var(--soft-blue)] py-1 pl-2"><b className="text-[#0b5ed7]">Kháng cáo ({fmtDate(user.shopBan.appealSubmittedAt ?? user.updatedAt, true)}):</b> {user.shopBan.appealMessage}</p>
                        ) : user.shopBan?.appealStatus === "rejected" ? (
                          <p className="m-0 pl-2 text-[var(--muted)]">Đã từ chối kháng cáo lần {user.shopBan.appealCount ?? 1}</p>
                        ) : (
                          <p className="m-0 pl-2 text-[var(--muted)]">Chưa kháng cáo</p>
                        )}
                      </div>
                    )}
                    {status !== "suspended" && user.sellerReviewNote && (
                      <p className="mt-2 mb-0 max-w-[260px] border-l-2 border-[#e08b25] pl-2 text-[11px] leading-4 text-[var(--muted)]">{user.sellerReviewNote}</p>
                    )}
                  </td>
                  <td><Badge>{BUSINESS_TYPE[user.seller?.businessType ?? ""] ?? "—"}</Badge></td>
                  <td className="text-[11px] leading-5">
                    <div>CCCD: <b>{user.seller?.idNumber || "—"}</b></div>
                    <div>MST: <b>{user.seller?.taxCode || "—"}</b></div>
                    {user.seller?.businessLicense && <div>GPKD: <b>{user.seller.businessLicense}</b></div>}
                  </td>
                  <td className="max-w-[240px] text-[11px] leading-5">
                    <div><b>{user.seller?.phone || user.phone || "—"}</b></div>
                    <small className="line-clamp-2">{user.seller?.warehouseAddress || "—"}</small>
                  </td>
                  <td className="text-[11px] whitespace-nowrap text-[var(--muted)]">{fmtDate(user.updatedAt, true)}</td>
                  <td className="pr-5">
                    {status === "approved" || status === "suspended" ? (
                      <ShopBanControls
                        id={String(user.id)}
                        shop={user.seller?.shopName || user.name}
                        status={status}
                        appealPending={user.shopBan?.appealStatus === "pending"}
                      />
                    ) : (
                      <ReviewControls kind="seller" id={String(user.id)} status={user.sellerStatus ?? "pending"} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty icon={<Store size={22} />} title="Không có hồ sơ" text={status === "pending" ? "Tất cả hồ sơ đăng ký bán đã được xử lý." : status === "suspended" ? "Không có cửa hàng nào đang bị khóa." : "Chưa có hồ sơ nào trong mục này."} />
      )}
    </>
  )
}
