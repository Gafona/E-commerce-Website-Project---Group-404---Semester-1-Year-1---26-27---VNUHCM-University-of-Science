"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, CheckCircle2, Clock3, Copy, Landmark } from "lucide-react"
import { vietQrUrl } from "@/lib/banks"
import { useShop } from "../components/ShopProvider"

export type TransferEntry = {
  id: string
  shopName: string
  amount: number
  bankCode: string
  bankName: string
  accountNumber: string
  accountHolder: string
  transferNote: string
  status: "awaiting" | "paid"
}

const money = new Intl.NumberFormat("vi-VN")

export function CopyValue({ label, value, display }: { label: string; value: string; display?: string }) {
  const { tr } = useShop()
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2 last:border-0">
      <span className="min-w-0">
        <small className="block text-[10px] font-semibold text-[var(--muted)]">{label}</small>
        <b className="block truncate text-sm">{display ?? value}</b>
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            setCopied(false)
          }
        }}
        className="inline-flex shrink-0 items-center gap-1 border border-[var(--line)] px-2 py-1 text-[10px] font-bold text-[var(--lime-dark)] hover:border-[var(--lime)]"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? tr("Đã chép", "Copied") : tr("Sao chép", "Copy")}
      </button>
    </div>
  )
}

/** Bank-transfer details for each shop in an order, paid directly to the shop. */
export function TransferInstructions({ entries }: { entries: TransferEntry[] }) {
  const { tr } = useShop()
  return (
    <section className="mt-5 grid gap-4">
      <div>
        <b className="flex items-center gap-2 text-sm">
          <Landmark size={17} className="text-[var(--lime-dark)]" />
          {tr("Chuyển khoản trực tiếp cho shop", "Transfer directly to the shop")}
        </b>
        <p className="m-0 mt-1 text-xs leading-5 text-[var(--muted)]">
          {tr(
            "Quét mã QR bằng ứng dụng ngân hàng hoặc chuyển đúng số tiền và nội dung bên dưới. Shop sẽ xác nhận khi nhận được tiền.",
            "Scan the QR code in your banking app, or transfer the exact amount and reference below. The shop confirms once the money arrives.",
          )}
        </p>
      </div>
      {entries.map((entry) => {
        const qr = vietQrUrl({ ...entry, note: entry.transferNote })
        const paid = entry.status === "paid"
        return (
          <article key={entry.id} className="grid gap-4 border border-[var(--line)] bg-[var(--white)] p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="grid content-start justify-items-center gap-2">
              {qr && !paid ? (
                <Image
                  src={qr}
                  alt={tr(`Mã QR chuyển khoản cho ${entry.shopName}`, `Transfer QR code for ${entry.shopName}`)}
                  width={180}
                  height={180}
                  className="h-auto w-full max-w-[180px] border border-[var(--line)] bg-white"
                  unoptimized
                />
              ) : (
                <span className="grid aspect-square w-full max-w-[180px] place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">
                  <CheckCircle2 size={44} />
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase ${
                  paid ? "bg-[#e3f7ec] text-[#127a43]" : "bg-[#fff3df] text-[#9a5a00]"
                }`}
              >
                {paid ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                {paid ? tr("Shop đã nhận tiền", "Paid") : tr("Chờ chuyển khoản", "Awaiting transfer")}
              </span>
            </div>
            <div className="min-w-0">
              <small className="text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
                {entry.shopName}
              </small>
              <CopyValue label={tr("Số tiền", "Amount")} value={String(entry.amount)} display={`${money.format(entry.amount)}₫`} />
              <CopyValue label={tr("Ngân hàng", "Bank")} value={entry.bankName} />
              <CopyValue label={tr("Số tài khoản", "Account number")} value={entry.accountNumber} />
              <CopyValue label={tr("Chủ tài khoản", "Account holder")} value={entry.accountHolder} />
              <CopyValue label={tr("Nội dung chuyển khoản", "Transfer reference")} value={entry.transferNote} />
            </div>
          </article>
        )
      })}
    </section>
  )
}
