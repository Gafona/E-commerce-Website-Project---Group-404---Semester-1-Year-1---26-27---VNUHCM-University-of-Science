"use server"

import { appAuth } from "@/lib/app-auth"
import { getPayloadClient } from "@/lib/payload"
import { getTr } from "@/lib/i18n-server"
import { hit } from "@/lib/rate-limit"
import { isCoreResult, parseCoreAnswers, sanitizeContext, type CoreContext, type DnaStoredResult } from "@/lib/sportdna-core"
import type { CoreSport } from "@/lib/sportdna-core-bank"

const POSITION = { FW: "striker", MF: "midfielder", DF: "defender", GK: "goalkeeper" } as const

export type CoreHistoryRow = { id: string; at: string; elo: number; tierName: string; attempt: number; consistent: boolean }

/** Saves one attempt (the collection recomputes the score) and syncs the context into equipment needs. */
export async function saveCoreAssessmentAction(input: { sport: CoreSport; answers: Record<string, number>; context: CoreContext }): Promise<{ ok: true; saved: DnaStoredResult } | { ok: false; error: string; signedOut?: boolean }> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) return { ok: false, signedOut: true, error: tr("Đăng nhập để lưu kết quả.", "Sign in to save your result.") }
  const sport: CoreSport = input?.sport === "football" ? "football" : "badminton"
  const answers = parseCoreAnswers(sport, input?.answers)
  if (!answers) return { ok: false, error: tr("Bài làm chưa đủ câu trả lời.", "Some situations are unanswered.") }
  if (!hit(`dna-core:${user.id}`, 12, 60 * 60_000).ok) return { ok: false, error: tr("Bạn đã làm bài quá nhiều lần trong 1 giờ. Thử lại sau.", "Too many attempts this hour. Try again later.") }
  const context = sanitizeContext(sport, input?.context)
  const payload = await getPayloadClient()
  try {
    const doc = await payload.create({ collection: "sportdna-results", data: { sport, answers, context, owner: user.id } as never, overrideAccess: false, user })
    if (!isCoreResult(doc.result)) throw new Error("no result")
    // The assessment context doubles as equipment needs (surface for boots, style for rackets).
    const current = user.equipmentPreferences ?? {}
    const nextPrefs =
      sport === "football"
        ? { ...current, ...(context.surface ? { footballSurface: context.surface } : {}), ...(context.position ? { footballPosition: POSITION[context.position] } : {}) }
        : { ...current, ...(context.style ? { badmintonPlaystyle: context.style } : {}) }
    await payload.update({ collection: "users", id: user.id, data: { equipmentPreferences: nextPrefs }, overrideAccess: false, user, depth: 0 }).catch(() => null)
    return { ok: true, saved: { id: String(doc.id), sport, at: doc.createdAt, elo: Number(doc.elo), result: doc.result } }
  } catch (error) {
    console.error("saveCoreAssessmentAction failed", error)
    return { ok: false, error: tr("Không thể lưu kết quả. Vui lòng thử lại.", "Couldn't save the result. Please try again.") }
  }
}

/** Own history for one sport, newest first (each retake is a new row). */
export async function loadCoreHistoryAction(sportInput: CoreSport): Promise<{ authenticated: boolean; latest: DnaStoredResult | null; history: CoreHistoryRow[] }> {
  const user = await appAuth.currentUser()
  if (!user) return { authenticated: false, latest: null, history: [] }
  const sport: CoreSport = sportInput === "football" ? "football" : "badminton"
  const { docs } = await (await getPayloadClient()).find({
    collection: "sportdna-results",
    where: { sport: { equals: sport } },
    sort: "-createdAt",
    limit: 20,
    depth: 0,
    overrideAccess: false,
    user,
  })
  const first = docs[0]
  return {
    authenticated: true,
    latest: first && isCoreResult(first.result) ? { id: String(first.id), sport, at: first.createdAt, elo: Number(first.elo), result: first.result } : null,
    history: docs.map((d) => ({ id: String(d.id), at: d.createdAt, elo: Number(d.elo), tierName: d.tierName ?? "", attempt: Number(d.attempt ?? 1), consistent: d.consistent !== false })),
  }
}
