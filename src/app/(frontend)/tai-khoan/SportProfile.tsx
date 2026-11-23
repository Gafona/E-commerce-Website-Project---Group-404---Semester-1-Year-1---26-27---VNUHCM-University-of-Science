"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Award, ChevronDown, Crosshair, History, Share2, ShoppingBag, Swords } from "lucide-react"
import { requestAchievementShare } from "./ProfileTimeline"
import { resolveSkillTier, type SkillResult } from "@/lib/sportdna"
import { playerRadar, type DnaSportKey } from "@/lib/sportdna-radar"
import { scenarioElo, TEST_META, type TestKind, type TestRun } from "@/lib/sportdna-runs"
import { axisText, strengthSummary } from "@/lib/sportdna-axes"
import { DnaRadar } from "../components/DnaRadar"
import { useSportDnaContext } from "../components/MatchBadge"
import { useShop } from "../components/ShopProvider"
import { EquipmentNeeds } from "../sportdna/_components/EquipmentNeeds"

type Tag = { key: string; label: string; detail: string; elo?: boolean }
type Tr = ReturnType<typeof useShop>["tr"]

const TEST_LABEL: Record<TestKind, [string, string]> = {
  doubles_scenario: ["Tình huống cầu lông đôi", "Badminton doubles situations"],
  doubles_quick: ["Quick cầu lông đôi", "Badminton doubles quick"],
  practice_singles: ["Luyện tập cầu lông đơn", "Badminton singles practice"],
  practice_doubles: ["Luyện tập cầu lông đôi", "Badminton doubles practice"],
  football_scenario: ["Tình huống bóng đá", "Football situations"],
  football_quick: ["Quick bóng đá", "Football quick"],
  position: ["Gợi ý vị trí bóng đá", "Football position finder"],
}
const XP: Record<TestKind, number> = {
  doubles_scenario: 30, football_scenario: 30, doubles_quick: 20, football_quick: 20,
  practice_singles: 15, practice_doubles: 15, position: 10,
}
const isCurrent = (r: SkillResult | undefined): r is SkillResult => !!r && r.schemaVersion === "v1.3.3-provisional"

function tagsFor(sport: DnaSportKey, runs: TestRun[], tr: Tr, locale: string, quick?: SkillResult, deep?: SkillResult): Tag[] {
  const tags: Tag[] = []
  if (sport === "badminton") {
    if (deep) tags.push({ key: "deep", label: tr("Đơn · sân 2D", "Singles · 2D court"), detail: `ELO ${deep.overall} · ${deep.tier.label}`, elo: true })
    if (quick) tags.push({ key: "quick", label: tr("Đơn · Quick", "Singles · Quick"), detail: new Date(quick.answeredAt).toLocaleDateString(locale) })
  }
  for (const k of (Object.keys(TEST_META) as TestKind[]).filter((kind) => TEST_META[kind].sport === sport)) {
    const mine = runs.filter((r) => r.test === k)
    if (!mine.length) continue
    let detail = `×${mine.length}`
    if (k === "position") detail = mine[mine.length - 1].result.position?.label ?? detail
    else {
      const best = k.startsWith("practice")
        ? Math.max(...mine.map((r) => (r.result.practice ? r.result.practice.correct / r.result.practice.total : 0)))
        : Math.max(...mine.map((r) => r.result.avg ?? 0))
      detail = tr(`×${mine.length} · tốt nhất ${Math.round(best * 100)}%`, `×${mine.length} · best ${Math.round(best * 100)}%`)
    }
    tags.push({ key: k, label: tr(...TEST_LABEL[k]), detail, elo: TEST_META[k].countsElo })
  }
  return tags
}

function EloStat({ label, elo, tierName, sub, tr }: { label: string; elo: number | null; tierName?: string; sub: string; tr: Tr }) {
  const tier = elo === null ? null : (tierName ?? resolveSkillTier(elo).label)
  return (
    <div className="border border-white/15 bg-white/[0.04] p-4">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className="m-0 mt-2 font-head text-4xl font-black leading-none tabular-nums">{elo ?? "—"}</p>
      <p className="m-0 mt-2 text-[11px] font-bold text-[var(--lime)]">{tier ? tr(tier) : tr("Chưa có ELO", "No ELO yet")}</p>
      <p className="m-0 mt-1 text-[10px] text-white/45">{sub}</p>
    </div>
  )
}

