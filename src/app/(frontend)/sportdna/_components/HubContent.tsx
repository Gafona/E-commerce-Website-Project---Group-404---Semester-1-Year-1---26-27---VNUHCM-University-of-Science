"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, CircleDot, Compass, Gauge, History, Users } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { useSportDnaContext } from "../../components/MatchBadge"
import { bankFor, type CoreSport } from "@/lib/sportdna-core-bank"
import { SPORT_SLUG } from "./CoreResultView"
import { axisList } from "@/lib/sportdna-axes"

const SPORTS: { sport: CoreSport; id: string; vi: string; en: string; blurbVi: string; blurbEn: string; axesVi: string; axesEn: string }[] = [
  {
    sport: "badminton",
    id: "cau-long",
    vi: "Cầu lông",
    en: "Badminton",
    blurbVi: "Tình huống theo lối chơi tấn công, phòng thủ, toàn diện.",
    blurbEn: "Situations for attacking, defensive and all-round styles.",
    axesVi: axisList("badminton", "vi"),
    axesEn: axisList("badminton", "en"),
  },
  {
    sport: "football",
    id: "bong-da",
    vi: "Bóng đá",
    en: "Football",
    blurbVi: "Tình huống theo vị trí (tiền đạo, tiền vệ, hậu vệ, thủ môn) và mặt sân AG, FG, IC.",
    blurbEn: "Situations by position (forward, midfielder, defender, goalkeeper) and AG, FG, IC surfaces.",
    axesVi: axisList("football", "vi"),
    axesEn: axisList("football", "en"),
  },
]

export function HubContent() {
  const { tr, lang } = useShop()
  const { profiles } = useSportDnaContext()
  return (
    <>
      <section className="relative overflow-hidden bg-court px-6 py-12 text-white md:px-12 md:py-16">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.2em] text-sky-300">SportDNA · {tr("Cầu lông · Bóng đá", "Badminton · Football")}</p>
        <h1 className="m-0 mt-3 max-w-3xl font-head text-5xl font-black uppercase italic leading-[0.88] md:text-7xl">
          {tr("Đo lối chơi bằng tình huống, không bằng cảm tính.", "Measure your game with real situations, not guesswork.")}
        </h1>
        <p className="mb-0 mt-5 max-w-xl text-sm leading-relaxed text-white/70">
          {tr(
            "Hồ sơ thể thao gồm 2 phần riêng biệt: Kỹ năng (ELO và 8 trục cho từng môn) và Độ phù hợp thiết bị. Mỗi môn có điểm riêng, không cộng chung.",
            "Your sports profile has 2 separate parts: Skill (ELO and 8 axes per sport) and Equipment fit. Each sport is scored on its own, never combined.",
          )}
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {SPORTS.map((s) => {
          const core = profiles[s.sport]?.core
          return (
            <article key={s.sport} id={s.id} className="flex scroll-mt-28 flex-col border border-dna-line bg-dna-surface p-6">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">{tr("Đánh giá chính", "Main assessment")}</p>
              <h2 className="m-0 mt-1 font-head text-5xl font-black uppercase italic leading-none">{lang === "en" ? s.en : s.vi}</h2>
              <p className="m-0 mt-3 text-sm">
                {tr(`${bankFor(s.sport).length} tình huống · 3 nhóm: kỹ thuật, chiến thuật, thể lực & tâm lý`, `${bankFor(s.sport).length} situations · 3 groups: technique, tactics, physical & mental`)}
              </p>
              <p className="m-0 mt-1 text-xs text-dna-muted">{lang === "en" ? s.blurbEn : s.blurbVi}</p>
              <p className="m-0 mt-3 text-[11px] text-dna-muted">{tr("8 trục:", "8 axes:")} {lang === "en" ? s.axesEn : s.axesVi}</p>
              {core && (
                <p className="m-0 mt-4 border-l-2 border-skill pl-3 text-sm">
                  ELO <b className="tabular-nums">{core.elo}</b> · {tr(core.result.tier.name)}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                <Link href={`/sportdna/kiem-tra/${SPORT_SLUG[s.sport]}`} className="group flex h-11 items-center gap-2 bg-skill px-5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                  {core ? tr("Làm lại bài", "Retake") : tr("Bắt đầu đánh giá", "Start assessment")} <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </Link>
                <Link href={`/sportdna/ket-qua/${SPORT_SLUG[s.sport]}`} className="flex h-11 items-center gap-2 border border-dna-ink px-5 text-[11px] font-extrabold uppercase tracking-wide">
                  <History size={14} /> {tr("Kết quả & lịch sử", "Results & history")}
                </Link>
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-dna-ink pb-3">
          <h2 className="m-0 font-head text-3xl font-black uppercase italic">{tr("Bài tập bổ sung", "Extra practice")}</h2>
          <p className="m-0 max-w-md text-xs text-dna-muted">
            {tr("Không thay thế bài đánh giá chính; dùng để luyện và cập nhật mạng nhện.", "These don't replace the main assessment; use them to practise and refine your radar.")}
            {lang === "en" && " Available in Vietnamese only."}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/sportdna/assessment/deep", Icon: Gauge, vi: "Cầu lông đơn · sân 2D", en: "Badminton singles · 2D court" },
            { href: "/sportdna/bank/cau-long-doi", Icon: Users, vi: "Cầu lông đôi · tình huống", en: "Badminton doubles · situations" },
            { href: "/sportdna/bank/luyen-tap-don", Icon: BookOpen, vi: "Luyện tập cầu lông", en: "Badminton practice" },
            { href: "/sportdna/bank/bong-da", Icon: CircleDot, vi: "Bóng đá · sân 2D", en: "Football · 2D pitch" },
            { href: "/sportdna/bank/vi-tri-bong-da", Icon: Compass, vi: "Gợi ý vị trí bóng đá", en: "Football position finder" },
          ].map(({ href, Icon, vi, en }) => (
            <Link key={href} href={href} className="flex items-center gap-3 border border-dna-line bg-dna-surface p-4 text-sm font-bold transition hover:border-court">
              <Icon size={18} className="shrink-0 text-skill" /> {lang === "en" ? en : vi}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <Link href="/tai-khoan#the-thao" className="group flex items-center justify-between border border-dna-line bg-dna-surface p-6 transition hover:border-court">
          <span>
            <b className="block text-lg">{tr("Hồ sơ thể thao", "Sports profile")}</b>
            <span className="text-xs text-dna-muted">{tr("ELO và mạng nhện 8 trục từng môn, nhu cầu thiết bị.", "Per-sport ELO and 8-axis radar, equipment needs.")}</span>
          </span>
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </Link>
        <Link href="/tim-kiem" className="group flex items-center justify-between border border-dna-line bg-dna-surface p-6 transition hover:border-court">
          <span>
            <b className="block text-lg">{tr("Độ phù hợp thiết bị", "Equipment fit")}</b>
            <span className="text-xs text-dna-muted">{tr("Vợt, giày và bóng được chấm theo hồ sơ kỹ năng của bạn.", "Rackets, boots and balls scored against your skill profile.")}</span>
          </span>
          <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </Link>
      </section>
    </>
  )
}
