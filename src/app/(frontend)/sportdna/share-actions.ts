"use server"

import { createPayloadRequest } from "payload"
import { appAuth } from "@/lib/app-auth"
import { getLang } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"
import { ownerDnaShare } from "@/lib/dna-snapshot"
import { hit } from "@/lib/rate-limit"
import { isDnaShareKind, isDnaSport, type DnaShareKind } from "@/lib/sportdna-share"

export type DnaShareResult = { ok: true; id: string; path: string } | { ok: false; error: string; signedOut?: boolean }

/** JSON with sorted keys: stored JSON columns may return keys in another order. */
const stable = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stable).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
          .join(",")}}`
      : JSON.stringify(value ?? null)

async function session() {
  const [user, lang] = await Promise.all([appAuth.currentUser(), getLang()])
  const t = (vi: string, en: string) => (lang === "en" ? en : vi)
  return { user: user && user.collection === "users" ? user : null, t }
}

/** A public, read-only snapshot of the member's current SportDNA card. */
export async function createDnaShareAction(sport: string, kind = "elo"): Promise<DnaShareResult> {
  const { user, t } = await session()
  if (!user) return { ok: false, signedOut: true, error: t("Đăng nhập để tạo liên kết chia sẻ kết quả.", "Sign in to create a share link.") }
  if (!isDnaSport(sport)) return { ok: false, error: t("Môn thể thao không hợp lệ.", "Invalid sport.") }
  const shareKind: DnaShareKind = isDnaShareKind(kind) ? kind : "elo"
  if (!hit(`dna-share:${user.id}`, 20, 60 * 60_000).ok)
    return { ok: false, error: t("Bạn đã tạo nhiều liên kết trong giờ qua. Vui lòng thử lại sau.", "You've created many links this hour. Please try again later.") }
  try {
    const payload = await getPayloadClient()
    const card = await ownerDnaShare(await createPayloadRequest({ payload }), String(user.id), shareKind, sport)
    if (!card)
      return {
        ok: false,
        error:
          shareKind === "elo"
            ? t("Bạn chưa có điểm ELO cho môn này. Hãy làm bài test trước khi chia sẻ.", "No ELO for this sport yet. Take the test before sharing.")
            : t("Mạng nhện của bạn chưa có dữ liệu. Hãy làm bài test trước khi chia sẻ.", "Your radar has no data yet. Take the test before sharing."),
      }
    // Sharing the same result again reuses its link instead of piling up copies.
    const latest = await payload.find({
      collection: "dna-shares",
      where: { and: [{ owner: { equals: user.id } }, { sport: { equals: sport } }, { kind: { equals: shareKind } }, { active: { equals: true } }] },
      sort: "-createdAt",
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user,
    })
    const previous = latest.docs[0]
    if (previous && stable(previous.card) === stable(card)) return { ok: true, id: String(previous.id), path: `/sportdna/chia-se/${previous.id}` }
    const doc = await payload.create({ collection: "dna-shares", data: { owner: user.id, sport, kind: shareKind }, overrideAccess: false, user })
    return { ok: true, id: String(doc.id), path: `/sportdna/chia-se/${doc.id}` }
  } catch {
    return { ok: false, error: t("Không tạo được liên kết, vui lòng thử lại.", "Couldn't create the link. Please try again.") }
  }
}

/** Turns a link off for good; visitors then see "no longer shared". */
export async function revokeDnaShareAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const { user, t } = await session()
  if (!user) return { ok: false, error: t("Hãy đăng nhập lại.", "Please sign in again.") }
  if (typeof id !== "string" || !/^[\w-]{1,64}$/.test(id)) return { ok: false, error: t("Liên kết không hợp lệ.", "Invalid link.") }
  try {
    const payload = await getPayloadClient()
    await payload.update({ collection: "dna-shares", id, data: { active: false }, overrideAccess: false, user })
    return { ok: true }
  } catch {
    return { ok: false, error: t("Không thu hồi được liên kết, vui lòng thử lại.", "Couldn't revoke the link. Please try again.") }
  }
}
