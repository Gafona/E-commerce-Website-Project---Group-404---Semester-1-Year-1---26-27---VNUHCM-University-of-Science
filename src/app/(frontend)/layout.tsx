import React from "react"
import type { Metadata } from "next"
import Script from "next/script"
import { BodyCustomCode, renderHeadCustomCode } from "@/lib/make-custom-code"
import {
  makeSiteSettings,
  sanitizeHtmlAttribute,
} from "@/lib/make-site-settings"
import { ShopProvider } from "./components/ShopProvider"
import { ChatDockProvider } from "./components/ChatDock"
import { SportDnaProvider } from "./components/MatchBadge"
import { SiteAnnouncements } from "./components/SiteAnnouncements"
import { SiteContentProvider } from "./components/SiteContentProvider"
import { SiteFooter } from "./components/SiteFooter"
import { getLang, getThemeCookie } from "@/lib/i18n-server"
import { getSiteContent } from "@/lib/site-content"
import { defaultSocialImages } from "@/lib/social"
import "./styles.css"

const favicon = makeSiteSettings.icons?.icon
const googleAnalyticsId = sanitizeHtmlAttribute(
  makeSiteSettings.analytics?.googleAnalyticsId,
)

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  const title =
    makeSiteSettings.title ??
    (lang === "en"
      ? "BOAI — Break limits. Make your mark."
      : "BOAI — Vượt giới hạn. Chất riêng lên tiếng.")
  const description =
    makeSiteSettings.description ??
    (lang === "en"
      ? "Authentic football and badminton gear personalized for the way you play."
      : "Trang bị bóng đá và cầu lông chính hãng, được cá nhân hóa theo lối chơi của bạn.")

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title,
    description,
    robots:
      makeSiteSettings.robots?.index === false
        ? { follow: false, index: false }
        : undefined,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      title,
      description,
      siteName: "BOAI",
      images: defaultSocialImages(),
    },
    twitter: {
      card: "summary_large_image",
      images: defaultSocialImages(),
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const lang = await getLang()
  // A remembered theme is rendered on the server, so the page never flashes light-then-dark.
  const theme = await getThemeCookie()
  const siteContent = await getSiteContent()
  const addBypassLinks = makeSiteSettings.accessibility?.addBypassLinks === true
  const customScripts = makeSiteSettings.customScripts

  return (
    <html
      lang={lang}
      data-theme={theme ?? undefined}
      style={theme ? { colorScheme: theme } : undefined}
      // The theme lives in localStorage, so the pre-hydration script below
      // sets data-theme/color-scheme on <html> before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Load fonts in the browser to avoid Turbopack's Google font resolver. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,600;1,700;1,800;1,900&family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800;900&family=Oswald:wght@500;600;700&family=Roboto+Slab:wght@500;600;700;800&display=swap"
        />
        <Script id="boai-theme" strategy="beforeInteractive">
          {`try{const s=localStorage.getItem("boai-theme");const t=s==="dark"||s==="light"?s:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}`}
        </Script>
        {renderHeadCustomCode(customScripts?.headStart, "head-start")}
        {renderHeadCustomCode(customScripts?.headEnd, "head-end")}
      </head>
      <body className="min-h-screen antialiased">
        <BodyCustomCode html={customScripts?.bodyStart} />
        {addBypassLinks && (
          <a className="figma-bypass-link" href="#root">
            Skip to content
          </a>
        )}
        <div id="root" tabIndex={-1}>
          <ShopProvider initialLang={lang}>
            {/* Inside ShopProvider so pop-ups and banners follow the visitor's language. */}
            <SiteAnnouncements />
            <ChatDockProvider>
              <SiteContentProvider content={siteContent}>
                <SportDnaProvider>{children}</SportDnaProvider>
                <SiteFooter />
              </SiteContentProvider>
            </ChatDockProvider>
          </ShopProvider>
        </div>
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="figma-google-analytics" strategy="afterInteractive">
              {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(googleAnalyticsId)});
`}
            </Script>
          </>
        )}
        <BodyCustomCode html={customScripts?.bodyEnd} />
      </body>
    </html>
  )
}
