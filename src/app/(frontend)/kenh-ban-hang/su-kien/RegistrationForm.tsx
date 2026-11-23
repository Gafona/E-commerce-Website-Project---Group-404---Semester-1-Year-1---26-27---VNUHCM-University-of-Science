"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useMemo, useState } from "react"
import { BadgePercent, Check, RotateCcw, Search, Undo2 } from "lucide-react"
import { MIN_EVENT_DISCOUNT, salePrice } from "@/lib/event-rules"
import { useShop } from "../../components/ShopProvider"
import { saveRegistrationAction, type SaleItemDraft } from "./actions"

export type ProductOption = { id: string; name: string; price: number; image?: string; eligible: boolean }
export type ExistingItem = {
  id: string
  product: string
  discountPercent: number
  quota: number | null
  sold: number
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reviewNote: string | null
}
type Row = { selected: boolean; discount: string; quota: string; withdraw: boolean; resubmit: boolean }

const money = new Intl.NumberFormat("vi-VN")
const STATUS_TONE: Record<ExistingItem["status"], string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-green-50 text-green-700 ring-green-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  withdrawn: "bg-slate-100 text-slate-600 ring-slate-200",
}

/**
 * Per-product event offer: each product has its own discount (within the
 * event ceiling) and optional number of units. Approved products are live
 * for buyers and can only be withdrawn; rejected ones can be edited and re-sent.
 */
