"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { History, LogIn } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { useSportDnaContext } from "../../components/MatchBadge"
import type { DnaStoredResult } from "@/lib/sportdna-core"
import type { CoreSport } from "@/lib/sportdna-core-bank"
import { loadCoreHistoryAction, type CoreHistoryRow } from "../core-actions"
import { CoreResultView, SPORT_NAME, SPORT_SLUG } from "./CoreResultView"
import { DnaSharePanel } from "./DnaSharePanel"

/** Latest saved result for one sport plus every earlier attempt (kept, never overwritten). */
export function CoreHistory({ sport }: { sport: CoreSport }) {
  const { tr, lang } = useShop()
  const { profiles } = useSportDnaContext()
  const [data, setData] = useState<{ authenticated: boolean; latest: DnaStoredResult | null; history: CoreHistoryRow[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    loadCoreHistoryAction(sport)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData({ authenticated: false, latest: null, history: [] }))
    return () => {
      cancelled = true
    }
  }, [sport])
  const local = profiles[sport]?.core ?? null
  const latest = data?.latest ?? local
  const name = lang === "en" ? SPORT_NAME[sport].en : SPORT_NAME[sport].vi
  if (!data) return <p className="text-sm text-dna-muted">{tr("Đang tải kết quả…", "Loading results…")}</p>
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-dna-ink pb-3">
        <h1 className="m-0 font-head text-5xl font-black uppercase italic leading-none">{tr(`SportDNA ${name}`, `${name} SportDNA`)}</h1>
        <Link href={`/sportdna/kiem-tra/${SPORT_SLUG[sport]}`} className="flex h-10 items-center bg-skill px-5 text-[11px] font-extrabold uppercase text-white">
          {latest ? tr("Làm lại bài", "Retake") : tr("Làm bài đánh giá", "Take the assessment")}
        </Link>
      </div>
      {!data.authenticated && (
        <p className="m-0 flex items-center gap-2 text-xs text-dna-muted">
          <LogIn size={14} /> <Link href={`/dang-nhap?next=${encodeURIComponent(`/sportdna/ket-qua/${SPORT_SLUG[sport]}`)}`} className="font-bold text-skill">{tr("Đăng nhập", "Sign in")}</Link> {tr("để lưu kết quả và xem lịch sử trên mọi thiết bị.", "to save results and see your history on any device.")}
        </p>
      )}
      {latest ? <CoreResultView result={latest.result} /> : <p className="text-sm">{tr("Bạn chưa làm bài đánh giá môn này.", "You haven't taken this assessment yet.")}</p>}
      {latest && <DnaSharePanel sport={sport} signedIn={data.authenticated} returnTo={`/sportdna/ket-qua/${SPORT_SLUG[sport]}`} />}
      {data.history.length > 0 && (
        <section className="border border-dna-line bg-dna-surface p-6">
          <h2 className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]"><History size={15} /> {tr("Lịch sử các lần làm", "Attempt history")}</h2>
          <table className="mt-3 w-full text-left text-xs">
            <thead className="text-dna-muted"><tr><th className="py-1">{tr("Lần", "Attempt")}</th><th>{tr("Ngày", "Date")}</th><th>ELO</th><th>{tr("Bậc", "Tier")}</th><th>{tr("Nhất quán", "Consistent")}</th></tr></thead>
            <tbody>
              {data.history.map((h) => (
                <tr key={h.id} className="border-t border-dna-line">
                  <td className="py-1.5">#{h.attempt}</td>
                  <td>{new Date(h.at).toLocaleString(lang === "en" ? "en-GB" : "vi-VN")}</td>
                  <td className="font-bold tabular-nums">{h.elo}</td>
                  <td>{tr(h.tierName)}</td>
                  <td>{h.consistent ? tr("Có", "Yes") : tr("Có mâu thuẫn", "Contradictory")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
