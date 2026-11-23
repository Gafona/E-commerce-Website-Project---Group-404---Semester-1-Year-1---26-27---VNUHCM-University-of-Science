"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { ArrowRight, Check, RotateCcw } from "lucide-react"
import {
  pickSession,
  scoreScenario,
  updateRating,
  type Action,
  type Actor,
  type Scenario,
  type Sport,
  type Target,
} from "@/lib/sportdna-bank"
import { scenarioElo, SCENARIO_K, type RoundAnswer } from "@/lib/sportdna-runs"
import { useSportDnaContext } from "../../components/MatchBadge"
import { recordRun } from "../../components/dna-runs"

const TEST_OF: Record<Sport, "doubles_scenario" | "football_scenario"> = {
  badminton_doubles: "doubles_scenario",
  football: "football_scenario",
}

const SKILL_LABEL: Record<string, string> = {
  doubles_attack: "Tấn công đánh đôi",
  doubles_defense: "Phòng thủ đánh đôi",
  rotation: "Xoay vòng, nhường cầu",
  serve_receive: "Giao và nhận giao",
  net_play: "Xử lý lưới",
  defensive_reading: "Đọc tình huống phòng ngự",
  positioning: "Chọn vị trí",
  transition: "Chuyển trạng thái",
  passing_choice: "Chọn đường chuyền",
  finishing: "Dứt điểm",
  set_piece: "Bóng chết",
}
const SPORT_LABEL: Record<Sport, string> = { badminton_doubles: "Cầu lông đôi", football: "Bóng đá" }

function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// Xáo thứ tự hành động và vùng để đáp án đúng không luôn nằm đầu danh sách.
type Item = { sc: Scenario; actions: Action[]; targets: Target[] }
const makeItems = (sport: Sport, n: number): Item[] =>
  pickSession(sport, n).map((sc) => ({ sc, actions: shuffle(sc.actions), targets: shuffle(sc.targets) }))

type Result = { sc: Scenario; s: number; hardFail: boolean; trapped: boolean }

const TEAM_FILL: Record<Actor["team"], string> = { me: "#1667e8", partner: "#22c55e", opp: "#ef4444", ball: "#fde047" }

function Lines({ sport }: { sport: Sport }) {
  if (sport === "badminton_doubles") {
    // Sân 6,1 × 13,4 m → 100 × 220. Lưới y=110, vạch giao ngắn cách lưới 1,98 m, vạch giao dài đôi cách biên 0,76 m, biên dọc đơn 0,46 m.
    return (
      <g stroke="white" strokeWidth={0.7} fill="none" pointerEvents="none">
        <rect x={0.35} y={0.35} width={99.3} height={219.3} />
        <line x1={7.5} y1={0} x2={7.5} y2={220} />
        <line x1={92.5} y1={0} x2={92.5} y2={220} />
        <line x1={0} y1={77.5} x2={100} y2={77.5} />
        <line x1={0} y1={142.5} x2={100} y2={142.5} />
        <line x1={50} y1={0} x2={50} y2={77.5} />
        <line x1={50} y1={142.5} x2={50} y2={220} />
        <line x1={0} y1={12.5} x2={100} y2={12.5} />
        <line x1={0} y1={207.5} x2={100} y2={207.5} />
        <line x1={-2} y1={110} x2={102} y2={110} strokeWidth={1.6} stroke="#e2e8f0" />
      </g>
    )
  }
  return (
    <g stroke="white" strokeWidth={0.5} fill="none" pointerEvents="none">
      <rect x={0.25} y={0.25} width={99.5} height={153.5} />
      <line x1={0} y1={77} x2={100} y2={77} />
      <circle cx={50} cy={77} r={13.4} />
      <rect x={20.4} y={0} width={59.2} height={24.2} />
      <rect x={36.5} y={0} width={27} height={8.1} />
      <rect x={20.4} y={129.8} width={59.2} height={24.2} />
      <rect x={36.5} y={145.9} width={27} height={8.1} />
      <rect x={44.6} y={0} width={10.8} height={2} strokeWidth={0.9} />
      <rect x={44.6} y={152} width={10.8} height={2} strokeWidth={0.9} />
    </g>
  )
}

