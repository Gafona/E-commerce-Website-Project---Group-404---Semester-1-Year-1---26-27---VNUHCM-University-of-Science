"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Printer, ShieldCheck } from "lucide-react"
import { useShop } from "../../components/ShopProvider"
import { AUTH_BATCH_MAX } from "@/lib/authenticity"
import { generateAuthCodesAction, setAuthCodeStatusAction } from "./actions"

export function GenerateCodesForm({ products }: { products: { id: string; name: string }[] }) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const [productId, setProductId] = useState(products[0]?.id ?? "")
  const [quantity, setQuantity] = useState("20")
  const [batch, setBatch] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState<{ batchId: string; created: number } | null>(null)
  const [pending, start] = useTransition()
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    start(async () => {
      const result = await generateAuthCodesAction({ productId, quantity: Number(quantity), batch })
      if (!result.ok) return setError(result.error)
      notify(result.message)
      setDone({ batchId: result.batchId, created: result.created })
      router.refresh()
    })
  }
  const field = "h-10 w-full border border-[var(--line)] bg-[var(--white)] px-3 text-sm"
  return (
    <form onSubmit={submit} className="sc-card grid gap-3 p-5 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1.4fr)_auto] md:items-end">
      <label className="grid gap-1 text-xs font-bold">
        {tr("Sản phẩm", "Product")}
        <select className={field} value={productId} onChange={(e) => setProductId(e.target.value)} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold">
        {tr("Số lượng mã", "Quantity")}
        <input className={field} type="number" min={1} max={AUTH_BATCH_MAX} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
      <label className="grid gap-1 text-xs font-bold">
        {tr("Ghi chú lô (không bắt buộc)", "Batch note (optional)")}
        <input className={field} maxLength={60} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder={tr("Ví dụ: Lô nhập tháng 6", "E.g. June shipment")} />
      </label>
      <button type="submit" className="boai-button primary h-10" disabled={pending || !productId}>
        <ShieldCheck size={16} /> {pending ? tr("Đang tạo…", "Creating…") : tr("Tạo mã", "Create codes")}
      </button>
      {error && <p role="alert" className="m-0 text-xs font-semibold text-[var(--sale)] md:col-span-4">{error}</p>}
      {done && (
        <p role="status" className="m-0 flex flex-wrap items-center gap-2 text-xs md:col-span-4">
          {tr(`Đã tạo ${done.created} mã (lô ${done.batchId}).`, `${done.created} codes created (batch ${done.batchId}).`)}
          <Link className="inline-flex items-center gap-1 font-bold text-[var(--lime-dark)]" href={`/kenh-ban-hang/xac-thuc/in?lo=${done.batchId}`} target="_blank">
            <Printer size={14} /> {tr("In danh sách mã kèm QR", "Print codes with QR")}
          </Link>
        </p>
      )}
    </form>
  )
}

export function CodeStatusButton({ id, status }: { id: string; status: string }) {
  const { tr, notify } = useShop()
  const router = useRouter()
  const [pending, start] = useTransition()
  const next = status === "active" ? "revoked" : "active"
  return (
    <button
      type="button"
      disabled={pending}
      className={`text-[11px] font-bold ${next === "revoked" ? "text-[var(--sale)]" : "text-[var(--lime-dark)]"}`}
      onClick={() =>
        start(async () => {
          const result = await setAuthCodeStatusAction(id, next)
          if (!result.ok) return notify(result.error ?? "")
          notify(next === "revoked" ? tr("Đã thu hồi mã.", "Code revoked.") : tr("Đã khôi phục mã.", "Code restored."))
          router.refresh()
        })
      }
    >
      {next === "revoked" ? tr("Thu hồi", "Revoke") : tr("Khôi phục", "Restore")}
    </button>
  )
}
