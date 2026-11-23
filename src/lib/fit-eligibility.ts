/**
 * Which products get a SportDNA fit score at all. Only gear whose specs say
 * something about the player qualifies: badminton rackets (at least 3 of the
 * 7 racket specs), football boots with a known stud surface, and footballs
 * with size and surface. Apparel, accessories, shuttlecocks, bags and
 * listings missing those specs show no fit badge, panel or radar.
 */
import type { DnaProduct } from "./sportdna"
import { racketSpecsKnown } from "./racket-radar.ts"

const specValue = (product: Pick<DnaProduct, "specs">, pattern: RegExp) =>
  (product.specs ?? []).find((s) => pattern.test(s.label) && s.value.trim())?.value.trim() ?? ""

export function fitEligible(product: Pick<DnaProduct, "sport" | "equipment" | "specs">): boolean {
  const kind = product.equipment.kind
  if (product.sport === "badminton" && kind === "badminton_racket") return racketSpecsKnown(product.specs) >= 3
  if (product.sport === "football" && kind === "football_shoes") return !!product.equipment.surface
  if (product.sport === "football" && kind === "football_ball")
    return !!specValue(product, /kích cỡ|size/i) && (!!product.equipment.surface || !!specValue(product, /mặt sân/i))
  return false
}