function Court({
  sport, sc, targets, showTargets, chosen, best, onPick,
}: {
  sport: Sport; sc: Scenario; targets: Target[]; showTargets: boolean
  chosen?: string; best?: string; onPick: (id: string) => void
}) {
  const H = sport === "badminton_doubles" ? 220 : 154
  const fs = sport === "badminton_doubles" ? 3.4 : 3
  const ball = sc.actors.find((a) => a.team === "ball")
  const chosenT = targets.find((t) => t.id === chosen)
  return (
    <svg viewBox={`0 0 100 ${H}`} className="mx-auto block h-auto w-full max-w-[420px] select-none lg:max-h-[78vh] lg:w-auto" role="group" aria-label={`Sân ${SPORT_LABEL[sport]} — ${sc.title}`}>
      <rect x={0} y={0} width={100} height={H} fill="#1e6b4f" />
      {sport === "badminton_doubles" && <rect x={0} y={110} width={100} height={110} fill="black" fillOpacity={0.08} />}
      <Lines sport={sport} />

      {ball && chosenT && (
        <line x1={ball.x * 100} y1={ball.y * H} x2={chosenT.x * 100} y2={chosenT.y * H} stroke="#fde047" strokeWidth={0.7} strokeDasharray="2.5 2" pointerEvents="none" />
      )}

      {sc.actors.map((a, i) => {
        const cx = a.x * 100
        const cy = a.y * H
        const r = a.team === "ball" ? 1.7 : a.team === "me" ? 3.6 : 3.1
        const anchor = a.x > 0.75 ? "end" : a.x < 0.25 ? "start" : "middle"
        return (
          <g key={i} pointerEvents="none">
            <circle cx={cx} cy={cy} r={r} fill={TEAM_FILL[a.team]} stroke={a.team === "me" ? "#fde047" : "white"} strokeWidth={a.team === "me" ? 1.1 : 0.6} />
            <text x={cx} y={cy + r + fs + 0.4} textAnchor={anchor} fontSize={fs} fontWeight={700} fill="white" stroke="#0b3b2b" strokeWidth={0.7} paintOrder="stroke">
              {a.label}
            </text>
          </g>
        )
      })}

      {showTargets &&
        targets.map((t, i) => {
          const sel = chosen === t.id
          return (
            <g
              key={t.id}
              role="button"
              tabIndex={0}
              aria-label={`Vùng ${i + 1}: ${t.label}`}
              aria-pressed={sel}
              className="cursor-pointer outline-none"
              onClick={() => onPick(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onPick(t.id)
                }
              }}
            >
              <circle cx={t.x * 100} cy={t.y * H} r={6} fill="transparent" />
              <circle cx={t.x * 100} cy={t.y * H} r={3.2} fill={sel ? "#fde047" : "white"} fillOpacity={sel ? 0.95 : 0.25} stroke={sel ? "#fde047" : "white"} strokeWidth={0.6} strokeDasharray={sel ? undefined : "1.6 1.2"} />
              <text x={t.x * 100} y={t.y * H + 1.2} textAnchor="middle" fontSize={3.4} fontWeight={800} fill={sel ? "#0a2240" : "white"} pointerEvents="none">{i + 1}</text>
            </g>
          )
        })}

      {!showTargets && best && targets.find((t) => t.id === best) && (
        <circle cx={targets.find((t) => t.id === best)!.x * 100} cy={targets.find((t) => t.id === best)!.y * H} r={4.2} fill="none" stroke="#4ade80" strokeWidth={0.9} pointerEvents="none" />
      )}
      {!showTargets && chosenT && (
        <circle cx={chosenT.x * 100} cy={chosenT.y * H} r={2.4} fill="#fde047" stroke="#0a2240" strokeWidth={0.7} pointerEvents="none" />
      )}
    </svg>
  )
}

