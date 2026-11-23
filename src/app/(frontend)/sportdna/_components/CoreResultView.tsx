"use client"

import Link from "next/link"
import { AlertTriangle, ArrowUpRight, Dumbbell, RotateCcw, TrendingUp } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { DnaRadar } from "../../components/DnaRadar"
import { TIER_LADDER, type CoreResult } from "@/lib/sportdna-core"
import { GROUP_LABEL, POSITION_LABEL, STYLE_LABEL, SURFACE_LABEL, type CoreSport } from "@/lib/sportdna-core-bank"
import { axisText, strengthSummary } from "@/lib/sportdna-axes"

export const SPORT_SLUG: Record<CoreSport, string> = { badminton: "cau-long", football: "bong-da" }
export const SPORT_NAME: Record<CoreSport, { vi: string; en: string }> = { badminton: { vi: "Cầu lông", en: "Badminton" }, football: { vi: "Bóng đá", en: "Football" } }

/** Explainable result: ELO + tier with promotion conditions, 8 axis scores, groups and drills. */
export function CoreResultView({ result, onRetake }: { result: CoreResult; onRetake?: () => void }) {
  const { tr, lang } = useShop()
  const L = (b: { vi: string; en: string }) => (lang === "en" ? b.en : b.vi)
  const sport = result.sport
  const axisName = (id: string) => L(axisText(sport, id))
  const summary = strengthSummary(result.axes.map((a) => ({ id: a.id, value: a.score })))
  const weakestId = summary.kind === "split" ? summary.weakest?.id : undefined
  const strongestId = summary.kind === "split" ? summary.strongest.id : undefined
  const delta = result.eloBefore === null ? null : result.elo - result.eloBefore
  const ctx = result.context
  return (
    <div className="grid gap-5">
      <section className="grid gap-5 border border-dna-line bg-dna-surface p-6 md:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">
            SportDNA · {L(SPORT_NAME[sport])} · {tr(`Lần ${result.attempt}`, `Attempt ${result.attempt}`)}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <p className="m-0 font-head text-7xl font-black leading-none tabular-nums">{result.elo}</p>
            <div className="pb-1">
              <p className="m-0 text-lg font-black">{tr(result.tier.name)}</p>
              <p className="m-0 text-xs text-dna-muted">
                {tr(`Bậc ${result.tier.index + 1}/10`, `Tier ${result.tier.index + 1}/10`)}
                {delta !== null && (
                  <b className={`ml-2 ${delta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {delta >= 0 ? "+" : ""}
                    {delta} {tr("so với lần trước", "vs last time")}
                  </b>
                )}
              </p>
            </div>
          </div>
          <p className="m-0 mt-2 text-[11px] text-dna-muted">
            {[ctx.position && L(POSITION_LABEL[ctx.position]), ctx.surface && L(SURFACE_LABEL[ctx.surface]), ctx.style && L(STYLE_LABEL[ctx.style])].filter(Boolean).join(" · ")}
          </p>
          {!result.consistency.ok && (
            <p className="m-0 mt-3 flex gap-2 border border-amber-500 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle size={16} className="shrink-0" aria-hidden />
              {tr("Một số câu trả lời mâu thuẫn nhau; kết quả có thể chưa phản ánh đúng trình độ.", "Some answers contradict each other; this result may not reflect your level.")}
            </p>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["technique", "tactics", "physical"] as const).map((g) => (
              <div key={g} className="border border-dna-line bg-dna-paper p-3">
                <p className="m-0 text-[10px] font-extrabold uppercase tracking-wide text-dna-muted">{L(GROUP_LABEL[g])}</p>
                <p className="m-0 mt-1 text-2xl font-black tabular-nums">{result.groups[g]}</p>
              </div>
            ))}
          </div>
          <h3 className="m-0 mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em]">{tr("Điểm từng trục (0–100)", "Axis scores (0–100)")}</h3>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {result.axes.map((a) => (
              <li key={a.id} className="grid grid-cols-[130px_1fr_36px] items-center gap-2 text-xs">
                <span className={a.id === weakestId ? "font-bold text-red-600" : a.id === strongestId ? "font-bold text-emerald-700" : ""}>{axisName(a.id)}</span>
                <span className="h-2 bg-dna-line" aria-hidden>
                  <span className="block h-full bg-skill" style={{ width: `${a.score}%` }} />
                </span>
                <b className="text-right tabular-nums">{a.score}</b>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-xs">
            {summary.kind === "even"
              ? tr("Các kỹ năng đang đồng đều", "Your skills are evenly balanced")
              : summary.kind === "split"
                ? (
                    <>
                      <span className="text-emerald-700">{tr("Mạnh nhất", "Strongest")}: <b>{axisName(summary.strongest.id)}</b></span>
                      {summary.weakest && (
                        <>
                          {" · "}
                          <span className="text-red-600">{tr("Cần cải thiện", "To improve")}: <b>{axisName(summary.weakest.id)}</b></span>
                        </>
                      )}
                    </>
                  )
                : null}
          </p>
        </div>
        <div className="self-center text-dna-ink">
          <DnaRadar
            title={tr(`Mạng nhện ${L(SPORT_NAME[sport]).toLowerCase()}`, `${L(SPORT_NAME[sport])} radar`)}
            emptyLabel={tr("Chưa đủ dữ liệu", "Not enough data")}
            axes={result.axes.map((a) => ({ label: axisName(a.id), value: a.score }))}
            size={320}
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="border border-dna-line bg-dna-surface p-6">
          <h3 className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]"><TrendingUp size={15} /> {tr("Điều kiện lên bậc", "How to reach the next tier")}</h3>
          {result.next ? (
            <div className="mt-3 text-sm">
              <p className="m-0">
                {tr("Bậc kế tiếp:", "Next tier:")} <b>{tr(result.next.name)}</b>
              </p>
              <ul className="m-0 mt-2 grid list-none gap-1.5 p-0 text-xs">
                <li className={result.next.needElo ? "" : "text-emerald-700"}>
                  {result.next.needElo
                    ? tr(`ELO ≥ ${result.next.minElo}: còn thiếu ${result.next.needElo} điểm`, `ELO ≥ ${result.next.minElo}: ${result.next.needElo} points to go`)
                    : tr(`ELO ≥ ${result.next.minElo}: đã đạt`, `ELO ≥ ${result.next.minElo}: done`)}
                </li>
                <li className={result.next.needAxis ? "" : "text-emerald-700"}>
                  {result.next.minAxis === 0
                    ? tr("Không yêu cầu điểm trục tối thiểu", "No minimum axis score")
                    : result.next.needAxis
                      ? tr(`Trục yếu nhất ≥ ${result.next.minAxis}: ${axisName(result.next.weakestAxis)} còn thiếu ${result.next.needAxis}`, `Weakest axis ≥ ${result.next.minAxis}: ${axisName(result.next.weakestAxis)} needs ${result.next.needAxis} more`)
                      : tr(`Trục yếu nhất ≥ ${result.next.minAxis}: đã đạt`, `Weakest axis ≥ ${result.next.minAxis}: done`)}
                </li>
              </ul>
            </div>
          ) : (
            <p className="m-0 mt-3 text-sm">{tr("Bạn đang ở bậc cao nhất.", "You're at the top tier.")}</p>
          )}
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer font-bold">{tr("Xem cả 10 bậc", "See all 10 tiers")}</summary>
            <ol className="m-0 mt-2 grid list-none gap-1 p-0">
              {TIER_LADDER.map((t) => (
                <li key={t.id} className={`flex justify-between gap-2 border-b border-dna-line py-1 ${t.index === result.tier.index ? "font-black text-skill" : ""}`}>
                  <span>{t.index + 1}. {tr(t.name)}</span>
                  <span className="text-dna-muted">ELO ≥ {t.minElo}{t.minAxis ? ` · ${tr("trục", "axis")} ≥ ${t.minAxis}` : ""}</span>
                </li>
              ))}
            </ol>
            <p className="m-0 mt-2 text-dna-muted">{tr("Bậc 10 dành cho vận động viên chuyên nghiệp, không đạt được qua bài tự đánh giá.", "Tier 10 is reserved for professional athletes and cannot be reached through self-assessment.")}</p>
          </details>
        </div>
        <div className="border border-dna-line bg-dna-surface p-6">
          <h3 className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]"><Dumbbell size={15} /> {tr("Gợi ý luyện tập", "Training suggestions")}</h3>
          <ol className="m-0 mt-3 grid gap-3 pl-5 text-sm">
            {result.drills.map((d) => (
              <li key={d.axis}>
                <b>{axisName(d.axis)}</b>
                <span className="block text-dna-muted">{L(d)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            {onRetake && (
              <button type="button" onClick={onRetake} className="flex h-10 items-center gap-2 border border-dna-ink px-4 text-[11px] font-extrabold uppercase">
                <RotateCcw size={14} /> {tr("Làm lại bài", "Retake")}
              </button>
            )}
            <Link href={`/tim-kiem?mon=${sport}`} className="flex h-10 items-center gap-2 bg-skill px-4 text-[11px] font-extrabold uppercase text-white">
              {tr("Thiết bị hợp với bạn", "Gear that fits you")} <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
