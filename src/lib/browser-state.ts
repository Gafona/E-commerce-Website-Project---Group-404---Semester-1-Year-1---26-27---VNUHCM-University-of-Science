export const ACCOUNT_STATE_EVENT = "boai-account-state-change"

export function signalAccountStateChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ACCOUNT_STATE_EVENT))
}

/** Which account the personal data in this browser's storage belongs to. */
const OWNER_KEY = "boai-owner"
/** Work done while signed out in this tab; only this may be added to the account that signs in. */
const GUEST_WORK_KEY = "boai-guest-work"

/**
 * One person's data kept in this browser: cart, favorites and compare (`boai-shop-v1`
 * and the per-account `boai-shop-v1:<id>`), unticked cart lines, search history, every
 * SportDNA store (`boai-sportdna*`, `boai-dna-core-pending`) and the jersey studio draft.
 * Device choices (theme, language, dismissed announcements, chat bubble position) stay.
 */
const PERSONAL_KEYS = new Set([
  "boai-shop-v1",
  "boai-cart-deselected",
  "boai-search-history",
  "boai-dna-core-pending",
  "boai-jersey-studio-v1",
  OWNER_KEY,
])
const PERSONAL_PREFIXES = ["boai-shop-v1:", "boai-sportdna"]
const SESSION_PREFIXES = ["boai-", "sportdna:"]

const isPersonal = (key: string) => PERSONAL_KEYS.has(key) || PERSONAL_PREFIXES.some((prefix) => key.startsWith(prefix))

/** Removes everything personal from this browser (sign-out, account deletion, account switch). */
export function clearBrowserAccountData() {
  try {
    for (const key of Object.keys(localStorage)) if (isPersonal(key)) localStorage.removeItem(key)
    for (const key of Object.keys(sessionStorage))
      if (SESSION_PREFIXES.some((prefix) => key.startsWith(prefix))) sessionStorage.removeItem(key)
  } catch {
    /* storage blocked */
  }
}

/** Clears personal data, then reloads so no in-memory copy (cart, SportDNA, chat) survives. */
export function leaveAccount(destination = "/") {
  clearBrowserAccountData()
  window.location.assign(destination)
}

/**
 * Call once a signed-in session is confirmed. Data written for another account (for
 * example when a session expired without signing out) is wiped before it can be merged.
 */
export function claimBrowserData(userId: string | number) {
  try {
    const id = String(userId)
    const owner = localStorage.getItem(OWNER_KEY)
    if (owner && owner !== id) clearBrowserAccountData()
    localStorage.setItem(OWNER_KEY, id)
  } catch {
    /* storage blocked */
  }
}

function readGuestWork(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(GUEST_WORK_KEY) ?? "[]")
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

function writeGuestWork(items: string[]) {
  try {
    sessionStorage.setItem(GUEST_WORK_KEY, JSON.stringify(items.slice(-300)))
  } catch {
    /* storage blocked */
  }
}

/** Remembers (for this tab only) something not yet saved to an account, e.g. `run:<key>`. */
export function markGuestWork(item: string) {
  const items = readGuestWork()
  if (!items.includes(item)) writeGuestWork([...items, item])
}

export function forgetGuestWork(item: string) {
  writeGuestWork(readGuestWork().filter((entry) => entry !== item))
}

export function isGuestWork(item: string) {
  return readGuestWork().includes(item)
}

export function hasGuestWork(prefix: string) {
  return readGuestWork().some((entry) => entry.startsWith(prefix))
}
