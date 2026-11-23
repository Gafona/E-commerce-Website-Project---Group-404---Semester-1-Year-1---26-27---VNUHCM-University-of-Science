"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { BASE, QUIZ, sequenceFor, type QuizQuestion } from "./data"
import { ScenarioCourt } from "./ScenarioCourt"

const LETTERS = ["A", "B", "C", "D"] as const
const TOTAL = QUIZ.length + 2

export function QuickQuizCard({
  question,
  index,
  value,
  onChange,
}: {
  question: QuizQuestion
  index: number
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="animate-step-in border border-dna-line bg-dna-surface p-6 md:p-10">
      <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-skill">Quiz thể chất · {question.axis}</p>
      <h1 className="m-0 mt-3 max-w-2xl text-2xl font-bold leading-snug md:text-3xl">{question.q}</h1>
      <div role="radiogroup" aria-label={`Câu ${index + 1}`} className="mt-8 grid gap-2 md:grid-cols-2">
        {question.options.map((opt, i) => {
          const sel = value === i
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => onChange(i)}
              className={`flex items-center gap-4 border p-4 text-left transition ${sel ? "border-skill bg-skill text-white" : "border-dna-line bg-dna-paper hover:-translate-y-0.5 hover:border-dna-ink"}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center font-head text-lg font-black ${sel ? "bg-white text-skill" : "bg-court text-white"}`}>{LETTERS[i]}</span>
              <span className="text-sm font-semibold">{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function QuickFlow() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null))

  if (step >= QUIZ.length)
    return (
      <ScenarioCourt
        mode="quick"
        quiz={Object.fromEntries(QUIZ.flatMap((q, i) => (answers[i] === null ? [] : [[q.id, answers[i]]])))}
        rounds={sequenceFor("quick")}
        modeLabel="Quick · Scenario"
        offset={QUIZ.length}
        total={TOTAL}
        resultHref={`${BASE}/result/quick`}
      />
    )

  const q = QUIZ[step]
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="font-head text-2xl font-black">
          {String(step + 1).padStart(2, "0")}
          <span className="text-dna-muted">/{TOTAL}</span>
        </span>
        <div className="flex h-1.5 flex-1 gap-1">
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={`h-full flex-1 transition-colors duration-500 ${i < step ? "bg-skill" : i === step ? "bg-skill/40" : i >= QUIZ.length ? "bg-dna-line/60" : "bg-dna-line"}`} />
          ))}
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-dna-muted">Quick · Quiz</span>
      </div>
      <QuickQuizCard key={step} question={q} index={step} value={answers[step]} onChange={(v) => setAnswers((a) => a.map((x, i) => (i === step ? v : x)))} />
      <div className="mt-4 flex items-center justify-between">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="flex h-12 items-center gap-2 px-2 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink disabled:opacity-30">
          <ArrowLeft size={14} /> Câu trước
        </button>
        <button type="button" disabled={answers[step] === null} onClick={() => setStep(step + 1)} className="flex h-12 items-center gap-2 bg-skill px-8 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-court disabled:cursor-not-allowed disabled:bg-dna-line disabled:text-dna-muted">
          {step === QUIZ.length - 1 ? "Sang phần tình huống" : "Câu tiếp"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
