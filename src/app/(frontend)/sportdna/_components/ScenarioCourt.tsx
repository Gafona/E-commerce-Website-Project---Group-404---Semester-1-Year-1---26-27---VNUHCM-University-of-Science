"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { ArrowRight, Check, ChevronDown, Eye, Info, RotateCcw, X as CloseIcon } from "lucide-react"
import {
  ACTION_LABEL,
  PLAYER_SERVICE_POSITION,
  SERVE_Y,
  TARGET_ZONES,
  ZONE_LABEL,
  isServe,
  scoreAssessment,
  serveXRange,
  type Action,
  type Mode,
  type QuizAnswers,
  type Round,
  type RoundAnswer,
  type Template,
  type ZoneKey,
} from "./data"
import { saveDiagnosticResult } from "@/lib/sportdna"
import { saveAssessmentAction } from "../actions"
import { storePendingAssessment } from "../../components/dna-pending"
import { SAVE_STATUS_KEY } from "./MySkill"
import { Placeholder, Tip } from "./ui"

// Singles court 5.18 m × 13.4 m drawn at 1 unit = 1 cm (exact proportions).
const M = 26
const W = 518
const H = 1340
const X = (x: number) => M + x * W
const Y = (y: number) => M + y * H
// Short service line sits 4.72 m from the opponent baseline.
const SHORT_LINE_TOP = 0.352
const SHORT_LINE_BOTTOM = 1 - SHORT_LINE_TOP
const MIN_MOVEMENT = 0.02

type ServeSlot = keyof typeof SERVE_Y
type Target =
  | { kind: "zone"; zone: ZoneKey; x: number; y: number }
  | { kind: "serve"; x: number; y: number; valid: boolean; reason?: "cross" | "range" }
type Ctx = "still" | "toward" | "away" | "lateral"

function contextOf(t: Template, cx: number, cy: number): Ctx {
  const [mx, my] = t.opponent.movement
  if (Math.hypot(mx, my) < MIN_MOVEMENT) return "still"
  const vx = cx - t.opponent.x
  const vy = cy - t.opponent.y
  const cos = (mx * vx + my * vy) / (Math.hypot(mx, my) * Math.hypot(vx, vy) || 1)
  const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
  return deg < 30 ? "toward" : deg > 150 ? "away" : "lateral"
}
const CTX_COPY: Record<Ctx, string> = {
  still: "Đối thủ gần như đứng yên khi bạn đánh.",
  toward: "Đối thủ đang di chuyển VỀ PHÍA vùng bạn chọn.",
  away: "Đối thủ đang di chuyển RA XA vùng bạn chọn.",
  lateral: "Đối thủ di chuyển chéo/ngang so với vùng bạn chọn.",
}
const TOAST_CROSS = "Giao cầu phải chéo ô. Điểm không được tính."
const TOAST_RANGE = "Ngoài vùng gợi ý của SportDNA. Điểm sẽ không được tính."

const zoneCenter = (z: ZoneKey) => {
  const r = TARGET_ZONES[z]
  return { x: (r.x[0] + r.x[1]) / 2, y: (r.y[0] + r.y[1]) / 2 }
}

function DefenseVerdict({ defense, action }: { defense: NonNullable<Template["defense"]>; action: Action }) {
  const best = ACTION_LABEL[defense.canonical].vi
  if (action === defense.canonical)
    return <p className="m-0 mt-2 text-sm text-skill">Động tác hợp lý nhất cho pha phòng thủ này.</p>
  return (
    <p className="m-0 mt-2 text-sm">
      {action === defense.trap.action ? <><b>Cú bẫy:</b> {defense.trap.reason}</> : "Chưa phải động tác tốt nhất cho pha này."}{" "}
      <span className="text-dna-muted">Nên chọn: {best}.</span>
    </p>
  )
}

