/** Authenticity-code format shared by the seller tools, the collection and /xac-thuc. */
export const AUTH_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{4,30}[A-Z0-9]$/

export const normalizeAuthCode = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 32)

/** From this many lookups on, the public page warns that the code may have been copied. */
export const AUTH_CHECK_WARN_AT = 3
/** Codes a shop can generate in one batch. */
export const AUTH_BATCH_MAX = 200

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Random, unambiguous code (no 0/O/1/I), e.g. BOAI-7KQ2-M9XD-H3TP. */
export function generateAuthCode(prefix = "BOAI") {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("")
  return `${prefix}-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`
}
