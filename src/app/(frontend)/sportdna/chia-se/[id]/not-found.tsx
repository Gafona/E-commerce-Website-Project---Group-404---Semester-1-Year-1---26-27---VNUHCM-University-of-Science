import Link from "next/link"
import { Link2Off } from "lucide-react"
import { getTr } from "@/lib/i18n-server"

/** Revoked or unknown SportDNA links. */
export default async function DnaShareNotFound() {
  const tr = await getTr()
  return (
    <div className="mx-auto grid max-w-xl justify-items-center gap-3 py-16 text-center">
      <span className="grid size-14 place-items-center bg-dna-surface text-skill">
        <Link2Off size={26} />
      </span>
      <h1 className="m-0 font-head text-4xl font-black uppercase italic leading-none">{tr("Liên kết không còn được chia sẻ", "This link is no longer shared")}</h1>
      <p className="m-0 text-sm leading-6 text-dna-muted">
        {tr("Người chia sẻ đã thu hồi kết quả này, hoặc đường dẫn không đúng.", "The owner revoked this result, or the address is wrong.")}
      </p>
      <Link href="/sportdna" className="mt-2 flex h-11 items-center bg-skill px-6 text-[11px] font-extrabold uppercase text-white">
        {tr("Làm bài test SportDNA của bạn", "Take your own SportDNA test")}
      </Link>
    </div>
  )
}
