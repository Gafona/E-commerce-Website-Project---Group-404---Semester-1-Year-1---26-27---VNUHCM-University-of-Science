import type { ReactNode } from "react"
import type { PatternId } from "@/lib/jersey-kit"

/**
 * Procedural jersey patterns drawn in the 420×480 garment viewBox. The caller clips
 * them to the garment silhouette. Geometry is seeded (stable between renders) and
 * cached per pattern/scale; colors are applied at render time.
 */
type Ctx = { c1: string; c2: string; s: number; uid: string }
type Pt = [number, number]

const cache = new Map<string, unknown>()
function memo<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const f = (n: number) => Math.round(n * 10) / 10
const pts = (list: Pt[]) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")
const between = (r: () => number, a: number, b: number) => a + r() * (b - a)

function tile(ctx: Ctx, w: number, h: number, children: ReactNode, transform?: string) {
  const id = `${ctx.uid}-tile`
  return (
    <>
      <defs>
        <pattern id={id} width={f(w)} height={f(h)} patternUnits="userSpaceOnUse" patternTransform={transform}>
          {children}
        </pattern>
      </defs>
      <rect width="420" height="480" fill={`url(#${id})`} />
    </>
  )
}

/** A tapered brush stroke along a quadratic curve. */
function taper(p0: Pt, p1: Pt, p2: Pt, width: number, steps = 16): Pt[] {
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    const len = Math.hypot(dx, dy) || 1
    const w = (width / 2) * Math.sin(Math.PI * t) ** 0.7
    left.push([x - (dy / len) * w, y + (dx / len) * w])
    right.push([x + (dy / len) * w, y - (dx / len) * w])
  }
  return [...left, ...right.reverse()]
}

