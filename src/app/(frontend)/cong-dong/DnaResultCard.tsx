"use client"

import Link from "next/link"
import { Swords, Radar, ArrowRight } from "lucide-react"
import type { DnaShareCard } from "@/lib/sportdna-share"
import { axisText, strengthSummary } from "@/lib/sportdna-axes"
import { DnaRadar } from "../components/DnaRadar"
import { useShop } from "../components/ShopProvider"

/**
 * SportDNA result snapshot attached to a community post: sport, ELO, tier and
 * the 8 standard axes (cards shared before the axes changed are mapped onto
 * them; axes without data read "Chưa đủ dữ liệu").
 */
export function DnaResultCard({
  achievement: card,
  preview = false,
}: {
  achievement: DnaShareCard
  preview?: boolean
}) {
  const { tr } = useShop()
  const sport = card.sport === "badminton" ? tr("Cầu lông", "Badminton") : tr("Bóng đá", "Football")
  const label = (id: string) => {
    const text = axisText(card.sport, id)
    return tr(text.vi, text.en)
  }
  const summary = strengthSummary(card.axes)
  const isElo = card.kind === "elo"
  const Icon = isElo ? Swords : Radar

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl bg-[#071a33] text-white">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full bg-[#1677ff]/25 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-sky-300 uppercase">
          <Icon size={14} />
          {isElo ? tr("Điểm ELO", "ELO rating") : tr("Kết quả SportDNA", "SportDNA result")} · {sport}
        </span>
        <span className="text-[9px] font-bold tracking-widest text-white/40 uppercase">BOAI SportDNA</span>
      </div>

      {isElo ? (
        <div className={`relative grid gap-px bg-white/10 ${card.stats.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {card.stats.map((stat) => (
            <div key={stat.label} className="bg-[#071a33] px-5 py-5">
              <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-white/55 uppercase">{stat.label}</p>
              <p className="m-0 mt-2 font-[family-name:var(--display)] text-5xl leading-none font-black tabular-nums">{stat.value ?? "—"}</p>
              <p className="m-0 mt-2 text-xs font-bold text-[#7dd3fc]">{stat.tier ? tr(stat.tier) : tr("Chưa có ELO", "No ELO yet")}</p>
              {stat.sub && <p className="m-0 mt-0.5 text-[10px] text-white/45">{stat.sub}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative grid items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="text-white">
            <DnaRadar
              emptyLabel={tr("Chưa đủ dữ liệu", "Not enough data")}
              title={tr(`Mạng nhện ${sport}`, `${sport} radar`)}
              axes={card.axes.map((axis) => ({ label: label(axis.id), value: axis.value }))}
              color="#7dd3fc"
              size={preview ? 240 : 300}
            />
          </div>
          <div className="grid gap-2 px-2 pb-2 text-xs">
            {card.stats
              .filter((s) => s.value !== null)
              .map((s) => (
                <p key={s.label} className="m-0 border border-white/15 px-3 py-2">
                  <span className="block text-[10px] text-white/60">{s.label}</span>
                  <b className="font-[family-name:var(--display)] text-2xl tabular-nums">{s.value}</b>
                  {s.tier && <span className="ml-2 text-[11px] font-bold text-[#7dd3fc]">{tr(s.tier)}</span>}
                </p>
              ))}
            {summary.kind === "even" ? (
              <p className="m-0 border border-sky-300/30 px-3 py-2">{tr("Các kỹ năng đang đồng đều", "Your skills are evenly balanced")}</p>
            ) : summary.kind === "split" ? (
              <>
                <p className="m-0 border border-emerald-300/30 px-3 py-2">
                  <span className="block text-[9px] tracking-wide text-emerald-300 uppercase">{tr("Mạnh nhất", "Strongest")}</span>
                  <b>
                    {label(summary.strongest.id)} · {summary.strongest.value}
                  </b>
                </p>
                {summary.weakest && (
                  <p className="m-0 border border-orange-300/30 px-3 py-2">
                    <span className="block text-[9px] tracking-wide text-orange-300 uppercase">{tr("Cần cải thiện", "To improve")}</span>
                    <b>
                      {label(summary.weakest.id)} · {summary.weakest.value}
                    </b>
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {!preview && (
        <Link
          href={card.sport === "badminton" ? "/sportdna/kiem-tra/cau-long" : "/sportdna/kiem-tra/bong-da"}
          className="relative flex items-center justify-between border-t border-white/10 px-4 py-3 text-[11px] font-bold text-white/80 hover:bg-white/5 hover:text-white"
        >
          {tr("Làm bài test SportDNA của bạn", "Take your own SportDNA test")}
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
