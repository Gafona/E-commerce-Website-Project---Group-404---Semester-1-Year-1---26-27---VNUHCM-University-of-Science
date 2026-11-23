"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Check, Sparkles } from "lucide-react"
import {
  DNA_EVENT,
  fitFor,
  loadDiagnosticProfiles,
  loadEquipmentPreferences,
  mergeDiagnosticProfiles,
  saveDiagnosticResult,
  saveDiagnosticProfiles,
  saveEquipmentPreferences,
  type DiagnosticProfiles,
  type DnaProduct,
  type EquipmentFit,
  type EquipmentPreferences,
} from "@/lib/sportdna"
import { liveFeed } from "@/lib/live-feed"
import { claimBrowserData, forgetGuestWork, hasGuestWork, isGuestWork } from "@/lib/browser-state"
import {
  type loadSportDnaContextAction,
  saveAssessmentAction,
  saveEquipmentPreferencesAction,
} from "../sportdna/actions"
import { takePendingAssessment } from "./dna-pending"
import { useShop } from "./ShopProvider"
import type { TestRun } from "@/lib/sportdna-runs"
import { guestRuns, loadLocalRuns, mergeRuns, storeMergedRuns, uploadMissingRuns } from "./dna-runs"
import { RACKET_AXES, RACKET_SPEC_COUNT, racketFit, racketRadar } from "@/lib/racket-radar"
import { fitEligible } from "@/lib/fit-eligibility"
import { playerRadar } from "@/lib/sportdna-radar"
import { DnaRadar } from "./DnaRadar"

type SportDnaContext = {
  profiles: DiagnosticProfiles
  runs: TestRun[]
  preferences: EquipmentPreferences
  ready: boolean
  /** null while the session check is in flight. */
  authenticated: boolean | null
}

const SportDnaContextValue = createContext<SportDnaContext | null>(null)

export function SportDnaProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<SportDnaContext>({
    profiles: {},
    runs: [],
    preferences: {},
    ready: false,
    authenticated: null,
  })
  useEffect(() => {
    let cancelled = false
    const syncLocal = () =>
      setContext((current) => ({
        ...current,
        profiles: loadDiagnosticProfiles(),
        runs: loadLocalRuns(),
        preferences: loadEquipmentPreferences(),
        ready: true,
      }))
    syncLocal()
    void liveFeed<Awaited<ReturnType<typeof loadSportDnaContextAction>>>("sportdna").catch(() => null).then((remote) => {
      if (cancelled) return
      if (!remote) {
        setContext((current) => ({ ...current, authenticated: false }))
        return
      }
      // Data this browser kept for a different account is wiped before anything is merged.
      if (remote.authenticated) claimBrowserData(remote.userId)
      const localProfiles = loadDiagnosticProfiles()
      const localPreferences = loadEquipmentPreferences()
      const localRuns = loadLocalRuns()
      // Signed in, the account is the source of truth: only work done while signed out in this
      // tab is added to it, so nothing left by an earlier visitor of this browser is uploaded.
      const signedIn = remote.authenticated
      const keepLocalResults = !signedIn || hasGuestWork("assessment") || hasGuestWork("core:")
      const keepLocalPreferences = !signedIn || isGuestWork("equipment")
      const profiles = keepLocalResults ? mergeDiagnosticProfiles(localProfiles, remote.profiles) : remote.profiles
      const preferences = keepLocalPreferences ? { ...remote.preferences, ...localPreferences } : remote.preferences
      const runs = mergeRuns(signedIn ? guestRuns(localRuns) : localRuns, remote.runs)
      if (remote.authenticated) uploadMissingRuns(localRuns, remote.runs)
      // A guest finished a Quick test, then signed in: save it to the account now.
      const pending = remote.authenticated ? takePendingAssessment() : null
      if (pending)
        void saveAssessmentAction(pending)
          .then((res) => {
            if (!cancelled && res.ok && res.result?.answeredAt) saveDiagnosticResult(res.result)
          })
          .catch(() => {})
      saveDiagnosticProfiles(profiles)
      saveEquipmentPreferences(preferences)
      storeMergedRuns(runs)
      // Only write back preferences the account does not have yet.
      const localOnly = keepLocalPreferences && Object.entries(localPreferences).some(
        ([key, value]) => JSON.stringify((remote.preferences as Record<string, unknown>)[key]) !== JSON.stringify(value),
      )
      if (remote.authenticated && localOnly)
        void saveEquipmentPreferencesAction(preferences)
          .then((res) => res.ok && forgetGuestWork("equipment"))
          .catch(() => {})
      else if (remote.authenticated) forgetGuestWork("equipment")
      setContext({
        profiles,
        runs,
        preferences,
        ready: true,
        authenticated: remote.authenticated,
      })
    })
    window.addEventListener(DNA_EVENT, syncLocal)
    window.addEventListener("storage", syncLocal)
    return () => {
      cancelled = true
      window.removeEventListener(DNA_EVENT, syncLocal)
      window.removeEventListener("storage", syncLocal)
    }
  }, [])
  return (
    <SportDnaContextValue.Provider value={context}>
      {children}
    </SportDnaContextValue.Provider>
  )
}