// scoreElo = false (Quick): không tính ELO, chỉ trả bài làm qua onFinish để ghép vào mạng nhện.
export function BankCourt({ sport, backHref, count = 6, summary, onRestart, onFinish, scoreElo = true }: { sport: Sport; backHref: string; count?: number; summary?: ReactNode; onRestart?: () => void; onFinish?: (rounds: RoundAnswer[]) => void; scoreElo?: boolean }) {
  const { runs } = useSportDnaContext()
  const [answers, setAnswers] = useState<RoundAnswer[]>([])
  const [items, setItems] = useState<Item[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [actionId, setActionId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [startRatings, setStartRatings] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)

  function start() {
    const base = scoreElo ? scenarioElo(runs, TEST_OF[sport]).ratings : {}
    setItems(makeItems(sport, count))
    setAnswers([])
    setRatings(base)
    setStartRatings(base)
    setIdx(0); setActionId(null); setTargetId(null); setConfirmed(false); setResults([]); setDone(false)
  }
  // Chọn câu ngẫu nhiên sau khi mount để tránh lệch dữ liệu giữa server và client.
  useEffect(start, [sport]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <p className="m-0 py-10 text-sm text-dna-muted">Đang tải bộ câu hỏi…</p>

  if (done) {
    const avg = results.length ? results.reduce((t, r) => t + r.s, 0) / results.length : 0
    const skills = Array.from(new Set(results.map((r) => r.sc.skill)))
    return (
      <div className="max-w-2xl">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">{SPORT_LABEL[sport]} · Tổng kết</p>
        <p className="m-0 mt-3 font-head text-7xl font-black">{Math.round(avg * 100)}<span className="text-3xl text-dna-muted">%</span></p>
        <p className="m-0 mt-1 text-sm text-dna-muted">Điểm trung bình trên {results.length} tình huống.</p>
        <ul className="m-0 mt-6 grid list-none gap-2 p-0">
          {!scoreElo && results.map((r) => (
            <li key={r.sc.id} className="flex items-center justify-between border border-dna-line bg-dna-surface px-4 py-3 text-sm">
              <span className="font-bold">{r.sc.title}</span>
              <span className="font-mono">{Math.round(r.s * 100)}%</span>
            </li>
          ))}
          {scoreElo && skills.map((k) => {
            const d = (ratings[k] ?? 1000) - (startRatings[k] ?? 1000)
            return (
              <li key={k} className="flex items-center justify-between border border-dna-line bg-dna-surface px-4 py-3 text-sm">
                <span className="font-bold">{SKILL_LABEL[k] ?? k}</span>
                <span className="font-mono">{ratings[k] ?? 1000} <small className={d >= 0 ? "text-skill" : "text-danger"}>({d >= 0 ? "+" : ""}{d})</small></span>
              </li>
            )
          })}
        </ul>
        {summary}
        <p className="m-0 mt-4 text-xs text-dna-muted">
          {scoreElo
            ? "ELO tình huống bắt đầu từ 1000 và được lưu vào hồ sơ thể thao. Mọi bài làm đều được cộng vào mạng nhện cá nhân."
            : "Bài Quick không tính ELO, chỉ cập nhật mạng nhện cá nhân trên trang cá nhân."}
        </p>
        <Link href="/tai-khoan#the-thao" className="mt-2 inline-block text-xs font-bold text-skill hover:underline">Xem hồ sơ thể thao</Link>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onRestart ?? start} className="flex h-11 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill"><RotateCcw size={13} /> Chơi lại</button>
          <Link href={backHref} className="flex h-11 items-center border border-dna-line px-5 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">Đóng</Link>
        </div>
      </div>
    )
  }

  const it = items[idx]
  const sc = it.sc
  const action = it.actions.find((a) => a.id === actionId)
  const needsTarget = !!action && !action.noTarget && sc.targets.length > 0
  const canConfirm = !!action && (!needsTarget || !!targetId)
  const last = idx === items.length - 1
  const res = confirmed ? results[results.length - 1] : null

  const bestAction = sc.actions.reduce((m, a) => (a.fit > m.fit ? a : m))
  const bestTarget = !bestAction.noTarget && sc.targets.length > 0 ? sc.targets.reduce((m, t) => (t.score > m.score ? t : m)) : undefined

  function pickAction(id: string) {
    if (confirmed) return
    setActionId(id)
    const a = it.actions.find((x) => x.id === id)
    if (!a || a.noTarget || sc.targets.length === 0) setTargetId(null)
  }

  function confirm() {
    if (!action || !canConfirm) return
    const target = needsTarget ? targetId ?? undefined : undefined
    const r = scoreScenario(sc, action.id, target)
    if (scoreElo) setRatings({ ...ratings, [sc.skill]: updateRating(ratings[sc.skill] ?? 1000, r.s, sc.difficulty, SCENARIO_K) })
    setAnswers((l) => [...l, { id: sc.id, action: action.id, ...(target ? { target } : {}) }])
    setResults((l) => [...l, { sc, s: r.s, hardFail: r.hardFail, trapped: r.trapped }])
    setConfirmed(true)
  }

  function next() {
    if (last) {
      if (scoreElo) recordRun(TEST_OF[sport], { rounds: answers })
      else onFinish?.(answers)
      setDone(true)
      return
    }
    setIdx(idx + 1); setActionId(null); setTargetId(null); setConfirmed(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10">
      <div className="bg-court p-3 md:p-5">
        <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
          <span>Đối thủ</span>
          <span>{SPORT_LABEL[sport]}</span>
        </div>
        <Court sport={sport} sc={sc} targets={it.targets} showTargets={needsTarget && !confirmed} chosen={targetId ?? undefined} best={confirmed ? bestTarget?.id : undefined} onPick={(id) => !confirmed && setTargetId(id)} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#1667e8]" /> Bạn</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" /> Đồng đội</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" /> Đối thủ</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#fde047]" /> {sport === "football" ? "Bóng" : "Cầu"}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-4">
          <span className="font-head text-2xl font-black">{String(idx + 1).padStart(2, "0")}<span className="text-dna-muted">/{items.length}</span></span>
          <div className="h-1.5 flex-1 bg-dna-line"><div className="h-full bg-skill transition-[width] duration-500" style={{ width: `${((idx + (confirmed ? 1 : 0)) / items.length) * 100}%` }} /></div>
          <Link href={backHref} className="text-[10px] font-extrabold uppercase tracking-wide text-dna-muted hover:text-dna-ink">Đóng</Link>
        </div>
        <p className="m-0 mt-3 text-[11px] font-bold uppercase tracking-wide text-dna-muted">Vai trò: {sc.role}</p>
        <h1 className="m-0 mt-2 font-head text-3xl font-black uppercase leading-none md:text-4xl">{sc.title}</h1>
        <p className="m-0 mt-3 text-sm leading-relaxed">{sc.prompt}</p>

        <h2 className="m-0 mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em]">1 · Chọn hành động</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {it.actions.map((a) => {
            const sel = actionId === a.id
            return (
              <button key={a.id} type="button" disabled={confirmed} onClick={() => pickAction(a.id)} aria-pressed={sel}
                className={`min-h-[44px] border px-3 py-3 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${sel ? "border-court bg-court text-white shadow-[3px_3px_0_var(--color-skill)]" : "border-dna-line bg-dna-surface hover:-translate-y-0.5 hover:border-dna-ink"}`}>
                {a.label}
              </button>
            )
          })}
        </div>

        {needsTarget && (
          <>
            <h2 className="m-0 mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em]">2 · Chọn vùng</h2>
            <div className="grid gap-2">
              {it.targets.map((t, i) => {
                const sel = targetId === t.id
                return (
                  <button key={t.id} type="button" disabled={confirmed} onClick={() => setTargetId(t.id)} aria-pressed={sel}
                    className={`flex min-h-[44px] items-center gap-3 border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${sel ? "border-court bg-court text-white" : "border-dna-line bg-dna-surface hover:border-dna-ink"}`}>
                    <b className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${sel ? "bg-[#fde047] text-[#0a2240]" : "bg-dna-line"}`}>{i + 1}</b>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-auto pt-6">
          {!confirmed ? (
            <button type="button" disabled={!canConfirm} onClick={confirm}
              className="flex h-14 w-full items-center justify-center gap-2 bg-skill text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-court disabled:cursor-not-allowed disabled:bg-dna-line disabled:text-dna-muted">
              <Check size={16} /> Chốt
            </button>
          ) : (
            res && (
              <div className="border-l-4 border-skill bg-dna-surface p-4" role="status">
                <p className="m-0 font-head text-4xl font-black">{Math.round(res.s * 100)}%</p>
                {res.hardFail && <p className="m-0 mt-2 text-sm font-bold text-danger">Sai cơ bản</p>}
                {res.trapped && <p className="m-0 mt-2 text-sm"><b>Bạn rơi vào đáp án dễ nhầm.</b> {sc.trap.why}</p>}
                <p className="m-0 mt-3 text-sm"><b>Đáp án tốt nhất:</b> {bestAction.label}{bestTarget ? ` → ${bestTarget.label}` : ""}</p>
                <p className="m-0 mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-dna-muted">Dấu hiệu cần để ý</p>
                <ul className="m-0 mt-1 list-disc pl-5 text-sm">{sc.cue.map((c, i) => <li key={i}>{c}</li>)}</ul>
                <p className="m-0 mt-3 text-sm text-dna-muted">{sc.explain}</p>
                <button type="button" onClick={next} className="mt-4 flex h-11 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill">
                  {last ? "Xem tổng kết" : "Câu tiếp"} <ArrowRight size={14} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
