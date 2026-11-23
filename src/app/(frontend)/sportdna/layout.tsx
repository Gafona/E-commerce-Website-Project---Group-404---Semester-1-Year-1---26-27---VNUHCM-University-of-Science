import type { ReactNode } from "react"
import { SiteHeader } from "../components/SiteHeader"

export default function SportDnaLayout({ children }: { children: ReactNode }) {
  return (
    <main className="search-page min-h-screen bg-dna-paper text-dna-ink">
      <SiteHeader />
      <div className="mx-auto max-w-[1240px] px-5 pb-24 pt-10 md:px-8 md:pt-14">{children}</div>
    </main>
  )
}
