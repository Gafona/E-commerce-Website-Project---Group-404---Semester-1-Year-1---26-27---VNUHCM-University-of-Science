// Original club-style crest templates (not copies of real club marks). Each returns a
// standalone SVG string so it can be previewed as an <img> and rasterized to PNG.

export type CrestOptions = { initials: string; name: string; c1: string; c2: string; accent: string }
export type CrestTemplate = { id: string; vi: string; en: string; svg: (o: CrestOptions) => string }

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const FONT = `font-family="'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif" font-weight="900"`
const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${body}</svg>`
const initials = (o: CrestOptions, y: number, size: number, fill: string) => {
  const text = esc(o.initials.slice(0, 4).toUpperCase())
  const fit = text.length > 3 ? size * 0.72 : text.length > 2 ? size * 0.85 : size
  return `<text x="100" y="${y}" text-anchor="middle" dominant-baseline="central" ${FONT} font-size="${fit}" fill="${fill}">${text}</text>`
}
const ring = (o: CrestOptions, id: string, r: number, fill: string, size = 15) =>
  `<defs><path id="${id}" d="M${100 - r} 100a${r} ${r} 0 1 1 ${2 * r} 0"/></defs><text ${FONT} font-size="${size}" letter-spacing="2" fill="${fill}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${esc(o.name.slice(0, 20).toUpperCase())}</textPath></text>`
const star = (cx: number, cy: number, r: number, fill: string) => {
  const p = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.42 : r
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
  })
  return `<polygon points="${p.join(" ")}" fill="${fill}"/>`
}
const SHIELD = "M100 8 180 30V96c0 50-34 82-80 98C54 178 20 146 20 96V30Z"
const POINTED = "M100 6 178 26 170 120 100 196 30 120 22 26Z"

