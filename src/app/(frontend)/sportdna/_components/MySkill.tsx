"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Check, Info } from "lucide-react"
import type { SkillResult } from "@/lib/sportdna"
import { useSportDnaContext } from "../../components/MatchBadge"
import { BASE, MODES, RATINGS, SKILL_TIERS, skillTierOf, type Mode, type RadarAxis } from "./data"
import { SkillRatingCard } from "./SkillRatingCard"
import { SaveLoginPrompt } from "./LoginGate"
import { AxisEyebrow, Card, InsufficientMark, PageTitle, SkillTierBadge } from "./ui"
import { DnaRadar } from "../../components/DnaRadar"
import { LEGACY_SINGLES_AXES, axisText, toStandardAxes } from "@/lib/sportdna-axes"

export const SAVE_STATUS_KEY = "sportdna:last-save"

const QUIZ_AXES = new Set(["power", "speed", "endurance", "balance"])
const QUIZ_RATINGS = [
  { key: "power", label: "Sức mạnh" },
  { key: "speed", label: "Tốc độ" },
  { key: "endurance", label: "Bền bỉ" },
  { key: "balance", label: "Cân bằng" },
] as const
const RATING_VI: Record<string, string> = {
  tactical_rating: "Chiến thuật tổng hợp (S)",
  shot_selection_rating: "Chọn động tác (A)",
  target_selection_rating: "Chọn điểm rơi (T)",
  defensive_reading_rating: "Đọc phòng thủ",
}

/** Kết quả cầu lông mới nhất của người dùng (Deep/Retest hoặc Quick). */
export function useMySkill() {
  const { profiles, ready } = useSportDnaContext()
  const quick = profiles.badminton?.quick ?? null
  const deep = profiles.badminton?.deep ?? null
  // ELO chỉ tính từ Deep/Retest; Quick chỉ cập nhật mạng nhện.
  const latest = deep
  return { quick, deep, latest, ready }
}

