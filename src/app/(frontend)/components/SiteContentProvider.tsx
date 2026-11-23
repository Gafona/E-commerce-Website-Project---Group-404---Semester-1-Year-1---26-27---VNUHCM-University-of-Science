"use client"

import { createContext, useCallback, useContext } from "react"
import {
  pickText,
  toLines,
  type ContentKey,
  type ResolvedContent,
} from "@/lib/site-content-schema"
import { useShop } from "./ShopProvider"

const SiteContentContext = createContext<ResolvedContent | null>(null)

export function SiteContentProvider({
  content,
  children,
}: {
  content: ResolvedContent
  children: React.ReactNode
}) {
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>
}

/** Admin-editable copy in the visitor's current language. */
export function useSiteContent() {
  const content = useContext(SiteContentContext)
  const { lang } = useShop()
  if (!content) throw new Error("useSiteContent must be used inside SiteContentProvider")
  const t = useCallback(
    (key: ContentKey, vars?: Record<string, string | number>) => pickText(content[key], lang, vars),
    [content, lang],
  )
  const lines = useCallback((key: ContentKey) => toLines(pickText(content[key], lang)), [content, lang])
  return { t, lines }
}
