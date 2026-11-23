import type { Where } from "payload"
import { Users } from "lucide-react"
import { db, fmtDate, REVIEW_LABEL, requireAdmin } from "../admin-lib"
import { MemberControls } from "../AdminControls"
import { Badge, Empty, PageHead, Pager, param, SearchForm, type SearchParams, Tabs } from "../ui"

export const metadata = { title: "Thành viên | Quản trị BOAI" }

const FILTERS: Record<string, { label: string; where?: Where }> = {
  all: { label: "Tất cả" },
  restricted: {
    label: "Bị hạn chế",
    where: { or: [{ "moderation.postingBanned": { equals: true } }, { "moderation.chatBanned": { equals: true } }, { "moderation.suspended": { equals: true } }] },
  },
  sellers: { label: "Người bán", where: { sellerStatus: { equals: "approved" } } },
  admins: { label: "Quản trị viên", where: { role: { equals: "admin" } } },
}

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const sp = await searchParams
  const filter = param(sp.filter) in FILTERS ? param(sp.filter) : "all"
  const q = param(sp.q).trim().slice(0, 100)
  const page = Math.max(1, Math.min(500, Number(param(sp.page)) || 1))
  const where: Where = {
    and: [
      ...(FILTERS[filter].where ? [FILTERS[filter].where!] : []),
      ...(q ? [{ or: [{ name: { like: q } }, { email: { like: q } }] }] : []),
    ],
  }
  const result = await (await db()).find({
    collection: "users",
    where,
    sort: "-createdAt",
    limit: 25,
    page,
    depth: 0,
    overrideAccess: false,
    user: admin,
  })
  const href = (extra: Record<string, string | number>) =>
    "/quan-tri/thanh-vien?" + new URLSearchParams(Object.entries({ filter, q, ...extra }).filter(([, v]) => v !== "" && v !== "all").map(([k, v]) => [k, String(v)])).toString()

  return (
    <>
      <PageHead eyebrow="Cộng đồng" title="Thành viên">
        <SearchForm action="/quan-tri/thanh-vien" q={q} placeholder="Tên hoặc email…" hidden={{ filter: filter === "all" ? "" : filter }} />
      </PageHead>
      <Tabs active={filter} items={Object.entries(FILTERS).map(([key, f]) => ({ key, label: f.label, href: href({ filter: key, q: "" }) }))} />
      {result.docs.length ? (
        <section className="sc-card overflow-x-auto p-0">
          <table className="sc-table min-w-[860px]">
            <thead>
              <tr>
                <th className="pl-5">Thành viên</th>
                <th>Vai trò</th>
                <th>Người bán</th>
                <th>Hạn chế</th>
                <th>Tham gia</th>
                <th className="pr-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {result.docs.map((user) => {
                const m = user.moderation
                const flags = [m?.suspended && "Đã khóa", m?.postingBanned && "Cấm đăng bài", m?.chatBanned && "Cấm chat"].filter(Boolean) as string[]
                const isAdmin = user.role === "admin"
                return (
                  <tr key={user.id} className="align-top">
                    <td className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-9 shrink-0 place-items-center font-[family-name:var(--display)] text-lg font-black text-white ${m?.suspended ? "bg-[#a42626]" : "bg-[#071a33]"}`}>
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <b className="block truncate text-[13px]">{user.name}</b>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{isAdmin ? <Badge tone="confirmed">Quản trị viên</Badge> : <Badge>Thành viên</Badge>}</td>
                    <td>
                      {user.sellerStatus && user.sellerStatus !== "none" ? (
                        <Badge tone={REVIEW_LABEL[user.sellerStatus]?.tone}>{REVIEW_LABEL[user.sellerStatus]?.label}</Badge>
                      ) : (
                        <small>—</small>
                      )}
                    </td>
                    <td className="max-w-[220px]">
                      {flags.length ? (
                        <div className="grid gap-1">
                          <div className="flex flex-wrap gap-1">{flags.map((f) => <Badge key={f} tone="cancelled">{f}</Badge>)}</div>
                          {m?.reason && <small className="line-clamp-2 text-[11px]">{m.reason}</small>}
                        </div>
                      ) : (
                        <small>Không</small>
                      )}
                    </td>
                    <td className="text-[11px] whitespace-nowrap text-[var(--muted)]">{fmtDate(user.createdAt)}</td>
                    <td className="pr-5">
                      <MemberControls
                        id={String(user.id)}
                        name={user.name}
                        email={user.email}
                        locked={isAdmin}
                        moderation={{
                          postingBanned: Boolean(m?.postingBanned),
                          chatBanned: Boolean(m?.chatBanned),
                          suspended: Boolean(m?.suspended),
                          reason: m?.reason ?? "",
                        }}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty icon={<Users size={22} />} title="Không có thành viên" text="Không tìm thấy thành viên phù hợp với bộ lọc." />
      )}
      <Pager page={page} totalPages={result.totalPages} href={(p) => href({ page: p })} />
    </>
  )
}
