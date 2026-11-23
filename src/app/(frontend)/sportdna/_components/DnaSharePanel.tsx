"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Copy, ExternalLink, Globe2, Link2, Loader2, LogIn, MessageCircle, Share2, Users } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { createDnaShareAction } from "../share-actions"

const action =
  "flex min-h-11 items-center justify-center gap-2 border border-dna-line bg-dna-paper px-3 text-[11px] font-extrabold uppercase tracking-wide transition hover:border-dna-ink disabled:cursor-wait disabled:opacity-60"

/**
 * Share a SportDNA result: post it to the community (composer opens with the
 * result card attached) or create a public read-only link for Facebook, Zalo,
 * copy or the device share sheet.
 */
export function DnaSharePanel({ sport, signedIn, returnTo }: { sport: "badminton" | "football"; signedIn: boolean; returnTo: string }) {
  const { tr } = useShop()
  const [link, setLink] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  const createLink = () => {
    setError("")
    setNotice("")
    start(async () => {
      const res = await createDnaShareAction(sport, "elo").catch(() => ({ ok: false as const, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again.") }))
      if (res.ok) setLink(`${window.location.origin}${res.path}`)
      else setError(res.error)
    })
  }
  const copy = async () => {
    if (!link) return false
    try {
      await navigator.clipboard.writeText(link)
      setNotice(tr("Đã sao chép liên kết.", "Link copied."))
      return true
    } catch {
      setNotice(link)
      return false
    }
  }
  const deviceShare = async (app?: string) => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({ title: tr("Kết quả SportDNA của mình trên BOAI", "My SportDNA result on BOAI"), url: link })
        return
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
      }
    }
    const copied = await copy()
    if (app)
      setNotice(
        tr(
          `${copied ? "Đã sao chép liên kết." : link} Mở ${app} và dán liên kết để gửi. Trên điện thoại, chọn ${app} trong bảng chia sẻ nếu có.`,
          `${copied ? "Link copied." : link} Open ${app} and paste the link. On mobile, pick ${app} in the share sheet when available.`,
        ),
      )
  }

  return (
    <section className="border border-dna-line bg-dna-surface p-6" aria-labelledby={`chia-se-${sport}`}>
      <h2 id={`chia-se-${sport}`} className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]">
        <Share2 size={15} /> {tr("Chia sẻ kết quả", "Share your result")}
      </h2>
      <p className="m-0 mt-2 max-w-2xl text-xs leading-5 text-dna-muted">
        {tr(
          "Liên kết mở một trang chỉ đọc với ELO, bậc và 8 trục kỹ năng của lần làm mới nhất. Tên và ảnh đại diện chỉ hiện khi hồ sơ cộng đồng của bạn đang công khai; bạn có thể thu hồi liên kết trong Cài đặt.",
          "The link opens a read-only page with the ELO, tier and 8 skill axes of your latest attempt. Your name and photo appear only while your community profile is public; revoke the link anytime in Settings.",
        )}
      </p>
      {!signedIn ? (
        <Link href={`/dang-nhap?next=${encodeURIComponent(returnTo)}`} className={`${action} mt-4 w-full sm:w-auto sm:px-6`}>
          <LogIn size={15} /> {tr("Đăng nhập để chia sẻ kết quả", "Sign in to share your result")}
        </Link>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={`/tai-khoan?chia-se=elo&mon=${sport}#dang-bai`} className={`${action} border-dna-ink bg-dna-ink text-white hover:bg-black`}>
              <Users size={15} /> {tr("Đăng lên cộng đồng", "Post to the community")}
            </Link>
            {!link && (
              <button type="button" className={action} onClick={createLink} disabled={pending}>
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
                {pending ? tr("Đang tạo liên kết…", "Creating link…") : tr("Tạo liên kết chia sẻ", "Create share link")}
              </button>
            )}
          </div>
          {link && (
            <div className="grid gap-2">
              <label className="grid gap-1 text-[10px] font-extrabold uppercase tracking-wider text-dna-muted">
                {tr("Liên kết công khai", "Public link")}
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="h-10 border border-dna-line bg-dna-paper px-3 font-mono text-xs normal-case tracking-normal text-dna-ink" />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  className={action}
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank", "noopener,noreferrer")}
                >
                  <Globe2 size={15} /> Facebook
                </button>
                <button type="button" className={action} onClick={() => void deviceShare("Zalo")}>
                  <MessageCircle size={15} /> Zalo
                </button>
                <button type="button" className={action} onClick={() => void copy()}>
                  <Copy size={15} /> {tr("Sao chép", "Copy")}
                </button>
                <button type="button" className={action} onClick={() => void deviceShare()}>
                  <ExternalLink size={15} /> {tr("Ứng dụng khác", "More apps")}
                </button>
              </div>
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-skill">
                {tr("Xem trang chia sẻ", "Open the shared page")} ↗
              </a>
            </div>
          )}
        </div>
      )}
      {notice && <p role="status" className="m-0 mt-3 break-all bg-dna-paper p-3 text-xs">{notice}</p>}
      {error && <p role="alert" className="m-0 mt-3 text-xs font-bold text-red-600">{error}</p>}
    </section>
  )
}