export function useSportDnaContext() {
  const context = useContext(SportDnaContextValue)
  if (!context)
    throw new Error("useSportDnaContext must be used inside SportDnaProvider")
  return context
}

export function useSportDnaProfiles() {
  return useSportDnaContext().profiles
}

const statusClass = (fit: EquipmentFit) =>
  fit.score >= 85 ? "hot" : fit.score < 50 ? "poor" : ""

export function MatchBadge({
  product,
  variant = "card",
}: {
  product: DnaProduct
  variant?: "card" | "detail"
}) {
  const router = useRouter()
  const { tr } = useShop()
  const { profiles, preferences, runs } = useSportDnaContext()
  const sport = product.sport === "badminton" ? "badminton" : "football"
  // No badge (not even "take the test") for gear a fit score can't describe.
  if (!fitEligible(product)) return null
  const fit = fitFor(profiles, product, preferences, runs)
  const sportName = tr(sport === "football" ? "bóng đá" : "cầu lông", sport)
  const open = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const slug = sport === "football" ? "bong-da" : "cau-long"
    router.push(fit ? `/sportdna/ket-qua/${slug}` : `/sportdna/kiem-tra/${slug}`)
  }
  const label =
    variant === "detail"
      ? tr("phù hợp với SportDNA", "SportDNA fit")
      : tr("phù hợp", "fit")
  const title = fit
    ? tr(
        `${fit.label}. Xem hồ sơ SportDNA ${sportName}`,
        `${fit.label}. View your ${sportName} SportDNA profile`,
      )
    : tr(
        `Làm bài SportDNA ${sportName} để tính độ phù hợp`,
        `Take the ${sportName} SportDNA assessment to calculate fit`,
      )
  return (
    <button
      type="button"
      className={`${
        variant === "detail" ? "detail-match" : "match-badge"
      } dna-badge ${fit ? statusClass(fit) : "unknown"}`}
      onClick={open}
      title={title}
      aria-label={title}
    >
      <Sparkles size={variant === "detail" ? 14 : 12} />{" "}
      {fit === null
        ? tr("Làm bài test để xem độ phù hợp", "Take the test to see your fit")
        : fit.hardFail
          ? tr("Không phù hợp", "Not suitable")
          : `${fit.score}% ${label}`}
    </button>
  )
}

