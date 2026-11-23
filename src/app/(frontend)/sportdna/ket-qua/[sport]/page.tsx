import { notFound } from "next/navigation"
import { CoreHistory } from "../../_components/CoreHistory"
import type { CoreSport } from "@/lib/sportdna-core-bank"

const SLUGS: Record<string, CoreSport> = { "cau-long": "badminton", "bong-da": "football" }

export const dynamicParams = false
export function generateStaticParams() {
  return Object.keys(SLUGS).map((sport) => ({ sport }))
}
export const metadata = { title: "SportDNA · Kết quả & lịch sử | BOAI", robots: { index: false } }

export default async function CoreResultPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const key = SLUGS[sport]
  if (!key) notFound()
  return <CoreHistory sport={key} />
}
