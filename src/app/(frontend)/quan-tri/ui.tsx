import Link from "next/link"
import type { ReactNode } from "react"

export type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ""

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="sc-head flex-wrap gap-4">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function Tabs({ items, active }: { items: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <nav className="sc-tabs" aria-label="Bộ lọc">
      {items.map((item) => (
        <Link key={item.key} href={item.href} className={item.key === active ? "active" : ""} aria-current={item.key === active ? "page" : undefined}>
          {item.label}
          {item.count !== undefined && <span className="ml-1.5 opacity-60">{item.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

export function Badge({ tone = "", children }: { tone?: string; children: ReactNode }) {
  return <span className={`sc-badge ${tone} whitespace-nowrap`}>{children}</span>
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-14 text-center">
      <span className="grid size-12 place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">{icon}</span>
      <b className="text-[14px]">{title}</b>
      <p className="m-0 max-w-[380px] text-[12px] leading-5 text-[var(--muted)]">{text}</p>
    </div>
  )
}

export function Pager({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null
  const link = "border border-[var(--line)] bg-[var(--white)] px-3 py-1.5 text-[11px] font-semibold text-inherit no-underline hover:border-[#071a33]"
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-[var(--muted)]">
      {page > 1 && <Link className={link} href={href(page - 1)}>← Trước</Link>}
      <span>Trang {page}/{totalPages}</span>
      {page < totalPages && <Link className={link} href={href(page + 1)}>Sau →</Link>}
    </div>
  )
}

export function SearchForm({ action, q, placeholder, hidden }: { action: string; q: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form action={action} className="flex gap-2">
      {Object.entries(hidden ?? {}).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <input name="q" defaultValue={q} placeholder={placeholder} className="sc-search min-w-[240px] bg-[var(--white)]" aria-label={placeholder} />
      <button className="boai-button dark min-h-9 px-4">Tìm</button>
    </form>
  )
}