export function ScenarioCourt({
  mode,
  quiz = {},
  rounds,
  modeLabel,
  offset = 0,
  total,
  resultHref,
}: {
  mode: Mode
  quiz?: QuizAnswers
  rounds: Round[]
  modeLabel: string
  offset?: number
  total?: number
  resultHref: string
}) {
  const router = useRouter()
  const [log, setLog] = useState<Record<number, RoundAnswer>>({})
  const [saving, setSaving] = useState(false)
  const count = total ?? rounds.length
  const [idx, setIdx] = useState(0)
  const [action, setAction] = useState<Action | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [hover, setHover] = useState<ZoneKey | null>(null)
  const [review, setReview] = useState(false)

  const round = rounds[idx]
  const tp = round.template
  const serving = isServe(action)
  const serveSlot = serving ? (action as ServeSlot) : null
  const crossX = serveXRange(PLAYER_SERVICE_POSITION)
  const done = idx === rounds.length - 1 && confirmed
  const canConfirm = !!action && !!target && !(target.kind === "serve" && !target.valid)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  function confirm() {
    setConfirmed(true)
    // Chỉ lượt chọn ô điểm rơi mới được ghi để chấm; giao cầu (B05) chưa có dữ liệu chấm.
    if (action && target?.kind === "zone")
      setLog((l) => ({ ...l, [idx]: { code: tp.code, variant: round.variant, action, zone: target.zone } }))
  }

  // Chấm tạm tại máy (khách vẫn có % thiết bị), rồi lưu lên server nếu đã đăng nhập.
  async function finish() {
    if (saving) return
    setSaving(true)
    const input = { mode, quiz, rounds: Object.values(log) }
    if (Object.keys(quiz).length || input.rounds.length) {
      saveDiagnosticResult(scoreAssessment(input))
      let status = "error"
      try {
        const res = await saveAssessmentAction(input)
        status = res.ok ? "saved" : res.reason
        // Guests keep Quick answers until they sign in (ELO modes require login up front).
        if (!res.ok && res.reason === "signed_out" && mode === "quick") storePendingAssessment(input)
        if (res.ok && res.result?.answeredAt) saveDiagnosticResult(res.result)
      } catch {
        status = "error"
      }
      sessionStorage.setItem(SAVE_STATUS_KEY, status)
    } else sessionStorage.removeItem(SAVE_STATUS_KEY)
    router.push(resultHref)
  }

  function reset(next: number) {
    setIdx(next)
    setAction(null)
    setTarget(null)
    setConfirmed(false)
    setToast(null)
  }

  function validateServe(x: number, y: number, a: Action) {
    const range = SERVE_Y[a as ServeSlot]
    if (x < crossX[0] || x > crossX[1]) {
      setTarget({ kind: "serve", x, y, valid: false, reason: "cross" })
      setToast(TOAST_CROSS)
    } else if (y < range[0] || y > range[1]) {
      setTarget({ kind: "serve", x, y, valid: false, reason: "range" })
      setToast(TOAST_RANGE)
    } else {
      setTarget({ kind: "serve", x, y, valid: true })
      setToast(null)
    }
  }

  function pickAction(a: Action) {
    if (confirmed) return
    setAction(a)
    if (target && (target.kind === "serve") !== isServe(a)) setTarget(null)
    else if (target?.kind === "serve" && isServe(a)) validateServe(target.x, target.y, a)
  }

  function onServeClick(e: ReactMouseEvent<SVGRectElement>) {
    if (confirmed || !action) return
    const svg = e.currentTarget.ownerSVGElement!
    const p = svg.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const loc = p.matrixTransform(svg.getScreenCTM()!.inverse())
    validateServe(Math.min(1, Math.max(0, (loc.x - M) / W)), Math.min(0.5, Math.max(0, (loc.y - M) / H)), action)
  }

  function pickZone(z: ZoneKey) {
    if (confirmed || serving || !action) return
    setTarget({ kind: "zone", zone: z, ...zoneCenter(z) })
  }

  const ctx = target
    ? target.kind === "zone"
      ? contextOf(tp, target.x, target.y)
      : serveSlot
        ? contextOf(tp, (crossX[0] + crossX[1]) / 2, (SERVE_Y[serveSlot][0] + SERVE_Y[serveSlot][1]) / 2)
        : null
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-10">
      {/* CourtCanvas — 60% */}
      <div className="relative bg-court p-3 md:p-5">
        <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
          <span>Đối thủ</span>
          <span>Sân đơn · 5,18 × 13,4 m</span>
        </div>
        <svg
          viewBox={`0 0 ${W + 2 * M} ${H + 2 * M}`}
          className="mx-auto block h-auto w-full max-w-[400px] select-none lg:max-h-[80vh] lg:w-auto"
          role="group"
          aria-label={`Sân cầu lông — ${tp.name}`}
        >
          <defs>
            <marker id="dna-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#ff6b6b" />
            </marker>
          </defs>
          <rect x={M} y={M} width={W} height={H} fill="#1e6b4f" />
          <rect x={M} y={Y(0.5)} width={W} height={H / 2} fill="black" fillOpacity={0.08} />

          {/* ServeTargetOverlay — cross-court half only */}
          {serving && (
            <g pointerEvents="none">
              <rect x={X(crossX[0])} y={Y(0)} width={W / 2} height={SHORT_LINE_TOP * H} fill="var(--color-serve)" fillOpacity={0.24} stroke="#5eead4" strokeWidth={4} strokeDasharray="14 8" />
              {serveSlot && (
                <rect x={X(crossX[0])} y={Y(SERVE_Y[serveSlot][0])} width={W / 2} height={(SERVE_Y[serveSlot][1] - SERVE_Y[serveSlot][0]) * H} fill="var(--color-serve)" fillOpacity={0.6} />
              )}
              <rect x={X(crossX[0]) + 12} y={Y(0) + 14} width={214} height={36} fill="#042f2e" fillOpacity={0.85} />
              <text x={X(crossX[0]) + 24} y={Y(0) + 38} fontSize={19} fontWeight={800} fill="#99f6e4">Vùng gợi ý (SportDNA)</text>
            </g>
          )}

          {/* TargetZone ×9 */}
          {!serving &&
            (Object.keys(TARGET_ZONES) as ZoneKey[]).map((z) => {
              const r = TARGET_ZONES[z]
              const sel = target?.kind === "zone" && target.zone === z
              const on = !!action && (sel || hover === z)
              const enabled = !!action && !confirmed
              return (
                <g
                  key={z}
                  role="button"
                  tabIndex={enabled ? 0 : -1}
                  aria-label={`Vùng ${ZONE_LABEL[z]}`}
                  aria-pressed={sel}
                  aria-disabled={!enabled}
                  onClick={() => pickZone(z)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      pickZone(z)
                    }
                  }}
                  onMouseEnter={() => setHover(z)}
                  onMouseLeave={() => setHover(null)}
                  className={enabled ? "cursor-pointer outline-none" : "outline-none"}
                >
                  <rect
                    x={X(r.x[0]) + 3}
                    y={Y(r.y[0])}
                    width={(r.x[1] - r.x[0]) * W - 6}
                    height={(r.y[1] - r.y[0]) * H}
                    fill={sel ? "#fde047" : "#ffffff"}
                    fillOpacity={sel ? 0.55 : on ? 0.22 : action ? 0.08 : 0.03}
                    stroke={sel ? "#fde047" : "white"}
                    strokeOpacity={sel ? 1 : action ? 0.4 : 0.15}
                    strokeWidth={sel ? 5 : 2}
                    strokeDasharray={sel ? undefined : "8 6"}
                  />
                  <text x={X((r.x[0] + r.x[1]) / 2)} y={Y((r.y[0] + r.y[1]) / 2) + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill={sel ? "#0a2240" : "white"} fillOpacity={sel ? 1 : action ? 0.6 : 0.25}>
                    {ZONE_LABEL[z]}
                  </text>
                </g>
              )
            })}

          {/* Court lines */}
          <g stroke="white" strokeWidth={5} fill="none" pointerEvents="none">
            <rect x={M} y={M} width={W} height={H} />
            <line x1={M} y1={Y(SHORT_LINE_TOP)} x2={M + W} y2={Y(SHORT_LINE_TOP)} />
            <line x1={M} y1={Y(SHORT_LINE_BOTTOM)} x2={M + W} y2={Y(SHORT_LINE_BOTTOM)} />
            <line x1={X(0.5)} y1={M} x2={X(0.5)} y2={Y(SHORT_LINE_TOP)} />
            <line x1={X(0.5)} y1={Y(SHORT_LINE_BOTTOM)} x2={X(0.5)} y2={M + H} />
          </g>
          <line x1={M - 14} y1={Y(0.5)} x2={M + W + 14} y2={Y(0.5)} stroke="#e2e8f0" strokeWidth={9} pointerEvents="none" />
          <text x={M + W - 4} y={Y(0.5) - 12} textAnchor="end" fontSize={18} fontWeight={800} fill="white" fillOpacity={0.6} pointerEvents="none">LƯỚI</text>

          {serving && !confirmed && (
            <rect x={M} y={M} width={W} height={H / 2} fill="transparent" className="cursor-crosshair" onClick={onServeClick} aria-label="Chạm để chọn điểm rơi giao cầu" />
          )}

          {/* OpponentMarker + movement vector (0.5 s displacement, drawn ×3) */}
          <g pointerEvents="none">
            {Math.hypot(...tp.opponent.movement) >= MIN_MOVEMENT && (
              <line key={idx} className="animate-fade-in [animation-delay:450ms]" x1={X(tp.opponent.x)} y1={Y(tp.opponent.y)} x2={X(tp.opponent.x + tp.opponent.movement[0] * 3)} y2={Y(tp.opponent.y + tp.opponent.movement[1] * 3)} stroke="#ff6b6b" strokeWidth={6} markerEnd="url(#dna-arrow)" />
            )}
            <circle r={24} style={{ transform: `translate(${X(tp.opponent.x)}px, ${Y(tp.opponent.y)}px)` }} className="transition-transform duration-700" fill="#ef4444" stroke="white" strokeWidth={5} />
          </g>
          <g pointerEvents="none">
            <circle r={24} style={{ transform: `translate(${X(tp.player.x)}px, ${Y(tp.player.y)}px)` }} className="transition-transform duration-700" fill="#1667e8" stroke="white" strokeWidth={5} />
          </g>
          <g pointerEvents="none" style={{ transform: `translate(${X(tp.shuttle.x)}px, ${Y(tp.shuttle.y)}px)` }} className="transition-transform duration-700">
            <path d="M-11 -18 L11 -18 L5 2 L-5 2 Z" fill="white" fillOpacity={0.92} />
            <circle cx={0} cy={7} r={7} fill="#fde047" stroke="white" strokeWidth={2} />
          </g>

          {target && (
            <g pointerEvents="none">
              <line x1={X(tp.shuttle.x)} y1={Y(tp.shuttle.y)} x2={X(target.x)} y2={Y(target.y)} stroke={target.kind === "serve" && !target.valid ? "#fca5a5" : "#fde047"} strokeWidth={4} strokeDasharray="12 9" className="animate-dash-flow" />
              {target.kind === "serve" && !target.valid ? (
                <g transform={`translate(${X(target.x)} ${Y(target.y)})`}>
                  <circle r={18} fill="#a11d1d" stroke="white" strokeWidth={3} />
                  <path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke="white" strokeWidth={4} />
                </g>
              ) : (
                <circle key={`${target.x}-${target.y}`} cx={X(target.x)} cy={Y(target.y)} r={14} className="animate-pop-in [transform-box:fill-box] origin-center" fill="#fde047" stroke="#0a2240" strokeWidth={4} />
              )}
            </g>
          )}
        </svg>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#1667e8]" /> Bạn</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#ef4444]" /> Đối thủ</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full bg-[#fde047]" /> Cầu</span>
        </div>
      </div>

      {/* Control panel — 40% */}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-4">
          <span className="font-head text-2xl font-black">
            {String(offset + idx + 1).padStart(2, "0")}
            <span className="text-dna-muted">/{count}</span>
          </span>
          <div className="h-1.5 flex-1 bg-dna-line">
            <div className="h-full bg-skill transition-[width] duration-500" style={{ width: `${((offset + idx + (confirmed ? 1 : 0)) / count) * 100}%` }} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-dna-muted">{modeLabel}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="text-[11px] text-dna-muted">BD-{tp.code}-{round.variant}</code>
          {tp.defense && (
            <span className="rounded-[3px] border border-dna-line px-1.5 py-0.5 text-[10px] font-bold uppercase text-dna-muted">
              Phòng thủ{tp.defense.mirrored ? " · đối xứng" : ""}
            </span>
          )}
          {review && (
            <span className="rounded-[3px] bg-court px-1.5 py-0.5 text-[10px] font-bold text-white">
              D {tp.defense ? tp.defense.difficulty : <Placeholder name="D" />} · {tp.phase}
            </span>
          )}
          <button type="button" onClick={() => setReview(!review)} aria-pressed={review} className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase text-dna-muted hover:text-dna-ink">
            <Eye size={12} /> {review ? "Tắt Review" : "Chế độ Review"}
          </button>
        </div>
        <h1 key={`t${idx}`} className="animate-step-in m-0 mt-2 font-head text-3xl font-black uppercase leading-none md:text-4xl">{tp.name}</h1>
        <p key={`p${idx}`} className="animate-step-in m-0 mt-3 text-sm leading-relaxed [animation-delay:60ms]">{tp.prompt}</p>

        <h2 className="m-0 mb-2 mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em]">1 · Chọn động tác</h2>
        <div key={`a${idx}`} className={`animate-step-in [animation-delay:120ms] grid gap-2 ${tp.actions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {tp.actions.map((a) => {
            const sel = action === a
            return (
              <button
                key={a}
                type="button"
                disabled={confirmed}
                onClick={() => pickAction(a)}
                aria-pressed={sel}
                className={`border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${sel ? (isServe(a) ? "border-serve bg-serve text-white shadow-[3px_3px_0_#0f766e]" : "border-court bg-court text-white shadow-[3px_3px_0_var(--color-skill)]") : "border-dna-line bg-dna-surface hover:-translate-y-0.5 hover:border-dna-ink"}`}
              >
                <b className="block text-sm">{ACTION_LABEL[a].vi}</b>
                <small className="text-[10px] opacity-70">{ACTION_LABEL[a].hint}</small>
              </button>
            )
          })}
        </div>

        <h2 className="m-0 mb-2 mt-6 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]">
          2 · Chọn điểm rơi
          {tp.code === "B05" && (
            <Tip tip="Giao chéo — bắt buộc (BWF 9.1.3)">
              <Info size={14} className="text-serve" aria-label="Luật giao chéo" />
            </Tip>
          )}
        </h2>
        <p className={`m-0 border px-4 py-3 text-xs leading-relaxed ${serving ? "border-serve/40 bg-serve/5" : "border-dashed border-dna-line"} ${!action ? "text-dna-muted" : ""}`}>
          {!action ? "Chọn động tác trước, sau đó chạm vào nửa sân đối thủ." : "Chạm vào nửa sân đối thủ để chọn điểm rơi."}
          {target?.kind === "zone" && <b className="mt-1 block">Đã chọn: {ZONE_LABEL[target.zone]}</b>}
          {target?.kind === "serve" && (
            <b className={`mt-1 block ${target.valid ? "text-serve" : "text-danger"}`}>
              {target.valid ? "Điểm rơi nằm trong Vùng gợi ý (SportDNA)." : target.reason === "cross" ? TOAST_CROSS : TOAST_RANGE}
            </b>
          )}
        </p>

        {/* Confirm / Feedback with ContextIndicator */}
        <div className="mt-auto pt-6">
          {!confirmed ? (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={confirm}
              className="flex h-14 w-full items-center justify-center gap-2 bg-skill text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-court disabled:cursor-not-allowed disabled:bg-dna-line disabled:text-dna-muted"
            >
              <Check size={16} /> Xác nhận
            </button>
          ) : (
            <div className="animate-pop-in border-l-4 border-skill bg-dna-surface p-4" role="status">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-dna-muted">Phản hồi</p>
              {ctx && <p className="m-0 mt-1.5 text-sm font-semibold">{CTX_COPY[ctx]}</p>}
              {tp.defense && action && <DefenseVerdict defense={tp.defense} action={action} />}
              <p className="m-0 mt-2 text-xs text-dna-muted">
                {action && ACTION_LABEL[action].vi} → {target?.kind === "zone" ? ZONE_LABEL[target.zone] : "điểm rơi giao cầu"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {done ? (
                  <button type="button" onClick={finish} disabled={saving} className="flex h-11 items-center gap-2 bg-skill px-6 text-[11px] font-extrabold uppercase tracking-wide text-white disabled:opacity-60">
                    {saving ? "Đang chấm điểm…" : "Xem kết quả"} <ArrowRight size={14} />
                  </button>
                ) : (
                  <button type="button" onClick={() => reset(idx + 1)} className="flex h-11 items-center gap-2 bg-court px-6 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-skill">
                    Câu tiếp <ArrowRight size={14} />
                  </button>
                )}
                <button type="button" onClick={() => reset(idx)} className="flex h-11 items-center gap-2 border border-dna-line px-4 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">
                  <RotateCcw size={13} /> Làm lại
                </button>
              </div>
            </div>
          )}
        </div>

        {tp.code === "B05" && (
          <details className="group mt-4 border border-dna-line bg-dna-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide">
              Lưu ý về luật giao cầu
              <ChevronDown size={14} className="transition group-open:rotate-180" />
            </summary>
            <p className="m-0 border-t border-dna-line px-4 py-3 text-xs leading-relaxed text-dna-muted">
              Vùng điểm rơi gợi ý được thiết kế cho SportDNA assessment. BWF chỉ quy định cầu phải qua vạch giao ngắn 1.98m và rơi trong ô giao chéo — không quy định dải cụ thể cho short/long/flick. Đây là targetZone của hệ thống đánh giá, không phải luật thi đấu.
            </p>
          </details>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-dna-muted">
          <button type="button" onClick={finish} disabled={saving} className="font-bold text-dna-ink underline underline-offset-4">Kết thúc và xem kết quả</button>
          {idx > 0 && (
            <button type="button" onClick={() => reset(idx - 1)} className="font-bold text-dna-ink underline underline-offset-4">Câu trước</button>
          )}
        </div>
      </div>

      {toast && (
        <div role="alert" className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-center gap-3 bg-danger px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Đóng" className="opacity-70 hover:opacity-100"><CloseIcon size={14} /></button>
        </div>
      )}
    </div>
  )
}