/** The extra singles test shown on the standard SportDNA axes (ELO 500–1500 → 0–100). */
function StandardRadar({ result }: { result: SkillResult }) {
  const axes = toStandardAxes(
    "badminton",
    result.radar.map((a) => ({ id: a.id, value: a.rawElo === null ? null : Math.max(0, Math.min(100, (a.rawElo - 500) / 10)) })),
    (axis) => (axis.id ? LEGACY_SINGLES_AXES[axis.id] ?? null : null),
  )
  return (
    <DnaRadar
      title="Mạng nhện cầu lông"
      emptyLabel="Chưa đủ dữ liệu"
      axes={axes.map((axis) => ({ label: axisText("badminton", axis.id).vi, value: axis.value }))}
      size={420}
    />
  )
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN")

function NoResult({ title = "Chưa có kết quả đánh giá" }: { title?: string }) {
  return (
    <div className="flex min-h-56 flex-col justify-between bg-court p-6 text-white md:p-7">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">Overall ELO</p>
      <div>
        <p className="m-0 font-head text-3xl font-black uppercase leading-none">{title}</p>
        <p className="m-0 mt-2 text-sm text-white/65">Làm bài Deep hoặc Retest để có ELO cầu lông đơn. Bài Quick chỉ cập nhật mạng nhện.</p>
      </div>
      <Link href={`${BASE}/assessment/deep`} className="mt-4 inline-flex w-fit items-center gap-2 bg-skill px-5 py-3 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-sky-500">
        Làm bài Deep <ArrowRight size={14} />
      </Link>
    </div>
  )
}

function CardSkeleton() {
  return <div className="min-h-56 animate-pulse bg-court/80" aria-busy="true" aria-label="Đang tải kết quả" />
}

export function MySkillCard() {
  const { latest, ready } = useMySkill()
  if (!ready) return <CardSkeleton />
  if (!latest) return <NoResult />
  return <SkillRatingCard elo={latest.overall} provisional={latest.tier?.provisional ?? latest.mode === "quick"} />
}

export function HubSkillStat() {
  const { latest, ready } = useMySkill()
  if (!ready) return <p className="m-0 mt-2 h-8 w-16 animate-pulse bg-dna-line" />
  if (!latest) return <p className="m-0 mt-2 text-sm font-bold text-dna-muted">Chưa đánh giá</p>
  return (
    <>
      <p className="m-0 mt-2 text-2xl font-black text-skill">{latest.overall}</p>
      <SkillTierBadge elo={latest.overall} />
    </>
  )
}

export function LastAssessed() {
  const { latest, ready } = useMySkill()
  if (!ready) return null
  return <>{latest ? `Đánh giá lần cuối: ${fmtDate(latest.answeredAt)}` : "Chưa có bài đánh giá"}</>
}

function RatingList({ result }: { result: SkillResult }) {
  const rows = [
    ...QUIZ_RATINGS.map((r) => ({ key: r.key, label: r.label, from: "Quiz" })),
    ...RATINGS.map((r) => ({ key: r.key, label: RATING_VI[r.key] ?? r.label, from: "Tình huống" })),
  ]
  return (
    <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-x-6">
      {rows.map((r) => {
        const v = result.skillRatings[r.key]
        return (
          <li key={r.key} className="flex items-center justify-between gap-3 border-b border-dna-line pb-2 text-sm">
            <span className={`font-semibold ${v === undefined ? "text-zinc-400" : ""}`}>
              {r.label} <small className="font-normal text-dna-muted">· {r.from}</small>
            </span>
            {v === undefined ? <InsufficientMark /> : <b className="text-skill">{v}</b>}
          </li>
        )
      })}
    </ul>
  )
}

function ProvisionalNote({ result }: { result: SkillResult }) {
  const unscored = (result.totalRounds ?? 0) - (result.scoredRounds ?? 0)
  return (
    <p className="m-0 flex items-start gap-2 text-xs leading-relaxed text-dna-muted">
      <Info size={14} className="mt-0.5 shrink-0" />
      <span>
        Điểm đang được chấm theo công thức tạm trong lúc hoàn thiện bộ câu hỏi mới.
        {result.totalRounds ? ` ${result.scoredRounds ?? 0}/${result.totalRounds} tình huống được tính điểm` : ""}
        {unscored > 0 ? "; các tình huống còn lại đã được ghi nhận và sẽ được chấm khi có dữ liệu." : "."}
      </span>
    </p>
  )
}

const SAVE_COPY: Record<string, { text: string; ok: boolean }> = {
  saved: { text: "Đã lưu vào tài khoản của bạn.", ok: true },
  signed_out: { text: "Bạn chưa đăng nhập nên kết quả chưa được lưu vào tài khoản.", ok: false },
  invalid: { text: "Không lưu được lên tài khoản vì bài làm chưa hợp lệ.", ok: false },
  error: { text: "Chưa lưu được lên tài khoản. Kết quả vẫn được giữ trên trình duyệt này.", ok: false },
}

export function AssessmentResultView({ mode }: { mode: Mode }) {
  const { quick, deep, ready } = useMySkill()
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  useEffect(() => setSaveStatus(sessionStorage.getItem(SAVE_STATUS_KEY)), [])
  const result = mode === "quick" ? quick : deep
  // Guests on Quick get the sign-in prompt instead of a duplicate status line.
  const save = saveStatus && !(saveStatus === "signed_out" && mode === "quick") ? SAVE_COPY[saveStatus] : null

  return (
    <>
      <PageTitle eyebrow={`Kết quả · ${MODES[mode].label} · ${MODES[mode].count}`} title="Kết quả đánh giá">
        <Link href={`${BASE}/assessment/${mode}`} className="text-[11px] font-extrabold uppercase underline underline-offset-4">Làm lại</Link>
      </PageTitle>
      {!ready ? (
        <CardSkeleton />
      ) : !result ? (
        <div className="max-w-xl"><NoResult title={`Chưa có kết quả ${MODES[mode].label}`} /></div>
      ) : (
        <>
          {save && (
            <p role="status" className={`animate-rise-in m-0 mb-4 flex items-center gap-2 border px-4 py-3 text-sm ${save.ok ? "border-skill/30 bg-skill/5" : "border-dna-line bg-dna-surface"}`}>
              {save.ok ? <Check size={15} className="text-skill" /> : <Info size={15} className="text-dna-muted" />} {save.text}
            </p>
          )}
          {mode === "quick" && <div className="-mt-2 mb-4"><SaveLoginPrompt /></div>}
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <div className="grid content-start gap-4">
              {mode === "quick" ? (
                <div className="bg-court p-6 text-white md:p-7">
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sky-300">Quick · không tính ELO</p>
                  <p className="m-0 mt-3 font-head text-3xl font-black uppercase leading-none">Đã cập nhật mạng nhện cá nhân</p>
                  <p className="m-0 mt-2 text-sm text-white/65">Muốn có ELO cầu lông đơn, hãy làm bài Deep hoặc Retest.</p>
                  <Link href={`${BASE}/assessment/deep`} className="mt-4 inline-flex items-center gap-2 bg-skill px-5 py-3 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-sky-500">Làm bài Deep <ArrowRight size={14} /></Link>
                </div>
              ) : (
                <SkillRatingCard elo={result.overall} provisional={result.tier?.provisional ?? false} />
              )}
              <Card>
                <AxisEyebrow axis="skill">Bài làm</AxisEyebrow>
                <p className="m-0 mt-3 text-sm">
                  {MODES[(result.assessmentMode as Mode | undefined) ?? (result.mode as Mode)].label} · {fmtDate(result.answeredAt)}
                </p>
                <div className="mt-3"><ProvisionalNote result={result} /></div>
              </Card>
            </div>
            <div className="grid content-start gap-4">
              <Card>
                <AxisEyebrow axis="skill">Radar 8 trục</AxisEyebrow>
                <div className="mt-2"><StandardRadar result={result} /></div>
                <p className="m-0 text-[11px] text-dna-muted">Bộ 8 trục chuẩn SportDNA; trục bài này chưa đo được ghi “Chưa đủ dữ liệu”.</p>
              </Card>
              {mode !== "quick" && (
                <Card>
                  <AxisEyebrow axis="skill">Rating theo kỹ năng</AxisEyebrow>
                  <RatingList result={result} />
                </Card>
              )}
            </div>
          </div>
        </>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/tai-khoan#the-thao" className="flex h-12 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill">Xem hồ sơ thể thao <ArrowRight size={14} /></Link>
      </div>
    </>
  )
}

export function SkillDetailView() {
  const { latest, ready } = useMySkill()
  const current = latest ? skillTierOf(latest.overall) : null
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
      <div className="grid content-start gap-4">
        <MySkillCard />
        <Card>
          <AxisEyebrow axis="skill">10 bậc kỹ năng</AxisEyebrow>
          <ol className="m-0 mt-4 grid list-none gap-1 p-0">
            {SKILL_TIERS.map((t) => {
              const on = current?.id === t.id
              return (
                <li key={t.id} className={`flex items-center justify-between px-3 py-2 text-xs ${on ? "bg-skill font-bold text-white" : "text-dna-muted"}`}>
                  <span>{t.label}</span>
                  <span className="font-mono">{t.max ? `${t.min}–${t.max}` : `${t.min}+`}</span>
                </li>
              )
            })}
          </ol>
        </Card>
      </div>
      <div className="grid content-start gap-4">
        {ready && latest ? (
          <>
            <Card>
              <AxisEyebrow axis="skill">Radar 8 trục</AxisEyebrow>
              <div className="mt-2"><StandardRadar result={latest} /></div>
            </Card>
            <Card>
              <AxisEyebrow axis="skill">Nguồn dữ liệu từng trục</AxisEyebrow>
              <RatingList result={latest} />
              <div className="mt-4"><ProvisionalNote result={latest} /></div>
            </Card>
          </>
        ) : (
          <Card>
            <AxisEyebrow axis="skill">Radar 8 trục</AxisEyebrow>
            <p className="m-0 mt-3 text-sm text-dna-muted">{ready ? "Radar sẽ xuất hiện sau bài đánh giá đầu tiên." : "Đang tải…"}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
