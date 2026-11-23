"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ImagePlus, Loader2, Megaphone, PanelTop, SquareStack, X } from "lucide-react"
import { ANNOUNCEMENT_TONE, type AnnouncementTheme } from "@/lib/announcement-tones"
import { saveAnnouncementAction, type AdminResult } from "./actions"
import { EMPTY_ANNOUNCEMENT, type AnnouncementDraft } from "./announcement-draft"
import { ASPECTS, setInputFiles, useImageCropper } from "../components/ImageCropper"
import { AnnouncementPopupCard, previewCta, ScaledPreview } from "../components/AnnouncementPopupCard"

const THEMES: { value: AnnouncementTheme; label: string; swatch: string }[] = [
  { value: "brand", label: "Xanh BOAI", swatch: "bg-[#1677ff]" },
  { value: "dark", label: "Navy", swatch: "bg-[#071a33]" },
  { value: "sale", label: "Khuyến mãi", swatch: "bg-[#df462c]" },
  { value: "light", label: "Sáng", swatch: "bg-[#eef5ff] ring-1 ring-inset ring-[#c9dcf5]" },
]

const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const label = "grid gap-1.5 text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase"
const input = "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[#1677ff]"

function Choice({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-[12px] font-semibold normal-case tracking-normal transition ${checked ? "border-[#071a33] bg-[#071a33] text-white" : "border-[var(--line)] bg-[var(--white)] text-[var(--ink)] hover:border-[#071a33]"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}

export function AnnouncementForm({ initial }: { initial: AnnouncementDraft }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<AdminResult | null>(null)
  const [draft, setDraft] = useState(initial)
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [preview, setPreview] = useState<string | null>(initial.imageUrl)
  const [removeImage, setRemoveImage] = useState(false)
  const { cropImage, cropper } = useImageCropper()
  const editing = Boolean(initial.id)

  // Datetime inputs use the admin's own timezone, which only the browser knows.
  // The page keys this form by announcement id, so this runs once per record.
  useEffect(() => {
    setStartAt(toLocalInput(initial.startAt))
    setEndAt(toLocalInput(initial.endAt))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const tone = ANNOUNCEMENT_TONE[draft.theme]

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    data.set("tzOffset", String(new Date().getTimezoneOffset()))
    if (removeImage) data.set("removeImage", "on")
    start(async () => {
      const res = await saveAnnouncementAction(data).catch(() => ({ ok: false, error: "Mất kết nối. Vui lòng thử lại." }))
      setResult(res)
      if (!res.ok) return
      if (editing) router.push("/quan-tri/thong-bao")
      else {
        form.reset()
        setDraft(EMPTY_ANNOUNCEMENT)
        setStartAt("")
        setEndAt("")
        setPreview(null)
      }
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(e.currentTarget)
      }}
      className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid content-start gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className={label}>
            Kiểu hiển thị
            <div className="grid grid-cols-2 gap-1.5">
              <Choice name="displayType" value="popup" checked={draft.displayType === "popup"} onChange={() => set("displayType", "popup")}>
                <SquareStack size={15} /> Pop-up
              </Choice>
              <Choice name="displayType" value="banner" checked={draft.displayType === "banner"} onChange={() => set("displayType", "banner")}>
                <PanelTop size={15} /> Thanh đầu trang
              </Choice>
            </div>
          </div>
          <div className={label}>
            Phạm vi
            <div className="grid grid-cols-2 gap-1.5">
              <Choice name="scope" value="home" checked={draft.scope === "home"} onChange={() => set("scope", "home")}>Trang chủ</Choice>
              <Choice name="scope" value="all" checked={draft.scope === "all"} onChange={() => set("scope", "all")}>Toàn website</Choice>
            </div>
          </div>
        </div>

        <label className={label}>
          Tiêu đề
          <input name="title" required minLength={3} maxLength={120} value={draft.title} onChange={(e) => set("title", e.target.value)} className={input} placeholder="Siêu sale World Cup — giảm đến 40%" />
        </label>
        <label className={label}>
          Nội dung <span className="justify-self-end font-normal normal-case">{draft.message.length}/600</span>
          <textarea name="message" required minLength={5} maxLength={600} rows={4} value={draft.message} onChange={(e) => set("message", e.target.value)} className={input} placeholder="Mô tả ngắn gọn ưu đãi, thời gian và cách tham gia." />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>
            Nhãn nút (tuỳ chọn)
            <input name="ctaLabel" maxLength={40} value={draft.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={input} placeholder="Mua ngay" />
          </label>
          <label className={label}>
            Đường dẫn nút
            <input name="ctaHref" maxLength={300} value={draft.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} className={input} placeholder="/giam-gia" />
          </label>
        </div>

        <div className={label}>
          Màu sắc
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((theme) => (
              <Choice key={theme.value} name="theme" value={theme.value} checked={draft.theme === theme.value} onChange={() => set("theme", theme.value)}>
                <span className={`size-3.5 ${theme.swatch}`} /> {theme.label}
              </Choice>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>
            Bắt đầu (để trống = ngay)
            <input type="datetime-local" name="startAt" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={input} />
          </label>
          <label className={label}>
            Kết thúc (để trống = không hạn)
            <input type="datetime-local" name="endAt" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={input} />
          </label>
        </div>

        <div className={label}>
          Ảnh minh họa (pop-up)
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 border border-dashed border-[var(--line)] px-4 py-3 text-[12px] font-semibold normal-case tracking-normal text-[var(--ink)] hover:border-[#1677ff]">
              <ImagePlus size={16} /> Chọn ảnh
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const input = e.target
                  const file = input.files?.[0]
                  if (!file) return
                  const cropped = await cropImage(file, {
                    title: "Cắt ảnh thông báo",
                    aspects: [ASPECTS.landscape, ASPECTS.wide, ASPECTS.square, ASPECTS.original],
                  })
                  if (!cropped) {
                    input.value = ""
                    return
                  }
                  setInputFiles(input, [cropped])
                  setPreview(URL.createObjectURL(cropped))
                  setRemoveImage(false)
                }}
              />
              {cropper}
            </label>
            {preview && (
              <button type="button" onClick={() => { setPreview(null); setRemoveImage(true) }} className="inline-flex items-center gap-1 text-[11px] font-semibold normal-case tracking-normal text-[#a42626]">
                <X size={13} /> Bỏ ảnh
              </button>
            )}
            <small className="font-normal normal-case tracking-normal">JPG, PNG, WebP · tối đa 5 MB</small>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold">
            <input type="checkbox" name="active" checked={draft.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[#1677ff]" />
            Bật hiển thị
          </label>
          <div className="flex items-center gap-3">
            {result && <p role="status" className={`m-0 text-[12px] font-semibold ${result.ok ? "text-[#1d7a38]" : "text-[#a42626]"}`}>{result.ok ? result.message : result.error}</p>}
            {editing && (
              <button type="button" className="min-h-11 px-4 text-[11px] font-bold uppercase text-[var(--muted)]" onClick={() => router.push("/quan-tri/thong-bao")}>
                Hủy
              </button>
            )}
            <button type="submit" disabled={pending} className="boai-button primary min-h-11">
              {pending && <Loader2 size={14} className="animate-spin" />} {editing ? "Lưu thay đổi" : "Đăng thông báo"}
            </button>
          </div>
        </div>
      </div>

      {/* Live preview mirrors the storefront component styling. */}
      <aside className="grid content-start gap-2">
        <span className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">Xem trước</span>
        <div className="relative overflow-hidden border border-[var(--line)] bg-[repeating-linear-gradient(135deg,var(--paper)_0_10px,var(--soft-blue)_10px_11px)]">
          {draft.displayType === "banner" ? (
            <div className="min-h-[300px]">
              <div className={`flex items-center gap-2 px-4 py-2.5 text-[12px] ${tone.surface}`}>
                <Megaphone size={14} className="shrink-0" />
                <p className="m-0 min-w-0 truncate">
                  <b className="font-extrabold uppercase">{draft.title || "Tiêu đề thông báo"}</b>
                  <span className="mx-2 opacity-50">/</span>
                  <span className="opacity-90">{draft.message || "Nội dung thông báo"}</span>
                </p>
                {draft.ctaLabel && <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-extrabold underline">{draft.ctaLabel} <ArrowRight size={12} /></span>}
                <X size={14} className="ml-2 shrink-0 opacity-70" />
              </div>
              <div className="grid gap-2 p-5 opacity-50">
                <span className="h-4 w-32 bg-[var(--line)]" />
                <span className="h-24 w-full bg-[var(--line)]" />
                <span className="h-3 w-2/3 bg-[var(--line)]" />
              </div>
            </div>
          ) : (
            // Same component as the storefront, rendered at full size and scaled to fit.
            <div className="bg-[#030b17]/70 p-5">
              <ScaledPreview>
                <AnnouncementPopupCard
                  preview
                  content={{
                    title: draft.title || "Tiêu đề thông báo",
                    message: draft.message || "Nội dung thông báo sẽ hiển thị ở đây.",
                    scope: draft.scope,
                    theme: draft.theme,
                    imageUrl: preview,
                  }}
                  cta={draft.ctaLabel && draft.ctaHref ? previewCta(draft.ctaLabel) : undefined}
                />
              </ScaledPreview>
            </div>
          )}
        </div>
        <p className="m-0 text-[11px] leading-5 text-[var(--muted)]">
          Mỗi khách chỉ thấy pop-up một lần cho mỗi phiên bản; khi bạn chỉnh sửa, thông báo sẽ hiện lại cho mọi người.
        </p>
      </aside>
    </form>
  )
}
