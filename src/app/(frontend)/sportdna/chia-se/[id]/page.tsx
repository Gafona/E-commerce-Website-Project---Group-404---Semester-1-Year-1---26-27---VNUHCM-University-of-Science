import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { getLang, getTr } from "@/lib/i18n-server"
import { headlineStat, loadPublicDnaShare } from "@/lib/dna-share-public"
import { formatDay, vnDay } from "@/lib/recommendations"
import { DnaResultCard } from "../../../cong-dong/DnaResultCard"

type Props = { params: Promise<{ id: string }> }

const sportName = (sport: string, lang: string) => (sport === "badminton" ? (lang === "en" ? "Badminton" : "Cầu lông") : lang === "en" ? "Football" : "Bóng đá")

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, lang] = await Promise.all([params, getLang()])
  const share = await loadPublicDnaShare(id)
  if (!share) return { title: lang === "en" ? "Link no longer shared | BOAI" : "Liên kết không còn được chia sẻ | BOAI", robots: { index: false } }
  const stat = headlineStat(share.card)
  const who = share.name ?? (lang === "en" ? "A BOAI player" : "Một người chơi BOAI")
  const sport = sportName(share.card.sport, lang)
  const title =
    lang === "en"
      ? `${who}: ${sport} SportDNA${stat ? ` · ELO ${stat.value}` : ""} | BOAI`
      : `${who}: SportDNA ${sport}${stat ? ` · ELO ${stat.value}` : ""} | BOAI`
  const description =
    lang === "en"
      ? `${stat?.tier ? `Tier ${stat.tier}. ` : ""}See the 8-skill radar and take the free SportDNA test to find gear that fits your game.`
      : `${stat?.tier ? `Bậc ${stat.tier}. ` : ""}Xem mạng nhện 8 kỹ năng và làm bài test SportDNA miễn phí để chọn trang bị hợp lối chơi.`
  const image = { url: `/api/og/sportdna/${share.id}`, width: 1200, height: 630, alt: title }
  return {
    title,
    description,
    // Shared on purpose, but personal: previews yes, search indexing no.
    robots: { index: false, follow: true },
    openGraph: { title, description, type: "article", url: `/sportdna/chia-se/${share.id}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function DnaSharePage({ params }: Props) {
  const [{ id }, tr, lang] = await Promise.all([params, getTr(), getLang()])
  const share = await loadPublicDnaShare(id)
  if (!share) notFound()
  const sport = sportName(share.card.sport, lang)
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section className="min-w-0">
        <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-skill">
          <Sparkles size={14} /> {tr(`Kết quả SportDNA · ${sport}`, `SportDNA result · ${sport}`)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          {share.avatar ? (
            <Image src={share.avatar} alt={share.name ?? ""} width={48} height={48} className="size-12 rounded-full object-cover" />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-dna-ink font-head text-xl font-black text-white" aria-hidden>
              {(share.name ?? "B").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="m-0 font-head text-4xl font-black uppercase italic leading-none md:text-5xl">{share.name ?? tr("Một người chơi BOAI", "A BOAI player")}</h1>
            <p className="m-0 mt-1 text-xs text-dna-muted">{tr(`Chia sẻ ngày ${formatDay(vnDay(share.createdAt))}`, `Shared on ${formatDay(vnDay(share.createdAt))}`)}</p>
          </div>
        </div>
        <div className="max-w-2xl">
          <DnaResultCard achievement={share.card} />
        </div>
        <p className="m-0 mt-3 max-w-2xl text-[11px] leading-5 text-dna-muted">
          {tr(
            "Ảnh chụp kết quả tại thời điểm chia sẻ. Người chia sẻ có thể thu hồi liên kết bất cứ lúc nào.",
            "A snapshot taken when it was shared. The owner can revoke this link at any time.",
          )}
        </p>
      </section>
      <aside className="grid gap-3 border border-dna-line bg-dna-surface p-6">
        <h2 className="m-0 font-head text-2xl font-black uppercase italic leading-none">{tr("Bạn chơi ở bậc nào?", "What's your level?")}</h2>
        <p className="m-0 text-xs leading-5 text-dna-muted">
          {tr(
            "Làm bài test SportDNA miễn phí trong khoảng 5 phút để biết ELO, điểm mạnh và những món trang bị hợp lối chơi của bạn.",
            "Take the free 5-minute SportDNA test to see your ELO, strengths and the gear that suits how you play.",
          )}
        </p>
        <Link href="/sportdna" className="flex h-11 items-center justify-center gap-2 bg-skill px-5 text-[11px] font-extrabold uppercase text-white">
          {tr("Làm bài test SportDNA", "Take the SportDNA test")} <ArrowRight size={15} />
        </Link>
        <Link href="/" className="flex h-11 items-center justify-center gap-2 border border-dna-line px-5 text-[11px] font-extrabold uppercase">
          {tr("Khám phá cửa hàng BOAI", "Explore the BOAI store")}
        </Link>
      </aside>
    </div>
  )
}
