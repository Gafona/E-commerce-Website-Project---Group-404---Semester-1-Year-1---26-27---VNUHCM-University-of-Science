// Match Rating engine (DS-1 v8, Lead sửa lượt 14). Thuần TS, không phụ thuộc thư viện.
// Mọi hằng GIẢ ĐỊNH nằm ở ratingConfig.ts (E1b); engine chỉ dùng lại.
import {
  BLEND_SATURATION, CAP_CONFIG, DRIFT_TARGET_MEAN, DRIFT_THRESHOLD, FARM_MIN_PRIOR_MEETINGS, FARM_WINDOW_DAYS,
  K_BASE, N_EFF_WEIGHTS, PROVISIONAL_GROWTH_CAP, PROVISIONAL_K_MULTIPLIER, PROVISIONAL_MATCHES, TOURNAMENT_DELTA_CAP,
} from './ratingConfig.ts';

export { CAP_CONFIG, K_BASE };
export type MatchType = 'friendly' | 'community' | 'official';

export interface PlayerState {
  id: string;
  mr: number;
  matchesPlayed: number;        // số trận đã tính điểm (để xác định PROVISIONAL_MATCHES trận đầu)
  mrGainFirst10: number;        // tổng mức tăng MR đã nhận trong các trận lâm thời (chỉ cộng phần dương)
  deviceId?: string;
}

export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

export function kFor(p: PlayerState, type: MatchType): number {
  return K_BASE[type] * (p.matchesPlayed < PROVISIONAL_MATCHES ? PROVISIONAL_K_MULTIPLIER : 1);
}

/** teamA/teamB: 1 người (đơn) hoặc 2 người (đôi). aWins: đội A thắng. violators: tập người bị ΔR = 0 (quyết định 14). */
export function computeMatchDeltas(
  teamA: PlayerState[], teamB: PlayerState[], aWins: boolean, type: MatchType,
  violators: Set<string> = new Set(), growthCap = PROVISIONAL_GROWTH_CAP,
): Record<string, number> {
  const mean = (t: PlayerState[]) => t.reduce((s, p) => s + p.mr, 0) / t.length;
  const e = expectedScore(mean(teamA), mean(teamB));
  const kMatch = Math.max(...[...teamA, ...teamB].map(p => kFor(p, type)));
  const dA = kMatch * ((aWins ? 1 : 0) - e); // mỗi người đội A nhận dA, mỗi người đội B nhận -dA
  const out: Record<string, number> = {};
  for (const p of teamA) out[p.id] = dA;
  for (const p of teamB) out[p.id] = -dA;
  for (const p of [...teamA, ...teamB]) {
    if (violators.has(p.id)) { out[p.id] = 0; continue; }
    if (p.matchesPlayed < PROVISIONAL_MATCHES && out[p.id] > 0) {
      out[p.id] = Math.max(0, Math.min(out[p.id], growthCap - p.mrGainFirst10)); // áp cho TỪNG người
    }
  }
  return out; // drift tổng sinh ra theo quyết định 12
}

/** Gom tài khoản cùng deviceId thành một cụm (union-find) để đếm đối thủ khác nhau. Đại diện cụm xác định (id nhỏ nhất). */
export function canonicalIds(players: Record<string, { deviceId?: string }>): Record<string, string> {
  const byDev: Record<string, string[]> = {};
  for (const [id, p] of Object.entries(players)) if (p.deviceId) (byDev[p.deviceId] ||= []).push(id);
  const canon: Record<string, string> = {};
  for (const id of Object.keys(players)) canon[id] = id;
  for (const ids of Object.values(byDev)) { const rep = [...ids].sort()[0]; for (const id of ids) canon[id] = rep; }
  return canon;
}

export interface MatchResult {
  matchId: string; matchType: MatchType; date: Date; teamA: string[]; teamB: string[];
  isVerified: boolean; isAdminVerified?: boolean; isWalkover: boolean; isKZero: boolean;
}

