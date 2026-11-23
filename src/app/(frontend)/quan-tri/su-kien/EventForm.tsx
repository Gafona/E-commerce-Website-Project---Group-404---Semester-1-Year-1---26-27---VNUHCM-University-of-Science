"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"
import {
  CalendarDays,
  ImageIcon,
  Layers3,
  Sparkles,
  Type,
} from "lucide-react"
import {
  DEFAULT_EVENT_TYPOGRAPHY,
  EVENT_FONT_OPTIONS,
  type EventFontFamily,
  type EventTypography,
} from "@/lib/event-typography"
import { saveEventAction } from "./actions"
import { useShop } from "../../components/ShopProvider"
import { DEFAULT_EVENT_MAX_DISCOUNT, MAX_EVENT_DISCOUNT, MIN_EVENT_DISCOUNT } from "@/lib/event-rules"
import { PRODUCT_TYPES } from "@/lib/product-types"
import { ASPECTS, setInputFiles, useImageCropper } from "../../components/ImageCropper"

type StoredEventTypography = {
  fontFamily?: EventFontFamily | null
  color?: string | null
  fontSize?: number | null
}

type EventValue = {
  id: string
  name: string
  slogan?: string | null
  description: string
  campaignImage?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  fontFamily?: EventFontFamily | null
  fontSize?: number | null
  titleTypography?: StoredEventTypography | null
  sloganTypography?: StoredEventTypography | null
  descriptionTypography?: StoredEventTypography | null
  textPosition?: "top-left" | "center-left" | "center" | "bottom-left" | "bottom-center" | null
  displayPlacement?: "hero" | "midpage" | "both" | null
  category: "seasonal" | "sport"
  occasion: string
  customOccasion?: string | null
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  maxDiscount?: number | null
  allowedProductTypes?: string[] | null
  status: string
}

const seasonal = [
  ["back-to-school", "Back to school"],
  ["summer-sale", "Summer sale"],
  ["tet", "Tết"],
  ["seasonal-other", "Mùa vụ khác"],
] as const
const sport = [
  ["world-cup", "World Cup"],
  ["euro", "Euro"],
  ["sea-games", "SEA Games"],
  ["asian-games", "Asian Games"],
  ["sport-other", "Giải thể thao khác"],
] as const
const CUSTOM_OCCASIONS = new Set(["seasonal-other", "sport-other"])
const occasionsFor = (category: "seasonal" | "sport") =>
  category === "seasonal" ? seasonal : sport

const controlLabel =
  "grid min-w-0 content-start gap-2 text-[10px] font-extrabold tracking-wide uppercase"
const controlTitle = "flex min-h-8 items-end leading-4"
const controlBox =
  "flex h-12 min-w-0 items-center border border-[var(--line)] bg-[var(--white)]"
const selectControl =
  "block h-12 w-full min-w-0 border border-[var(--line)] bg-[var(--white)] px-3 text-sm font-semibold normal-case outline-none transition focus:border-[#071a33] focus:ring-2 focus:ring-[#071a33]/10"

function ColorControl({
  name,
  value,
  onChange,
}: {
  name: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <span className={`${controlBox} gap-2 px-2`}>
      <input
        className="size-8 shrink-0 cursor-pointer border-0 bg-transparent p-0"
        name={name}
        type="color"
        value={value}
        onChange={(input) => onChange(input.target.value)}
      />
      <span className="min-w-0 truncate text-xs font-semibold normal-case">
        {value.toUpperCase()}
      </span>
    </span>
  )
}

