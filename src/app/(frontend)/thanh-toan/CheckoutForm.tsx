"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Loader2,
  QrCode,
  Shirt,
  ShoppingBag,
  Ticket,
  Truck,
  UserRound,
  X,
} from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { AddressLocator, type LocatedPoint } from "../components/AddressLocator"
import { checkDiscountAction, placeOrderAction, previewCheckoutAction, type CheckoutPreview } from "../shop-actions"
import { placeCustomOrderAction, previewCustomCheckoutAction, type CustomCheckout } from "../custom-order-actions"
import { provincesByRegion, REGION_LABELS, resolveProvince } from "@/lib/provinces"

const money = new Intl.NumberFormat("vi-VN")
const km = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })

type Form = {
  fullName: string
  email: string
  phone: string
  address: string
  /** Province code from lib/provinces. */
  province: string
  note: string
}

export type CheckoutDefaults = Omit<Form, "note"> & { point: LocatedPoint | null }

const REGIONS = provincesByRegion()

export function CheckoutForm({
  defaults,
  loggedIn,
  custom = null,
}: {
  defaults: CheckoutDefaults
  loggedIn: boolean
  /** Checkout for an accepted custom-jersey quote instead of the cart. */
  custom?: CustomCheckout | null
}) {
  const shop = useShop()
  const { tr } = shop
  // Only the lines ticked in the cart are checked out; the rest stay in the cart.
  const lines = shop.checkoutLines
  const router = useRouter()
  const { point: defaultPoint, ...defaultFields } = defaults
  const [form, setForm] = useState<Form>({ ...defaultFields, note: "" })
  const [point, setPoint] = useState<LocatedPoint | null>(defaultPoint)
  const [payment, setPayment] = useState<"cod" | "online">("cod")
  const [codeInput, setCodeInput] = useState("")
  const [discount, setDiscount] = useState<{ code: string; percent: number } | null>(null)
  const [codeError, setCodeError] = useState("")
  const [checkingCode, setCheckingCode] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  const [preview, setPreview] = useState<CheckoutPreview | null>(null)
  const [previewKey, setPreviewKey] = useState("")
  const cartKey = custom
    ? `custom:${custom.id}`
    : lines.map((l) => `${l.id}:${l.quantity}:${l.stringing ? 1 : 0}:${l.size ?? ""}:${l.color ?? ""}`).join("|")
  const requestKey = `${cartKey}#${form.province}#${point ? `${point.lat},${point.lng}` : ""}#${discount?.code ?? ""}`

  useEffect(() => {
    if (!cartKey) return
    let live = true
    const destination = { province: form.province, lat: point?.lat ?? null, lng: point?.lng ?? null }
    const load: Promise<CheckoutPreview> = custom
      ? previewCustomCheckoutAction(custom.id, destination).then((r) => ({
          ok: r.ok,
          provinceKnown: r.provinceKnown,
          shops: r.shop ? [r.shop] : [],
          subtotal: custom.total,
          shipping: r.shop?.fee ?? 0,
          discount: null,
          total: custom.total + (r.shop?.fee ?? 0),
          transferReady: r.transferReady,
          missingSize: [],
        }))
      : previewCheckoutAction(
          lines.map((l) => ({ id: l.id, quantity: l.quantity, stringing: l.stringing, size: l.size, color: l.color })),
          destination,
          discount?.code,
        )
    load
      .then((result) => {
        if (!live) return
        setPreview(result)
        setPreviewKey(requestKey)
        // The code was switched off after it was applied.
        if (result.discountError) {
          setDiscount(null)
          setCodeError(result.discountError)
        }
      })
      .catch(() => live && setPreview(null))
    return () => {
      live = false
    }
    // requestKey captures every cart, address or code change that affects the totals.
  }, [requestKey])

  const quoteReady = !!preview && previewKey === requestKey
  const missingSize = quoteReady ? preview.missingSize : []
  const subtotal = custom ? custom.total : lines.reduce((s, l) => s + l.price * l.quantity, 0)
  const transferReady = quoteReady ? preview.transferReady : true
  const anyEstimated = quoteReady && preview.shops.some((line) => line.estimated)

  // Transfer becomes unavailable if BOAI's receiving account is missing.
  useEffect(() => {
    if (quoteReady && !preview.transferReady && payment === "online") setPayment("cod")
  }, [quoteReady, preview?.transferReady, payment])

  // The saved cart loads after hydration; never show "0 items" while it does.
  if (!custom && !shop.ready) {
    return (
      <section className="page-shell flow-page" aria-busy="true">
        <div className="eyebrow">{tr("THANH TOÁN", "CHECKOUT")}</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" role="status" aria-label={tr("Đang tải giỏ hàng", "Loading your cart")}>
          <div className="grid gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 animate-pulse border border-[var(--line)] bg-[var(--white)]" />
            ))}
          </div>
          <div className="h-72 animate-pulse border border-[var(--line)] bg-[var(--white)]" />
        </div>
      </section>
    )
  }

  if (!custom && shop.ready && !lines.length && !pending) {
    return (
      <section className="page-shell flow-page">
        <div className="empty-state">
          <ShoppingBag size={30} />
          <h3>{tr("Chưa có sản phẩm để thanh toán", "Nothing to check out yet")}</h3>
          <p>
            {shop.cart.length
              ? tr("Bạn chưa chọn sản phẩm nào trong giỏ để thanh toán.", "You haven't selected any cart items to check out.")
              : tr("Hãy thêm sản phẩm vào giỏ trước.", "Add some products to your cart first.")}
          </p>
          {shop.cart.length ? (
            <Link className="boai-button primary" href="/gio-hang">
              {tr("Về giỏ hàng để chọn", "Back to cart to select")} <ArrowRight size={17} />
            </Link>
          ) : (
            <Link className="boai-button primary" href="/tim-kiem">
              {tr("Xem sản phẩm", "Browse products")} <ArrowRight size={17} />
            </Link>
          )}
        </div>
      </section>
    )
  }

  const applyCode = async () => {
    setCodeError("")
    setCheckingCode(true)
    try {
      const result = await checkDiscountAction(codeInput)
      if (!result.ok) {
        setCodeError(result.error)
        return
      }
      setDiscount({ code: result.code, percent: result.percent })
      setCodeInput("")
    } catch {
      setCodeError(tr("Mất kết nối khi kiểm tra mã. Vui lòng thử lại.", "Connection lost while checking the code. Please retry."))
    } finally {
      setCheckingCode(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    // Explain what's missing instead of leaving a silently disabled button.
    if (!form.province) {
      setError(tr("Vui lòng chọn tỉnh/thành phố nhận hàng.", "Please choose the delivery province."))
      document.getElementById("checkout-province")?.focus()
      return
    }
    if (missingSize.length) {
      setError(tr("Có sản phẩm chưa chọn kích thước. Hãy chọn size trước khi đặt hàng.", "Some items have no size yet. Choose a size before ordering."))
      return
    }
    if (!quoteReady) {
      setError(tr("Đang tính phí vận chuyển, vui lòng chờ giây lát.", "Still calculating shipping, please wait a moment."))
      return
    }
    if (payment === "online" && !transferReady) {
      setError(tr("BOAI chưa mở nhận chuyển khoản. Vui lòng chọn thanh toán khi nhận hàng.", "BOAI isn't accepting bank transfers yet. Please choose cash on delivery."))
      return
    }
    start(async () => {
      const lost = {
        ok: false as const,
        code: undefined,
        error: tr("Mất kết nối khi đặt hàng. Vui lòng kiểm tra mạng và thử lại.", "Connection lost while placing the order. Please check your network and retry."),
      }
      const base = { ...form, lat: point?.lat ?? null, lng: point?.lng ?? null, payment }
      const res = custom
        ? await placeCustomOrderAction({ requestId: custom.id, ...base }).catch(() => lost)
        : await placeOrderAction({
            ...base,
            discountCode: discount?.code,
            items: lines.map((l) => ({ id: l.id, quantity: l.quantity, color: l.color, size: l.size, stringing: l.stringing })),
          }).catch(() => lost)
      if (!res.ok) {
        setError(res.error ?? tr("Không thể đặt hàng.", "Could not place the order."))
        return
      }
      // The server remembered access to this order; the phone number never goes into the URL.
      router.push(`/don-hang?ma=${encodeURIComponent(res.code ?? "")}&moi=1`)
      if (!custom) shop.removeMany(lines.map((l) => l.key))
    })
  }

  const field = (name: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span>{label}</span>
      <input
        value={form[name]}
        onChange={(e) => {
          setForm({ ...form, [name]: e.target.value })
          // A located point belongs to the address it was found for.
          if (name === "address") setPoint(null)
        }}
        {...props}
      />
    </label>
  )
  const provinceName = resolveProvince(form.province)?.name ?? ""

  return (
    <form className="page-shell flow-page" onSubmit={submit}>
      <div className="eyebrow">{tr("THANH TOÁN", "CHECKOUT")}</div>
      <h1 className="flow-title">
        {custom ? tr("Đặt đơn áo custom", "Order your custom kit") : tr("Hoàn tất đơn hàng", "Complete your order")}
      </h1>
      {custom ? (
        <div className="checkout-access-note complete">
          <Shirt size={20} />
          <div>
            <b>{tr(`Báo giá #${custom.code} đã được chốt với ${custom.shopName}`, `Quote #${custom.code} agreed with ${custom.shopName}`)}</b>
            <p>
              {tr(
                "Phí vận chuyển được tính tự động theo khoảng cách. Sau khi đặt, shop bắt đầu sản xuất và bạn theo dõi cả tiến độ may lẫn giao hàng trong trang Đơn hàng.",
                "Shipping is calculated automatically from the distance. After you order, the shop starts production and you track both production and delivery on the Orders page.",
              )}
            </p>
          </div>
        </div>
      ) : !loggedIn ? (
        <div className="checkout-access-note guest">
          <ShoppingBag size={20} />
          <div>
            <b>{tr("Mua hàng không cần đăng nhập", "Guest checkout is available")}</b>
            <p>
              {tr(
                "Chỉ cần nhập thông tin giao hàng bên dưới. Sau khi đặt, bạn có thể tra cứu bằng mã đơn và số điện thoại.",
                "Just enter your shipping details below. Track the order later with its code and your phone number.",
              )}
            </p>
          </div>
          <Link href="/dang-nhap">
            {tr("Đăng nhập để điền nhanh", "Sign in to autofill")} <ArrowRight size={15} />
          </Link>
        </div>
      ) : defaults.phone && defaults.address ? (
        <div className="checkout-access-note complete">
          <CheckCircle2 size={20} />
          <div>
            <b>{tr("Thông tin tài khoản đã được điền sẵn", "Your account details are ready")}</b>
            <p>{tr("Bạn vẫn có thể chỉnh sửa người nhận cho riêng đơn hàng này.", "You can still edit the recipient for this order.")}</p>
          </div>
        </div>
      ) : (
        <div className="checkout-access-note">
          <UserRound size={20} />
          <div>
            <b>{tr("Hoàn thiện hồ sơ để thanh toán nhanh hơn", "Complete your profile for faster checkout")}</b>
            <p>
              {tr(
                "Thông tin bạn nhập vẫn dùng được cho đơn này. Hãy lưu số điện thoại và địa chỉ cho lần sau.",
                "These details will work for this order. Save your phone and address for next time.",
              )}
            </p>
          </div>
          <Link href="/cai-dat#ho-so">
            {tr("Hoàn thiện hồ sơ", "Complete profile")} <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div className="flow-grid">
        <div className="checkout-steps">
          <section className="form-card">
            <h3>{tr("1. Thông tin giao hàng", "1. Shipping details")}</h3>
            <div className="field-row">
              {field("fullName", tr("Họ và tên", "Full name"), { required: true, autoComplete: "name" })}
              {field("phone", tr("Số điện thoại", "Phone number"), { required: true, inputMode: "tel", placeholder: "09xx xxx xxx", autoComplete: "tel" })}
            </div>
            {field("email", tr("Email (nhận xác nhận)", "Email (for confirmation)"), { type: "email", autoComplete: "email" })}
            {field("address", tr("Địa chỉ nhận hàng", "Delivery address"), {
              required: true,
              autoComplete: "street-address",
              placeholder: tr("Số nhà, đường, phường/xã, quận/huyện", "House number, street, ward, district"),
            })}
            <label className="field">
              <span>{tr("Tỉnh / Thành phố nhận hàng", "Delivery province / city")}</span>
              <select
                id="checkout-province"
                value={form.province}
                onChange={(e) => {
                  setForm({ ...form, province: e.target.value })
                  setPoint(null)
                }}
                required
              >
                <option value="">{tr("— Chọn tỉnh / thành phố —", "— Choose a province —")}</option>
                {REGIONS.map(({ region, provinces }) => (
                  <optgroup key={region} label={tr(REGION_LABELS[region].vi, REGION_LABELS[region].en)}>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="mb-4">
              <AddressLocator
                query={[form.address, provinceName].filter(Boolean).join(", ")}
                value={point}
                onChange={setPoint}
                onProvince={(code) => !form.province && setForm((current) => ({ ...current, province: code }))}
              />
            </div>
            {field("note", tr("Ghi chú", "Note"), { placeholder: tr("Ví dụ: giao giờ hành chính", "e.g. deliver during office hours") })}
          </section>
          <section className="form-card">
            <h3>{tr("2. Phương thức thanh toán", "2. Payment method")}</h3>
            <div className="pay-options">
              <label className={payment === "cod" ? "selected" : ""}>
                <input type="radio" name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} />
                <Banknote size={20} />
                <span>
                  <b>{tr("Thanh toán khi nhận hàng", "Cash on delivery")}</b>
                  <small>{tr("Trả tiền mặt cho shipper của từng shop", "Pay each shop's courier in cash")}</small>
                </span>
              </label>
              <label className={`${payment === "online" ? "selected" : ""} ${transferReady ? "" : "opacity-60"}`}>
                <input type="radio" name="payment" checked={payment === "online"} disabled={!transferReady} onChange={() => setPayment("online")} />
                <QrCode size={20} />
                <span>
                  <b>{tr("Chuyển khoản VietQR", "VietQR bank transfer")}</b>
                  <small>
                    {transferReady
                      ? tr("Quét mã QR chuyển cho BOAI ngay sau khi đặt", "Scan the QR to pay BOAI right after ordering")
                      : tr("BOAI chưa mở nhận chuyển khoản", "BOAI isn't accepting transfers yet")}
                  </small>
                </span>
              </label>
            </div>
            {payment === "online" && (
              <p className="m-0 mt-4 border border-[var(--line)] bg-[var(--soft-blue)] p-3 text-[11px] leading-5">
                {tr(
                  "Bạn thanh toán một lần cho cả đơn vào tài khoản của BOAI (mã QR có sẵn số tiền và nội dung). Đơn được chuyển cho các shop ngay khi BOAI nhận tiền; nếu một shop hủy, BOAI hoàn tiền trong 3–5 ngày làm việc.",
                  "You pay once for the whole order into BOAI's account (the QR includes the amount and reference). Shops get the order as soon as BOAI receives the money; if a shop cancels, BOAI refunds you within 3–5 working days.",
                )}
              </p>
            )}
          </section>
        </div>
        <aside className="summary-card">
          <h3>
            {tr("Đơn hàng", "Order")} ({custom ? custom.quantity : lines.reduce((s, l) => s + l.quantity, 0)})
          </h3>
          {custom ? (
            <div className="mini-lines">
              <div>
                <span className="flex items-start gap-2">
                  <Shirt size={15} className="mt-0.5 shrink-0 text-[var(--lime-dark)]" />
                  <span>
                    {custom.quantity} × {tr(`Áo custom “${custom.designName}”`, `Custom kit “${custom.designName}”`)}
                    {custom.pants ? tr(" (bộ áo + quần)", " (shirt + shorts)") : ""}
                    <small className="block text-[11px] text-[var(--muted)]">
                      #{custom.code} · {custom.shopName} · Size {custom.jerseySize} · {money.format(custom.unitPrice)}₫/{custom.pants ? tr("bộ", "set") : tr("áo", "pc")}
                    </small>
                  </span>
                </span>
                <b>{money.format(custom.total)}₫</b>
              </div>
            </div>
          ) : (
            <div className="mini-lines">
              {lines.map((l) => {
                const noSize = missingSize.some((m) => m.key === l.key)
                return (
                  <div key={l.key}>
                    <span>
                      {l.quantity} × {l.name}
                      {(l.color || l.size || l.stringing) && (
                        <small className="block text-[11px] text-[var(--muted)]">
                          {[l.color && tr(l.color), l.size && `Size ${l.size}`, l.stringing && tr("Đan cước", "Strung")].filter(Boolean).join(" · ")}
                        </small>
                      )}
                      {noSize && (
                        <Link href={`/san-pham/${l.slug}?chon=size${l.color ? `&mau=${encodeURIComponent(l.color)}` : ""}`} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--sale)]">
                          <AlertTriangle size={12} /> {tr("Chưa chọn size · chọn ngay", "No size yet · choose now")}
                        </Link>
                      )}
                    </span>
                    <b>{money.format(l.price * l.quantity)}₫</b>
                  </div>
                )
              })}
            </div>
          )}
          {!custom && (
            <div className="grid gap-1.5">
              {discount ? (
                <div className="flex items-center justify-between gap-2 border border-dashed border-[var(--lime)] bg-[var(--soft-blue)] px-3 py-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-bold">
                    <Ticket size={15} className="shrink-0 text-[var(--lime-dark)]" />
                    {tr(`Mã ${discount.code} (−${discount.percent}%)`, `Code ${discount.code} (−${discount.percent}%)`)}
                  </span>
                  <button type="button" onClick={() => setDiscount(null)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--lime-dark)]" aria-label={tr("Bỏ mã giảm giá", "Remove code")}>
                    <X size={12} /> {tr("Bỏ", "Remove")}
                  </button>
                </div>
              ) : (
                <div className="voucher-row">
                  <Ticket size={16} />
                  <input
                    placeholder={tr("Mã giảm giá", "Discount code")}
                    value={codeInput}
                    maxLength={20}
                    onChange={(e) => {
                      setCodeInput(e.target.value.toUpperCase())
                      setCodeError("")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        applyCode()
                      }
                    }}
                    aria-invalid={codeError ? true : undefined}
                  />
                  <button type="button" onClick={applyCode} disabled={checkingCode || !codeInput.trim()}>
                    {checkingCode ? <Loader2 size={14} className="animate-spin" /> : tr("Áp dụng", "Apply")}
                  </button>
                </div>
              )}
              {codeError && <p className="m-0 text-[11px] font-semibold text-[var(--sale)]" role="alert">{codeError}</p>}
              <p className="m-0 text-[10px] text-[var(--muted)]">{tr("Mỗi đơn dùng 1 mã, chỉ giảm trên tiền hàng.", "One code per order, applied to goods only.")}</p>
            </div>
          )}
          <div>
            <span>{tr("Tạm tính", "Subtotal")}</span>
            <b>{money.format(quoteReady ? preview.subtotal : subtotal)}₫</b>
          </div>
          {quoteReady && preview.discount && (
            <div className="discount">
              <span>{tr(`Mã ${preview.discount.code} (−${preview.discount.percent}%)`, `Code ${preview.discount.code} (−${preview.discount.percent}%)`)}</span>
              <b>−{money.format(preview.discount.amount)}₫</b>
            </div>
          )}
          <div>
            <span>{tr("Vận chuyển", "Shipping")}</span>
            <b className="text-right">
              {!form.province
                ? tr("Chọn tỉnh/thành", "Choose province")
                : !quoteReady
                  ? tr("Đang tính…", "Calculating…")
                  : `${money.format(preview.shipping)}₫`}
            </b>
          </div>
          {form.province && quoteReady && preview.shops.length > 0 && (
            <ul className="m-0 grid list-none gap-1.5 border-l-2 border-[var(--line)] p-0 pl-3 text-[11px] text-[var(--muted)]">
              {preview.shops.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-start gap-1.5">
                    <Truck size={13} className="mt-px shrink-0 text-[var(--lime-dark)]" aria-hidden />
                    <span className="min-w-0">
                      <b className="block truncate text-[var(--ink)]">{line.shopName}</b>
                      {line.originProvince ? `${line.originProvince} → ${provinceName}` : provinceName} · {km.format(line.distanceKm)} km
                      {line.estimated && (
                        <span className="ml-1.5 inline-block border border-amber-300 bg-amber-50 px-1 text-[9px] font-bold text-amber-800 uppercase dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                          {tr("Phí ước tính", "Estimated")}
                        </span>
                      )}
                    </span>
                  </span>
                  <b className="shrink-0">{money.format(line.fee)}₫</b>
                </li>
              ))}
            </ul>
          )}
          {anyEstimated && (
            <p className="hint">
              {tr(
                "Phí ước tính tính theo khoảng cách giữa hai tỉnh/thành. Bấm “Định vị địa chỉ” để tính theo vị trí chính xác.",
                "Estimated fees use the distance between provinces. Use “Locate the address” for an exact fee.",
              )}
            </p>
          )}
          <div className="summary-total">
            <span>{tr("Tổng thanh toán", "Total")}</span>
            <b>{quoteReady && form.province ? `${money.format(preview.total)}₫` : "—"}</b>
          </div>
          {missingSize.length > 0 && (
            <p className="form-error flex items-start gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {tr("Có sản phẩm giày/áo/quần chưa chọn kích thước. Bấm “chọn ngay” ở từng dòng để bổ sung.", "Some shoes/apparel have no size. Use “choose now” on each line.")}
            </p>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="boai-button primary full" disabled={pending || missingSize.length > 0}>
            {pending
              ? tr("Đang xử lý...", "Processing...")
              : payment === "online"
                ? tr("Đặt hàng & lấy mã QR", "Place order & get QR")
                : tr("Đặt hàng", "Place order")}{" "}
            <ArrowRight size={17} />
          </button>
        </aside>
      </div>
    </form>
  )
}
