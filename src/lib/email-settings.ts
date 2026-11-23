/**
 * Outgoing email (SMTP) settings from environment variables. All five must be
 * set; otherwise Payload keeps its development fallback and only writes emails
 * to the server log. Server-side only: never import this from client code.
 */
export type SmtpSettings = {
  host: string
  port: number
  user: string
  pass: string
  fromAddress: string
  fromName: string
}

export function smtpSettings(): SmtpSettings | null {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM?.trim()
  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass || !from) return null
  // EMAIL_FROM may be "BOAI <no-reply@boai.vn>" or a bare address.
  const named = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from)
  return {
    host,
    port,
    user,
    pass,
    fromAddress: (named ? named[2] : from).trim(),
    fromName: named?.[1]?.trim() || "BOAI",
  }
}

export function emailConfigured() {
  return smtpSettings() !== null
}
