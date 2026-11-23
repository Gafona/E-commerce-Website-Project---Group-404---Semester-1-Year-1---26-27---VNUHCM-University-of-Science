"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, LogIn } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { useSportDnaContext } from "../../components/MatchBadge"
import { forgetGuestWork, isGuestWork, markGuestWork } from "@/lib/browser-state"
import { loadDiagnosticProfiles, mergeDiagnosticProfiles, saveDiagnosticProfiles, type DiagnosticProfiles } from "@/lib/sportdna"
import { optionOrder, scoreCore, type CoreAnswers, type CoreContext, type CoreResult } from "@/lib/sportdna-core"
import {
  bankFor,
  GROUP_LABEL,
  POSITION_LABEL,
  STYLE_LABEL,
  SURFACE_LABEL,
  type BadmintonStyle,
  type CoreSport,
  type FootballPosition,
  type FootballSurface,
} from "@/lib/sportdna-core-bank"
import { saveCoreAssessmentAction } from "../core-actions"
import { CoreResultView, SPORT_NAME, SPORT_SLUG } from "./CoreResultView"
import { DnaSharePanel } from "./DnaSharePanel"

const PENDING_KEY = "boai-dna-core-pending"
type Pending = { sport: CoreSport; answers: CoreAnswers; context: CoreContext }

