"use server"

import { isCoreResult } from "@/lib/sportdna-core"
import { randomUUID } from "node:crypto"
import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import type {
  DnaSport,
  EquipmentPreferences,
  DiagnosticProfiles,
  SkillResult,
} from "@/lib/sportdna"
import { parseAssessmentInput, type AssessmentInput } from "@/lib/sportdna-assessment"
import { computeRun, isTestKind, RUN_KEY_PATTERN, type RunAnswers, type RunResult, type TestKind, type TestRun } from "@/lib/sportdna-runs"

// Lưu một lượt test (đôi, bóng đá, Quick theo môn, luyện tập, vị trí). Collection tự chấm lại.
export async function saveTestRunAction(input: { runKey: string; test: TestKind; answers: RunAnswers }) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, reason: "signed_out" as const }
  if (!input || !isTestKind(input.test) || typeof input.runKey !== "string" || !RUN_KEY_PATTERN.test(input.runKey))
    return { ok: false as const, reason: "invalid" as const }
  if (!computeRun(input.test, input.answers)) return { ok: false as const, reason: "invalid" as const }
  const payload = await getPayloadClient()
  const existing = await payload.find({
    collection: "sport-test-runs",
    where: { runKey: { equals: input.runKey } },
    user,
    overrideAccess: false,
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) return { ok: true as const, duplicate: true }
  await payload.create({
    collection: "sport-test-runs",
    user,
    overrideAccess: false,
    data: { owner: user.id, runKey: input.runKey, test: input.test, sport: "badminton", answers: input.answers, result: {} },
  })
  return { ok: true as const, duplicate: false }
}

// Lưu bài làm SportDNA. Server lọc dữ liệu và collection tự chấm lại (xem SportAssessments).
export async function saveAssessmentAction(input: AssessmentInput) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, reason: "signed_out" as const }
  const answers = parseAssessmentInput(input)
  if (!answers) return { ok: false as const, reason: "invalid" as const }

  const payload = await getPayloadClient()
  const doc = await payload.create({
    collection: "sport-assessments",
    user,
    overrideAccess: false,
    data: {
      owner: user.id,
      assessmentKey: randomUUID(),
      sport: "badminton",
      mode: answers.mode === "quick" ? "quick" : "deep",
      status: "completed",
      answers,
      result: {},
    },
  })
  return { ok: true as const, result: doc.result as SkillResult }
}

const isSkillResult = (value: unknown): value is SkillResult => {
  if (!value || typeof value !== "object") return false
  const result = value as Partial<SkillResult>
  return (
    (result.sport === "football" || result.sport === "badminton") &&
    (result.mode === "quick" || result.mode === "deep") &&
    typeof result.overall === "number" &&
    typeof result.answeredAt === "string" &&
    Array.isArray(result.radar)
  )
}

