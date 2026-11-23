import { ClipboardCheck } from "lucide-react"
import { db, requireAdmin } from "../../admin-lib"
import { getTr } from "@/lib/i18n-server"
import { Empty, PageHead, param, type SearchParams, Tabs } from "../../ui"
import { EventTabs } from "../EventTabs"
import { RegistrationCard } from "../RegistrationCard"

export const metadata = { title: "Duyệt đăng ký sự kiện | Quản trị BOAI" }

const STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const

export default async function RegistrationReviewPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const tr = await getTr()
  const LABEL = {
    pending: tr("Chờ duyệt", "Pending"),
    approved: tr("Đã duyệt", "Approved"),
    rejected: tr("Từ chối", "Rejected"),
    withdrawn: tr("Shop đã rút", "Withdrawn"),
  } as const
  const requested = param((await searchParams).status)
  const status = STATUSES.find((s) => s === requested) ?? "pending"
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const counts = await Promise.all(
    STATUSES.map((s) => payload.count({ collection: "event-registrations", where: { reviewStatus: { equals: s } }, ...scoped })),
  )
  const { docs } = await payload.find({
    collection: "event-registrations",
    where: { reviewStatus: { equals: status } },
    sort: "-updatedAt",
    limit: 60,
    depth: 2,
    ...scoped,
  })

  return (
    <>
      <PageHead eyebrow={tr("Kiểm duyệt", "Review")} title={tr("Đăng ký tham gia sự kiện", "Event registrations")} />
      <EventTabs active="registrations" pending={counts[0].totalDocs} />
      <Tabs
        active={status}
        items={STATUSES.map((s, i) => ({ key: s, href: `/quan-tri/su-kien/dang-ky?status=${s}`, label: LABEL[s], count: counts[i].totalDocs }))}
      />
      {docs.length ? (
        <div className="grid gap-3.5 xl:grid-cols-2">
          {docs.map((registration) => (
            <RegistrationCard key={registration.id} registration={registration} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<ClipboardCheck size={22} />}
          title={tr("Không có đăng ký", "No registrations")}
          text={status === "pending" ? tr("Không có đăng ký nào đang chờ duyệt.", "Nothing is waiting for review.") : tr("Chưa có đăng ký nào trong mục này.", "Nothing in this tab yet.")}
        />
      )}
    </>
  )
}
