import { getTr } from "@/lib/i18n-server"

export default async function ProfileLoading() {
  const tr = await getTr()
  return (
    <main className="page-shell py-12" role="status" aria-live="polite">
      <p className="text-sm text-[var(--muted)]">
        {tr("Đang mở trang cá nhân…", "Opening profile…")}
      </p>
      <div aria-hidden="true" className="mt-5 animate-pulse overflow-hidden rounded-2xl border border-[var(--line)]">
        <div className="h-40 bg-[var(--soft-blue)]" />
        <div className="space-y-4 p-6">
          <div className="h-6 w-48 rounded bg-[var(--paper)]" />
          <div className="h-4 w-28 rounded bg-[var(--paper)]" />
        </div>
      </div>
    </main>
  )
}
