"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { ArrowRight, CloudUpload, LockKeyhole } from "lucide-react"
import { useSportDnaContext } from "../../components/MatchBadge"

const authHref = (path: string, page: "dang-nhap" | "dang-ky") => `/${page}?next=${encodeURIComponent(path)}`

/** ELO-rated tests: only signed-in members can start, so every rating belongs to an account. */
export function RequireLogin({ title, children }: { title: string; children: ReactNode }) {
  const { authenticated } = useSportDnaContext()
  const path = usePathname()
  if (authenticated === null) return <p className="m-0 py-10 text-sm text-dna-muted">Đang kiểm tra đăng nhập…</p>
  if (authenticated) return <>{children}</>
  return (
    <section className="animate-rise-in max-w-2xl border border-dna-line bg-dna-surface p-6 md:p-10">
      <span className="grid size-12 place-items-center bg-court text-white"><LockKeyhole size={22} /></span>
      <p className="m-0 mt-6 text-[10px] font-extrabold uppercase tracking-[0.18em] text-skill">Bài có tính ELO · cần đăng nhập</p>
      <h1 className="m-0 mt-2 font-head text-4xl font-black uppercase leading-none md:text-5xl">{title}</h1>
      <p className="m-0 mt-4 max-w-lg text-sm leading-relaxed text-dna-muted">
        Bài này cập nhật ELO trên hồ sơ thể thao, nên bạn cần đăng nhập trước khi bắt đầu. Các bài Quick, luyện tập và gợi ý vị trí vẫn làm được mà không cần tài khoản.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={authHref(path, "dang-nhap")} className="group flex h-12 items-center gap-2 bg-skill px-7 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-court">
          Đăng nhập để bắt đầu <ArrowRight size={14} className="transition group-hover:translate-x-1" />
        </Link>
        <Link href={authHref(path, "dang-ky")} className="flex h-12 items-center border border-dna-line px-6 text-[11px] font-extrabold uppercase tracking-wide hover:border-dna-ink">
          Tạo tài khoản
        </Link>
        <Link href="/sportdna" className="flex h-12 items-center px-3 text-[11px] font-bold uppercase text-dna-muted hover:text-dna-ink">Quay lại SportDNA</Link>
      </div>
    </section>
  )
}

/** Non-ELO tests: guests can play, but results are only saved after signing in. */
export function SaveLoginPrompt({ returnTo }: { returnTo?: string }) {
  const { authenticated } = useSportDnaContext()
  const path = usePathname()
  if (authenticated !== false) return null
  const target = returnTo ?? path
  return (
    <div role="status" className="animate-rise-in mt-6 flex flex-wrap items-center gap-4 border border-skill/40 bg-skill/5 p-4">
      <CloudUpload size={20} className="shrink-0 text-skill" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold">Kết quả chưa được lưu</p>
        <p className="m-0 mt-0.5 text-xs leading-relaxed text-dna-muted">Đăng nhập để lưu bài làm này vào hồ sơ thể thao và cập nhật mạng nhện cá nhân.</p>
      </div>
      <Link href={authHref(target, "dang-nhap")} className="flex h-10 items-center gap-2 bg-skill px-5 text-[11px] font-extrabold uppercase tracking-wide text-white hover:bg-court">
        Đăng nhập để lưu <ArrowRight size={13} />
      </Link>
    </div>
  )
}