export async function loadSportDnaContextAction() {
  const user = await appAuth.currentUser()
  if (!user)
    return {
      authenticated: false as const,
      profiles: {} as DiagnosticProfiles,
      runs: [] as TestRun[],
      preferences: {} as EquipmentPreferences,
    }
  const payload = await getPayloadClient()
  const [assessmentResult, account, runResult, coreResult] = await Promise.all([
    payload.find({
      collection: "sport-assessments",
      user,
      overrideAccess: false,
      depth: 0,
      sort: "-createdAt",
      limit: 50,
    }),
    payload.findByID({
      collection: "users",
      id: user.id,
      user,
      overrideAccess: false,
      depth: 0,
    }),
    payload.find({
      collection: "sport-test-runs",
      user,
      overrideAccess: false,
      depth: 0,
      sort: "-createdAt",
      limit: 200,
    }),
    payload.find({
      collection: "sportdna-results",
      user,
      overrideAccess: false,
      depth: 0,
      sort: "-createdAt",
      limit: 20,
      select: { sport: true, elo: true, result: true, createdAt: true },
    }),
  ])
  const runs: TestRun[] = runResult.docs
    .filter((d) => isTestKind(d.test))
    .map((d) => ({
      runKey: d.runKey,
      test: d.test as TestKind,
      at: d.createdAt,
      answers: (d.answers ?? {}) as RunAnswers,
      result: (d.result ?? {}) as RunResult,
    }))
  const profiles: DiagnosticProfiles = {}
  for (const assessment of assessmentResult.docs) {
    if (!isSkillResult(assessment.result)) continue
    const { sport, mode } = assessment.result
    if (!profiles[sport]?.[mode])
      profiles[sport] = { ...profiles[sport], [mode]: assessment.result }
  }
  // Newest SportDNA core result per sport becomes that sport's current profile.
  for (const doc of coreResult.docs) {
    const sport = doc.sport as DnaSport
    if (profiles[sport]?.core || !isCoreResult(doc.result)) continue
    profiles[sport] = { ...profiles[sport], core: { id: String(doc.id), sport, at: doc.createdAt, elo: Number(doc.elo), result: doc.result } }
  }
  const preferences = account.equipmentPreferences ?? {}
  return {
    authenticated: true as const,
    userId: String(user.id),
    profiles,
    runs,
    preferences: {
      footballSurface: preferences.footballSurface ?? undefined,
      badmintonPlaystyle: preferences.badmintonPlaystyle ?? undefined,
      footShape: preferences.footShape ?? undefined,
      budget: preferences.budget ?? undefined,
      stringTensionLbs: preferences.stringTensionLbs ?? undefined,
      gripSize: preferences.badmintonGripSize ?? undefined,
      footballFootShape: preferences.footballFootShape ?? undefined,
      footballPosition: preferences.footballPosition ?? undefined,
      footballBudget: preferences.footballBudget ?? undefined,
    } satisfies EquipmentPreferences,
  }
}

export async function saveEquipmentPreferencesAction(
  input: EquipmentPreferences,
) {
  const user = await appAuth.currentUser()
  if (!user) return { ok: false as const, reason: "signed_out" as const }
  const footballSurface = ["ag", "fg", "ic"].includes(
    input.footballSurface ?? "",
  )
    ? input.footballSurface
    : undefined
  const badmintonPlaystyle = ["attack", "defense", "allround"].includes(
    input.badmintonPlaystyle ?? "",
  )
    ? input.badmintonPlaystyle
    : undefined
  const footShape = ["narrow", "standard", "wide"].includes(
    input.footShape ?? "",
  )
    ? input.footShape
    : undefined
  const budget =
    typeof input.budget === "number" &&
    input.budget >= 0 &&
    input.budget <= 100000000
      ? input.budget
      : undefined
  const stringTensionLbs =
    typeof input.stringTensionLbs === "number" &&
    input.stringTensionLbs >= 15 &&
    input.stringTensionLbs <= 35
      ? input.stringTensionLbs
      : undefined
  const shape = (v: unknown) => (["narrow", "standard", "wide"].includes(String(v)) ? (v as "narrow" | "standard" | "wide") : undefined)
  const money = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 100000000 ? v : undefined)
  const gripSize = ["G4", "G5", "G6"].includes(String(input.gripSize)) ? input.gripSize : undefined
  const footballPosition = ["goalkeeper", "defender", "midfielder", "striker"].includes(String(input.footballPosition)) ? input.footballPosition : undefined
  const payload = await getPayloadClient()
  await payload.update({
    collection: "users",
    id: user.id,
    user,
    overrideAccess: false,
    data: {
      equipmentPreferences: {
        footballSurface,
        badmintonPlaystyle,
        footShape,
        budget,
        stringTensionLbs,
        badmintonGripSize: gripSize,
        footballFootShape: shape(input.footballFootShape),
        footballPosition,
        footballBudget: money(input.footballBudget),
      },
    },
  })
  return { ok: true as const }
}
