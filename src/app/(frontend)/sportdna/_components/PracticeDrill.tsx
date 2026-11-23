"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Check, RotateCcw, X } from "lucide-react"
import { PRACTICE_GROUPS, practiceFor, type PracticeQuestion, type PracticeSport } from "@/lib/sportdna-practice"
import { recordRun } from "../../components/dna-runs"
import { SaveLoginPrompt } from "./LoginGate"

const SPORT_LABEL: Record<PracticeSport, string> = { badminton_singles: "Cầu lông đơn", badminton_doubles: "Cầu lông đôi" }

type Item = { q: PracticeQuestion; order: number[] }
function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const makeItems = (sport: PracticeSport): Item[] => shuffle(practiceFor(sport)).map((q) => ({ q, order: shuffle([0, 1, 2, 3]) }))

// Luyện tập: hiện đáp án tốt nhất, bẫy và lý do. Không chấm điểm, không cộng ELO.
export function PracticeDrill({ sport, backHref }: { sport: PracticeSport; backHref: string }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [trapped, setTrapped] = useState(0)
  const [done, setDone] = useState(false)
  const [picks, setPicks] = useState<{ id: string; option: number }[]>([])

  function start() {
    setItems(makeItems(sport))
    setIdx(0); setPicked(null); setCorrect(0); setTrapped(0); setDone(false); setPicks([])
  }
  // Xáo câu sau khi mount để tránh lệch dữ liệu giữa server và client.
  useEffect(start, [sport]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <p className="m-0 py-10 text-sm text-dna-muted">Đang tải câu luyện tập…</p>

  if (done) {
    return (
      <div className="max-w-xl">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">Luyện tập · {SPORT_LABEL[sport]}</p>
        <p className="m-0 mt-3 font-head text-7xl font-black">{correct}<span className="text-3xl text-dna-muted">/{items.length}</span></p>
        <p className="m-0 mt-1 text-sm text-dna-muted">câu chọn đúng đáp án tốt nhất · {trapped} lần rơi vào bẫy.</p>
        <p className="m-0 mt-4 text-xs text-dna-muted">Luyện tập không tính ELO, kết quả được cộng vào mạng nhện cá nhân.</p>
        <SaveLoginPrompt returnTo="/tai-khoan#the-thao" />
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={start} className="flex h-11 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill"><RotateCcw size={13} /> Làm lại</button>
          <Link href={backHref} className="flex h-11 items-center border border-dna-line px-5 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">Đóng</Link>
        </div>
      </div>
    )
  }

  const { q, order } = items[idx]
  const last = idx === items.length - 1
  const answered = picked !== null

  function pick(opt: number) {
    if (answered) return
    setPicked(opt)
    setPicks((l) => [...l, { id: q.id, option: opt }])
    if (opt === 0) setCorrect((c) => c + 1)
    if (opt === q.trap.option) setTrapped((t) => t + 1)
  }
  function next() {
    if (last) {
      recordRun(sport === "badminton_singles" ? "practice_singles" : "practice_doubles", { picks })
      return setDone(true)
    }
    setIdx(idx + 1); setPicked(null)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <span className="font-head text-2xl font-black">{String(idx + 1).padStart(2, "0")}<span className="text-dna-muted">/{items.length}</span></span>
        <div className="h-1.5 flex-1 bg-dna-line"><div className="h-full bg-skill transition-[width] duration-500" style={{ width: `${((idx + (answered ? 1 : 0)) / items.length) * 100}%` }} /></div>
        <Link href={backHref} className="text-[10px] font-extrabold uppercase tracking-wide text-dna-muted hover:text-dna-ink">Đóng</Link>
      </div>
      <p className="m-0 mt-4 text-[11px] font-bold uppercase tracking-wide text-dna-muted">
        <span className="font-mono">{q.id}</span> · {PRACTICE_GROUPS[q.group]} · Luyện tập, không cộng ELO
      </p>
      <h1 className="m-0 mt-2 font-head text-3xl font-black uppercase leading-none md:text-4xl">{q.title}</h1>
      <p className="m-0 mt-3 text-sm leading-relaxed">{q.prompt}</p>

      <div className="mt-6 grid gap-2">
        {order.map((opt) => {
          const best = answered && opt === 0
          const wrongPick = answered && opt === picked && opt !== 0
          return (
            <button key={opt} type="button" disabled={answered} onClick={() => pick(opt)} aria-pressed={picked === opt}
              className={`flex min-h-[48px] items-center justify-between gap-3 border px-4 py-3 text-left text-sm font-bold transition disabled:cursor-default ${
                best ? "border-skill bg-skill/10" : wrongPick ? "border-danger bg-danger/10" : answered ? "border-dna-line bg-dna-surface opacity-50" : "border-dna-line bg-dna-surface hover:-translate-y-0.5 hover:border-dna-ink"
              }`}>
              {q.options[opt]}
              {best && <Check size={16} className="shrink-0 text-skill" />}
              {wrongPick && <X size={16} className="shrink-0 text-danger" />}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="mt-5 border-l-4 border-skill bg-dna-surface p-4" role="status">
          <p className="m-0 font-bold">{picked === 0 ? "Chính xác." : picked === q.trap.option ? "Bạn rơi vào đáp án dễ nhầm." : "Chưa phải lựa chọn tốt nhất."}</p>
          <p className="m-0 mt-2 text-sm"><b>Đáp án tốt nhất:</b> {q.options[0]}</p>
          <p className="m-0 mt-2 text-sm"><b>Bẫy ({q.options[q.trap.option]}):</b> {q.trap.why}</p>
          <button type="button" onClick={next} className="mt-4 flex h-11 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill">
            {last ? "Xem tổng kết" : "Câu tiếp"} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
