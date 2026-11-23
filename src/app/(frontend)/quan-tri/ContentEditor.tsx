"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw, Save } from "lucide-react"
import type { ContentSectionDef } from "@/lib/site-content-schema"
import { saveSiteContentAction, type AdminResult } from "./actions"
import { useShop } from "../components/ShopProvider"

export type EditorValues = Record<string, { vi: string; en: string }>

const input =
  "w-full border border-[var(--line)] bg-[var(--white)] px-3 py-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[#1677ff]"
const MAX = { text: 200, textarea: 800, lines: 1000, url: 300, phone: 30 } as const

function FieldInput({
  name,
  kind,
  value,
  onChange,
  lang,
}: {
  name: string
  kind: keyof typeof MAX
  value: string
  onChange: (value: string) => void
  lang?: "vi" | "en"
}) {
  const common = {
    name,
    value,
    maxLength: MAX[kind],
    lang,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: input,
  }
  return kind === "textarea" || kind === "lines" ? (
    <textarea {...common} rows={kind === "lines" ? 4 : 3} className={`${input} resize-y leading-5`} />
  ) : (
    <input
      {...common}
      type={kind === "url" ? "url" : kind === "phone" ? "tel" : "text"}
      placeholder={kind === "url" ? "https://…" : undefined}
    />
  )
}

export function ContentEditor({
  page,
  sections,
  initial,
}: {
  page: string
  sections: ContentSectionDef[]
  initial: EditorValues
}) {
  const router = useRouter()
  const { notify } = useShop()
  const [values, setValues] = useState(initial)
  // Last state confirmed by the server; "dirty" compares against this, not the
  // (possibly not yet refreshed) server props.
  const [baseline, setBaseline] = useState(initial)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<AdminResult | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  const set = (key: string, lang: "vi" | "en", value: string) => {
    setResult(null)
    setValues((old) => ({ ...old, [key]: { ...old[key], [lang]: value } }))
  }

  // Leaving mid-save or with unsaved edits would silently drop them.
  useEffect(() => {
    if (!dirty && !pending) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty, pending])

  // Ctrl/Cmd+S saves, like any editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        if (dirty && !pending) formRef.current?.requestSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dirty, pending])

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        const data = new FormData(event.currentTarget)
        const submitted = values
        setResult(null)
        start(async () => {
          const res = await saveSiteContentAction(page, data).catch(() => ({ ok: false, error: "Mất kết nối. Vui lòng thử lại." }))
          setResult(res)
          if (res.ok) {
            setBaseline(submitted)
            notify("Đã lưu nội dung website")
            router.refresh()
          }
        })
      }}
      className="grid gap-3.5 pb-24"
      aria-busy={pending}
    >
      {sections.map((section) => (
        <section key={section.key} className="sc-card p-6">
          <div className="sc-section-head">
            <div>
              <small>{section.fields.length} mục</small>
              <h3>{section.label}</h3>
            </div>
            {section.description && <small className="max-w-[380px] text-right">{section.description}</small>}
          </div>
          <div className="grid gap-4">
            {section.fields.map((field) => {
              const key = `${section.key}.${field.key}`
              const value = values[key] ?? { vi: "", en: "" }
              return (
                <div key={key} className="grid gap-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label htmlFor={`${key}.vi`} className="text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                      {field.label}
                      {!field.optional && <span className="text-[#a42626]"> *</span>}
                    </label>
                    {field.help && <small className="text-[11px] text-[var(--muted)]">{field.help}</small>}
                  </div>
                  {field.single ? (
                    <div id={`${key}.vi`}>
                      <FieldInput name={`${key}.vi`} kind={field.kind} value={value.vi} onChange={(v) => set(key, "vi", v)} />
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="relative" id={`${key}.vi`}>
                        <span className="pointer-events-none absolute top-1.5 right-2 text-[9px] font-bold text-[var(--muted)]">VI</span>
                        <FieldInput name={`${key}.vi`} kind={field.kind} value={value.vi} lang="vi" onChange={(v) => set(key, "vi", v)} />
                      </div>
                      <div className="relative">
                        <span className="pointer-events-none absolute top-1.5 right-2 text-[9px] font-bold text-[var(--muted)]">EN</span>
                        <FieldInput name={`${key}.en`} kind={field.kind} value={value.en} lang="en" onChange={(v) => set(key, "en", v)} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] bg-[var(--white)] px-5 py-3 shadow-[0_-8px_24px_rgba(7,26,51,.08)]">
        <p
          role="status"
          className={`m-0 text-[12px] font-semibold ${pending ? "text-[#0b5ed7]" : result ? (result.ok ? "text-[#1d7a38]" : "text-[#a42626]") : dirty ? "text-[#a46a00]" : "text-[var(--muted)]"}`}
        >
          {pending
            ? "Đang lưu thay đổi… Vui lòng không rời trang."
            : result
              ? result.ok
                ? result.message
                : result.error
              : dirty
                ? "Có thay đổi chưa lưu."
                : "Tiếng Anh để trống sẽ dùng bản tiếng Việt."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={() => {
              setValues(baseline)
              setResult(null)
            }}
            className="inline-flex min-h-9 items-center gap-1.5 border border-[var(--line)] bg-[var(--white)] px-4 text-[12px] font-bold disabled:opacity-50"
          >
            <RotateCcw size={14} /> Hoàn tác
          </button>
          <button
            disabled={!dirty || pending}
            className="inline-flex min-h-9 items-center gap-1.5 bg-[#071a33] px-5 text-[12px] font-bold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {pending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </form>
  )
}
