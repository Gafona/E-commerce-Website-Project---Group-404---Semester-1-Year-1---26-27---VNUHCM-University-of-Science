import { cookies, headers } from "next/headers"
import { isLang, LANG_COOKIE, makeTr, type Lang } from "./i18n"
import { defaultSocialImages } from "./social"

export const THEME_COOKIE = "boai-theme"

/**
 * The visitor's saved language; on a first visit, the browser's Accept-Language
 * decides between Vietnamese and English (Vietnamese when neither is listed).
 */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value
  if (isLang(value)) return value
  return preferredFromHeader((await headers()).get("accept-language"))
}

export function preferredFromHeader(header: string | null | undefined): Lang {
  if (!header) return "vi"
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";")
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1)
      return { base: tag.split("-")[0], q: Number.isFinite(q) ? q : 0, index }
    })
    .filter((entry) => entry.base === "vi" || entry.base === "en")
    .sort((a, b) => b.q - a.q || a.index - b.index)
  return ranked[0]?.base === "en" ? "en" : "vi"
}

/** Theme the visitor explicitly chose earlier (null = follow the device setting). */
export async function getThemeCookie(): Promise<"light" | "dark" | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return value === "dark" || value === "light" ? value : null
}

export async function getTr() {
  return makeTr(await getLang())
}

export async function localizedTitle(vi: string, en: string) {
  const title = (await getTr())(vi, en)
  // Link previews show this page's title; a page-level openGraph replaces the layout's, so the image is repeated.
  return { title, openGraph: { title, images: defaultSocialImages() }, twitter: { card: "summary_large_image" as const, title, images: defaultSocialImages() } }
}