function blob(cx: number, cy: number, radius: number, r: () => number, n = 8) {
  const p: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const rr = radius * between(r, 0.6, 1.2)
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
  })
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M${f(mid(p[n - 1], p[0])[0])} ${f(mid(p[n - 1], p[0])[1])}`
  for (let i = 0; i < n; i++) {
    const m = mid(p[i], p[(i + 1) % n])
    d += `Q${f(p[i][0])} ${f(p[i][1])} ${f(m[0])} ${f(m[1])}`
  }
  return d + "Z"
}

type Shape = { d?: string; points?: string; alt: boolean; o: number }
const shapes = (list: Shape[], ctx: Ctx) =>
  list.map((shape, i) =>
    shape.d ? (
      <path key={i} d={shape.d} fill={shape.alt ? ctx.c2 : ctx.c1} fillOpacity={shape.o} />
    ) : (
      <polygon key={i} points={shape.points} fill={shape.alt ? ctx.c2 : ctx.c1} fillOpacity={shape.o} />
    ),
  )

const RENDER: Record<Exclude<PatternId, "none">, (ctx: Ctx) => ReactNode> = {
  lightning: (ctx) =>
    shapes(
      memo(`lightning:${ctx.s}`, () => {
        const r = rng(7)
        const d: Pt = [Math.cos(-1.05), Math.sin(-1.05)]
        const n: Pt = [-d[1], d[0]]
        return Array.from({ length: 24 }, (): Shape => {
          const base: Pt = [between(r, -60, 460), between(r, 110, 540)]
          const len = between(r, 90, 320) * ctx.s
          const w = between(r, 7, 34) * ctx.s
          const tip: Pt = [base[0] + d[0] * len, base[1] + d[1] * len]
          const back: Pt = [base[0] - d[0] * len * 0.45, base[1] - d[1] * len * 0.45]
          const notch: Pt = [base[0] + d[0] * len * 0.35 + n[0] * w * 0.9, base[1] + d[1] * len * 0.35 + n[1] * w * 0.9]
          return {
            points: pts([back, [base[0] + (n[0] * w) / 2, base[1] + (n[1] * w) / 2], notch, tip, [base[0] - (n[0] * w) / 2, base[1] - (n[1] * w) / 2]]),
            alt: w < 14 * ctx.s,
            o: between(r, 0.65, 1),
          }
        })
      }),
      ctx,
    ),
  shards: (ctx) =>
    shapes(
      memo(`shards:${ctx.s}`, () => {
        const r = rng(11)
        return Array.from({ length: 48 }, (): Shape => {
          const cx = between(r, 10, 410)
          const cy = between(r, 70, 470)
          const size = between(r, 25, 90) * ctx.s
          const p = Array.from({ length: 3 }, (): Pt => {
            const a = r() * Math.PI * 2
            return [cx + Math.cos(a) * size, cy + Math.sin(a) * size]
          })
          return { points: pts(p), alt: r() > 0.55, o: between(r, 0.25, 0.9) }
        })
      }),
      ctx,
    ),
  brush: (ctx) =>
    shapes(
      memo(`brush:${ctx.s}`, () => {
        const r = rng(5)
        return Array.from({ length: 9 }, (_, i): Shape => {
          const y = 90 + i * 48 + between(r, -20, 20)
          const p0: Pt = [between(r, -40, 40), y + between(r, 60, 120)]
          const p2: Pt = [between(r, 380, 460), y - between(r, 40, 110)]
          const p1: Pt = [210, (p0[1] + p2[1]) / 2 + between(r, -60, 60)]
          return { points: pts(taper(p0, p1, p2, between(r, 16, 46) * ctx.s, 22)), alt: i % 3 === 1, o: between(r, 0.7, 1) }
        })
      }),
      ctx,
    ),
  stripes: (ctx) => tile(ctx, 48 * ctx.s, 480, <rect width={f(24 * ctx.s)} height="480" fill={ctx.c1} />, `translate(${f(210 - 12 * ctx.s)} 0)`),
  pinstripe: (ctx) => tile(ctx, 20 * ctx.s, 480, <rect width={f(2.5 * ctx.s)} height="480" fill={ctx.c1} />, `translate(${f(210 - 1.25 * ctx.s)} 0)`),
  hoops: (ctx) => tile(ctx, 420, 56 * ctx.s, <rect width="420" height={f(28 * ctx.s)} fill={ctx.c1} />, "translate(0 92)"),
  diagonal: (ctx) => tile(ctx, 40 * ctx.s, 40 * ctx.s, <rect width={f(18 * ctx.s)} height={f(40 * ctx.s)} fill={ctx.c1} />, "rotate(35)"),
  sash: (ctx) => (
    <g>
      <line x1="40" y1="60" x2="420" y2="500" stroke={ctx.c2} strokeWidth={f(86 * ctx.s)} />
      <line x1="40" y1="60" x2="420" y2="500" stroke={ctx.c1} strokeWidth={f(70 * ctx.s)} />
    </g>
  ),
  halves: (ctx) => (
    <g>
      <rect x="210" width="210" height="480" fill={ctx.c1} />
      <rect x="208" width="4" height="480" fill={ctx.c2} />
    </g>
  ),
  gradient: (ctx) => (
    <>
      <defs>
        <linearGradient id={`${ctx.uid}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" stopColor={ctx.c1} stopOpacity="0" />
          <stop offset="0.6" stopColor={ctx.c1} stopOpacity="0.55" />
          <stop offset="1" stopColor={ctx.c1} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="420" height="480" fill={`url(#${ctx.uid}-grad)`} />
    </>
  ),
  duotone: (ctx) => (
    <>
      <defs>
        <linearGradient id={`${ctx.uid}-duo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.15" stopColor={ctx.c2} stopOpacity="0" />
          <stop offset="0.55" stopColor={ctx.c2} stopOpacity="0.7" />
          <stop offset="1" stopColor={ctx.c1} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="420" height="480" fill={`url(#${ctx.uid}-duo)`} />
    </>
  ),
  halftone: (ctx) => {
    const d = memo(`halftone:${ctx.s}`, () => {
      const step = 13 * ctx.s
      let out = ""
      for (let row = 0, y = 80; y < 490; row++, y += step) {
        const r = 6.4 * ctx.s * Math.min(1, Math.max(0, (y - 110) / 340)) ** 1.2
        if (r < 0.4) continue
        for (let x = row % 2 ? step / 2 : 0; x < 430; x += step) out += `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`
      }
      return out
    })
    return <path d={d} fill={ctx.c1} />
  },
  chevron: (ctx) =>
    tile(ctx, 64 * ctx.s, 36 * ctx.s, <path d={`M0 ${f(30 * ctx.s)}L${f(32 * ctx.s)} ${f(6 * ctx.s)}L${f(64 * ctx.s)} ${f(30 * ctx.s)}`} fill="none" stroke={ctx.c1} strokeWidth={f(9 * ctx.s)} strokeLinecap="square" />),
  zigzag: (ctx) =>
    tile(
      ctx,
      40 * ctx.s,
      26 * ctx.s,
      <path d={`M0 ${f(20 * ctx.s)}L${f(10 * ctx.s)} ${f(6 * ctx.s)}L${f(20 * ctx.s)} ${f(20 * ctx.s)}L${f(30 * ctx.s)} ${f(6 * ctx.s)}L${f(40 * ctx.s)} ${f(20 * ctx.s)}`} fill="none" stroke={ctx.c1} strokeWidth={f(3.5 * ctx.s)} />,
    ),
  geometric: (ctx) =>
    shapes(
      memo(`geometric:${ctx.s}`, () => {
        const r = rng(3)
        const c = 52 * ctx.s
        const out: Shape[] = []
        for (let y = 60; y < 490; y += c)
          for (let x = 0; x < 430; x += c) {
            const flip = r() > 0.5
            const a: Pt[] = flip ? [[x, y], [x + c, y], [x, y + c]] : [[x, y], [x + c, y], [x + c, y + c]]
            const b: Pt[] = flip ? [[x + c, y], [x + c, y + c], [x, y + c]] : [[x, y], [x + c, y + c], [x, y + c]]
            if (r() > 0.25) out.push({ points: pts(a), alt: r() > 0.5, o: between(r, 0.15, 0.9) })
            if (r() > 0.25) out.push({ points: pts(b), alt: r() > 0.5, o: between(r, 0.15, 0.9) })
          }
        return out
      }),
      ctx,
    ),
  camo: (ctx) =>
    shapes(
      memo(`camo:${ctx.s}`, () => {
        const r = rng(9)
        return Array.from({ length: 42 }, (_, i): Shape => ({
          d: blob(between(r, 0, 420), between(r, 70, 480), between(r, 22, 60) * ctx.s, r),
          alt: i % 3 === 1,
          o: i % 3 === 2 ? 0.55 : 1,
        }))
      }),
      ctx,
    ),
  digital: (ctx) => {
    const cells = memo(`digital:${ctx.s}`, () => {
      const r = rng(13)
      const c = 14 * ctx.s
      let a = ""
      let b = ""
      for (let y = 70; y < 490; y += c)
        for (let x = 0; x < 430; x += c) {
          const v = r()
          const rect = `M${f(x)} ${f(y)}h${f(c)}v${f(c)}h${f(-c)}Z`
          if (v < 0.3) a += rect
          else if (v < 0.5) b += rect
        }
      return { a, b }
    })
    return (
      <g>
        <path d={cells.a} fill={ctx.c1} />
        <path d={cells.b} fill={ctx.c2} />
      </g>
    )
  },
  hex: (ctx) => {
    const d = memo(`hex:${ctx.s}`, () => {
      const r = 16 * ctx.s
      const h = Math.sqrt(3) * r
      let out = ""
      for (let col = 0, x = 0; x < 440; col++, x += 1.5 * r)
        for (let y = col % 2 ? h / 2 : 0; y < 500; y += h) {
          const p = Array.from({ length: 6 }, (_, i): Pt => [x + r * Math.cos((Math.PI / 3) * i), y + r * Math.sin((Math.PI / 3) * i)])
          out += `M${p.map(([px, py]) => `${f(px)} ${f(py)}`).join("L")}Z`
        }
      return out
    })
    return <path d={d} fill="none" stroke={ctx.c1} strokeWidth={f(2.5 * ctx.s)} />
  },
  waves: (ctx) => {
    const lines = memo(`waves:${ctx.s}`, () => {
      let a = ""
      let b = ""
      for (let i = 0, y0 = 80; y0 < 500; i++, y0 += 30 * ctx.s) {
        let d = ""
        for (let x = -10; x <= 430; x += 8) d += `${x === -10 ? "M" : "L"}${x} ${f(y0 + 10 * ctx.s * Math.sin((2 * Math.PI * x) / (90 * ctx.s) + i * 0.6))}`
        if (i % 2) b += d
        else a += d
      }
      return { a, b }
    })
    return (
      <g fill="none" strokeWidth={f(5 * ctx.s)}>
        <path d={lines.a} stroke={ctx.c1} />
        <path d={lines.b} stroke={ctx.c2} />
      </g>
    )
  },
  topo: (ctx) => {
    const d = memo(`topo:${ctx.s}`, () => {
      let out = ""
      for (const [cx, cy, phase] of [[130, 250, 0.3], [330, 390, 1.7], [350, 140, 2.6]] as const)
        for (let k = 1; k <= 11; k++) {
          const R = 21 * k * ctx.s
          const p = Array.from({ length: 56 }, (_, i): Pt => {
            const a = (i / 56) * Math.PI * 2
            const rr = R * (1 + 0.13 * Math.sin(3 * a + k * 0.4 + phase) + 0.07 * Math.sin(5 * a + 1))
            return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]
          })
          out += `M${p.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`
        }
      return out
    })
    return <path d={d} fill="none" stroke={ctx.c1} strokeWidth={f(1.8 * ctx.s)} />
  },
  checker: (ctx) => {
    const c = 34 * ctx.s
    return tile(
      ctx,
      2 * c,
      2 * c,
      <>
        <rect width={f(c)} height={f(c)} fill={ctx.c1} />
        <rect x={f(c)} y={f(c)} width={f(c)} height={f(c)} fill={ctx.c1} />
      </>,
      `translate(${f(210 - c)} 92)`,
    )
  },
  sunburst: (ctx) => {
    const d = memo("sunburst", () => {
      let out = ""
      const n = 28
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2
        const a1 = a0 + Math.PI / n
        out += `M210 170L${f(210 + Math.cos(a0) * 700)} ${f(170 + Math.sin(a0) * 700)}L${f(210 + Math.cos(a1) * 700)} ${f(170 + Math.sin(a1) * 700)}Z`
      }
      return out
    })
    return <path d={d} fill={ctx.c1} />
  },
  centerband: (ctx) => (
    <g>
      <rect x={f(210 - 36 * ctx.s)} width={f(72 * ctx.s)} height="480" fill={ctx.c1} />
      <rect x={f(210 - 36 * ctx.s - 6)} width="3" height="480" fill={ctx.c2} />
      <rect x={f(210 + 36 * ctx.s + 3)} width="3" height="480" fill={ctx.c2} />
    </g>
  ),
  sidepanels: (ctx) => (
    <g>
      <rect x="0" width={f(108 + 30 * ctx.s)} y="150" height="330" fill={ctx.c1} />
      <rect x={f(312 - 30 * ctx.s)} width={f(108 + 30 * ctx.s)} y="150" height="330" fill={ctx.c1} />
      <rect x={f(108 + 30 * ctx.s)} y="150" width="4" height="330" fill={ctx.c2} />
      <rect x={f(312 - 30 * ctx.s - 4)} y="150" width="4" height="330" fill={ctx.c2} />
    </g>
  ),
  shoulders: (ctx) => (
    <g>
      <path d={`M0 0H420V${f(150 * ctx.s)}Q210 ${f(205 * ctx.s)} 0 ${f(150 * ctx.s)}Z`} fill={ctx.c1} />
      <path d={`M0 ${f(150 * ctx.s + 6)}Q210 ${f(205 * ctx.s + 6)} 420 ${f(150 * ctx.s + 6)}`} fill="none" stroke={ctx.c2} strokeWidth="5" />
    </g>
  ),
  chestband: (ctx) => (
    <g>
      <rect y="170" width="420" height={f(52 * ctx.s)} fill={ctx.c1} />
      <rect y="162" width="420" height="3" fill={ctx.c2} />
      <rect y={f(170 + 52 * ctx.s + 5)} width="420" height="3" fill={ctx.c2} />
    </g>
  ),
  tiger: (ctx) =>
    shapes(
      memo(`tiger:${ctx.s}`, () => {
        const r = rng(17)
        return Array.from({ length: 22 }, (_, i): Shape => {
          const left = i % 2 === 0
          const y = between(r, 100, 450)
          const len = between(r, 80, 170) * ctx.s
          const x0 = left ? between(r, 0, 70) : between(r, 350, 420)
          const x2 = left ? x0 + len : x0 - len
          const y2 = y + between(r, -30, 30)
          return { points: pts(taper([x0, y], [(x0 + x2) / 2, y + between(r, -30, 30)], [x2, y2], between(r, 10, 24) * ctx.s)), alt: false, o: 1 }
        })
      }),
      ctx,
    ),
  scales: (ctx) => {
    const d = memo(`scales:${ctx.s}`, () => {
      const r = 15 * ctx.s
      let out = ""
      for (let row = 0, y = 70; y < 500; row++, y += r)
        for (let x = row % 2 ? r : 0; x < 440; x += 2 * r) out += `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 0 0 ${f(2 * r)} 0`
      return out
    })
    return <path d={d} fill="none" stroke={ctx.c1} strokeWidth={f(2 * ctx.s)} />
  },
  cross: (ctx) => {
    const c = 34 * ctx.s
    return tile(
      ctx,
      c,
      c,
      <>
        <rect x={f(c / 2 - 6 * ctx.s)} y={f(c / 2 - 1.75 * ctx.s)} width={f(12 * ctx.s)} height={f(3.5 * ctx.s)} fill={ctx.c1} />
        <rect x={f(c / 2 - 1.75 * ctx.s)} y={f(c / 2 - 6 * ctx.s)} width={f(3.5 * ctx.s)} height={f(12 * ctx.s)} fill={ctx.c1} />
      </>,
    )
  },
  argyle: (ctx) => {
    const w = 60 * ctx.s
    const h = 90 * ctx.s
    return tile(
      ctx,
      w,
      h,
      <>
        <polygon points={pts([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])} fill={ctx.c1} />
        <path d={`M0 0L${f(w)} ${f(h)}M${f(w)} 0L0 ${f(h)}`} stroke={ctx.c2} strokeWidth={f(1.5 * ctx.s)} strokeDasharray={`${f(5 * ctx.s)} ${f(4 * ctx.s)}`} />
      </>,
      `translate(${f(210 - w / 2)} 92)`,
    )
  },
  splatter: (ctx) => {
    const dots = memo(`splatter:${ctx.s}`, () => {
      const r = rng(19)
      const circles: { x: number; y: number; r: number; alt: boolean }[] = []
      for (let i = 0; i < 16; i++) {
        const x = between(r, 20, 400)
        const y = between(r, 90, 460)
        const size = between(r, 10, 30) * ctx.s
        const alt = r() > 0.6
        circles.push({ x, y, r: size, alt })
        for (let j = 0; j < 7; j++) {
          const a = r() * Math.PI * 2
          const dist = size * between(r, 1.2, 2.6)
          circles.push({ x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, r: size * between(r, 0.12, 0.35), alt })
        }
      }
      for (let i = 0; i < 50; i++) circles.push({ x: between(r, 0, 420), y: between(r, 80, 480), r: between(r, 1, 4) * ctx.s, alt: r() > 0.5 })
      return circles
    })
    return dots.map((c, i) => <circle key={i} cx={f(c.x)} cy={f(c.y)} r={f(c.r)} fill={c.alt ? ctx.c2 : ctx.c1} />)
  },
}

export function KitPattern({
  id,
  c1,
  c2,
  scale,
  uid,
}: {
  id: PatternId
  c1: string
  c2: string
  scale: number
  uid: string
}) {
  if (id === "none") return null
  const s = Math.round(Math.max(0.4, Math.min(2.5, scale)) * 20) / 20
  return <>{RENDER[id]({ c1, c2, s, uid })}</>
}