function FontSizeControl({
  name,
  value,
  onChange,
  min,
  max,
}: {
  name: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  return (
    <span className={`${controlBox} focus-within:border-[#071a33]`}>
      <input
        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-semibold normal-case outline-none"
        name={name}
        type="number"
        inputMode="numeric"
        required
        min={min}
        max={max}
        step={1}
        value={draft}
        onChange={(input) => {
          const next = input.target.value
          const size = Number(next)
          setDraft(next)
          if (Number.isInteger(size) && size >= min && size <= max) {
            onChange(size)
          }
        }}
        onBlur={() => {
          const size = Number(draft)
          const safe = Number.isFinite(size)
            ? Math.min(max, Math.max(min, Math.round(size)))
            : value
          setDraft(String(safe))
          onChange(safe)
        }}
      />
      <span className="pr-3 text-xs font-bold text-[var(--muted)] normal-case">
        px
      </span>
    </span>
  )
}

function TypographyEditor({
  label,
  prefix,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  prefix: "title" | "slogan" | "description"
  value: EventTypography
  onChange: (value: EventTypography) => void
  min: number
  max: number
}) {
  return (
    <article className="@container w-full min-w-0 border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm sm:p-6">
      <div>
        <span className="flex items-center gap-2 text-[10px] font-black tracking-[.12em] uppercase">
          <Type size={14} className="text-[var(--lime-dark)]" /> {label}
        </span>
        <small className="mt-1 block text-[10px] font-normal normal-case text-[var(--muted)]">
          Thiết lập này chỉ áp dụng cho {label.toLocaleLowerCase("vi")}.
        </small>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 @xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,.8fr)]">
        <label className={controlLabel}>
          <span className={controlTitle}>Phông chữ</span>
          <select
            className={selectControl}
            name={`${prefix}FontFamily`}
            value={value.fontFamily}
            onChange={(input) =>
              onChange({
                ...value,
                fontFamily: input.target.value as EventFontFamily,
              })
            }
          >
            {EVENT_FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </label>
        <label className={controlLabel}>
          <span className={controlTitle}>Màu chữ</span>
          <ColorControl
            name={`${prefix}Color`}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
        </label>
        <label className={controlLabel}>
          <span className={controlTitle}>Cỡ chữ</span>
          <FontSizeControl
            name={`${prefix}FontSize`}
            value={value.fontSize}
            min={min}
            max={max}
            onChange={(fontSize) => onChange({ ...value, fontSize })}
          />
        </label>
      </div>
    </article>
  )
}

