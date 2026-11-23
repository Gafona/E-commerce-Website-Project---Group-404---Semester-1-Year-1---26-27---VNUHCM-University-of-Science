// Mạng nhện 0–100. Trục null (chưa đủ dữ liệu) hiện mờ ở tâm, không bịa giá trị.
// overlay: đa giác thứ hai (ví dụ "vợt bạn cần") vẽ nét đứt.
export type DnaRadarAxis = { label: string; value: number | null; overlay?: number | null }

export function DnaRadar({
  axes,
  size = 320,
  color = "#1667e8",
  overlayColor = "#f97316",
  title,
  emptyLabel = "Chưa đủ dữ liệu",
}: {
  axes: DnaRadarAxis[]
  size?: number
  color?: string
  overlayColor?: string
  title: string
  /** Shown for axes without data (pass a translated string). */
  emptyLabel?: string
}) {
  const c = 200
  const radius = 120
  const n = axes.length
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, r: number) => [c + Math.cos(angle(i)) * r, c + Math.sin(angle(i)) * r] as const
  const rOf = (v: number) => Math.max(0.04, Math.min(1, v / 100)) * radius
  const poly = (pick: (a: DnaRadarAxis) => number | null | undefined) =>
    axes
      .map((a, i) => {
        const v = pick(a)
        return v === null || v === undefined ? null : pt(i, rOf(v)).join(",")
      })
      .filter(Boolean)
      .join(" ")
  const main = poly((a) => a.value)
  const over = axes.some((a) => a.overlay !== undefined) ? poly((a) => a.overlay) : ""
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className="mx-auto block h-auto max-w-full" role="img" aria-label={title}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={axes.map((_, i) => pt(i, radius * f).join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.12} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, radius)
        return <line key={a.label} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity={a.value === null ? 0.08 : 0.18} />
      })}
      {over && <polygon points={over} fill={overlayColor} fillOpacity={0.08} stroke={overlayColor} strokeWidth={2} strokeDasharray="6 5" strokeLinejoin="round" />}
      {main && <polygon points={main} className="animate-radar" style={{ transformOrigin: "200px 200px" }} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />}
      {axes.map((a, i) => {
        if (a.value === null) return null
        const [x, y] = pt(i, rOf(a.value))
        return <circle key={`d-${a.label}`} cx={x} cy={y} r={3.5} fill={color} />
      })}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, radius + 34)
        const anchor = Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end"
        return (
          <g key={`l-${a.label}`}>
            <text x={lx} y={ly - 4} textAnchor={anchor} fontSize={13} fontWeight={700} fill="currentColor" fillOpacity={a.value === null ? 0.4 : 0.9}>{a.label}</text>
            <text x={lx} y={ly + 12} textAnchor={anchor} fontSize={11} fill="currentColor" fillOpacity={0.55}>
              {a.value === null ? emptyLabel : a.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
