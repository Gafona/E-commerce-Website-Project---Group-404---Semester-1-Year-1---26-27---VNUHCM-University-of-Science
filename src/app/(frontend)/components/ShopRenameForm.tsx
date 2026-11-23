"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, PencilLine, X } from "lucide-react"
import { renameShopAction } from "../kenh-ban-hang/actions"
import { useShop } from "./ShopProvider"

/**
 * Inline shop rename. `tone="dark"` sits on the navy shop hero; `tone="light"`
 * is the seller-settings card.
 */
export function ShopRenameForm({
  name,
  tone = "light",
}: {
  name: string
  tone?: "dark" | "light"
}) {
  const { tr } = useShop()
  const router = useRouter()
  const [editing, setEditing] = useState(tone === "light")
  const [value, setValue] = useState(name)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const dark = tone === "dark"
  const changed = value.replace(/\s+/g, " ").trim() !== name

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSaved(false)
    start(async () => {
      const result = await renameShopAction(value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setValue(result.name)
      setSaved(true)
      if (dark) setEditing(false)
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name)
          setEditing(true)
        }}
        className="inline-flex items-center gap-1.5 border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/20"
      >
        <PencilLine size={13} /> {tr("Đổi tên shop", "Rename shop")}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <label
        className={`text-[10px] font-black tracking-[.14em] uppercase ${dark ? "text-white/70" : "text-[var(--muted)]"}`}
        htmlFor={`shop-name-${tone}`}
      >
        {tr("Tên shop hiển thị", "Public shop name")}
      </label>
      <div className="flex flex-wrap items-stretch gap-2">
        <input
          id={`shop-name-${tone}`}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
          maxLength={60}
          minLength={2}
          required
          autoFocus={dark}
          className={`min-w-0 flex-1 basis-56 border px-3 py-2.5 text-sm font-semibold outline-none focus:border-[var(--lime)] ${
            dark
              ? "border-white/25 bg-white/10 text-white placeholder:text-white/50"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
          }`}
        />
        <button
          className="boai-button primary"
          disabled={pending || !changed}
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {tr("Lưu tên", "Save name")}
        </button>
        {dark && (
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setError("")
            }}
            className="inline-flex items-center justify-center border border-white/25 px-3 text-white hover:bg-white/10"
            aria-label={tr("Hủy", "Cancel")}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <small className={dark ? "text-white/60" : "text-[var(--muted)]"}>
        {value.trim().length}/60 ·{" "}
        {tr(
          "Tên mới hiển thị ngay trên trang shop và mọi sản phẩm bạn đăng bán.",
          "The new name appears on your shop page and every product you sell.",
        )}
      </small>
      {error && (
        <p className={`m-0 text-xs font-semibold ${dark ? "text-[#ffb4a6]" : "text-[var(--sale)]"}`}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className={`m-0 text-xs font-semibold ${dark ? "text-[#9fd0ff]" : "text-[var(--lime-dark)]"}`}>
          {tr("Đã đổi tên shop.", "Shop renamed.")}
        </p>
      )}
    </form>
  )
}