export function EquipmentFitPanel({ product }: { product: DnaProduct }) {
  const { profiles, preferences, ready, runs } = useSportDnaContext()
  const { tr } = useShop()
  if (!fitEligible(product)) return null
  const fit = fitFor(profiles, product, preferences, runs)
  if (!ready) return <div className="equipment-fit-panel loading" />
  if (!fit)
    return (
      <section className="equipment-fit-panel unknown">
        <div>
          <span>SPORTDNA EQUIPMENT FIT</span>
          <h2>{tr("Chưa đủ dữ liệu để đánh giá", "Not enough data to assess")}</h2>
        </div>
        <p>
          {product.sport === "football"
            ? tr("Hoàn thành bài đánh giá bóng đá để nhận phân tích dựa trên kỹ năng thực tế.", "Complete the football assessment to get an analysis based on your real skills.")
            : tr("Hoàn thành bài đánh giá cầu lông để nhận phân tích dựa trên kỹ năng thực tế.", "Complete the badminton assessment to get an analysis based on your real skills.")}
        </p>
        <a
          className="boai-button primary"
          href={product.sport === "football" ? "/sportdna/kiem-tra/bong-da" : "/sportdna/kiem-tra/cau-long"}
        >
          {tr("Làm bài SportDNA", "Take SportDNA")}
        </a>
      </section>
    )
  return (
    <section className={`equipment-fit-panel ${statusClass(fit)}`}>
      <div className="equipment-fit-score">
        <span>{tr("ĐỘ PHÙ HỢP VỚI BẠN", "YOUR FIT")}</span>
        <b>{fit.hardFail ? tr("Loại", "Excluded") : `${fit.score}%`}</b>
        <small>
          {tr(fit.label, fit.labelEn ?? fit.label)} ·{" "}
          {fit.source === "core"
            ? tr("Dựa trên bài đánh giá SportDNA", "Based on your SportDNA assessment")
            : fit.source === "radar"
              ? tr("Dựa trên mạng nhện của bạn", "Based on your radar")
              : fit.source === "deep"
                ? tr("Dựa trên bài Deep", "Based on Deep test")
                : tr("Dựa trên bài Quick", "Based on Quick test")}
        </small>
      </div>
      <div className="equipment-fit-reasons">
        {fit.reasons?.map((reason) => (
          <p className={reason.good ? "pro" : "con"} key={reason.vi}>
            {reason.good ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>
              <b>{reason.good ? tr("Vì sao phù hợp", "Why it fits") : tr("Lưu ý", "Heads-up")}</b>
              {tr(reason.vi, reason.en)}
            </span>
          </p>
        ))}
        {!fit.reasons && fit.pros.map((reason) => (
          <p className="pro" key={reason}>
            <Check size={16} />
            <span>
              <b>{tr("Vì sao phù hợp", "Why it fits")}</b>
              {reason}
            </span>
          </p>
        ))}
        {!fit.reasons && fit.cons.map((reason) => (
          <p className="con" key={reason}>
            <AlertTriangle size={16} />
            <span>
              <b>{tr("Lưu ý", "Heads-up")}</b>
              {reason}
            </span>
          </p>
        ))}
      </div>
    </section>
  )
}

/** Mạng nhện riêng của vợt (từ thông số người bán) chồng với "vợt bạn cần" (từ mạng nhện cá nhân). */
export function RacketRadarPanel({ product }: { product: DnaProduct }) {
  const { profiles, runs, preferences, ready } = useSportDnaContext()
  const { tr } = useShop()
  const racket = racketRadar(product.specs)
  // Under 3 of the 7 racket specs there is no meaningful radar to draw.
  if (!racket || product.equipment.kind !== "badminton_racket" || !fitEligible(product)) return null
  const fit = ready ? racketFit(playerRadar("badminton", profiles, runs), racket, preferences.badmintonPlaystyle) : null
  return (
    <section className="my-6 grid gap-6 border border-[var(--line)] bg-[var(--white)] p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-7">
      <div className="text-[var(--ink)]">
        <DnaRadar
          emptyLabel={tr("Chưa đủ dữ liệu", "Not enough data")}
          title={tr(`Mạng nhện vợt ${product.name}`, `${product.name} racket radar`)}
          axes={RACKET_AXES.map((a) => ({ label: tr(a.label, a.en), value: racket.axes[a.id], overlay: fit && racket.axes[a.id] !== null ? Math.round(fit.needs[a.id]) : undefined }))}
          size={340}
        />
      </div>
      <div className="self-center">
        <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--muted)]">{tr("Mạng nhện vợt · SportDNA", "Racket radar · SportDNA")}</p>
        <h2 className="m-0 mt-2 text-2xl font-black">{tr("Đặc tính của cây vợt", "Racket characteristics")}</h2>
        <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {tr(`Tính từ ${racket.known}/${RACKET_SPEC_COUNT} thông số`, `Based on ${racket.known}/${RACKET_SPEC_COUNT} specs`)}
          {" · "}
          {racket.known < RACKET_SPEC_COUNT
            ? tr("Trục nào thiếu thông số được ghi “Chưa đủ dữ liệu”.", "Axes without enough specs show “Not enough data”.")
            : tr("Đủ cả 7 thông số người bán khai báo (trọng lượng, cân bằng, độ cứng, chiều dài, chu vi cán, sức căng, chất liệu).", "All 7 seller specs provided (weight, balance, stiffness, length, grip, tension, material).")}
        </p>
        <ul className="m-0 mt-4 grid list-none gap-2 p-0 text-sm">
          <li className="flex items-center gap-2"><i className="inline-block h-2.5 w-5 bg-[#1667e8]" /> {tr("Vợt này", "This racket")}</li>
          {fit ? (
            <li className="flex items-center gap-2"><i className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#f97316]" /> {tr("Vợt phù hợp với mạng nhện của bạn", "Racket matching your radar")}</li>
          ) : (
            <li className="text-xs text-[var(--muted)]">
              {tr("Làm bài test cầu lông bất kỳ để thấy vợt phù hợp với bạn chồng lên biểu đồ.", "Take any badminton test to overlay your ideal racket on the chart.")}{" "}
              <a href="/sportdna/kiem-tra/cau-long" className="font-bold text-[#1677ff]">{tr("Làm bài", "Take a test")}</a>
            </li>
          )}
        </ul>
        {fit && <p className="m-0 mt-4 text-sm">{tr("Độ tương thích theo mạng nhện", "Radar compatibility")}: <b className="text-lg">{fit.score}%</b></p>}
      </div>
    </section>
  )
}
