"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { saveEquipmentPreferences, type EquipmentPreferences } from "@/lib/sportdna"
import { forgetGuestWork, markGuestWork } from "@/lib/browser-state"
import { useSportDnaContext } from "../../components/MatchBadge"
import { useShop } from "../../components/ShopProvider"
import { saveEquipmentPreferencesAction } from "../actions"

const field = "mt-1.5 block h-11 w-full border border-dna-line bg-dna-paper px-3 text-sm outline-none focus:border-fit"

/** Equipment needs per sport, used with the SportDNA result to score products in the shop. */
export function EquipmentNeeds({ sport = "badminton" }: { sport?: "badminton" | "football" }) {
  const { tr } = useShop()
  const { preferences, ready } = useSportDnaContext()
  const [value, setValue] = useState<EquipmentPreferences>({})
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "local">("idle")
  useEffect(() => {
    if (ready) setValue(preferences)
  }, [ready, preferences])
  const set = <K extends keyof EquipmentPreferences>(key: K, next: EquipmentPreferences[K]) => {
    setValue((v) => ({ ...v, [key]: next }))
    setStatus("idle")
  }
  async function save() {
    setStatus("saving")
    saveEquipmentPreferences(value)
    const res = await saveEquipmentPreferencesAction(value).catch(() => null)
    // Not saved to an account yet: sent along when this visitor signs in (this tab only).
    if (res?.ok) forgetGuestWork("equipment")
    else markGuestWork("equipment")
    setStatus(res?.ok ? "saved" : "local")
  }
  const shapeOptions = (
    <>
      <option value="">{tr("Chưa chọn", "Not set")}</option>
      <option value="narrow">{tr("Thon", "Narrow")}</option>
      <option value="standard">{tr("Tiêu chuẩn", "Standard")}</option>
      <option value="wide">{tr("Bè", "Wide")}</option>
    </>
  )
  return (
    <section className="border border-dna-line bg-dna-surface p-6 lg:col-span-2">
      <h2 className="m-0 text-[11px] font-extrabold uppercase tracking-[0.14em]">
        {tr("Nhu cầu thiết bị", "Equipment needs")} · {sport === "badminton" ? tr("Cầu lông", "Badminton") : tr("Bóng đá", "Football")}
      </h2>
      <p className="m-0 mt-1 text-xs text-dna-muted">
        {sport === "badminton"
          ? tr("Dùng cùng kết quả SportDNA để chấm % phù hợp của vợt và giày cầu lông.", "Used with your SportDNA result to score rackets and badminton shoes.")
          : tr("Dùng cùng kết quả SportDNA để chấm % phù hợp của giày bóng đá. Giày sai loại đinh với mặt sân bị loại khỏi gợi ý.", "Used with your SportDNA result to score football boots. Boots with the wrong studs for your surface are excluded.")}
      </p>
      {sport === "badminton" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold">
            {tr("Lối chơi", "Playing style")}
            <select value={value.badmintonPlaystyle ?? ""} onChange={(e) => set("badmintonPlaystyle", (e.target.value || undefined) as EquipmentPreferences["badmintonPlaystyle"])} className={field}>
              <option value="">{tr("Chưa chọn", "Not set")}</option>
              <option value="attack">{tr("Tấn công", "Attacking")}</option>
              <option value="defense">{tr("Phòng thủ / phản tạt", "Defensive / counter")}</option>
              <option value="allround">{tr("Toàn diện", "All-round")}</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            {tr("Mức căng dây (lbs)", "String tension (lbs)")}
            <input type="number" min={15} max={35} value={value.stringTensionLbs ?? ""} onChange={(e) => set("stringTensionLbs", e.target.value ? Number(e.target.value) : undefined)} placeholder="26" className={field} />
          </label>
          <label className="text-xs font-bold">
            {tr("Cỡ cán quen cầm", "Usual grip size")}
            <select value={value.gripSize ?? ""} onChange={(e) => set("gripSize", (e.target.value || undefined) as EquipmentPreferences["gripSize"])} className={field}>
              <option value="">{tr("Chưa chọn", "Not set")}</option>
              <option value="G4">G4</option>
              <option value="G5">G5</option>
              <option value="G6">G6</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            {tr("Dáng bàn chân", "Foot shape")}
            <select value={value.footShape ?? ""} onChange={(e) => set("footShape", (e.target.value || undefined) as EquipmentPreferences["footShape"])} className={field}>{shapeOptions}</select>
          </label>
          <label className="text-xs font-bold">
            {tr("Ngân sách tối đa (₫)", "Max budget (₫)")}
            <input type="number" min={0} step={100000} value={value.budget ?? ""} onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : undefined)} placeholder="2000000" className={field} />
          </label>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold">
            {tr("Mặt sân chính", "Main surface")}
            <select value={value.footballSurface ?? ""} onChange={(e) => set("footballSurface", (e.target.value || undefined) as EquipmentPreferences["footballSurface"])} className={field}>
              <option value="">{tr("Chưa chọn", "Not set")}</option>
              <option value="ag">{tr("AG · cỏ nhân tạo", "AG · artificial grass")}</option>
              <option value="fg">{tr("FG · cỏ tự nhiên", "FG · natural grass")}</option>
              <option value="ic">{tr("IC · trong nhà / futsal", "IC · indoor / futsal")}</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            {tr("Vị trí", "Position")}
            <select value={value.footballPosition ?? ""} onChange={(e) => set("footballPosition", (e.target.value || undefined) as EquipmentPreferences["footballPosition"])} className={field}>
              <option value="">{tr("Chưa chọn", "Not set")}</option>
              <option value="striker">{tr("Tiền đạo", "Forward")}</option>
              <option value="midfielder">{tr("Tiền vệ", "Midfielder")}</option>
              <option value="defender">{tr("Hậu vệ", "Defender")}</option>
              <option value="goalkeeper">{tr("Thủ môn", "Goalkeeper")}</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            {tr("Dáng bàn chân", "Foot shape")}
            <select value={value.footballFootShape ?? ""} onChange={(e) => set("footballFootShape", (e.target.value || undefined) as EquipmentPreferences["footballFootShape"])} className={field}>{shapeOptions}</select>
          </label>
          <label className="text-xs font-bold">
            {tr("Ngân sách tối đa (₫)", "Max budget (₫)")}
            <input type="number" min={0} step={100000} value={value.footballBudget ?? ""} onChange={(e) => set("footballBudget", e.target.value ? Number(e.target.value) : undefined)} placeholder="1500000" className={field} />
          </label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={status === "saving"} className="flex h-11 items-center gap-2 bg-fit px-6 text-[11px] font-extrabold uppercase tracking-wide text-white disabled:opacity-60">
          {status === "saving" ? tr("Đang lưu…", "Saving…") : tr("Lưu nhu cầu", "Save needs")}
        </button>
        {status === "saved" && <p role="status" className="animate-rise-in m-0 flex items-center gap-1.5 text-sm font-semibold text-fit"><Check size={15} /> {tr("Đã lưu vào tài khoản.", "Saved to your account.")}</p>}
        {status === "local" && <p role="status" className="animate-rise-in m-0 text-sm text-dna-muted">{tr("Đã lưu trên trình duyệt này. Đăng nhập để lưu vào tài khoản.", "Saved in this browser. Sign in to save to your account.")}</p>}
      </div>
    </section>
  )
}
