"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Clock3,
  LogIn,
  MapPin,
  Minus,
  Package,
  Plus,
  Send,
  Store,
  X,
} from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { ShopAvatar } from "../components/ShopAvatar"
import { sendDesignToShopsAction, type JerseyDraft } from "../design-actions"
import { MAX_CUSTOM_QUANTITY, MAX_SHOPS_PER_SEND } from "@/lib/custom-jersey"
import { emptyArt, itemCount, JerseySvg, normalizeArt, PantsSvg, PANTS_STACK_CLASS } from "./jersey-art"

export type CustomShopCard = {
  id: string
  name: string
  avatarUrl: string | null
  intro: string
  priceFrom: number | null
  minQuantity: number | null
  leadDays: number | null
  province: string
}

const money = new Intl.NumberFormat("vi-VN")
const field =
  "h-11 w-full border border-white/15 bg-white/[.06] px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[var(--lime)] focus:bg-white/[.1]"

export function SendToShops({
  shops,
  authenticated,
  profile,
  design,
  onSent,
}: {
  shops: CustomShopCard[]
  authenticated: boolean
  profile: { id: string; name: string; phone: string }
  design: { id: string | null; name: string; draft: JerseyDraft }
  onSent: (designId: string) => void
}) {
  const { tr, notify } = useShop()
  const [picked, setPicked] = useState<string[]>([])
  const [quantity, setQuantity] = useState(10)
  const [contact, setContact] = useState<{ name: string; phone: string } | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const name = contact?.name ?? profile.name
  const phone = contact?.phone ?? profile.phone

  const selected = shops.filter((shop) => picked.includes(shop.id))
  const minRequired = selected.reduce((max, shop) => Math.max(max, shop.minQuantity ?? 1), 1)
  const art = normalizeArt(design.draft.art)
  const elementCount = useMemo(
    () =>
      (["front", "back"] as const).reduce(
        (sum, side) => sum + itemCount(art[side]) + (art.pants.enabled ? itemCount(art.pants[side]) : 0),
        0,
      ),
    [art],
  )

  const toggle = (id: string) => {
    setError("")
    setPicked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= MAX_SHOPS_PER_SEND
          ? current
          : [...current, id],
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    if (!picked.length) return setError(tr("Hãy chọn ít nhất một shop.", "Pick at least one shop."))
    if (quantity < minRequired) return setError(tr(`Shop đã chọn nhận từ ${minRequired} áo trở lên.`, `The selected shops need at least ${minRequired} jerseys.`))
    if (!elementCount && !window.confirm(tr("Mẫu áo chưa có hình hay chữ nào. Vẫn gửi?", "Your jersey has no artwork yet. Send anyway?"))) return
    start(async () => {
      const result = await sendDesignToShopsAction({
        designId: design.id,
        name: design.name,
        draft: design.draft,
        shopIds: picked,
        quantity,
        contactName: name,
        contactPhone: phone,
        note,
      }).catch(() => ({ ok: false as const, error: tr("Mất kết nối. Vui lòng thử lại.", "Connection lost. Please try again.") }))
      if (!result.ok) return setError(result.error)
      notify(tr(`Đã gửi mẫu cho ${result.sent} shop`, `Design sent to ${result.sent} shop(s)`))
      setPicked([])
      setNote("")
      onSent(result.designId)
    })
  }

  return (
    <section id="gui-shop" className="scroll-mt-24 pt-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[var(--lime-dark)]">
            <span className="grid size-5 place-items-center rounded-full bg-[var(--lime)] text-[10px] !text-white">2</span>
            {tr("Bước 2 · Chọn xưởng may", "Step 2 · Choose a maker")}
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-4xl font-black uppercase leading-[1.1] tracking-tight md:text-5xl">
            {tr("Gửi mẫu cho shop may", "Send to custom makers")}
          </h2>
          <p className="mb-0 mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            {tr(
              `Chọn tối đa ${MAX_SHOPS_PER_SEND} shop đã đăng ký nhận may áo custom. Mỗi shop nhận một bản mẫu của bạn và sẽ báo giá trực tiếp.`,
              `Pick up to ${MAX_SHOPS_PER_SEND} shops that accept custom orders. Each receives a copy of your design and quotes you directly.`,
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--white)] px-3 py-2 text-xs font-bold">
          <Store size={15} className="text-[var(--lime-dark)]" />
          {shops.length} {tr("shop nhận custom", "custom makers")}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {shops.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {shops.map((shop) => {
              const own = shop.id === profile.id
              const active = picked.includes(shop.id)
              const full = !active && picked.length >= MAX_SHOPS_PER_SEND
              return (
                <article
                  key={shop.id}
                  className={`group relative flex flex-col border bg-[var(--white)] transition duration-200 ${
                    active
                      ? "border-[var(--lime)] shadow-[0_14px_40px_rgba(22,119,255,.18)] ring-1 ring-[var(--lime)]"
                      : "border-[var(--line)] hover:-translate-y-0.5 hover:border-[var(--muted)] hover:shadow-[0_12px_30px_rgba(15,23,42,.08)]"
                  } ${own || full ? "opacity-55" : ""}`}
                >
                  <button
                    type="button"
                    className="flex flex-1 flex-col p-4 text-left disabled:cursor-not-allowed"
                    aria-pressed={active}
                    disabled={own || full}
                    onClick={() => toggle(shop.id)}
                  >
                    <span
                      className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border-2 transition ${
                        active ? "border-[var(--lime)] bg-[var(--lime)] text-white" : "border-[var(--line)] bg-[var(--white)]"
                      }`}
                      aria-hidden
                    >
                      {active && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="flex items-center gap-3 pr-8">
                      <ShopAvatar name={shop.name} url={shop.avatarUrl} size={46} />
                      <span className="min-w-0">
                        <b className="flex items-center gap-1.5 truncate text-sm">
                          {shop.name}
                          <BadgeCheck size={14} className="shrink-0 text-[var(--lime-dark)]" />
                        </b>
                        {shop.province && (
                          <small className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                            <MapPin size={11} /> {shop.province}
                          </small>
                        )}
                      </span>
                    </span>
                    <span className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--muted)]">
                      {shop.intro || tr("Nhận may áo thi đấu theo mẫu riêng của đội bạn.", "Custom team jerseys made to your design.")}
                    </span>
                    <span className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
                      <span className="bg-[var(--soft-blue)] px-2 py-1.5">
                        <CircleDollarSign size={12} className="mb-0.5 text-[var(--lime-dark)]" />
                        {shop.priceFrom ? (
                          <b className="block truncate">{money.format(shop.priceFrom)}₫</b>
                        ) : (
                          <b className="block truncate font-semibold text-[var(--muted)]">{tr("Chưa cập nhật", "Not set")}</b>
                        )}
                        <span className="text-[var(--muted)]">{tr("giá từ", "price from")}</span>
                      </span>
                      <span className="bg-[var(--soft-blue)] px-2 py-1.5">
                        <Package size={12} className="mb-0.5 text-[var(--lime-dark)]" />
                        {shop.minQuantity ? (
                          <b className="block">{tr(`${shop.minQuantity}+ áo`, `${shop.minQuantity}+ pcs`)}</b>
                        ) : (
                          <b className="block font-semibold text-[var(--muted)]">{tr("Chưa cập nhật", "Not set")}</b>
                        )}
                        <span className="text-[var(--muted)]">{tr("tối thiểu", "minimum")}</span>
                      </span>
                      <span className="bg-[var(--soft-blue)] px-2 py-1.5">
                        <Clock3 size={12} className="mb-0.5 text-[var(--lime-dark)]" />
                        {shop.leadDays ? (
                          <b className="block">{tr(`~${shop.leadDays} ngày`, `~${shop.leadDays} days`)}</b>
                        ) : (
                          <b className="block font-semibold text-[var(--muted)]">{tr("Chưa cập nhật", "Not set")}</b>
                        )}
                        <span className="text-[var(--muted)]">{tr("thời gian may", "lead time")}</span>
                      </span>
                    </span>
                    {own && <span className="mt-2 text-[11px] font-semibold text-[var(--muted)]">{tr("Đây là shop của bạn", "This is your shop")}</span>}
                  </button>
                  <Link
                    href={`/cua-hang/${shop.id}`}
                    className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2.5 text-[11px] font-bold text-[var(--muted)] transition hover:text-[var(--lime-dark)]"
                  >
                    {tr("Xem trang shop", "View shop")} <ArrowRight size={13} />
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="grid place-items-center gap-2 border border-dashed border-[var(--line)] bg-[var(--white)] px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--soft-blue)] text-[var(--lime-dark)]"><Store size={22} /></span>
            <b>{tr("Chưa có shop nhận may custom", "No custom makers yet")}</b>
            <p className="m-0 max-w-sm text-xs leading-5 text-[var(--muted)]">
              {tr(
                "Bạn vẫn có thể lưu và tải mẫu áo. Shop sẽ xuất hiện ở đây khi bật nhận may áo custom trong kênh người bán.",
                "You can still save and download your design. Shops appear here once they turn on custom orders in Seller Center.",
              )}
            </p>
          </div>
        )}

        <form
          onSubmit={submit}
          className="relative overflow-hidden bg-[#07111f] p-5 text-white shadow-[0_24px_60px_rgba(7,17,31,.28)] lg:sticky lg:top-24"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[var(--lime)] opacity-25 blur-3xl" aria-hidden />
          <div className="relative flex gap-3">
            {(["front", "back"] as const).map((side) => (
              <div key={side} className="w-20 shrink-0 bg-white/[.06] p-1">
                <JerseySvg
                  uid={`send-${side}`}
                  side={side}
                  art={art[side] ?? emptyArt()}
                  kit={art.kit}
                  shirtColor={design.draft.shirtColor}
                  material={design.draft.material}
                  background={null}
                  className="relative z-10 block aspect-[7/8] w-full"
                />
                {art.pants.enabled && (
                  <PantsSvg uid={`send-pants-${side}`} side={side} art={art.pants[side]} kit={art.kit} pantsColor={art.pants.color} material={design.draft.material} background={null} className={PANTS_STACK_CLASS} />
                )}
                <small className="block text-center text-[9px] font-bold uppercase tracking-wider text-white/50">
                  {side === "front" ? tr("Trước", "Front") : tr("Sau", "Back")}
                </small>
              </div>
            ))}
            <div className="min-w-0 self-center">
              <small className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--lime)]">{tr("Mẫu sẽ gửi", "Design to send")}</small>
              <b className="mt-1 block truncate font-[family-name:var(--display)] text-xl uppercase">{design.name || tr("Thiết kế mới", "New design")}</b>
              <small className="text-[11px] text-white/55">
                Size {design.draft.jerseySize} · {elementCount} {tr("chi tiết", "elements")}
              </small>
            </div>
          </div>

          <div className="relative mt-5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/55">
              {tr("Shop nhận", "Recipients")} ({picked.length}/{MAX_SHOPS_PER_SEND})
            </span>
            <div className="mt-2 flex min-h-9 flex-wrap gap-1.5">
              {selected.length ? (
                selected.map((shop) => (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => toggle(shop.id)}
                    className="inline-flex items-center gap-1.5 bg-[var(--lime)] px-2.5 py-1.5 text-[11px] font-bold text-white"
                    aria-label={tr(`Bỏ chọn ${shop.name}`, `Remove ${shop.name}`)}
                  >
                    {shop.name} <X size={12} />
                  </button>
                ))
              ) : (
                <span className="text-xs text-white/45">{tr("Chọn shop ở danh sách bên cạnh", "Pick shops from the list")}</span>
              )}
            </div>
          </div>

          {authenticated ? (
            <div className="relative mt-4 grid gap-3">
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/55">
                  {tr("Số lượng áo", "Quantity")}
                  {minRequired > 1 && <em className="ml-1 not-italic text-[var(--lime)]">({tr("tối thiểu", "min")} {minRequired})</em>}
                </span>
                <div className="flex h-11 items-center border border-white/15">
                  <button type="button" className="grid h-full w-10 place-items-center hover:bg-white/10" aria-label={tr("Giảm", "Decrease")} onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={14} /></button>
                  <input
                    className="h-full w-16 bg-transparent text-center text-sm font-bold outline-none"
                    inputMode="numeric"
                    aria-label={tr("Số lượng áo", "Quantity")}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(MAX_CUSTOM_QUANTITY, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                  />
                  <button type="button" className="grid h-full w-10 place-items-center hover:bg-white/10" aria-label={tr("Tăng", "Increase")} onClick={() => setQuantity((q) => Math.min(MAX_CUSTOM_QUANTITY, q + 1))}><Plus size={14} /></button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <input className={field} placeholder={tr("Tên người liên hệ", "Contact name")} aria-label={tr("Tên người liên hệ", "Contact name")} value={name} maxLength={80} onChange={(e) => setContact({ name: e.target.value, phone })} required />
                <input className={field} placeholder="09xx xxx xxx" aria-label={tr("Số điện thoại", "Phone")} inputMode="tel" value={phone} onChange={(e) => setContact({ name, phone: e.target.value })} required />
              </div>
              <textarea
                className={`${field} h-auto min-h-20 resize-y py-2.5 leading-5`}
                placeholder={tr("Ghi chú: tên & số in lưng từng cầu thủ, hạn cần nhận…", "Notes: names & numbers per player, deadline…")}
                aria-label={tr("Ghi chú", "Notes")}
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <p className="m-0 border-l-2 border-[var(--sale)] bg-[var(--sale)]/15 px-3 py-2 text-xs text-white">{error}</p>}
              <button className="boai-button full bg-[var(--lime)] !text-white disabled:opacity-50" disabled={pending || !picked.length}>
                <Send size={16} />
                {pending
                  ? tr("Đang gửi…", "Sending…")
                  : picked.length
                    ? tr(`Gửi cho ${picked.length} shop`, `Send to ${picked.length} shop(s)`)
                    : tr("Chọn shop để gửi", "Pick shops to send")}
              </button>
              <p className="m-0 text-[10px] leading-4 text-white/45">
                {tr("Mẫu được lưu vào tài khoản của bạn. Shop chỉ thấy bản mẫu, số lượng và thông tin liên hệ bạn nhập.", "The design is saved to your account. Shops only see the design, quantity and the contact details you enter.")}
              </p>
            </div>
          ) : (
            <div className="relative mt-5 border border-white/15 p-4 text-center">
              <p className="mb-3 mt-0 text-xs leading-5 text-white/70">
                {tr("Đăng nhập để lưu mẫu và gửi cho shop. Bản nháp trên máy vẫn được giữ nguyên.", "Sign in to save and send your design. Your local draft stays intact.")}
              </p>
              <Link href="/dang-nhap" className="boai-button full bg-[var(--lime)] !text-white">
                <LogIn size={16} /> {tr("Đăng nhập để gửi", "Sign in to send")}
              </Link>
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
