"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { PHYSICAL_QUIZ, type Sport } from "@/lib/sportdna-bank"
import { recordRun } from "../../components/dna-runs"
import { BankCourt } from "./BankCourt"
import { SaveLoginPrompt } from "./LoginGate"

const QUICK_TEST = { badminton_doubles: "doubles_quick", football: "football_quick" } as const
const LEVEL = ["Cơ bản", "Khá", "Tốt", "Rất tốt"]
const SPORT_LABEL: Record<Sport, string> = { badminton_doubles: "Cầu lông đôi", football: "Bóng đá" }

// Quick theo môn: 6 câu thể chất (không cộng ELO) rồi 2 tình huống 2D có chấm điểm.
export function PhysicalQuick({ sport, backHref }: { sport: Sport; backHref: string }) {
  const questions = PHYSICAL_QUIZ[sport]
  const [answers, setAnswers] = useState<number[]>([])
  const [phase, setPhase] = useState<"quiz" | "court">("quiz")
  const [round, setRound] = useState(0)
  const complete = questions.every((_, i) => answers[i] !== undefined)

  function toCourt() {
    setPhase("court")
  }

  function restart() {
    setAnswers([])
    setPhase("quiz")
    setRound((r) => r + 1)
  }

  if (phase === "court") {
    const summary = (
      <div className="mt-6 border border-dna-line bg-dna-surface p-4">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">Thể chất tự đánh giá · không cộng ELO</p>
        <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
          {questions.map((q, i) => (
            <li key={q.id} className="text-sm">
              <div className="flex justify-between"><b>{q.axis}</b><span className="text-dna-muted">{LEVEL[answers[i]]}</span></div>
              <div className="mt-1 h-1.5 bg-dna-line"><div className="h-full bg-skill" style={{ width: `${((answers[i] + 1) / 4) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
        <SaveLoginPrompt returnTo="/tai-khoan#the-thao" />
      </div>
    )
    return <BankCourt key={round} sport={sport} backHref={backHref} count={2} summary={summary} onRestart={restart} scoreElo={false}
      onFinish={(rounds) => recordRun(QUICK_TEST[sport], { physical: answers, rounds })} />
  }

  return (
    <div className="max-w-2xl">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">Quick · {SPORT_LABEL[sport]} · Bước 1/2: thể chất</p>
      <h1 className="m-0 mt-3 font-head text-4xl font-black uppercase leading-none">6 câu thể chất, rồi 2 tình huống</h1>
      <p className="m-0 mt-3 text-sm text-dna-muted">Chọn mức đúng nhất với bạn. Bài Quick không tính ELO: kết quả chỉ cập nhật mạng nhện cá nhân.</p>
      <div className="mt-6 grid gap-6">
        {questions.map((q, qi) => (
          <fieldset key={q.id} className="m-0 border-0 p-0">
            <legend className="mb-2 text-sm font-bold">
              <span className="mr-2 text-[10px] font-extrabold uppercase tracking-wide text-skill">{q.axis}</span>
              {qi + 1}. {q.q}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const sel = answers[qi] === oi
                return (
                  <button key={oi} type="button" aria-pressed={sel} onClick={() => setAnswers((a) => { const n = a.slice(); n[qi] = oi; return n })}
                    className={`min-h-[44px] border px-3 py-2 text-left text-sm transition ${sel ? "border-court bg-court text-white" : "border-dna-line bg-dna-surface hover:border-dna-ink"}`}>
                    <b className="mr-1.5">{"ABCD"[oi]}.</b>{o}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button type="button" disabled={!complete} onClick={toCourt}
          className="flex h-14 flex-1 items-center justify-center gap-2 bg-skill text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-court disabled:cursor-not-allowed disabled:bg-dna-line disabled:text-dna-muted">
          Sang 2 tình huống <ArrowRight size={14} />
        </button>
        <Link href={backHref} className="flex h-14 items-center border border-dna-line px-5 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">Đóng</Link>
      </div>
    </div>
  )
}
