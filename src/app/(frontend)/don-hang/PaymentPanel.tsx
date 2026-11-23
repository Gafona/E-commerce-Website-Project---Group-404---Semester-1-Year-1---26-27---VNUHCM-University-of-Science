"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BadgeCheck, Clock3, QrCode } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { claimTransferAction } from "../shop-actions"
import { CopyValue } from "./TransferInstructions"

const money = new Intl.NumberFormat("vi-VN")

/** VietQR payment for a transfer order: one QR for the whole order, paid to BOAI. */
export function PaymentPanel({
  code,
  amount,
  qrUrl,
  bankName,
  accountNumber,
  accountName,
  claimedAt,
  automatic,
}: {
  code: string
  amount: number
  qrUrl: string | null
  bankName: string
  accountNumber: string
  accountName: string
  claimedAt: string | null
  /** A bank webhook confirms transfers automatically. */
  automatic: boolean
}) {
  const { tr, lang } = useShop()
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const claimedText = claimedAt
    ? new Date(claimedAt).toLocaleString(lang === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : ""
  return (
    <section className="mb-5 grid gap-5 border-2 border-[var(--lime)] bg-[var(--white)] p-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:p-5" aria-label={tr("Thanh toán chuyển khoản", "Bank transfer payment")}>
      <div className="grid content-start justify-items-center gap-2">
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt={tr(`Mã VietQR thanh toán đơn ${code}`, `VietQR code for order ${code}`)}
            width={200}
            height={200}
            className="h-auto w-full max-w-[200px] border border-[var(--line)] bg-white"
            unoptimized
          />
        ) : (
          <span className="grid aspect-square w-full max-w-[200px] place-items-center bg-[var(--soft-blue)] text-[var(--lime-dark)]">
            <QrCode size={44} />
          </span>
        )}
        <small className="text-center text-[10px] text-[var(--muted)]">{tr("Mở app ngân hàng → Quét QR", "Open your banking app → Scan QR")}</small>
      </div>
      <div className="min-w-0">
        <b className="block text-base">{tr("Quét mã để thanh toán đơn hàng", "Scan to pay for your order")}</b>
        <p className="m-0 mt-1 mb-2 text-xs leading-5 text-[var(--muted)]">
          {tr(
            "Mã QR đã có sẵn số tiền và nội dung. Nếu chuyển tay, hãy nhập đúng số tiền và nội dung bên dưới để đơn được xác nhận.",
            "The QR already contains the amount and reference. If you type it in manually, use the exact amount and reference below.",
          )}
        </p>
        <CopyValue label={tr("Số tiền", "Amount")} value={String(amount)} display={`${money.format(amount)}₫`} />
        <CopyValue label={tr("Nội dung chuyển khoản", "Transfer reference")} value={code} />
        <CopyValue label={tr("Số tài khoản", "Account number")} value={accountNumber} />
        <CopyValue label={tr("Ngân hàng", "Bank")} value={bankName} />
        <CopyValue label={tr("Chủ tài khoản", "Account holder")} value={accountName} />
        {claimedAt ? (
          <p className="m-0 mt-3 flex items-start gap-2 border border-sky-300 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200" role="status">
            <Clock3 size={15} className="mt-0.5 shrink-0" />
            <span>
              {tr(`Bạn đã báo chuyển khoản lúc ${claimedText}. BOAI đang kiểm tra và sẽ xác nhận sớm.`, `You reported the transfer at ${claimedText}. BOAI is checking and will confirm shortly.`)}
            </span>
          </p>
        ) : (
          <button
            type="button"
            className="boai-button primary mt-3"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError("")
                const result = await claimTransferAction(code).catch(() => ({ ok: false, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please retry.") }))
                if (!result.ok) return setError(result.error ?? tr("Không thể gửi xác nhận.", "Couldn't send the confirmation."))
                router.refresh()
              })
            }
          >
            <BadgeCheck size={16} /> {pending ? tr("Đang gửi…", "Sending…") : tr("Tôi đã chuyển khoản", "I've transferred")}
          </button>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="m-0 mt-3 text-[11px] leading-5 text-[var(--muted)]">
          {automatic
            ? tr("Hệ thống tự xác nhận khi tiền về tài khoản BOAI (thường trong 1–2 phút).", "The system confirms automatically when the money reaches BOAI (usually 1–2 minutes).")
            : tr(
                "BOAI xác nhận thủ công khi tiền về (thường trong 30 phút, giờ làm việc). Đơn chỉ được gửi cho shop sau khi BOAI nhận tiền.",
                "BOAI confirms manually when the money arrives (usually within 30 minutes during business hours). Shops receive the order only after BOAI has the money.",
              )}
        </p>
      </div>
    </section>
  )
}
