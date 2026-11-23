import { notFound } from "next/navigation"
import { MODES, isMode } from "../../_components/data"
import { AssessmentResultView } from "../../_components/MySkill"

export const dynamic = "force-static"
export const dynamicParams = false
export function generateStaticParams() {
  return Object.keys(MODES).map((mode) => ({ mode }))
}
export const metadata = { title: "SportDNA — Kết quả đánh giá | BOAI" }

export default async function ResultPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  if (!isMode(mode)) notFound()
  return <AssessmentResultView mode={mode} />
}
