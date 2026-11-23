import { notFound } from "next/navigation"
import { CoreAssessment } from "../../_components/CoreAssessment"
import type { CoreSport } from "@/lib/sportdna-core-bank"

const SLUGS: Record<string, CoreSport> = { "cau-long": "badminton", "bong-da": "football" }

export const dynamicParams = false
export function generateStaticParams() {
  return Object.keys(SLUGS).map((sport) => ({ sport }))
}
export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  return { title: SLUGS[sport] === "football" ? "SportDNA bóng đá · Football assessment | BOAI" : "SportDNA cầu lông · Badminton assessment | BOAI" }
}

export default async function CoreAssessmentPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const key = SLUGS[sport]
  if (!key) notFound()
  return <CoreAssessment sport={key} />
}