export function CoreAssessment({ sport }: { sport: CoreSport }) {
  const { tr, lang } = useShop()
  const L = (b: { vi: string; en: string }) => (lang === "en" ? b.en : b.vi)
  const { profiles, authenticated } = useSportDnaContext()
  const bank = useMemo(() => bankFor(sport), [sport])
  const [step, setStep] = useState<"intro" | "quiz" | "review" | "result">("intro")
  const [context, setContext] = useState<CoreContext>({})
  const [answers, setAnswers] = useState<CoreAnswers>({})
  const [queue, setQueue] = useState<string[]>(() => bank.map((q) => q.id))
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<CoreResult | null>(null)
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "guest" | "error">("idle")
  const [saveError, setSaveError] = useState("")
  const seed = useRef(Math.floor(Math.random() * 1e9))
  const previous = profiles[sport]?.core
  const prevRef = previous ? { elo: previous.elo, attempt: previous.result.attempt } : null

  const persist = async (payload: Pending) => {
    setSave("saving")
    const res = await saveCoreAssessmentAction(payload).catch(() => null)
    if (!res) {
      setSave("error")
      setSaveError(tr("Mất kết nối, chưa lưu được.", "Connection lost; not saved."))
      return
    }
    if (!res.ok) {
      if (res.signedOut) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(payload))
        markGuestWork(`core:${payload.sport}`)
        setSave("guest")
      } else {
        setSave("error")
        setSaveError(res.error)
      }
      return
    }
    localStorage.removeItem(PENDING_KEY)
    forgetGuestWork(`core:${payload.sport}`)
    // The server result (with the authoritative previous ELO) replaces the local preview.
    setResult(res.saved.result)
    saveDiagnosticProfiles(mergeDiagnosticProfiles(loadDiagnosticProfiles(), { [sport]: { core: res.saved } } as DiagnosticProfiles))
    setSave("saved")
  }

  // A guest who finished, then signed in, gets the pending attempt saved now.
  useEffect(() => {
    if (authenticated !== true) return
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as Pending | null
      // Only an attempt finished while signed out in this tab belongs to this account.
      if (pending?.sport === sport && !isGuestWork(`core:${sport}`)) localStorage.removeItem(PENDING_KEY)
      else if (pending?.sport === sport && step === "intro") {
        const preview = scoreCore(sport, pending.answers, pending.context, prevRef)
        if (preview) {
          setResult(preview)
          setStep("result")
          void persist(pending)
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  const contextReady = sport === "football" ? !!context.position && !!context.surface : !!context.style
  const current = bank.find((q) => q.id === queue[index])
  const finish = (all: CoreAnswers, skipReview = false) => {
    const scored = scoreCore(sport, all, context, prevRef)
    if (!scored) return
    if (!scored.consistency.ok && !skipReview) {
      setResult(scored)
      setStep("review")
      return
    }
    setResult(scored)
    setStep("result")
    if (authenticated) void persist({ sport, answers: all, context })
    else {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ sport, answers: all, context }))
      markGuestWork(`core:${sport}`)
      // Guests still get equipment fit from this browser's copy until they sign in.
      saveDiagnosticProfiles(mergeDiagnosticProfiles(loadDiagnosticProfiles(), { [sport]: { core: { sport, at: scored.at, elo: scored.elo, result: scored } } } as DiagnosticProfiles))
      setSave("guest")
    }
  }
  const choose = (option: number) => {
    if (!current) return
    const next = { ...answers, [current.id]: option }
    setAnswers(next)
    if (index + 1 < queue.length) setIndex(index + 1)
    else finish(next)
  }
  const restart = () => {
    setAnswers({})
    setQueue(bank.map((q) => q.id))
    setIndex(0)
    setResult(null)
    setSave("idle")
    seed.current = Math.floor(Math.random() * 1e9)
    setStep("intro")
  }

  const chip = (active: boolean) =>
    `border px-3 py-2 text-xs font-bold transition ${active ? "border-skill bg-skill text-white" : "border-dna-line bg-dna-paper hover:border-skill"}`

  if (step === "intro")
    return (
      <section className="mx-auto max-w-2xl border border-dna-line bg-dna-surface p-6 md:p-8">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">SportDNA · {L(SPORT_NAME[sport])}</p>
        <h1 className="m-0 mt-2 font-head text-4xl font-black uppercase italic leading-none">{tr("Đánh giá trình độ", "Skill assessment")}</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed text-dna-muted">
          {tr(
            `${bank.length} tình huống thật trên sân, chia đều 3 nhóm: kỹ thuật, chiến thuật, thể lực & tâm lý. Chọn cách bạn thường xử lý nhất. Kết quả gồm điểm ELO ${L(SPORT_NAME[sport]).toLowerCase()}, bậc trình độ và 8 trục kỹ năng.`,
            `${bank.length} real match situations in 3 equal groups: technique, tactics, physical & mental. Pick what you'd usually do. You get a ${L(SPORT_NAME[sport]).toLowerCase()} ELO, a skill tier and 8 skill axes.`,
          )}
        </p>
        {sport === "football" ? (
          <>
            <p className="m-0 mt-5 text-xs font-bold">{tr("Vị trí chính của bạn", "Your main position")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(POSITION_LABEL) as FootballPosition[]).map((p) => (
                <button key={p} type="button" className={chip(context.position === p)} aria-pressed={context.position === p} onClick={() => setContext({ ...context, position: p })}>{L(POSITION_LABEL[p])}</button>
              ))}
            </div>
            <p className="m-0 mt-4 text-xs font-bold">{tr("Mặt sân bạn đá nhiều nhất", "Surface you play on most")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(SURFACE_LABEL) as FootballSurface[]).map((s) => (
                <button key={s} type="button" className={chip(context.surface === s)} aria-pressed={context.surface === s} onClick={() => setContext({ ...context, surface: s })}>{L(SURFACE_LABEL[s])}</button>
              ))}
            </div>
            <p className="m-0 mt-2 text-[11px] text-dna-muted">{tr("Mặt sân dùng để loại giày sai loại đinh khỏi gợi ý.", "The surface is used to exclude boots with the wrong studs.")}</p>
          </>
        ) : (
          <>
            <p className="m-0 mt-5 text-xs font-bold">{tr("Lối chơi của bạn", "Your playing style")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(STYLE_LABEL) as BadmintonStyle[]).map((s) => (
                <button key={s} type="button" className={chip(context.style === s)} aria-pressed={context.style === s} onClick={() => setContext({ ...context, style: s })}>{L(STYLE_LABEL[s])}</button>
              ))}
            </div>
          </>
        )}
        {previous && (
          <p className="m-0 mt-5 border-l-2 border-skill pl-3 text-xs text-dna-muted">
            {tr(`Kết quả gần nhất: ELO ${previous.elo} (${previous.result.tier.name}). Lần làm mới được lưu thêm vào lịch sử, không ghi đè.`, `Latest result: ELO ${previous.elo} (${tr(previous.result.tier.name)}). A new attempt is added to your history, never overwritten.`)}
          </p>
        )}
        <button type="button" disabled={!contextReady} onClick={() => setStep("quiz")} className="mt-6 flex h-12 items-center gap-2 bg-skill px-6 text-[11px] font-extrabold uppercase tracking-wide text-white disabled:opacity-40">
          {tr("Bắt đầu", "Start")} <ArrowRight size={15} />
        </button>
      </section>
    )

  if (step === "quiz" && current) {
    const order = optionOrder(current.id, seed.current)
    const partial = queue.length < bank.length
    return (
      <section className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between text-[11px] font-bold text-dna-muted">
          <span>{partial ? tr("Làm lại câu mâu thuẫn", "Re-answering contradictions") : L(GROUP_LABEL[current.group])} · {index + 1}/{queue.length}</span>
          <span>{L(SPORT_NAME[sport])}</span>
        </div>
        <div className="h-1.5 bg-dna-line" aria-hidden><div className="h-full bg-skill transition-all" style={{ width: `${(index / queue.length) * 100}%` }} /></div>
        <article className="mt-4 border border-dna-line bg-dna-surface p-6">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-extrabold uppercase tracking-wide">
            <span className="bg-dna-paper px-2 py-1">{L(GROUP_LABEL[current.group])}</span>
            {current.position && <span className="bg-dna-paper px-2 py-1">{L(POSITION_LABEL[current.position])}</span>}
            {current.surface && <span className="bg-dna-paper px-2 py-1">{L(SURFACE_LABEL[current.surface])}</span>}
            {current.style && <span className="bg-dna-paper px-2 py-1">{tr("Lối chơi", "Style")}: {L(STYLE_LABEL[current.style])}</span>}
          </div>
          <h2 className="m-0 mt-4 text-xl font-black leading-snug">{L(current.prompt)}</h2>
          <div className="mt-5 grid gap-2" role="radiogroup" aria-label={L(current.prompt)}>
            {order.map((optionIndex) => {
              const option = current.options[optionIndex]
              const picked = answers[current.id] === optionIndex
              return (
                <button
                  key={optionIndex}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => choose(optionIndex)}
                  className={`flex items-center justify-between gap-3 border px-4 py-3 text-left text-sm transition ${picked ? "border-skill bg-skill/10" : "border-dna-line bg-dna-paper hover:border-skill"}`}
                >
                  <span>{L(option)}</span>
                  {picked && <Check size={16} className="shrink-0 text-skill" />}
                </button>
              )
            })}
          </div>
        </article>
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="mt-3 flex items-center gap-1 text-xs font-bold text-dna-muted disabled:opacity-30">
          <ArrowLeft size={14} /> {tr("Câu trước", "Previous")}
        </button>
      </section>
    )
  }

  if (step === "review" && result)
    return (
      <section className="mx-auto max-w-2xl border border-amber-500 bg-dna-surface p-6">
        <h2 className="m-0 flex items-center gap-2 text-xl font-black"><AlertTriangle className="text-amber-600" /> {tr("Câu trả lời đang mâu thuẫn", "Your answers contradict each other")}</h2>
        <p className="m-0 mt-2 text-sm text-dna-muted">
          {tr(
            `Bạn chọn phương án rất tốt ở tình huống khó nhưng phương án yếu ở tình huống dễ hơn nhiều (${result.consistency.pairs.length} cặp). Hãy làm lại ${result.consistency.flagged.length} câu dưới đây cho chính xác.`,
            `You chose excellent answers in hard situations but weak ones in much easier situations (${result.consistency.pairs.length} pairs). Re-answer the ${result.consistency.flagged.length} situations below.`,
          )}
        </p>
        <ul className="m-0 mt-3 grid gap-1 pl-5 text-xs">
          {result.consistency.flagged.map((id) => {
            const q = bank.find((x) => x.id === id)
            return q ? <li key={id}>{L(q.prompt)}</li> : null
          })}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setQueue(result.consistency.flagged)
              setIndex(0)
              setStep("quiz")
            }}
            className="flex h-11 items-center gap-2 bg-skill px-5 text-[11px] font-extrabold uppercase text-white"
          >
            {tr("Làm lại các câu này", "Re-answer these")}
          </button>
          <button type="button" onClick={() => finish(answers, true)} className="flex h-11 items-center border border-dna-ink px-5 text-[11px] font-extrabold uppercase">
            {tr("Vẫn xem kết quả", "Show result anyway")}
          </button>
        </div>
      </section>
    )

  if (step === "result" && result)
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs" role="status">
          {save === "saving" && <span className="text-dna-muted">{tr("Đang lưu vào hồ sơ…", "Saving to your profile…")}</span>}
          {save === "saved" && <span className="font-bold text-emerald-700"><Check size={14} className="mr-1 inline" />{tr("Đã lưu vào hồ sơ và lịch sử.", "Saved to your profile and history.")}</span>}
          {save === "error" && <span className="font-bold text-red-600">{saveError}</span>}
          {save === "guest" && (
            <Link href={`/dang-nhap?next=${encodeURIComponent(`/sportdna/kiem-tra/${SPORT_SLUG[sport]}`)}`} className="inline-flex items-center gap-1 font-bold text-skill">
              <LogIn size={14} /> {tr("Đăng nhập để lưu kết quả này (đã giữ tạm trên trình duyệt)", "Sign in to save this result (kept in this browser for now)")}
            </Link>
          )}
          <Link href={`/sportdna/ket-qua/${SPORT_SLUG[sport]}`} className="ml-auto font-bold text-skill">{tr("Lịch sử kết quả", "Result history")}</Link>
        </div>
        <CoreResultView result={result} onRetake={restart} />
        {(save === "saved" || save === "guest") && (
          <DnaSharePanel sport={sport} signedIn={save === "saved"} returnTo={`/sportdna/ket-qua/${SPORT_SLUG[sport]}`} />
        )}
      </div>
    )
  return null
}
