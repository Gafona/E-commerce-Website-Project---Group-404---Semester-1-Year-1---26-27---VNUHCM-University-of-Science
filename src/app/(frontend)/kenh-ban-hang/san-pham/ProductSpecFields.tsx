"use client"

import { useState } from "react"
import { specTemplateFor } from "@/lib/product-specs"
import { RACKET_AXES, RACKET_SPEC_COUNT, racketRadar } from "@/lib/racket-radar"
import { DnaRadar } from "../../components/DnaRadar"
import { useShop } from "../../components/ShopProvider"

export function ProductSpecFields({
  sport,
  category,
  values,
}: {
  sport: string
  category: string
  values: Record<string, string>
}) {
  const { tr } = useShop()
  const template = specTemplateFor(sport, category)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const valueOf = (label: string, legacy?: string) => picked[label] ?? values[label] ?? (legacy ? values[legacy] : undefined) ?? ""
  const preview =
    template.key === "badmintonRacket"
      ? racketRadar(template.fields.map((field) => ({ label: field.label, value: valueOf(field.label, field.legacy) })))
      : null
  return (
    <fieldset className="sc-spec-fields wide">
      <legend>{tr("Thông số kỹ thuật (tùy chọn)", "Specifications (optional)")}</legend>
      <p>
        {template.key === "badmintonRacket"
          ? tr(
              "Không bắt buộc. Điền từ 3/7 thông số vợt trở lên để hệ thống vẽ mạng nhện của vợt và tính độ tương thích với người mua.",
              "Optional. Fill in at least 3 of the 7 racket specs to get a racket radar and fit scores for buyers.",
            )
          : tr(
              `Không bắt buộc. Bộ thông số chuẩn cho ${template.title.toLowerCase()} giúp khách dễ so sánh; bỏ trống ô nào không rõ.`,
              "Optional. Standard fields make products easier to compare; leave any unknown field empty.",
            )}
      </p>
      <input type="hidden" name="specTemplate" value={template.key} />
      <div className="sc-spec-grid">
        {template.fields.map((field) => {
          const current = valueOf(field.label, field.legacy)
          return (
            <label key={`${template.key}-${field.key}`}>
              {field.label}
              {field.options ? (
                <select
                  name={`spec:${field.key}`}
                  value={field.options.includes(current) ? current : ""}
                  onChange={(e) => setPicked((p) => ({ ...p, [field.label]: e.target.value }))}
                >
                  <option value="">
                    {tr("Chưa chọn")}
                    {current && !field.options.includes(current) ? ` (${tr("cũ", "old")}: ${current})` : ""}
                  </option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={`spec:${field.key}`}
                  defaultValue={current}
                  placeholder={field.placeholder}
                  maxLength={80}
                />
              )}
            </label>
          )
        })}
      </div>
      {template.key === "badmintonRacket" && (
        <div className="mt-4 grid items-center gap-4 border border-[var(--line)] bg-[var(--paper)] p-4 sm:grid-cols-[220px_1fr]">
          {preview ? (
            <div>
              <DnaRadar emptyLabel={tr("Chưa đủ dữ liệu", "Not enough data")} title={tr("Mạng nhện vợt", "Racket radar")} size={220} axes={RACKET_AXES.map((a) => ({ label: tr(a.label, a.en), value: preview.axes[a.id] }))} />
              <p className="m-0 text-center text-[11px] text-[var(--muted)]">
                {tr(`Tính từ ${preview.known}/${RACKET_SPEC_COUNT} thông số`, `Based on ${preview.known}/${RACKET_SPEC_COUNT} specs`)}
              </p>
            </div>
          ) : (
            <div className="grid h-[180px] place-items-center text-center text-xs text-[var(--muted)]">
              {tr("Chọn ít nhất 3 thông số để xem mạng nhện", "Pick at least 3 specs to preview the radar")}
            </div>
          )}
          <p className="m-0 text-xs leading-relaxed text-[var(--muted)]">
            {tr(
              "Xem trước mạng nhện của vợt: Lực đập, Tốc độ vung, Kiểm soát, Phản tạt, Ổn định, Dễ chơi. Người mua sẽ thấy biểu đồ này trên trang sản phẩm, kèm độ tương thích với mạng nhện cá nhân của họ.",
              "Live racket radar preview. Buyers see it on the product page with their personal fit score.",
            )}
          </p>
        </div>
      )}
    </fieldset>
  )
}
