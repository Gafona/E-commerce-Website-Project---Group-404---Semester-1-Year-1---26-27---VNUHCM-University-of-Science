import type { PayloadRequest } from "payload"
import { buildDnaShare, profilesFromDocs, type DnaShareCard, type DnaShareKind } from "./sportdna-share"
import type { DnaSportKey } from "./sportdna-radar"
import { isCoreResult } from "./sportdna-core"

/**
 * A member's current SportDNA card (ELO/tier + 8 axes), built on the server from
 * their own assessments, test runs and latest main result. Shared cards are
 * snapshots of this, so a visitor can never submit made-up scores.
 */
export async function ownerDnaShare(req: PayloadRequest, ownerId: string, kind: DnaShareKind, sport: DnaSportKey): Promise<DnaShareCard | null> {
  const [assessments, runs, coreResults] = await Promise.all([
    req.payload.find({ collection: "sport-assessments", where: { owner: { equals: ownerId } }, sort: "-createdAt", limit: 50, depth: 0, overrideAccess: true, req }),
    req.payload.find({ collection: "sport-test-runs", where: { owner: { equals: ownerId } }, sort: "-createdAt", limit: 200, depth: 0, overrideAccess: true, req }),
    req.payload.find({
      collection: "sportdna-results",
      where: { and: [{ owner: { equals: ownerId } }, { sport: { equals: sport } }] },
      sort: "-createdAt",
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  ])
  const { profiles, runs: testRuns } = profilesFromDocs(assessments.docs, runs.docs)
  const core = isCoreResult(coreResults.docs[0]?.result) ? coreResults.docs[0].result : null
  return buildDnaShare(kind, sport, profiles, testRuns, core)
}

export const missingResultMessage = (kind: DnaShareKind) =>
  kind === "elo"
    ? "Bạn chưa có điểm ELO cho môn này. Hãy làm bài test trước khi chia sẻ."
    : "Mạng nhện của bạn chưa có dữ liệu. Hãy làm bài test trước khi chia sẻ."
