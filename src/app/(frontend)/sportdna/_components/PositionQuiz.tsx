"use client"

import Link from "next/link"
import { useState } from "react"
import { POSITION_LABEL, POSITION_QUESTIONS, suggestRole } from "@/lib/sportdna-bank"
import { recordRun } from "../../components/dna-runs"
import { SaveLoginPrompt } from "./LoginGate"

export function PositionQuiz({ backHref }: { backHref: string }) {
  const [answers, setAnswers] = useState<number[]>([])
  const [shown, setShown] = useState(false)
  const complete = POSITION_QUESTIONS.every((_, i) => answers[i] !== undefined)

  if (shown && complete) {
    const r = suggestRole(answers)
    const top = r.ranking.slice(0, 3)
    const max = top[0]?.[1] || 1
    return (
      <div className="max-w-xl">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">Gợi ý vị trí bóng đá</p>
        <p className="m-0 mt-3 font-head text-5xl font-black uppercase">{r.label}</p>
        <ul className="m-0 mt-6 grid list-none gap-3 p-0">
          {top.map(([pos, score], i) => (
            <li key={pos}>
              <div className="flex justify-between text-sm"><b>{i + 1}. {POSITION_LABEL[pos]}</b><span className="font-mono text-dna-muted">{score}</span></div>
              <div className="mt-1 h-1.5 bg-dna-line"><div className="h-full bg-skill" style={{ width: `${(score / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-4 text-xs text-dna-muted">Đây chỉ là gợi ý dựa trên sở thích và thể chất bạn tự đánh giá, không cộng ELO.</p>
        <SaveLoginPrompt returnTo="/tai-khoan#the-thao" />
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => { setAnswers([]); setShown(false) }} className="h-11 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill">Làm lại</button>
          <Link href={backHref} className="flex h-11 items-center border border-dna-line px-5 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">Đóng</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">Gợi ý vị trí bóng đá · không cộng ELO</p>
      <div className="mt-5 grid gap-6">
        {POSITION_QUESTIONS.map((q, qi) => (
          <fieldset key={q.id} className="m-0 border-0 p-0">
            <legend className="mb-2 text-sm font-bold">{qi + 1}. {q.text}</legend>
            <div className="grid gap-2">
              {q.options.map((o, oi) => {
                const sel = answers[qi] === oi
                return (
                  <button key={oi} type="button" aria-pressed={sel} onClick={() => setAnswers((a) => { const n = a.slice(); n[qi] = oi; return n })}
                    className={`min-h-[44px] border px-3 py-2 text-left text-sm transition ${sel ? "border-court bg-court text-white" : "border-dna-line bg-dna-surface hover:border-dna-ink"}`}>
                    {o.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" disabled={!complete} onClick={() => { recordRun("position", { position: answers }); setShown(true) }}
        className="mt-6 flex h-14 w-full items-center justify-center bg-skill text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-court disabled:cursor-not-allowed disabled:bg-dna-line disabled:text-dna-muted">
        Xem gợi ý
      </button>
    </div>
  )
}
