import { preferredSkill, type DiagnosticProfiles } from "./sportdna"
import { scenarioElo, type TestRun } from "./sportdna-runs"
import { latestDnaElo, type DnaStoredResult } from "./sportdna-core"

/**
 * The sport a player is strongest in: the higher SportDNA rating (new
 * per-sport assessment first, then the older tests). Null without any result.
 */
export function strongestSport(profiles: DiagnosticProfiles, runs: TestRun[], extra: DnaStoredResult[] = []): "badminton" | "football" | null {
  const dna = [...extra, ...(["badminton", "football"] as const).flatMap((s) => (profiles[s]?.core ? [profiles[s]!.core!] : []))]
  const rating = (sport: "badminton" | "football") => {
    const fresh = latestDnaElo(dna, sport)
    if (fresh !== null) return fresh
    const skill = preferredSkill(profiles, sport)?.overall ?? null
    const scenario = scenarioElo(runs, sport === "badminton" ? "doubles_scenario" : "football_scenario").overall
    const values = [skill, scenario].filter((v): v is number => typeof v === "number")
    return values.length ? Math.max(...values) : null
  }
  const b = rating("badminton")
  const f = rating("football")
  if (b === null && f === null) return null
  if (b === null) return "football"
  if (f === null) return "badminton"
  return f > b ? "football" : "badminton"
}
