"use client"

import { useEffect, useRef } from "react"
import { lookupOrderAction } from "../shop-actions"

/**
 * Old links carried the phone number in the URL (?ma=&sdt=). Re-submit them as a
 * POST once so the browser keeps a private proof and the URL loses the phone.
 */
export function LegacyLookup({ code, phone }: { code: string; phone: string }) {
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    form.current?.requestSubmit()
  }, [])
  return (
    <form ref={form} action={lookupOrderAction} className="hidden" aria-hidden>
      <input name="ma" defaultValue={code} />
      <input name="sdt" defaultValue={phone} />
    </form>
  )
}