export function RegistrationForm({
  eventId,
  cap,
  allowedLabel,
  products,
  items,
}: {
  eventId: string
  cap: number
  /** Product groups the event accepts (null = every group). */
  allowedLabel: string | null
  products: ProductOption[]
  items: ExistingItem[]
}) {
  const router = useRouter()
  const { tr } = useShop()
  const [state, action, pending] = useActionState(saveRegistrationAction, { ok: false })
  const existing = useMemo(() => new Map(items.map((item) => [item.product, item])), [items])
  const initialRows = () =>
    Object.fromEntries(
      products.map((product) => {
        const item = existing.get(product.id)
        return [
          product.id,
          {
            selected: !!item && (item.status === "pending" || item.status === "approved"),
            discount: String(item?.discountPercent ?? Math.min(cap, 10)),
            quota: item?.quota ? String(item.quota) : "",
            withdraw: false,
            resubmit: false,
          } satisfies Row,
        ]
      }),
    )
  const [rows, setRows] = useState<Record<string, Row>>(initialRows)
  const [bulk, setBulk] = useState(String(Math.min(cap, 10)))
  const [query, setQuery] = useState("")
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [router, state])
  // After a save the server sends fresh rows; start from them again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRows(initialRows()), [items])

  const patch = (id: string, next: Partial<Row>) => setRows((current) => ({ ...current, [id]: { ...current[id], ...next } }))
  const validDiscount = (value: string) => {
    const n = Number(value)
    return Number.isInteger(n) && n >= MIN_EVENT_DISCOUNT && n <= cap
  }
  const validQuota = (value: string) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 100000)

  // What the form sends: new/pending selections, approved rows (maybe withdrawn), re-sent rejected rows.
  const drafts: SaleItemDraft[] = products.flatMap((product) => {
    const row = rows[product.id]
    const item = existing.get(product.id)
    if (!row) return []
    const base = {
      ...(item ? { id: item.id } : {}),
      product: product.id,
      discountPercent: Number(row.discount),
      quota: row.quota === "" ? null : Number(row.quota),
    }
    if (item?.status === "approved") return [{ ...base, discountPercent: item.discountPercent, quota: item.quota, withdraw: row.withdraw }]
    if (item && (item.status === "rejected" || item.status === "withdrawn")) return row.resubmit ? [{ ...base, resubmit: true }] : []
    return row.selected ? [base] : []
  })
  const editable = drafts.filter((d) => !d.withdraw && existing.get(d.product)?.status !== "approved")
  const invalid = editable.some((d) => !validDiscount(String(d.discountPercent)) || !validQuota(d.quota === null ? "" : String(d.quota)))
  const changed = drafts.some((d) => {
    const item = existing.get(d.product)
    return !item || d.withdraw || d.resubmit || item.discountPercent !== d.discountPercent || (item.quota ?? null) !== d.quota
  }) || items.some((item) => item.status === "pending" && !drafts.some((d) => d.product === item.product))
  const fold = (text: string) => text.toLocaleLowerCase("vi")
  const visible = products.filter((product) => fold(product.name).includes(fold(query)))
  const selectedCount = drafts.filter((d) => !d.withdraw).length

  return (
    <form action={action} className="grid gap-5 border border-[var(--line)] bg-[var(--white)] p-5 lg:p-7">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="items" value={JSON.stringify(drafts)} />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
            <BadgePercent size={14} /> {tr("Ưu đãi của shop", "Your shop offer")}
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            {items.length ? tr("Sản phẩm tham gia", "Products in this event") : tr("Đăng ký tham gia", "Register for this event")}
          </h2>
          <p className="m-0 mt-1 text-xs text-[var(--muted)]">
            {tr(
              `Mỗi sản phẩm có mức giảm riêng từ ${MIN_EVENT_DISCOUNT}% đến ${cap}% (trần của sự kiện) và số suất tùy chọn.`,
              `Each product gets its own discount from ${MIN_EVENT_DISCOUNT}% to ${cap}% (the event ceiling) and optional units.`,
            )}
            {allowedLabel ? ` ${tr("Nhóm được tham gia:", "Eligible groups:")} ${allowedLabel}.` : ""}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[10px] font-extrabold tracking-wide uppercase">
            {tr("Áp dụng cho mục đã chọn", "Apply to selected")}
            <span className="mt-1.5 flex h-11 w-28 items-center border border-[var(--line)] bg-[var(--white)]">
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-lg font-black outline-none"
                type="number"
                inputMode="numeric"
                min={MIN_EVENT_DISCOUNT}
                max={cap}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                aria-label={tr("Mức giảm chung", "Shared discount")}
              />
              <b className="pr-3">%</b>
            </span>
          </label>
          <button
            type="button"
            className="boai-button min-h-11"
            disabled={!validDiscount(bulk)}
            onClick={() =>
              setRows((current) =>
                Object.fromEntries(
                  Object.entries(current).map(([id, row]) => {
                    const status = existing.get(id)?.status
                    const target = (row.selected && status !== "approved") || row.resubmit
                    return [id, target ? { ...row, discount: bulk } : row]
                  }),
                ),
              )
            }
          >
            {tr("Áp dụng", "Apply")}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border border-[var(--line)] bg-[var(--paper)] px-3">
        <Search size={17} className="text-[var(--muted)]" />
        <input
          className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("Tìm trong sản phẩm của cửa hàng...", "Search your products...")}
          aria-label={tr("Tìm sản phẩm", "Search products")}
        />
        <b className="shrink-0 text-xs">{tr(`${selectedCount} đã chọn`, `${selectedCount} selected`)}</b>
      </div>

      {products.length ? (
        <ul className="m-0 grid max-h-[36rem] list-none gap-2 overflow-y-auto p-0 pr-1">
          {visible.map((product) => {
            const row = rows[product.id]
            const item = existing.get(product.id)
            const status = item?.status
            const approved = status === "approved"
            const reviewed = status === "rejected" || status === "withdrawn"
            const active = approved ? !row.withdraw : reviewed ? row.resubmit : row.selected
            const locked = approved || (reviewed && !row.resubmit) || (!item && !product.eligible)
            const discount = approved ? item!.discountPercent : Number(row.discount)
            const preview = validDiscount(String(discount)) ? salePrice(product.price, discount) : null
            const statusLabel = status
              ? {
                  pending: tr("Chờ BOAI duyệt", "Awaiting review"),
                  approved: tr("Đã duyệt", "Approved"),
                  rejected: tr("Bị từ chối", "Rejected"),
                  withdrawn: tr("Đã rút", "Withdrawn"),
                }[status]
              : null
            return (
              <li
                key={product.id}
                className={`grid gap-3 border p-3 transition sm:grid-cols-[auto_3.5rem_minmax(0,1fr)_auto] sm:items-center ${
                  active ? "border-[var(--lime-dark)] bg-lime-50/60" : "border-[var(--line)] bg-[var(--white)]"
                }`}
              >
                <span className="flex items-center">
                  {approved ? (
                    <button
                      type="button"
                      className={`flex h-9 items-center gap-1.5 border px-2.5 text-[11px] font-bold ${row.withdraw ? "border-red-300 bg-red-50 text-red-700" : "border-[var(--line)]"}`}
                      onClick={() => patch(product.id, { withdraw: !row.withdraw })}
                      aria-pressed={row.withdraw}
                    >
                      <Undo2 size={13} /> {row.withdraw ? tr("Sẽ rút", "Will withdraw") : tr("Rút", "Withdraw")}
                    </button>
                  ) : reviewed ? (
                    <button
                      type="button"
                      className={`flex h-9 items-center gap-1.5 border px-2.5 text-[11px] font-bold ${row.resubmit ? "border-[var(--lime-dark)] bg-[var(--lime-dark)] text-white" : "border-[var(--line)]"}`}
                      onClick={() => patch(product.id, { resubmit: !row.resubmit })}
                      aria-pressed={row.resubmit}
                    >
                      <RotateCcw size={13} /> {tr("Gửi lại", "Re-send")}
                    </button>
                  ) : (
                    <label className={`grid size-9 place-items-center border ${row.selected ? "border-[var(--lime-dark)] bg-[var(--lime-dark)] text-white" : "border-[var(--line)]"} ${locked ? "opacity-40" : "cursor-pointer"}`}>
                      <input
                        className="sr-only"
                        type="checkbox"
                        checked={row.selected}
                        disabled={locked}
                        onChange={(e) => patch(product.id, { selected: e.target.checked })}
                        aria-label={tr(`Chọn ${product.name}`, `Select ${product.name}`)}
                      />
                      {row.selected && <Check size={15} />}
                    </label>
                  )}
                </span>
                <span className="relative hidden aspect-square overflow-hidden bg-[var(--paper)] sm:block">
                  {product.image && <Image src={product.image} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm">{product.name}</b>
                  <small className="text-[11px] text-[var(--muted)]">
                    {preview !== null && active ? (
                      <>
                        <del>{money.format(product.price)}₫</del> <b className="text-[var(--ink)]">{money.format(preview)}₫</b>
                      </>
                    ) : (
                      <>{money.format(product.price)}₫</>
                    )}
                    {!item && !product.eligible && <> · {tr("Không thuộc nhóm được tham gia", "Not in an eligible group")}</>}
                  </small>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    {statusLabel && <span className={`px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase ring-1 ${STATUS_TONE[status!]}`}>{statusLabel}</span>}
                    {approved && (
                      <span className="text-[10px] text-[var(--muted)]">
                        {item!.quota ? tr(`Đã bán ${item!.sold}/${item!.quota} suất`, `${item!.sold}/${item!.quota} units sold`) : tr(`Đã bán ${item!.sold} · không giới hạn suất`, `${item!.sold} sold · unlimited units`)}
                      </span>
                    )}
                    {status === "rejected" && item!.reviewNote && (
                      <span className="text-[10px] text-red-700">
                        {tr("Lý do:", "Reason:")} {item!.reviewNote}
                      </span>
                    )}
                  </span>
                </span>
                <span className="grid grid-cols-2 gap-2 sm:w-56">
                  <label className="text-[9px] font-extrabold tracking-wide uppercase">
                    {tr("Giảm", "Off")}
                    <span className={`mt-1 flex h-10 items-center border bg-[var(--white)] ${active && !approved && !validDiscount(row.discount) ? "border-red-400" : "border-[var(--line)]"}`}>
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm font-black outline-none disabled:opacity-50"
                        type="number"
                        inputMode="numeric"
                        min={MIN_EVENT_DISCOUNT}
                        max={cap}
                        value={approved ? String(item!.discountPercent) : row.discount}
                        disabled={locked || !active}
                        onChange={(e) => patch(product.id, { discount: e.target.value })}
                        aria-label={tr(`Mức giảm của ${product.name}`, `Discount for ${product.name}`)}
                      />
                      <b className="pr-2 text-xs">%</b>
                    </span>
                  </label>
                  <label className="text-[9px] font-extrabold tracking-wide uppercase">
                    {tr("Số suất", "Units")}
                    <input
                      className={`mt-1 h-10 w-full border bg-[var(--white)] px-2 text-sm font-bold outline-none disabled:opacity-50 ${active && !approved && !validQuota(row.quota) ? "border-red-400" : "border-[var(--line)]"}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100000}
                      placeholder={tr("Không giới hạn", "Unlimited")}
                      value={approved ? (item!.quota ? String(item!.quota) : "") : row.quota}
                      disabled={locked || !active}
                      onChange={(e) => patch(product.id, { quota: e.target.value })}
                      aria-label={tr(`Số suất của ${product.name}`, `Units for ${product.name}`)}
                    />
                  </label>
                </span>
              </li>
            )
          })}
          {!visible.length && <li className="p-6 text-center text-sm text-[var(--muted)]">{tr("Không có sản phẩm khớp từ khóa.", "No products match.")}</li>}
        </ul>
      ) : (
        <div className="border border-dashed border-[var(--line)] bg-[var(--paper)] p-8 text-center text-sm text-[var(--muted)]">
          {tr("Bạn cần đăng ít nhất một sản phẩm trước khi đăng ký sự kiện.", "Add at least one product before registering.")}
        </div>
      )}

      {state.error && (
        <p className="m-0 border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="m-0 border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700" role="status">
          {state.message}
        </p>
      )}

      <div className="flex flex-col justify-between gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center">
        <small className="text-[11px] leading-5 text-[var(--muted)]">
          {tr(
            "Sản phẩm mới hoặc gửi lại chờ BOAI duyệt. Giá sự kiện chỉ áp dụng trong đúng khung giờ của sự kiện và dừng khi hết suất.",
            "New or re-sent products wait for BOAI review. Event prices apply only inside the event's time window and stop when units run out.",
          )}
        </small>
        <button className="boai-button primary justify-center" disabled={pending || !changed || invalid || (!items.length && !selectedCount)}>
          {pending ? tr("Đang gửi...", "Submitting...") : items.length ? tr("Lưu thay đổi", "Save changes") : tr("Gửi đăng ký", "Submit registration")}
        </button>
      </div>
    </form>
  )
}
