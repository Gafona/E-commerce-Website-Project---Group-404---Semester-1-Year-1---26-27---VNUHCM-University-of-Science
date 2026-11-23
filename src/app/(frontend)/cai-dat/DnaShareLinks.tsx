"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Link2, Loader2 } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { revokeDnaShareAction } from "../sportdna/share-actions"
import { formatDay, vnDay } from "@/lib/recommendations"

export type ShareLinkRow = { id: string; sport: string; createdAt: string; active: boolean; elo: number | null; tier: string | null }

/** Public SportDNA result links the member created; revoking one takes the page down for good. */
export function DnaShareLinks({ links }: { links: ShareLinkRow[] }) {
  const { tr } = useShop()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [, start] = useTransition()
  const day = (iso: string) => formatDay(vnDay(iso))
  const revoke = (id: string) => {
    if (!window.confirm(tr("Thu hồi liên kết này? Người đã có liên kết sẽ không xem được nữa.", "Revoke this link? People who have it will no longer see your result."))) return
    setBusy(id)
    setError("")
    start(async () => {
      const res = await revokeDnaShareAction(id).catch(() => ({ ok: false, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again.") }))
      setBusy(null)
      if (res.ok) router.refresh()
      else setError(res.error ?? "")
    })
  }
  return (
    <section className="form-card settings-card" id="chia-se-sportdna">
      <div className="settings-head">
        <span><Link2 size={20} /></span>
        <div>
          <h3>{tr("Liên kết chia sẻ SportDNA", "SportDNA share links")}</h3>
          <p className="hint">
            {tr(
              "Trang công khai chỉ đọc của kết quả bạn đã chia sẻ. Tên và ảnh chỉ hiện khi hồ sơ cộng đồng đang công khai.",
              "Read-only public pages of results you shared. Your name and photo show only while your community profile is public.",
            )}
          </p>
        </div>
      </div>
      {links.length ? (
        <ul className="m-0 grid list-none gap-2 p-0">
          {links.map((link) => (
            <li key={link.id} className={`flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] bg-[var(--white)] px-4 py-3 ${link.active ? "" : "opacity-60"}`}>
              <span className="min-w-0">
                <b className="block text-sm">
                  {link.sport === "badminton" ? tr("Cầu lông", "Badminton") : tr("Bóng đá", "Football")}
                  {link.elo !== null && ` · ELO ${link.elo}`}
                  {link.tier && ` · ${link.tier}`}
                </b>
                <small className="text-[var(--muted)]">
                  {tr(`Tạo ngày ${day(link.createdAt)}`, `Created ${day(link.createdAt)}`)} · {link.active ? tr("Đang chia sẻ", "Shared") : tr("Đã thu hồi", "Revoked")}
                </small>
              </span>
              {link.active && (
                <span className="flex items-center gap-3">
                  <Link href={`/sportdna/chia-se/${link.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-[var(--lime)]">
                    <ExternalLink size={13} /> {tr("Mở", "Open")}
                  </Link>
                  <button type="button" className="text-link danger inline-flex items-center gap-1" disabled={busy === link.id} onClick={() => revoke(link.id)}>
                    {busy === link.id && <Loader2 size={13} className="animate-spin" />} {tr("Thu hồi", "Revoke")}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint m-0">
          {tr("Bạn chưa chia sẻ kết quả nào. Tạo liên kết ở trang kết quả SportDNA.", "You haven't shared a result yet. Create a link from your SportDNA result page.")}{" "}
          <Link href="/sportdna" className="font-bold text-[var(--lime)]">SportDNA</Link>
        </p>
      )}
      {error && <p role="alert" className="form-error m-0 mt-2">{error}</p>}
    </section>
  )
}