export function EventForm({ event }: { event?: EventValue }) {
  const { tr } = useShop()
  const router = useRouter()
  const [state, action, pending] = useActionState(saveEventAction, {
    ok: false,
  })
  const [category, setCategory] = useState<"seasonal" | "sport">(
    event?.category ?? "seasonal",
  )
  const { cropImage, cropper } = useImageCropper()
  const [campaignPreview, setCampaignPreview] = useState<string | null>(null)
  const [eventName, setEventName] = useState(event?.name ?? "")
  const [eventSlogan, setEventSlogan] = useState(event?.slogan ?? "")
  const [eventDescription, setEventDescription] = useState(
    event?.description ?? "",
  )
  const [backgroundColor, setBackgroundColor] = useState(
    event?.backgroundColor ?? "#071a33",
  )
  const [textColor, setTextColor] = useState(event?.textColor ?? "#ffffff")
  const [fontFamily, setFontFamily] = useState(event?.fontFamily ?? "display")
  const [fontSize, setFontSize] = useState(event?.fontSize ?? 16)
  const [titleTypography, setTitleTypography] = useState<EventTypography>({
    fontFamily:
      event?.titleTypography?.fontFamily ??
      event?.fontFamily ??
      DEFAULT_EVENT_TYPOGRAPHY.title.fontFamily,
    color:
      event?.titleTypography?.color ??
      event?.textColor ??
      DEFAULT_EVENT_TYPOGRAPHY.title.color,
    fontSize:
      event?.titleTypography?.fontSize ??
      DEFAULT_EVENT_TYPOGRAPHY.title.fontSize,
  })
  const [sloganTypography, setSloganTypography] = useState<EventTypography>({
    fontFamily:
      event?.sloganTypography?.fontFamily ??
      event?.fontFamily ??
      DEFAULT_EVENT_TYPOGRAPHY.slogan.fontFamily,
    color:
      event?.sloganTypography?.color ??
      event?.textColor ??
      DEFAULT_EVENT_TYPOGRAPHY.slogan.color,
    fontSize:
      event?.sloganTypography?.fontSize ??
      DEFAULT_EVENT_TYPOGRAPHY.slogan.fontSize,
  })
  const [descriptionTypography, setDescriptionTypography] =
    useState<EventTypography>({
      fontFamily:
        event?.descriptionTypography?.fontFamily ??
        event?.fontFamily ??
        DEFAULT_EVENT_TYPOGRAPHY.description.fontFamily,
      color:
        event?.descriptionTypography?.color ??
        event?.textColor ??
        DEFAULT_EVENT_TYPOGRAPHY.description.color,
      fontSize:
        event?.descriptionTypography?.fontSize ??
        DEFAULT_EVENT_TYPOGRAPHY.description.fontSize,
    })
  const [textPosition, setTextPosition] = useState(
    event?.textPosition ?? "center-left",
  )
  const occasions = occasionsFor(category)
  const [occasion, setOccasion] = useState<string>(() =>
    occasions.some(([value]) => value === event?.occasion)
      ? event!.occasion
      : occasions[0][0],
  )
  const [customOccasion, setCustomOccasion] = useState(
    event?.customOccasion ?? "",
  )
  const needsCustomOccasion = CUSTOM_OCCASIONS.has(occasion)

  useEffect(() => {
    if (!state.ok || !state.href) return
    router.push(state.href)
    router.refresh()
  }, [router, state])

  const field =
    "mt-2 min-w-0 w-full border border-[var(--line)] bg-[var(--white)] px-3 py-3 text-sm font-normal normal-case outline-none transition focus:border-[#071a33] focus:ring-2 focus:ring-[#071a33]/10"
  const applySharedTypography = () => {
    const shared = { fontFamily, color: textColor, fontSize }
    setTitleTypography(shared)
    setSloganTypography(shared)
    setDescriptionTypography(shared)
  }

  return (
    <form action={action} className="grid gap-5">
      {event && <input type="hidden" name="id" value={event.id} />}

      <section className="grid gap-5 border border-[var(--line)] bg-[var(--white)] p-5 lg:grid-cols-2 lg:p-7">
        <div className="lg:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
            <Sparkles size={14} /> Nội dung chiến dịch
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            Thông tin sự kiện
          </h2>
        </div>
        <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
          Tên sự kiện *
          <input
            className={field}
            name="name"
            required
            minLength={3}
            maxLength={100}
            value={eventName}
            onChange={(input) => setEventName(input.target.value)}
            placeholder="Ví dụ: Summer Football Fest"
          />
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
          Khẩu hiệu sự kiện
          <input
            className={field}
            name="slogan"
            maxLength={180}
            value={eventSlogan}
            onChange={(input) => setEventSlogan(input.target.value)}
            placeholder="Bứt tốc mùa hè, săn deal cực chất"
          />
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
          Mô tả *
          <textarea
            className={field}
            name="description"
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            value={eventDescription}
            onChange={(input) => setEventDescription(input.target.value)}
            placeholder="Mô tả nội dung, đối tượng và điểm nổi bật của sự kiện..."
          />
        </label>
      </section>

      <section className="grid gap-5 border border-[var(--line)] bg-[var(--white)] p-5 lg:grid-cols-2 lg:p-7">
        <div className="lg:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
            <ImageIcon size={14} /> Giao diện website
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            Hình ảnh & nền sự kiện
          </h2>
          <p className="mt-2 mb-0 text-xs leading-5 text-[var(--muted)] normal-case">
            Khi sự kiện đang diễn ra đúng lịch, website sẽ tự dùng nội dung này
            tại vị trí bạn chọn.
          </p>
        </div>
        <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
          {event?.campaignImage ? "Đổi ảnh sự kiện (tùy chọn)" : "Ảnh sự kiện"}
          <input
            className={field}
            name="campaignImage"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const input = e.target
              const file = input.files?.[0]
              if (!file) return setCampaignPreview(null)
              const cropped = await cropImage(file, {
                title: "Cắt ảnh sự kiện",
                aspects: [ASPECTS.wide, ASPECTS.banner, ASPECTS.original],
                maxOutput: 2400,
              })
              if (!cropped) {
                input.value = ""
                return setCampaignPreview(null)
              }
              setInputFiles(input, [cropped])
              setCampaignPreview(URL.createObjectURL(cropped))
            }}
          />
          {cropper}
          {campaignPreview && (
            // Local blob preview cannot go through the image loader.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={campaignPreview} alt="Ảnh sự kiện mới đã cắt" className="mt-3 aspect-[16/5] w-full object-cover" />
          )}
          <small className="mt-2 block text-[11px] font-normal normal-case text-[var(--muted)]">
            JPG, PNG hoặc WebP, tối đa 5MB. Nên dùng ảnh ngang tỷ lệ 16:9.
          </small>
        </label>
        {event?.campaignImage && (
          <div className="relative aspect-[16/5] overflow-hidden bg-[var(--paper)] lg:col-span-2">
            <Image
              src={event.campaignImage}
              alt={`Ảnh hiện tại của ${event.name}`}
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          </div>
        )}
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Màu nền dự phòng
          <span className="mt-2 flex items-center gap-3 border border-[var(--line)] bg-[var(--white)] p-2">
            <input
              className="size-10 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              name="backgroundColor"
              type="color"
              value={backgroundColor}
              onChange={(input) => setBackgroundColor(input.target.value)}
            />
            <span className="text-xs font-semibold normal-case">
              Hiển thị khi ảnh chưa tải và phủ màu toàn trang
            </span>
          </span>
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Vị trí chữ
          <select
            className={field}
            name="textPosition"
            value={textPosition}
            onChange={(input) =>
              setTextPosition(
                input.target
                  .value as "top-left" | "center-left" | "center" | "bottom-left" | "bottom-center",
              )
            }
          >
            <option value="top-left">Trên bên trái</option>
            <option value="center-left">Giữa bên trái</option>
            <option value="center">Chính giữa</option>
            <option value="bottom-left">Dưới bên trái</option>
            <option value="bottom-center">Dưới chính giữa</option>
          </select>
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Vị trí nổi bật
          <select
            className={field}
            name="displayPlacement"
            defaultValue={event?.displayPlacement ?? "hero"}
          >
            <option value="hero">Đầu website</option>
            <option value="midpage">Giữa website</option>
            <option value="both">Cả đầu và giữa website</option>
          </select>
        </label>
      </section>

      <section className="grid grid-cols-1 gap-5 border border-[var(--line)] bg-[var(--white)] p-5 lg:p-7">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
            <Type size={14} /> Kiểu chữ sự kiện
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            Tuỳ chỉnh từng phần
          </h2>
          <p className="mt-2 mb-0 text-xs leading-5 text-[var(--muted)] normal-case">
            Chỉnh riêng tên, khẩu hiệu và mô tả; hoặc dùng bộ thiết lập chung
            bên dưới để đồng bộ nhanh cả ba phần.
          </p>
        </div>

        <div className="@container min-w-0 border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
          <div className="grid min-w-0 gap-4 @xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,.8fr)]">
            <div className="@xl:col-span-3">
              <span className="flex items-center gap-2 text-[10px] font-black tracking-[.12em] uppercase">
                <Layers3 size={14} className="text-blue-700" /> Thiết lập chung
              </span>
            </div>
            <label className={controlLabel}>
              <span className={controlTitle}>Phông chữ chung</span>
              <select
                className={selectControl}
                name="fontFamily"
                value={fontFamily}
                onChange={(input) =>
                  setFontFamily(input.target.value as EventFontFamily)
                }
              >
                {EVENT_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={controlLabel}>
              <span className={controlTitle}>Màu chữ chung</span>
              <ColorControl
                name="textColor"
                value={textColor}
                onChange={setTextColor}
              />
            </label>
            <label className={controlLabel}>
              <span className={controlTitle}>Cỡ chữ chung</span>
              <FontSizeControl
                name="fontSize"
                value={fontSize}
                min={10}
                max={120}
                onChange={setFontSize}
              />
            </label>
            <div className="@xl:col-span-3">
              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#071a33] px-4 py-3 text-center text-[10px] font-black tracking-wide text-white! uppercase transition hover:-translate-y-0.5 sm:w-auto"
                onClick={applySharedTypography}
              >
                <Layers3 size={15} /> Áp dụng thiết lập chung cho tất cả
              </button>
              <small className="mt-2 block text-[10px] normal-case text-[var(--muted)]">
                Bạn vẫn có thể chỉnh lại từng phần sau khi áp dụng.
              </small>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-6 border-t border-[var(--line)] pt-6">
          <TypographyEditor
            label="Tên sự kiện"
            prefix="title"
            value={titleTypography}
            onChange={setTitleTypography}
            min={10}
            max={120}
          />
          <TypographyEditor
            label="Khẩu hiệu"
            prefix="slogan"
            value={sloganTypography}
            onChange={setSloganTypography}
            min={10}
            max={120}
          />
          <TypographyEditor
            label="Mô tả"
            prefix="description"
            value={descriptionTypography}
            onChange={setDescriptionTypography}
            min={10}
            max={120}
          />
        </div>
        <div>
          <span className="text-[10px] font-extrabold tracking-wide uppercase">
            Xem trước cách trình bày
          </span>
          <div
            className={`event-style-preview event-text-${textPosition}`}
            style={
              {
                "--event-background": backgroundColor,
                "--event-title-color": titleTypography.color,
                "--event-title-size": `${titleTypography.fontSize}px`,
                "--event-slogan-color": sloganTypography.color,
                "--event-slogan-size": `${sloganTypography.fontSize}px`,
                "--event-description-color": descriptionTypography.color,
                "--event-description-size": `${descriptionTypography.fontSize}px`,
              } as React.CSSProperties
            }
          >
            {event?.campaignImage && (
              <Image
                src={event.campaignImage}
                alt=""
                fill
                sizes="900px"
                className="object-cover"
              />
            )}
            <span className="event-style-preview-overlay" />
            <div>
              <small>SỰ KIỆN ĐANG DIỄN RA</small>
              <b
                className={`event-copy-title event-type-${titleTypography.fontFamily}`}
              >
                {eventName || "Tên sự kiện của bạn"}
              </b>
              <strong
                className={`event-copy-slogan event-type-${sloganTypography.fontFamily}`}
              >
                {eventSlogan || "Khẩu hiệu sự kiện sẽ hiển thị tại đây"}
              </strong>
              <p
                className={`event-copy-description event-type-${descriptionTypography.fontFamily}`}
              >
                {eventDescription ||
                  "Mô tả nội dung và điểm nổi bật của sự kiện sẽ hiển thị tại đây."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 border border-[var(--line)] bg-[var(--white)] p-5 lg:grid-cols-2 lg:p-7">
        <div className="lg:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[var(--lime-dark)] uppercase">
            <CalendarDays size={14} /> Phân loại & thời gian
          </div>
          <h2 className="m-0 font-[family-name:var(--display)] text-3xl font-black uppercase">
            Lịch chạy sự kiện
          </h2>
        </div>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Loại sự kiện *
          <select
            className={field}
            name="category"
            value={category}
            onChange={(input) => {
              const next = input.target.value as "seasonal" | "sport"
              const nextOccasions = occasionsFor(next)
              setCategory(next)
              setOccasion(
                nextOccasions.some(([value]) => value === event?.occasion)
                  ? event!.occasion
                  : nextOccasions[0][0],
              )
            }}
          >
            <option value="seasonal">Seasonal event</option>
            <option value="sport">Sport event</option>
          </select>
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Chủ đề *
          <select
            className={field}
            name="occasion"
            value={occasion}
            onChange={(input) => setOccasion(input.target.value)}
          >
            {occasions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {needsCustomOccasion && (
          <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
            {category === "sport" ? "Tên giải thể thao *" : "Tên mùa vụ *"}
            <input
              className={field}
              name="customOccasion"
              required
              minLength={2}
              maxLength={80}
              value={customOccasion}
              onChange={(input) => setCustomOccasion(input.target.value)}
              placeholder={
                category === "sport"
                  ? "Ví dụ: Giải bóng đá sinh viên 2026"
                  : "Ví dụ: Lễ hội mùa thu"
              }
            />
            <small className="mt-2 block text-[11px] font-normal normal-case text-[var(--muted)]">
              Tên này sẽ được lưu làm chủ đề riêng cho sự kiện.
            </small>
          </label>
        )}
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Ngày bắt đầu *
          <input
            className={field}
            name="startDate"
            type="date"
            required
            defaultValue={event?.startDate.slice(0, 10)}
          />
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          Ngày kết thúc *
          <input
            className={field}
            name="endDate"
            type="date"
            required
            defaultValue={event?.endDate.slice(0, 10)}
          />
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          {tr("Giờ bắt đầu (giờ Việt Nam)", "Start time (Vietnam time)")}
          <input className={field} name="startTime" type="time" required defaultValue={event?.startTime ?? "00:00"} />
        </label>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          {tr("Giờ kết thúc (giờ Việt Nam)", "End time (Vietnam time)")}
          <input className={field} name="endTime" type="time" required defaultValue={event?.endTime ?? "23:59"} />
        </label>
        <p className="m-0 text-[11px] leading-5 text-[var(--muted)] lg:col-span-2">
          {tr(
            "Giá sự kiện tự bật đúng giờ bắt đầu và tự tắt sau giờ kết thúc, không cần thao tác. Để cả ngày: 00:00 – 23:59.",
            "Event prices switch on at the start time and off after the end time by themselves. For whole days use 00:00 – 23:59.",
          )}
        </p>
        <label className="text-[10px] font-extrabold tracking-wide uppercase">
          {tr("Trần % giảm cho shop *", "Shop discount ceiling (%) *")}
          <input
            className={field}
            name="maxDiscount"
            type="number"
            inputMode="numeric"
            required
            min={MIN_EVENT_DISCOUNT}
            max={MAX_EVENT_DISCOUNT}
            step={1}
            defaultValue={event?.maxDiscount ?? DEFAULT_EVENT_MAX_DISCOUNT}
          />
          <small className="mt-2 block text-[11px] font-normal normal-case text-[var(--muted)]">
            {tr(
              `Shop chọn mức giảm riêng cho từng sản phẩm, từ ${MIN_EVENT_DISCOUNT}% đến mức trần này.`,
              `Shops pick a discount per product, from ${MIN_EVENT_DISCOUNT}% up to this ceiling.`,
            )}
          </small>
        </label>
        <fieldset className="m-0 min-w-0 border-0 p-0 text-[10px] font-extrabold tracking-wide uppercase">
          <legend className="mb-2">{tr("Nhóm sản phẩm được tham gia", "Eligible product groups")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_TYPES.map((type) => (
              <label key={type.id} className="flex cursor-pointer items-center gap-1.5 border border-[var(--line)] bg-[var(--white)] px-2.5 py-1.5 text-[11px] font-bold normal-case has-[:checked]:border-[#071a33] has-[:checked]:bg-[#071a33] has-[:checked]:text-white">
                <input type="checkbox" name="allowedProductTypes" value={type.id} defaultChecked={event?.allowedProductTypes?.includes(type.id)} className="sr-only" />
                {tr(type.vi, type.en)}
              </label>
            ))}
          </div>
          <small className="mt-2 block text-[11px] font-normal normal-case text-[var(--muted)]">
            {tr("Không chọn nhóm nào: mọi sản phẩm đều được đăng ký.", "Select none to accept every product.")}
          </small>
        </fieldset>
        <label className="text-[10px] font-extrabold tracking-wide uppercase lg:col-span-2">
          Trạng thái *
          <select
            className={field}
            name="status"
            defaultValue={event?.status ?? "draft"}
          >
            <option value="draft">Bản nháp</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="active">Đang diễn ra</option>
            <option value="paused">Tạm dừng</option>
            <option value="ended">Đã kết thúc</option>
          </select>
          <small className="mt-2 block text-[11px] font-normal normal-case text-[var(--muted)]">
            Người bán chỉ thấy sự kiện khác “Bản nháp” và chỉ đăng ký được khi
            sự kiện “Đã lên lịch” hoặc “Đang diễn ra”. Giảm giá của shop chỉ áp
            dụng khi sự kiện đang diễn ra trong thời gian đã đặt.
          </small>
        </label>
      </section>

      {state.error && (
        <p className="m-0 border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="m-0 border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {state.message}
        </p>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col justify-between gap-3 border border-[var(--line)] bg-[var(--white)] p-4 shadow-xl sm:flex-row sm:items-center">
        <small className="text-[11px] text-[var(--muted)]">
          {tr(
            `Shop đăng ký từng sản phẩm với mức giảm riêng (${MIN_EVENT_DISCOUNT}% đến trần) và số suất; BOAI duyệt từng sản phẩm trước khi áp dụng.`,
            `Shops register each product with its own discount (${MIN_EVENT_DISCOUNT}% up to the ceiling) and units; BOAI approves each product before it applies.`,
          )}
        </small>
        <button
          className="boai-button primary justify-center"
          disabled={pending}
        >
          {pending ? "Đang lưu..." : event ? "Lưu thay đổi" : "Tạo sự kiện"}
        </button>
      </div>
    </form>
  )
}
