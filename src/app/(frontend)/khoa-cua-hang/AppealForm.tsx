"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send } from "lucide-react"
import { submitShopAppealAction } from "./actions"
import { useShop } from "../components/ShopProvider"

export function AppealForm({ remaining }: { remaining: number }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const { tr } = useShop()
  const length = message.trim().length

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    start(async () => {
      const res = await submitShopAppealAction(message).catch(() => ({ ok: false, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again.") }))
      if (res.ok) router.refresh()
      else setError(res.error ?? tr("Không thể gửi kháng cáo.", "Couldn't send the appeal."))
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label htmlFor="appeal" className="text-[12px] font-extrabold tracking-wide uppercase">
        {tr("Nội dung kháng cáo", "Your appeal")}
      </label>
      <textarea
        id="appeal"
        rows={6}
        maxLength={1000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        aria-describedby="appeal-hint"
        placeholder={tr("Trình bày rõ sự việc, những gì bạn đã khắc phục và cam kết của cửa hàng. Có thể kèm mã đơn hàng hoặc liên kết sản phẩm liên quan.", "Explain what happened, what you have fixed and your commitments. You can include related order codes or product links.")}
        className="w-full resize-y border border-[var(--line)] bg-[var(--white)] px-4 py-3 text-[14px] leading-6 text-[var(--ink)] outline-none focus:border-[#1677ff]"
      />
      <div id="appeal-hint" className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
        <span>{tr(`Tối thiểu 20 ký tự · Còn ${remaining} lần kháng cáo`, `At least 20 characters · ${remaining} appeals left`)}</span>
        <span className={length > 0 && length < 20 ? "text-[#a42626]" : ""}>{length}/1000</span>
      </div>
      {error && (
        <p role="alert" className="m-0 border-l-2 border-[#a42626] bg-[#fdecec] px-3 py-2 text-[13px] font-semibold text-[#a42626]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || length < 20}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#071a33] px-6 text-[12px] font-extrabold tracking-wider text-white uppercase transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-start"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />} {tr("Gửi kháng cáo tới BOAI", "Send appeal to BOAI")}
      </button>
    </form>
  )
}
