import "server-only"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ReactElement, ReactNode } from "react"
import { ImageResponse } from "next/og"
import sharp from "sharp"

/** Social preview images (Facebook, Zalo, X…): 1200×630 PNG. */
export const OG_SIZE = { width: 1200, height: 630 }

type OgFont = { name: string; data: Buffer; weight: 600 | 800; style: "normal" }
let fonts: Promise<OgFont[]> | null = null

/** Be Vietnam Pro (SIL OFL, src/assets/og) so Vietnamese diacritics render in the image. */
function ogFonts(): Promise<OgFont[]> {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), "src/assets/og/BeVietnamPro-SemiBold.ttf")),
    readFile(join(process.cwd(), "src/assets/og/BeVietnamPro-ExtraBold.ttf")),
  ])
    .then(([semi, extra]): OgFont[] => [
      { name: "Be Vietnam Pro", data: semi, weight: 600, style: "normal" },
      { name: "Be Vietnam Pro", data: extra, weight: 800, style: "normal" },
    ])
    .catch((error) => {
      fonts = null
      console.error("og fonts unavailable", error)
      return []
    })
  return fonts
}

/**
 * PNG response. ImageResponse defaults to a one-year immutable cache; prices,
 * results and revoked links change, so previews are cached for minutes instead.
 */
export async function ogImage(element: ReactElement, maxAge = 600) {
  const loaded = await ogFonts()
  return new ImageResponse(element, {
    ...OG_SIZE,
    // Without our font files the renderer falls back to its built-in font.
    ...(loaded.length ? { fonts: loaded } : {}),
    headers: { "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}` },
  })
}

/** Image URLs inside the preview must be absolute (the renderer downloads them). */
export const absoluteUrl = (url: string | null | undefined, origin: string) => {
  if (!url) return null
  try {
    return new URL(url, origin).toString()
  } catch {
    return null
  }
}

/**
 * Downloads an image and returns it as a JPEG data URL: the preview renderer
 * cannot read WebP (most product photos) and must not wait on slow hosts.
 */
export async function embedImage(url: string | null | undefined, origin: string, size = 640): Promise<string | null> {
  const absolute = absoluteUrl(url, origin)
  if (!absolute) return null
  try {
    const res = await fetch(absolute, { signal: AbortSignal.timeout(5000) })
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null
    const input = Buffer.from(await res.arrayBuffer())
    if (input.length > 12_000_000) return null
    const jpeg = await sharp(input).rotate().resize(size, size, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`
  } catch {
    return null
  }
}

export const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text)

/** Shared frame: BOAI navy with the "B BOAI" wordmark, an eyebrow line and a footer. */
export function OgFrame({ eyebrow, footer, children }: { eyebrow: string; footer?: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #071a33 0%, #0b2a52 60%, #1677ff 140%)",
        color: "#ffffff",
        fontFamily: "Be Vietnam Pro",
        padding: "56px 64px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 52, height: 52, alignItems: "center", justifyContent: "center", background: "#1677ff", fontSize: 32, fontWeight: 800 }}>B</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 1 }}>BOAI</div>
        </div>
        <div style={{ display: "flex", fontSize: 20, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: "#8fc1ff" }}>{eyebrow}</div>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", marginTop: 32, marginBottom: 20 }}>{children}</div>
      <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "#9fb3cc", whiteSpace: "nowrap", overflow: "hidden" }}>
        {footer ?? "BOAI · Trang bị bóng đá & cầu lông chính hãng"}
      </div>
    </div>
  )
}
