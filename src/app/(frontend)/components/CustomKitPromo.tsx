"use client"

import Link from "next/link"
import { ArrowRight, Eye, ImagePlus, Palette, Send } from "lucide-react"
import { emptyArt, KitPreview, type JerseyArt } from "../custom-ao/jersey-art"
import { useShop } from "./ShopProvider"

const text = (id: number, value: string, x: number, y: number, size: number, color = "#ffffff") => ({ id, text: value, x, y, size, color, bold: true, italic: false })
const star = (id: number, x: number, y: number, size: number, color: string) => ({ id, kind: "star" as const, x, y, size, color })
const line = (id: number, pts: [number, number][], color: string, width: number) => ({ id, points: pts.map(([x, y]) => ({ x, y })), color, width })

// Ba bộ mẫu dựng bằng chính bộ vẽ của trang Custom (không dùng ảnh), nên luôn khớp với thứ khách tự làm được.
const KITS: { shirt: string; art: JerseyArt; tilt: string }[] = [
  {
    shirt: "#ef4444",
    tilt: "-rotate-[8deg] translate-y-6",
    art: {
      front: { ...emptyArt(), strokes: [line(1, [[108, 250], [210, 300], [312, 250]], "#ffffff", 14)], texts: [text(2, "7", 210, 205, 64)] },
      back: emptyArt(),
      pants: { enabled: true, color: "#f8fafc", front: { ...emptyArt(), strokes: [line(3, [[96, 150], [104, 340]], "#ef4444", 10)] }, back: emptyArt() },
    },
  },
  {
    shirt: "#1677ff",
    tilt: "z-10 scale-110",
    art: {
      front: { ...emptyArt(), stickers: [star(4, 168, 150, 30, "#facc15")], texts: [text(5, "BOAI FC", 210, 196, 30), text(6, "10", 210, 290, 80)] },
      back: emptyArt(),
      pants: { enabled: true, color: "#f8fafc", front: { ...emptyArt(), texts: [text(7, "10", 150, 300, 30, "#1677ff")] }, back: emptyArt() },
    },
  },
  {
    shirt: "#111827",
    tilt: "rotate-[8deg] translate-y-6",
    art: {
      front: { ...emptyArt(), strokes: [line(8, [[150, 92], [150, 430]], "#facc15", 18), line(9, [[270, 92], [270, 430]], "#facc15", 18)], texts: [text(10, "23", 210, 250, 72, "#facc15")] },
      back: emptyArt(),
      pants: { enabled: true, color: "#facc15", front: { ...emptyArt(), strokes: [line(11, [[90, 330], [190, 340]], "#111827", 10)] }, back: emptyArt() },
    },
  },
]

export function CustomKitPromo() {
  const { tr } = useShop()
  const features = [
    [Palette, tr("Thiết kế cả áo lẫn quần", "Design shirt and shorts"), tr("Vẽ, sticker, tên và số cho hai mặt", "Draw, stickers, names and numbers on both sides")],
    [ImagePlus, tr("Tải logo & họa tiết riêng", "Upload your logo & pattern"), tr("Logo chỉnh được cỡ, họa tiết phủ kín", "Resizable logos, full-cover patterns")],
    [Eye, tr("Xem trước trực tiếp", "Live preview"), tr("Lật mặt trước, mặt sau ngay khi vẽ", "Flip front and back as you design")],
    [Send, tr("Nhận báo giá từ shop", "Get quotes from shops"), tr("Gửi một lần cho nhiều shop may", "Send once to several makers")],
  ] as const
  return (
    <section className="page-shell my-14" id="custom-ao" aria-labelledby="custom-promo-title">
      <div className="relative overflow-hidden bg-[#07111f] text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-32 -top-32 size-[420px] rounded-full bg-[#1677ff] opacity-35 blur-[110px]" />
          <div className="absolute -bottom-40 right-10 size-[380px] rounded-full bg-[#7c3aed] opacity-30 blur-[110px]" />
          <div className="absolute inset-0 opacity-[.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        </div>
        <div className="relative grid items-center gap-10 px-6 py-12 md:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-16">
          <div>
            <p className="m-0 inline-flex items-center gap-2 border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#7cc0ff]">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {tr("Mới · BOAI Design Lab", "New · BOAI Design Lab")}
            </p>
            <h2 id="custom-promo-title" className="m-0 mt-5 font-[family-name:var(--display)] text-5xl font-black uppercase leading-[1.08] tracking-tight md:text-6xl">
              <span className="block">{tr("Tự thiết kế", "Design your own")}</span>
              <span className="block bg-gradient-to-r from-[#5aa2ff] via-[#7cc0ff] to-[#c4b5fd] bg-clip-text pb-[0.06em] pt-[0.1em] text-transparent">
                {tr("bộ đồ của đội", "team kit")}
              </span>
            </h2>
            <p className="mb-0 mt-4 max-w-lg text-sm leading-7 text-white/70">
              {tr(
                "Từ màu áo, số áo đến logo đội: tự tay thiết kế trong vài phút, xem trước cả hai mặt, rồi gửi cho các shop may để nhận báo giá.",
                "From colors and numbers to your team logo: design it in minutes, preview both sides, then send it to makers for quotes.",
              )}
            </p>
            <ul className="m-0 mt-7 grid list-none gap-3 p-0 sm:grid-cols-2">
              {features.map(([Icon, title, desc]) => (
                <li key={title} className="flex gap-3 border border-white/10 bg-white/[.04] p-3">
                  <span className="grid size-9 shrink-0 place-items-center bg-[var(--lime)]"><Icon size={16} /></span>
                  <span className="min-w-0">
                    <b className="block text-[13px] leading-5">{title}</b>
                    <small className="block text-[11px] leading-5 text-white/55">{desc}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/custom-ao" className="boai-button primary">
                {tr("Thiết kế ngay", "Start designing")} <ArrowRight size={17} />
              </Link>
              <Link href="/custom-ao#gui-shop" className="boai-button border border-white/25 bg-transparent !text-white hover:border-white">
                {tr("Xem shop nhận may", "See custom makers")}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[560px] items-end justify-center" aria-hidden>
            <div className="absolute inset-x-10 bottom-6 h-24 rounded-full bg-[#1677ff] opacity-25 blur-3xl" />
            {KITS.map((kit, i) => (
              <div key={i} className={`relative -mx-6 w-[38%] shrink-0 transition duration-500 hover:-translate-y-3 ${kit.tilt}`}>
                <div className={i === 1 ? "jersey-float" : ""}>
                  <KitPreview uid={`promo-${i}`} side="front" art={kit.art} shirtColor={kit.shirt} material="polyester" className="drop-shadow-[0_24px_30px_rgba(0,0,0,.45)]" />
                </div>
              </div>
            ))}
            <span className="absolute right-2 top-2 rotate-3 bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#07111f] shadow-xl">
              {tr("Áo + quần", "Shirt + shorts")}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
