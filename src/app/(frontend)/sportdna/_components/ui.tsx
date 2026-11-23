import type { ReactNode } from "react"
import {
  Award,
  BadgeCheck,
  CircleAlert,
  Clock,
  Gauge,
  Hourglass,
  Medal,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import {
  MOD_LABEL,
  SOURCE_LABEL,
  skillTierOf,
  tierOf,
  type Confidence,
  type EvidenceLevel,
  type ModStatus,
  type SourceQuality,
  type TierId,
} from "./data"

export const SKILL_TIP = "Đánh giá bạn chơi cầu lông tốt đến mức nào."
export const CP_TIP = "Đánh giá bạn đóng góp tích cực đến mức nào cho cộng đồng."

/** Non-finalized value marker. Never replace with a hardcoded number. */
export function Placeholder({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border border-dashed border-current/40 bg-current/5 px-1.5 font-mono text-[0.78em] font-semibold tracking-tight ${className}`}
      title="Giá trị chưa finalize"
    >
      {`{{${name}}}`}
    </span>
  )
}

export function MockTag() {
  return (
    <span className="inline-flex items-center rounded-[3px] bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
      Dữ liệu giả lập
    </span>
  )
}

export function Tip({
  children,
  tip,
  side = "top",
}: {
  children: ReactNode
  tip: ReactNode
  side?: "top" | "bottom"
}) {
  return (
    <span className="group/tip relative inline-flex outline-none" tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-40 w-max max-w-64 -translate-x-1/2 bg-court px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug tracking-normal text-white normal-case opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 group-focus/tip:opacity-100 ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
      >
        {tip}
      </span>
    </span>
  )
}

// v1.3.4: Evidence Level is always purple; levels differ by fill intensity.
const EVIDENCE: Record<EvidenceLevel, { label: string; tip: string; cls: string }> = {
  SELF_REPORTED_LEGACY: {
    label: "Tự khai báo (cũ)",
    tip: "Hoàn thành assessment để nâng lên V1",
    cls: "border-dashed border-evidence/40 bg-transparent text-evidence/80",
  },
  V1: { label: "Đã đánh giá", tip: "Đã hoàn thành SportDNA assessment", cls: "border-evidence/40 bg-violet-50 text-evidence" },
  V2: { label: "Cộng đồng xác nhận", tip: "Được cộng đồng xác nhận", cls: "border-evidence/60 bg-violet-200 text-violet-900" },
  V3: { label: "Chính thức", tip: "Xác nhận chính thức", cls: "border-evidence bg-evidence text-white" },
}

export function EvidenceLevelBadge({ level, size = "sm" }: { level: EvidenceLevel; size?: "sm" | "md" }) {
  const e = EVIDENCE[level]
  const short = level === "SELF_REPORTED_LEGACY" ? null : level
  return (
    <Tip tip={e.tip}>
      <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${e.cls} ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}>
        <ShieldCheck size={size === "md" ? 14 : 11} strokeWidth={2.4} />
        {short && <b className="font-extrabold">{short}</b>}
        <span className={short ? "opacity-85" : ""}>{short ? `· ${e.label}` : e.label}</span>
      </span>
    </Tip>
  )
}

export function SkillTierBadge({ elo, size = "sm" }: { elo: number; size?: "sm" | "md" }) {
  const tier = skillTierOf(elo)
  return (
    <Tip tip={SKILL_TIP}>
      <span className={`inline-flex items-center gap-1 rounded-full bg-skill font-bold text-white ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}>
        <Gauge size={size === "md" ? 14 : 11} strokeWidth={2.4} />
        {tier ? tier.label : "Chưa xếp bậc"}
      </span>
    </Tip>
  )
}

export function CpTierBadge({ tier, size = "sm" }: { tier: TierId; size?: "sm" | "md" }) {
  return (
    <Tip tip={CP_TIP}>
      <span className={`inline-flex items-center gap-1 rounded-full bg-cp font-bold text-white ${size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]"}`}>
        <Award size={size === "md" ? 14 : 11} strokeWidth={2.4} />
        {tierOf(tier).label}
      </span>
    </Tip>
  )
}

