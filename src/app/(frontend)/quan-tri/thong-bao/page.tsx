import Link from "next/link"
import { Megaphone, Pencil } from "lucide-react"
import { isLiveNow } from "@/lib/announcements"
import { db, fmtDate, requireAdmin } from "../admin-lib"
import { AnnouncementRowControls } from "../AdminControls"
import { AnnouncementForm } from "../AnnouncementForm"
import { EMPTY_ANNOUNCEMENT, type AnnouncementDraft } from "../announcement-draft"
import { Badge, Empty, PageHead, param, type SearchParams } from "../ui"

export const metadata = { title: "Pop-up & thông báo | Quản trị BOAI" }

const stateOf = (doc: { active?: boolean | null; startAt?: string | null; endAt?: string | null }) => {
  if (!doc.active) return { label: "Đã tắt", tone: "" }
  if (doc.endAt && new Date(doc.endAt).getTime() <= Date.now()) return { label: "Đã hết hạn", tone: "cancelled" }
  if (!isLiveNow(doc)) return { label: "Đã lên lịch", tone: "confirmed" }
  return { label: "Đang hiển thị", tone: "delivered" }
}

export default async function AnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const editId = param((await searchParams).edit)
  const { docs } = await (await db()).find({
    collection: "site-announcements",
    sort: "-updatedAt",
    limit: 100,
    depth: 1,
    overrideAccess: false,
    user: admin,
  })
  const editing = docs.find((doc) => String(doc.id) === editId)
  const image = editing?.image && typeof editing.image === "object" ? editing.image : null
  const initial: AnnouncementDraft = editing
    ? {
        id: String(editing.id),
        title: editing.title,
        message: editing.message,
        displayType: editing.displayType,
        scope: editing.scope,
        theme: editing.theme,
        ctaLabel: editing.ctaLabel ?? "",
        ctaHref: editing.ctaHref ?? "",
        startAt: editing.startAt ?? null,
        endAt: editing.endAt ?? null,
        active: Boolean(editing.active),
        imageUrl: image?.url ?? null,
      }
    : EMPTY_ANNOUNCEMENT

  return (
    <>
      <PageHead eyebrow="Truyền thông" title="Pop-up & thông báo" />
      <section className="sc-card mb-3.5 p-6">
        <div className="sc-section-head">
          <div>
            <small>{editing ? "Chỉnh sửa" : "Tạo mới"}</small>
            <h3>{editing ? editing.title : "Sự kiện / thông báo toàn website"}</h3>
          </div>
          <small className="max-w-[340px] text-right">Pop-up xuất hiện giữa màn hình; thanh thông báo nằm trên cùng mọi trang trong phạm vi đã chọn.</small>
        </div>
        <AnnouncementForm key={initial.id ?? "new"} initial={initial} />
      </section>

      <section className="sc-card p-0">
        <div className="sc-card-head mb-0 border-b border-[var(--line)] px-5 py-4">
          <h3>Đã tạo ({docs.length})</h3>
        </div>
        {docs.length ? (
          <ul className="m-0 list-none p-0">
            {docs.map((doc) => {
              const state = stateOf(doc)
              return (
                <li key={doc.id} className={`flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4 last:border-0 ${String(doc.id) === editId ? "bg-[var(--soft-blue)]" : ""}`}>
                  <div className="min-w-0 flex-1 basis-[380px]">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={state.tone}>{state.label}</Badge>
                      <Badge>{doc.displayType === "popup" ? "Pop-up" : "Thanh đầu trang"}</Badge>
                      <Badge>{doc.scope === "all" ? "Toàn website" : "Trang chủ"}</Badge>
                    </div>
                    <b className="block truncate text-[14px]">{doc.title}</b>
                    <small className="text-[11px] text-[var(--muted)]">
                      {doc.startAt ? fmtDate(doc.startAt, true) : "Ngay khi bật"} → {doc.endAt ? fmtDate(doc.endAt, true) : "Không giới hạn"}
                    </small>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Link href={`/quan-tri/thong-bao?edit=${doc.id}`} className="inline-flex min-h-8 items-center gap-1.5 border border-[var(--line)] bg-[var(--white)] px-3 text-[11px] font-bold text-inherit no-underline hover:border-[#071a33]">
                      <Pencil size={13} /> Sửa
                    </Link>
                    <AnnouncementRowControls id={String(doc.id)} active={Boolean(doc.active)} title={doc.title} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="p-5">
            <Empty icon={<Megaphone size={22} />} title="Chưa có thông báo" text="Tạo pop-up đầu tiên để giới thiệu sự kiện hoặc khuyến mãi đến mọi khách truy cập." />
          </div>
        )}
      </section>
    </>
  )
}
