import { SKILL_TIERS, skillTierOf } from "./data"
import { SKILL_TIP, SkillTierBadge, Tip } from "./ui"

export function SkillRatingCard({ elo, provisional = false }: { elo: number; provisional?: boolean }) {
  const tier = skillTierOf(elo)
  const next = tier ? SKILL_TIERS[SKILL_TIERS.findIndex((t) => t.id === tier.id) + 1] : SKILL_TIERS[0]
  const from = tier?.min ?? 0
  const progress = next ? Math.max(0, Math.min(1, (elo - from) / (next.min - from))) : 1
  return (
    <div className="relative overflow-hidden bg-court p-6 text-white md:p-7">
      <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-skill/40 blur-3xl" aria-hidden />
      <div className="flex items-center justify-between">
        <Tip tip={SKILL_TIP}>
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">Overall ELO ⓘ</p>
        </Tip>
        {provisional && (
          <span className="rounded-[3px] bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/70">Tạm tính</span>
        )}
      </div>
      <b className="mt-3 block font-head text-8xl font-black leading-[0.85]">{elo}</b>
      <div className="mt-3"><SkillTierBadge elo={elo} size="md" /></div>
      {next && (
        <div className="mt-5">
          <div className="h-1.5 bg-white/10"><div className="h-full bg-sky-400" style={{ width: `${progress * 100}%` }} /></div>
          <p className="m-0 mt-1.5 text-[10px] text-white/55">{next.min - elo} ELO tới bậc {next.label}</p>
        </div>
      )}
    </div>
  )
}
