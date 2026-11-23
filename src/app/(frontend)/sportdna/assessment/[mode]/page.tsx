import { notFound } from "next/navigation"
import { ScenarioCourt } from "../../_components/ScenarioCourt"
import { QuickFlow } from "../../_components/QuickFlow"
import { RequireLogin } from "../../_components/LoginGate"
import { BASE, MODES, isMode, sequenceFor } from "../../_components/data"

export const dynamic = "force-static"
export const dynamicParams = false
export function generateStaticParams() {
  return Object.keys(MODES).map((mode) => ({ mode }))
}
export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  return { title: `SportDNA ${isMode(mode) ? MODES[mode].label : ""} — Đánh giá | BOAI` }
}

export default async function AssessmentPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params
  if (!isMode(mode)) notFound()
  if (mode === "quick") return <QuickFlow />
  // Deep/Retest update ELO, so they require an account before starting.
  return (
    <RequireLogin title={`${MODES[mode].label} · Cầu lông đơn`}>
      <ScenarioCourt key={mode} mode={mode} rounds={sequenceFor(mode)} modeLabel={MODES[mode].label} resultHref={`${BASE}/result/${mode}`} />
    </RequireLogin>
  )
}