export function LifetimePeakBadge({ tier, revokedAt }: { tier: TierId; revokedAt: string | null }) {
  return (
    <Tip tip={revokedAt ? "Danh dự đã bị điều chỉnh do vi phạm" : "Danh dự lịch sử, không giảm do inactivity"}>
      <span className="inline-flex items-center gap-1 rounded-[3px] border border-bronze/50 bg-bronze/10 px-2 py-0.5 text-[11px] font-bold text-bronze">
        <Medal size={12} strokeWidth={2.4} />
        {tier}
        <span className="font-normal">ⓘ</span>
        {revokedAt && <CircleAlert size={11} className="text-danger" />}
      </span>
    </Tip>
  )
}

// v1.3.4 history colors: APPROVED green, PENDING faded yellow, REVOKED red struck.
const MOD_CLS: Record<ModStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50/70 text-amber-600/80",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  NEEDS_REVIEW: "border-zinc-300 bg-zinc-50 text-zinc-500",
  REJECTED: "border-zinc-300 bg-zinc-100 text-zinc-500",
  REVOKED: "border-red-300 bg-red-50 text-danger line-through decoration-1",
}
export function ModerationStatusBadge({ status }: { status: ModStatus }) {
  return (
    <Tip tip={MOD_LABEL[status].tip}>
      <span className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MOD_CLS[status]}`}>
        {status === "PENDING" && <Clock size={10} />}
        {status === "NEEDS_REVIEW" && <TriangleAlert size={10} />}
        {status === "APPROVED" && <BadgeCheck size={10} />}
        {MOD_LABEL[status].label}
      </span>
    </Tip>
  )
}

const CONF: Record<Confidence, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-fit/15 text-fit" },
  medium: { label: "Medium", cls: "bg-sky-100 text-sky-700" },
  low: { label: "Low", cls: "bg-amber-100 text-amber-700" },
  insufficient_data: { label: "Chưa đủ dữ liệu", cls: "bg-zinc-200 text-zinc-600" },
}
export function ConfidenceBadge({ value }: { value: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold ${CONF[value].cls}`}>
      {value === "insufficient_data" ? CONF[value].label : `Confidence: ${CONF[value].label}`}
    </span>
  )
}

// v1.3.4: Manufacturer blue, Seller yellow, Unknown gray.
const SRC_CLS: Record<SourceQuality, string> = {
  MANUFACTURER_VERIFIED: "border-sky-300 bg-sky-50 text-sky-700",
  SELLER_PROVIDED: "border-yellow-300 bg-yellow-50 text-yellow-800",
  INFERRED: "border-dashed border-yellow-400 bg-transparent text-yellow-700",
  UNKNOWN: "border-zinc-300 bg-zinc-100 text-zinc-500",
}
export function DataSourceLabel({ source }: { source: SourceQuality }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SRC_CLS[source]}`}>
      {SOURCE_LABEL[source]}
    </span>
  )
}

export function InsufficientMark({ label = "Chưa đủ dữ liệu" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
      <Hourglass size={12} /> {label}
    </span>
  )
}

const AXIS_CLS = {
  skill: "text-skill",
  evidence: "text-evidence",
  cp: "text-cp",
  fit: "text-fit",
} as const
export type AxisKey = keyof typeof AXIS_CLS
export function AxisEyebrow({ axis, children }: { axis: AxisKey; children: ReactNode }) {
  return (
    <p className={`m-0 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] ${AXIS_CLS[axis]}`}>
      <span className="inline-block h-2 w-2 bg-current" aria-hidden />
      {children}
    </p>
  )
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="m-0 mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-dna-muted">{eyebrow}</p>}
        <h1 className="m-0 font-head text-4xl font-black uppercase leading-[0.92] tracking-tight md:text-6xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`sd-reveal border border-dna-line bg-dna-surface p-5 md:p-6 ${className}`}>{children}</section>
}

export function HoldNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-2 text-[11px] leading-relaxed text-dna-muted">
      <Clock size={12} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
