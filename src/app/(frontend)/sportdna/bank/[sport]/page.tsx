import { notFound } from "next/navigation"
import { BankCourt } from "../../_components/BankCourt"
import { PhysicalQuick } from "../../_components/PhysicalQuick"
import { PositionQuiz } from "../../_components/PositionQuiz"
import { PracticeDrill } from "../../_components/PracticeDrill"
import { RequireLogin } from "../../_components/LoginGate"

export const dynamic = "force-static"
export const dynamicParams = false

const ROUTES = {
  "cau-long-doi": { kind: "court", sport: "badminton_doubles", title: "Cầu lông đôi", back: "/sportdna#cau-long" },
  "nhanh-cau-long-doi": { kind: "quick", sport: "badminton_doubles", title: "Quick cầu lông đôi", back: "/sportdna#cau-long" },
  "luyen-tap-don": { kind: "practice", sport: "badminton_singles", title: "Luyện tập cầu lông đơn", back: "/sportdna#cau-long" },
  "luyen-tap-doi": { kind: "practice", sport: "badminton_doubles", title: "Luyện tập cầu lông đôi", back: "/sportdna#cau-long" },
  "bong-da": { kind: "court", sport: "football", title: "Bóng đá", back: "/sportdna#bong-da" },
  "nhanh-bong-da": { kind: "quick", sport: "football", title: "Quick bóng đá", back: "/sportdna#bong-da" },
  "vi-tri-bong-da": { kind: "position", title: "Gợi ý vị trí bóng đá", back: "/sportdna#bong-da" },
} as const
type Slug = keyof typeof ROUTES

export function generateStaticParams() {
  return Object.keys(ROUTES).map((sport) => ({ sport }))
}
export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const r = ROUTES[sport as Slug]
  return { title: `SportDNA ${r ? r.title : ""} | BOAI` }
}

export default async function BankPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const r = ROUTES[sport as Slug]
  if (!r) notFound()
  switch (r.kind) {
    case "court":
      // Scenario sets are ELO-rated: sign-in required.
      return (
        <RequireLogin title={r.title}>
          <BankCourt sport={r.sport} backHref={r.back} />
        </RequireLogin>
      )
    case "quick":
      return <PhysicalQuick sport={r.sport} backHref={r.back} />
    case "practice":
      return <PracticeDrill sport={r.sport} backHref={r.back} />
    default:
      return <PositionQuiz backHref={r.back} />
  }
}