export const CREST_TEMPLATES: CrestTemplate[] = [
  {
    id: "stripes",
    vi: "Khiên sọc",
    en: "Striped shield",
    svg: (o) =>
      wrap(`<defs><clipPath id="s"><path d="${SHIELD}"/></clipPath></defs><path d="${SHIELD}" fill="${o.c1}"/>
      <g clip-path="url(#s)"><rect x="52" y="0" width="22" height="200" fill="${o.c2}"/><rect x="90" y="0" width="22" height="200" fill="${o.c2}"/><rect x="128" y="0" width="22" height="200" fill="${o.c2}"/>
      <rect x="0" y="34" width="200" height="44" fill="${o.accent}"/></g>${initials(o, 57, 34, o.c1)}
      <path d="${SHIELD}" fill="none" stroke="${o.accent}" stroke-width="7"/>`),
  },
  {
    id: "roundel",
    vi: "Huy hiệu tròn",
    en: "Roundel",
    svg: (o) =>
      wrap(`<circle cx="100" cy="100" r="94" fill="${o.c1}"/><circle cx="100" cy="100" r="90" fill="none" stroke="${o.accent}" stroke-width="4"/>
      <circle cx="100" cy="100" r="60" fill="${o.c2}" stroke="${o.accent}" stroke-width="4"/>${ring(o, "r", 74, o.accent)}
      ${star(100, 172, 9, o.accent)}${initials(o, 100, 44, o.accent)}`),
  },
  {
    id: "ball",
    vi: "Khiên bóng",
    en: "Ball shield",
    svg: (o) =>
      wrap(`<path d="${SHIELD}" fill="${o.c1}" stroke="${o.accent}" stroke-width="7"/>${initials(o, 52, 30, o.accent)}
      <circle cx="100" cy="122" r="40" fill="#fff" stroke="${o.c2}" stroke-width="4"/>
      <polygon points="100,104 117,116 110,136 90,136 83,116" fill="${o.c2}"/>
      <path d="M100 104V84M117 116l19-7M110 136l12 17M90 136l-12 17M83 116l-19-7" stroke="${o.c2}" stroke-width="4"/>`),
  },
  {
    id: "hexagon",
    vi: "Lục giác",
    en: "Hexagon",
    svg: (o) =>
      wrap(`<polygon points="100,6 182,52 182,148 100,194 18,148 18,52" fill="${o.c1}" stroke="${o.accent}" stroke-width="7"/>
      <polygon points="100,26 164,62 164,138 100,174 36,138 36,62" fill="none" stroke="${o.c2}" stroke-width="3"/>
      ${star(62, 100, 10, o.c2)}${star(138, 100, 10, o.c2)}${initials(o, 100, 42, o.accent)}`),
  },
  {
    id: "diamond",
    vi: "Kim cương",
    en: "Diamond",
    svg: (o) =>
      wrap(`<polygon points="100,4 196,100 100,196 4,100" fill="${o.c2}"/><polygon points="100,22 178,100 100,178 22,100" fill="${o.c1}" stroke="${o.accent}" stroke-width="4"/>
      ${initials(o, 100, 46, o.accent)}`),
  },
  {
    id: "chevron",
    vi: "Khiên mũi tên",
    en: "Chevron shield",
    svg: (o) =>
      wrap(`<defs><clipPath id="c"><path d="${POINTED}"/></clipPath></defs><path d="${POINTED}" fill="${o.c1}"/>
      <g clip-path="url(#c)"><path d="M10 96 100 160 190 96V132L100 196 10 132Z" fill="${o.c2}"/></g>
      ${initials(o, 78, 46, o.accent)}<path d="${POINTED}" fill="none" stroke="${o.accent}" stroke-width="7"/>`),
  },
  {
    id: "bolt",
    vi: "Tia chớp",
    en: "Bolt",
    svg: (o) =>
      wrap(`<circle cx="100" cy="100" r="94" fill="${o.c1}" stroke="${o.accent}" stroke-width="6"/>
      <polygon points="114,18 58,108 96,108 82,182 144,84 106,84" fill="${o.c2}" stroke="${o.accent}" stroke-width="4" stroke-linejoin="round"/>
      ${initials(o, 170, 20, o.accent)}`),
  },
  {
    id: "crown",
    vi: "Vương miện",
    en: "Crown",
    svg: (o) =>
      wrap(`<path d="M100 40 176 58V110c0 44-30 72-76 86-46-14-76-42-76-86V58Z" fill="${o.c1}" stroke="${o.accent}" stroke-width="6"/>
      <path d="M52 44 64 6 84 30 100 2 116 30 136 6 148 44Z" fill="${o.accent}"/>
      ${initials(o, 116, 46, o.c2)}`),
  },
  {
    id: "wings",
    vi: "Đôi cánh",
    en: "Wings",
    svg: (o) =>
      wrap(`<path d="M74 92C52 70 22 66 2 72c16 6 26 14 30 22-12-2-22 0-28 4 14 2 24 8 30 16-8 0-16 2-20 6 20 2 40 2 60-8Z" fill="${o.c2}"/>
      <path d="M126 92c22-22 52-26 72-20-16 6-26 14-30 22 12-2 22 0 28 4-14 2-24 8-30 16 8 0 16 2 20 6-20 2-40 2-60-8Z" fill="${o.c2}"/>
      <circle cx="100" cy="100" r="50" fill="${o.c1}" stroke="${o.accent}" stroke-width="6"/>${initials(o, 100, 34, o.accent)}`),
  },
  {
    id: "star",
    vi: "Ngôi sao",
    en: "Star",
    svg: (o) => wrap(`${star(100, 106, 98, o.accent)}${star(100, 106, 84, o.c1)}${initials(o, 112, 34, o.c2)}`),
  },
  {
    id: "pentagon",
    vi: "Ngũ giác",
    en: "Pentagon",
    svg: (o) =>
      wrap(`<defs><clipPath id="p"><polygon points="100,6 190,72 156,190 44,190 10,72"/></clipPath></defs>
      <polygon points="100,6 190,72 156,190 44,190 10,72" fill="${o.c1}"/><g clip-path="url(#p)"><rect y="98" width="200" height="50" fill="${o.c2}"/></g>
      <polygon points="100,6 190,72 156,190 44,190 10,72" fill="none" stroke="${o.accent}" stroke-width="7"/>${initials(o, 123, 32, o.accent)}${star(100, 62, 16, o.accent)}`),
  },
  {
    id: "sash",
    vi: "Tròn dải chéo",
    en: "Sash roundel",
    svg: (o) =>
      wrap(`<defs><clipPath id="q"><circle cx="100" cy="100" r="92"/></clipPath></defs><circle cx="100" cy="100" r="92" fill="${o.c1}"/>
      <g clip-path="url(#q)"><path d="M-10 40 40-10 210 160 160 210Z" fill="${o.c2}"/></g>
      <circle cx="100" cy="100" r="92" fill="none" stroke="${o.accent}" stroke-width="8"/>${initials(o, 100, 50, o.accent)}`),
  },
  {
    id: "flame",
    vi: "Ngọn lửa",
    en: "Flame",
    svg: (o) =>
      wrap(`<path d="M100 4c10 30 46 44 46 92 0-16-8-28-16-34 4 22-6 34-14 40 2-30-10-50-16-58-6 8-18 28-16 58-8-6-18-18-14-40-8 6-16 18-16 34 0-48 36-62 46-92Z" fill="${o.accent}"/>
      <path d="M100 74 168 92V126c0 36-26 58-68 70-42-12-68-34-68-70V92Z" fill="${o.c1}" stroke="${o.c2}" stroke-width="6"/>${initials(o, 136, 38, o.accent)}`),
  },
  {
    id: "peaks",
    vi: "Núi non",
    en: "Peaks",
    svg: (o) =>
      wrap(`<defs><clipPath id="m"><path d="${SHIELD}"/></clipPath></defs><path d="${SHIELD}" fill="${o.c1}"/>
      <g clip-path="url(#m)"><circle cx="138" cy="74" r="20" fill="${o.accent}"/><path d="M0 170 60 92 92 130 126 84 200 170V200H0Z" fill="${o.c2}"/><path d="M60 92 72 108 64 106 52 116Z M126 84 140 104 130 100 116 110Z" fill="#fff" opacity=".85"/></g>
      <path d="${SHIELD}" fill="none" stroke="${o.accent}" stroke-width="7"/>${initials(o, 46, 28, o.accent)}`),
  },
  {
    id: "shuttle",
    vi: "Quả cầu lông",
    en: "Shuttlecock",
    svg: (o) =>
      wrap(`<circle cx="100" cy="100" r="94" fill="${o.c1}" stroke="${o.accent}" stroke-width="6"/>${ring(o, "u", 76, o.accent, 14)}
      <path d="M80 54 100 118 120 54Z" fill="#fff" stroke="${o.c2}" stroke-width="3"/><path d="M90 56 100 116M110 56 100 116M84 70h32M88 86h24" stroke="${o.c2}" stroke-width="2"/>
      <circle cx="100" cy="126" r="12" fill="${o.accent}"/>${initials(o, 160, 22, o.accent)}`),
  },
  {
    id: "rackets",
    vi: "Vợt bắt chéo",
    en: "Crossed rackets",
    svg: (o) =>
      wrap(`<path d="${SHIELD}" fill="${o.c1}" stroke="${o.accent}" stroke-width="7"/>
      <g fill="none" stroke="${o.c2}" stroke-width="6"><ellipse cx="72" cy="78" rx="22" ry="28" transform="rotate(-35 72 78)"/><ellipse cx="128" cy="78" rx="22" ry="28" transform="rotate(35 128 78)"/></g>
      <path d="M86 102 132 160M114 102 68 160" stroke="${o.accent}" stroke-width="8" stroke-linecap="round"/>${initials(o, 168, 22, o.accent)}`),
  },
  {
    id: "laurel",
    vi: "Vòng nguyệt quế",
    en: "Laurel",
    svg: (o) => {
      const leaves = Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (0.62 + i * 0.09)
        const x = 100 + Math.cos(a) * 82
        const y = 104 + Math.sin(a) * 82
        const deg = (a * 180) / Math.PI + 90
        return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="15" transform="rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${o.accent}"/><ellipse cx="${(200 - x).toFixed(1)}" cy="${y.toFixed(1)}" rx="7" ry="15" transform="rotate(${(-deg).toFixed(1)} ${(200 - x).toFixed(1)} ${y.toFixed(1)})" fill="${o.accent}"/>`
      }).join("")
      return wrap(`${leaves}<circle cx="100" cy="100" r="62" fill="${o.c1}" stroke="${o.c2}" stroke-width="5"/>${initials(o, 100, 40, o.accent)}`)
    },
  },
  {
    id: "monogram",
    vi: "Chữ lồng",
    en: "Monogram",
    svg: (o) =>
      wrap(`<rect x="10" y="10" width="180" height="180" rx="34" fill="${o.c1}" stroke="${o.accent}" stroke-width="7"/>
      <rect x="10" y="140" width="180" height="16" fill="${o.c2}"/>${initials(o, 88, 66, o.accent)}
      <text x="100" y="174" text-anchor="middle" dominant-baseline="central" ${FONT} font-size="15" letter-spacing="2" fill="${o.accent}">${esc(o.name.slice(0, 16).toUpperCase())}</text>`),
  },
]

export const crestDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Rasterize a crest so it is stored like any uploaded logo (PNG data URL). */
export async function crestPng(svg: string, size = 440): Promise<string> {
  const img = new Image()
  img.src = crestDataUrl(svg)
  await img.decode()
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("CANVAS")
  ctx.drawImage(img, 0, 0, size, size)
  return canvas.toDataURL("image/png")
}
