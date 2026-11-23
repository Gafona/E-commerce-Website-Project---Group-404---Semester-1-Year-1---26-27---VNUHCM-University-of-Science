import Image from "next/image"
import { Check } from "lucide-react"
import { getLang } from "@/lib/i18n-server"
import { getSiteContent } from "@/lib/site-content"
import { getSiteImages } from "@/lib/site-images"
import { pickText, toLines } from "@/lib/site-content-schema"
import { Logo } from "./Logo"

/** Left-hand photo panel of the login/register pages, fully admin-managed. */
export async function AuthVisual({ page }: { page: "login" | "register" }) {
  const [lang, content, images] = await Promise.all([getLang(), getSiteContent(), getSiteImages([page])])
  const t = (field: "eyebrow" | "title1" | "title2" | "text" | "points") => pickText(content[`${page}.${field}`], lang)
  const photo = images[page]
  const points = toLines(t("points"))
  return (
    <div className="auth-visual">
      {photo && (
        <Image
          src={photo.url}
          alt=""
          fill
          preload
          sizes="(max-width: 900px) 1px, 55vw"
          className="auth-visual-photo object-cover"
          style={{ objectPosition: photo.objectPosition }}
        />
      )}
      <Logo />
      <div className="auth-visual-copy">
        <span>{t("eyebrow")}</span>
        <h1>
          {t("title1")}
          {t("title2") && (
            <>
              <br />
              {t("title2")}
            </>
          )}
        </h1>
        {t("text") && <p>{t("text")}</p>}
        {points.length > 0 && (
          <div className="auth-visual-points">
            {points.map((point) => (
              <span key={point}>
                <Check size={14} />
                {point}
              </span>
            ))}
          </div>
        )}
      </div>
      {photo?.credit && (
        <small className="relative z-[1] text-[9px] text-white/55">
          {lang === "en" ? "Photo" : "Ảnh"}:{" "}
          {photo.credit.url ? (
            <a href={photo.credit.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {photo.credit.author}
            </a>
          ) : (
            photo.credit.author
          )}
        </small>
      )}
    </div>
  )
}