export function SportProfile() {
  const { tr, lang } = useShop()
  const locale = lang === "en" ? "en-GB" : "vi-VN"
  const { profiles, runs, ready } = useSportDnaContext()
  const [sport, setSport] = useState<DnaSportKey>("badminton")
  const quick = isCurrent(profiles.badminton?.quick) ? profiles.badminton!.quick : undefined
  const deep = isCurrent(profiles.badminton?.deep) ? profiles.badminton!.deep : undefined
  const core = profiles[sport]?.core
  const slug = sport === "badminton" ? "cau-long" : "bong-da"
  const sportName = sport === "badminton" ? tr("cầu lông", "badminton") : tr("bóng đá", "football")

  // Main radar: the 8 standard axes of the newest SportDNA assessment; older tests (mapped onto the same axes) fill in until then.
  const legacyRadar = useMemo(() => playerRadar(sport, profiles, runs), [sport, profiles, runs])
  const axisLabel = (id: string) => tr(axisText(sport, id).vi, axisText(sport, id).en)
  const radar = core
    ? core.result.axes.map((a) => ({ id: a.id, label: axisLabel(a.id), value: a.score as number | null }))
    : legacyRadar.map((a) => ({ id: a.id, label: axisLabel(a.id), value: a.value }))
  const doubles = useMemo(() => scenarioElo(runs, "doubles_scenario"), [runs])
  const football = useMemo(() => scenarioElo(runs, "football_scenario"), [runs])
  const tags = tagsFor(sport, runs, tr, locale, quick, deep)

  const xp = (quick ? 20 : 0) + (deep ? 40 : 0) + runs.reduce((t, r) => t + XP[r.test], 0) + ((profiles.badminton?.core ? 50 : 0) + (profiles.football?.core ? 50 : 0))
  const level = 1 + Math.floor(xp / 100)
  const known = radar.filter((a) => a.value !== null)
  // Strongest and "to improve" are never the same axis; equal scores read as "evenly balanced".
  const summary = strengthSummary(radar)
  const hasElo = !!core || (sport === "badminton" ? deep?.overall != null || doubles.overall !== null : football.overall !== null)
  const shareButton =
    "inline-flex h-9 items-center gap-2 border border-white/25 bg-white/[0.04] px-3 text-[11px] font-extrabold uppercase tracking-wide text-white transition hover:border-[var(--lime)] hover:text-[var(--lime)] disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <section id="the-thao" className="m-0 scroll-mt-28 overflow-hidden border border-[#0a2240] bg-[#071a33] text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-7">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center border-2 border-[var(--lime)] font-head text-2xl font-black text-[var(--lime)]" aria-label={tr(`Cấp ${level}`, `Level ${level}`)}>
            {level}
          </div>
          <div>
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-300">{tr("Hồ sơ thể thao · SportDNA", "Sports profile · SportDNA")}</p>
            <p className="m-0 mt-1 font-head text-2xl font-black uppercase leading-none">{tr(`Cấp ${level}`, `Level ${level}`)}</p>
            <div className="mt-2 h-1.5 w-44 bg-white/10" title={tr(`${xp % 100}/100 XP tới cấp ${level + 1}`, `${xp % 100}/100 XP to level ${level + 1}`)}>
              <div className="h-full bg-[var(--lime)]" style={{ width: `${xp % 100}%` }} />
            </div>
          </div>
        </div>
        <div role="tablist" aria-label={tr("Môn thể thao", "Sport")} className="flex border border-white/20">
          {(["badminton", "football"] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={sport === s} onClick={() => setSport(s)}
              className={`h-10 px-5 text-[11px] font-extrabold uppercase tracking-wide transition ${sport === s ? "bg-white text-[#071a33]" : "text-white/70 hover:text-white"}`}>
              {s === "badminton" ? tr("Cầu lông", "Badminton") : tr("Bóng đá", "Football")}
            </button>
          ))}
        </div>
      </div>

      {!ready ? (
        <div className="h-80 animate-pulse bg-white/5" />
      ) : (
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="text-white">
            <DnaRadar title={tr(`Mạng nhện ${sportName}`, `${sportName} radar`)} emptyLabel={tr("Chưa đủ dữ liệu", "Not enough data")} axes={radar.map((a) => ({ label: a.label, value: a.value }))} color="#7dd3fc" size={380} />
            <p className="m-0 mt-1 text-center text-[11px] text-white/50">
              {core
                ? tr(`Từ bài đánh giá SportDNA ${sportName} ngày ${new Date(core.at).toLocaleDateString(locale)}.`, `From your ${sportName} SportDNA assessment on ${new Date(core.at).toLocaleDateString(locale)}.`)
                : known.length
                  ? tr("Tổng hợp từ các bài bổ sung. Làm bài đánh giá chính để có đủ 8 trục.", "Built from extra practice tests. Take the main assessment for all 8 axes.")
                  : tr("Chưa có dữ liệu. Làm bài đánh giá để mở khóa mạng nhện.", "No data yet. Take the assessment to unlock your radar.")}
            </p>
            <div className="mt-3 flex justify-center">
              <button type="button" className={shareButton} disabled={!known.length} onClick={() => requestAchievementShare({ kind: "radar", sport })}>
                <Share2 size={13} /> {tr("Chia sẻ mạng nhện lên trang cá nhân", "Share radar to your profile")}
              </button>
            </div>
            {summary.kind === "even" && (
              <p className="m-0 mt-4 border border-sky-300/30 px-3 py-2 text-center text-xs">{tr("Các kỹ năng đang đồng đều", "Your skills are evenly balanced")} · {summary.value}</p>
            )}
            {summary.kind === "split" && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <p className="m-0 border border-emerald-300/30 px-3 py-2"><span className="block text-[10px] uppercase tracking-wide text-emerald-300">{tr("Mạnh nhất", "Strongest")}</span><b>{axisLabel(summary.strongest.id)} · {summary.strongest.value}</b></p>
                {summary.weakest && <p className="m-0 border border-orange-300/30 px-3 py-2"><span className="block text-[10px] uppercase tracking-wide text-orange-300">{tr("Cần cải thiện", "To improve")}</span><b>{axisLabel(summary.weakest.id)} · {summary.weakest.value}</b></p>}
              </div>
            )}
          </div>

          <div className="grid content-start gap-5">
            <EloStat
              tr={tr}
              label={tr(`ELO ${sportName} (SportDNA)`, `${sportName} ELO (SportDNA)`)}
              elo={core?.elo ?? null}
              tierName={core?.result.tier.name}
              sub={core ? tr(`Lần ${core.result.attempt} · mỗi môn tính riêng`, `Attempt ${core.result.attempt} · scored per sport`) : tr("Làm bài đánh giá để có ELO", "Take the assessment to get an ELO")}
            />
            {core?.result.next && (
              <p className="m-0 text-xs text-white/70">
                {tr(`Lên ${core.result.next.name}: cần ELO ≥ ${core.result.next.minElo}`, `To reach ${core.result.next.name}: ELO ≥ ${core.result.next.minElo}`)}
                {core.result.next.minAxis ? tr(` và trục yếu nhất ≥ ${core.result.next.minAxis}`, ` and weakest axis ≥ ${core.result.next.minAxis}`) : ""}
              </p>
            )}
            <div className={`grid gap-3 ${sport === "badminton" ? "sm:grid-cols-2" : ""}`}>
              {sport === "badminton" ? (
                <>
                  <EloStat tr={tr} label={tr("Bổ sung · đơn sân 2D", "Extra · singles 2D")} elo={deep?.overall ?? null} sub={tr("Từ bài Deep/Retest", "From Deep/Retest")} />
                  <EloStat tr={tr} label={tr("Bổ sung · đôi", "Extra · doubles")} elo={doubles.overall} sub={tr(`${doubles.sessions} lượt tình huống`, `${doubles.sessions} situation sessions`)} />
                </>
              ) : (
                <EloStat tr={tr} label={tr("Bổ sung · sân 2D", "Extra · 2D pitch")} elo={football.overall} sub={tr(`${football.sessions} lượt tình huống`, `${football.sessions} situation sessions`)} />
              )}
            </div>
            <button type="button" className={shareButton + " justify-self-start"} disabled={!hasElo} onClick={() => requestAchievementShare({ kind: "elo", sport })}>
              <Share2 size={13} /> {tr("Chia sẻ điểm ELO lên trang cá nhân", "Share ELO to your profile")}
            </button>

            <div>
              <p className="m-0 mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55"><Award size={13} /> {tr("Huy hiệu bài test", "Test badges")}</p>
              {tags.length ? (
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {tags.map((t) => (
                    <li key={t.key} className={`border px-3 py-2 ${t.elo ? "border-[var(--lime)]/50 bg-[var(--lime)]/10" : "border-white/20 bg-white/[0.04]"}`}>
                      <span className="flex items-center gap-1.5 text-[11px] font-extrabold">
                        {t.elo ? <Swords size={12} className="text-[var(--lime)]" /> : <Crosshair size={12} className="text-sky-300" />}
                        {t.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-white/60">{t.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 border border-dashed border-white/20 px-3 py-3 text-xs text-white/60">{tr("Chưa có huy hiệu nào cho môn này.", "No badges for this sport yet.")}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/sportdna/kiem-tra/${slug}`} className="inline-flex h-11 items-center gap-2 bg-[var(--lime)] px-5 text-[11px] font-extrabold uppercase tracking-wide text-[#071a33] hover:brightness-95">
                {core ? tr("Làm lại bài", "Retake") : tr("Làm bài đánh giá", "Take the assessment")} <ArrowRight size={14} />
              </Link>
              {core && (
                <Link href={`/sportdna/ket-qua/${slug}`} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-[11px] font-extrabold uppercase tracking-wide text-white hover:border-white">
                  <History size={14} /> {tr("Lịch sử", "History")}
                </Link>
              )}
              <Link href={`/tim-kiem?mon=${sport}`} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-[11px] font-extrabold uppercase tracking-wide text-white hover:border-white">
                <ShoppingBag size={14} /> {tr("Thiết bị hợp với bạn", "Gear that fits you")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <details className="group border-t border-white/10 bg-[var(--paper)] text-[var(--ink)]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[11px] font-extrabold uppercase tracking-[0.14em] md:px-7">
          {tr("Nhu cầu thiết bị (dùng để tính độ phù hợp khi mua hàng)", "Equipment needs (used for fit scores while shopping)")}
          <ChevronDown size={16} className="transition group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 md:px-7">
          <EquipmentNeeds sport={sport} />
        </div>
      </details>
    </section>
  )
}