export function countUniqueOpponents(
  matches: MatchResult[], target: string, type: MatchType,
  players: Record<string, { deviceId?: string }>,
): number {
  const canon = canonicalIds(players);
  const me = canon[target] ?? target;
  const set = new Set<string>();
  for (const m of matches) {
    if (m.matchType !== type || !m.isVerified || m.isWalkover || m.isKZero) continue;
    if (type === 'community' && m.isAdminVerified !== true) continue;
    const inA = m.teamA.includes(target), inB = m.teamB.includes(target);
    if (!inA && !inB) continue;
    for (const o of inA ? m.teamB : m.teamA) {
      const c = canon[o] ?? o;
      if (c !== me) set.add(c); // tài khoản trùng cụm với chính mình không tính
    }
  }
  return set.size;
}

// ---- Bổ sung lượt 14 ----
export interface BlendInput { ar: number; mr: number; v1: number; v2: number; v3: number; uniqueV2Opponents: number }

export function calculateBlendedRating(i: BlendInput) {
  const nEff = i.v1 * N_EFF_WEIGHTS.v1 + i.v2 * N_EFF_WEIGHTS.v2 + i.v3 * N_EFF_WEIGHTS.v3;
  const w = nEff / (nEff + BLEND_SATURATION);
  let br = w * i.mr + (1 - w) * i.ar;
  const c = CAP_CONFIG;
  const rm1 = i.v3 >= c.v3ToRemove || (i.v2 >= c.v2For1 && i.uniqueV2Opponents >= c.opp1);
  const rm2 = i.v3 >= c.v3ToRemove || (i.v2 >= c.v2For2 && i.uniqueV2Opponents >= c.opp2);
  const caps: number[] = [], activeCaps: string[] = [];
  if (!rm1 && !rm2) { /* cả hai còn */ }
  if (!rm1) { caps.push(c.cap1); activeCaps.push('cap1_1199'); }
  if (!rm2) { caps.push(i.ar + c.cap2Margin); activeCaps.push('cap2_AR+200'); }
  if (caps.length) br = Math.min(br, ...caps);
  return { br, activeCaps, isFullyUncapped: caps.length === 0 };
}

/** Trần ±TOURNAMENT_DELTA_CAP/giải: kẹp TỔNG ΔR của từng người trong một giải. */
export function applyTournamentCap(totals: Record<string, number>, maxCap = TOURNAMENT_DELTA_CAP): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, d] of Object.entries(totals)) out[id] = Math.max(-maxCap, Math.min(maxCap, d));
  return out;
}

/** Người vi phạm farm: cặp đối thủ đã gặp ≥ FARM_MIN_PRIOR_MEETINGS lần (đã xác minh, không walkover/KZero, không official) trong FARM_WINDOW_DAYS ngày trước trận này. */
export function findFarmViolators(all: MatchResult[], cur: MatchResult & { tournamentId?: string; tournamentPhase?: 'group' | 'knockout' | 'none' }): Set<string> {
  const v = new Set<string>();
  if (cur.tournamentId && ['group', 'knockout'].includes(cur.tournamentPhase || '') && cur.isAdminVerified === true) return v;
  const to = new Date(cur.date).getTime(), from = to - FARM_WINDOW_DAYS * 86400000;
  const past = all.filter(m => m.matchType !== 'official' && !m.isKZero && !m.isWalkover && m.isVerified
    && new Date(m.date).getTime() < to && new Date(m.date).getTime() >= from);
  for (const a of cur.teamA) for (const b of cur.teamB) {
    let n = 0;
    for (const m of past) if ((m.teamA.includes(a) && m.teamB.includes(b)) || (m.teamA.includes(b) && m.teamB.includes(a))) n++;
    if (n >= FARM_MIN_PRIOR_MEETINGS) { v.add(a); v.add(b); }
  }
  return v;
}

/** Giảm phát hai chiều: nếu |mean − DRIFT_TARGET_MEAN| > DRIFT_THRESHOLD thì dịch mọi người về lại mean = DRIFT_TARGET_MEAN. */
export function measureAndApplyDrift(r: Record<string, number>) {
  const ids = Object.keys(r);
  if (!ids.length) return { newRatings: {}, driftApplied: 0 };
  const mean = ids.reduce((s, id) => s + r[id], 0) / ids.length;
  if (Math.abs(mean - DRIFT_TARGET_MEAN) <= DRIFT_THRESHOLD) return { newRatings: { ...r }, driftApplied: 0 };
  const shift = DRIFT_TARGET_MEAN - mean;
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = r[id] + shift;
  return { newRatings: out, driftApplied: shift };
}
