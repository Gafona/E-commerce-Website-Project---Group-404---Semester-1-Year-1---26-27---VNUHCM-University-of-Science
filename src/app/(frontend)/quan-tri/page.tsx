import Link from "next/link"
import { ArrowRight, CalendarCheck2, Megaphone, MessagesSquare, ShieldAlert, Store } from "lucide-react"
import { isLiveNow } from "@/lib/announcements"
import { BUSINESS_TYPE, db, fmtDate, requireAdmin } from "./admin-lib"
import { ReviewControls } from "./AdminControls"
import { Badge, PageHead } from "./ui"

export default async function AdminOverview() {
  const admin = await requireAdmin()
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const [sellers, events, posts, hiddenPosts, restricted, announcements] = await Promise.all([
    payload.find({ collection: "users", where: { sellerStatus: { equals: "pending" } }, sort: "-updatedAt", limit: 5, depth: 0, ...scoped }),
    payload.find({ collection: "event-registrations", where: { reviewStatus: { equals: "pending" } }, sort: "-updatedAt", limit: 5, depth: 1, ...scoped }),
    payload.count({ collection: "community-posts", ...scoped }),
    payload.count({ collection: "community-posts", where: { visibility: { equals: "hidden" } }, ...scoped }),
    payload.count({
      collection: "users",
      where: { or: [{ "moderation.postingBanned": { equals: true } }, { "moderation.chatBanned": { equals: true } }, { "moderation.suspended": { equals: true } }] },
      ...scoped,
    }),
    payload.find({ collection: "site-announcements", where: { active: { equals: true } }, limit: 50, depth: 0, ...scoped }),
  ])
  const live = announcements.docs.filter((doc) => isLiveNow(doc)).length

  const stats = [
    { Icon: Store, label: "Người bán chờ duyệt", value: sellers.totalDocs, href: "/quan-tri/nguoi-ban", urgent: sellers.totalDocs > 0 },
    { Icon: CalendarCheck2, label: "Đăng ký sự kiện chờ duyệt", value: events.totalDocs, href: "/quan-tri/su-kien/dang-ky", urgent: events.totalDocs > 0 },
    { Icon: MessagesSquare, label: `Bài viết · ${hiddenPosts.totalDocs} đang ẩn`, value: posts.totalDocs, href: "/quan-tri/cong-dong", urgent: false },
    { Icon: ShieldAlert, label: "Thành viên bị hạn chế", value: restricted.totalDocs, href: "/quan-tri/thanh-vien?filter=restricted", urgent: false },
    { Icon: Megaphone, label: "Thông báo đang hiển thị", value: live, href: "/quan-tri/thong-bao", urgent: false },
  ]

  return (
    <>
      <PageHead eyebrow={`Xin chào, ${admin.name}`} title="Bảng điều khiển">
        <Link href="/quan-tri/thong-bao" className="boai-button primary">
          <Megaphone size={15} /> Tạo pop-up
        </Link>
      </PageHead>

      <div className="mb-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        {stats.map(({ Icon, label, value, href, urgent }) => (
          <Link key={href} href={href} className={`sc-card group grid gap-1.5 text-inherit no-underline transition hover:border-[#071a33] ${urgent ? "shadow-[inset_0_3px_0_#e08b25]" : ""}`}>
            <Icon size={20} className={urgent ? "text-[#c46f0a]" : "text-[var(--lime-dark)]"} />
            <small className="text-[11px] text-[var(--muted)]">{label}</small>
            <b className="font-[family-name:var(--display)] text-[34px] leading-none">{value}</b>
          </Link>
        ))}
      </div>

      <div className="sc-grid2">
        <section className="sc-card">
          <div className="sc-card-head">
            <h3>Hồ sơ người bán mới</h3>
            <Link href="/quan-tri/nguoi-ban" className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--lime-dark)]">Xem tất cả <ArrowRight size={13} /></Link>
          </div>
          {sellers.docs.length ? (
            <ul className="m-0 grid list-none gap-0 p-0">
              {sellers.docs.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0">
                  <div className="min-w-0">
                    <b className="block truncate text-[13px]">{user.seller?.shopName || user.name}</b>
                    <small className="text-[11px] text-[var(--muted)]">{user.name} · {BUSINESS_TYPE[user.seller?.businessType ?? ""] ?? "—"} · {fmtDate(user.updatedAt)}</small>
                  </div>
                  <ReviewControls kind="seller" id={String(user.id)} status="pending" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sc-empty">Không có hồ sơ nào đang chờ.</p>
          )}
        </section>

        <section className="sc-card">
          <div className="sc-card-head">
            <h3>Shop đăng ký sự kiện</h3>
            <Link href="/quan-tri/su-kien/dang-ky" className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--lime-dark)]">Xem tất cả <ArrowRight size={13} /></Link>
          </div>
          {events.docs.length ? (
            <ul className="m-0 grid list-none gap-0 p-0">
              {events.docs.map((registration) => {
                const seller = typeof registration.seller === "object" ? registration.seller : null
                const event = typeof registration.event === "object" ? registration.event : null
                return (
                  <li key={registration.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-3 last:border-0">
                    <div className="min-w-0">
                      <b className="block truncate text-[13px]">{seller?.seller?.shopName || seller?.name || "Người bán"}</b>
                      <small className="text-[11px] text-[var(--muted)]">
                        {event?.name ?? "Sự kiện"} · −{registration.discountPercent}% · {registration.products?.length ?? 0} sản phẩm
                      </small>
                    </div>
                    <ReviewControls kind="registration" id={String(registration.id)} status="pending" />
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="sc-empty">Không có đăng ký nào đang chờ.</p>
          )}
        </section>
      </div>

      <p className="mt-6 flex items-center gap-2 text-[11px] text-[var(--muted)]">
        <Badge tone="pending">Lưu ý</Badge> Sự kiện do quản trị viên tạo. Giảm giá của shop chỉ áp dụng sau khi đăng ký được duyệt; mỗi lần người bán chỉnh sửa, đăng ký sẽ quay lại hàng chờ.
      </p>
    </>
  )
}
