"use client"

import type { ReactNode } from "react"
import { Check, Globe, Moon, Sun } from "lucide-react"
import { LANGS } from "@/lib/i18n"
import { useShop } from "../components/ShopProvider"

export function SettingsView({ children }: { children?: ReactNode }) {
  const { t, lang, setLang, theme, setTheme, notify } = useShop()
  return (
    <section className="page-shell flow-page narrow">
      <div className="eyebrow">{t("settingsEyebrow")}</div>
      <h1 className="flow-title">{t("settingsTitle")}</h1>
      {children}
      <div className="form-card settings-card">
        <div className="settings-head"><span><Globe size={20} /></span><div><h3>{t("languageTitle")}</h3><p className="hint">{t("languageHint")}</p></div></div>
        <div className="lang-options" role="radiogroup" aria-label={t("languageTitle")}>
          {LANGS.map((l) => (
            <button key={l.value} role="radio" aria-checked={lang === l.value} className={lang === l.value ? "active" : ""} onClick={() => { setLang(l.value); notify(l.value === "en" ? "Settings saved" : "Đã lưu cài đặt") }}>
              <span className="lang-code">{l.value.toUpperCase()}</span>
              <span><b>{l.label}</b><small>{l.native}</small></span>
              {lang === l.value && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>
      <div className="form-card settings-card">
        <div className="settings-head"><span>{theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}</span><div><h3>{t("appearanceTitle")}</h3><p className="hint">{t("appearanceHint")}</p></div></div>
        <div className="lang-options" role="radiogroup" aria-label={t("appearanceTitle")}>
          {(["light", "dark"] as const).map((value) => {
            const Icon = value === "light" ? Sun : Moon
            return (
              <button key={value} role="radio" aria-checked={theme === value} className={theme === value ? "active" : ""} onClick={() => { setTheme(value); notify(t("saved")) }}>
                <span className="lang-code"><Icon size={17} /></span>
                <span><b>{t(value === "light" ? "lightMode" : "darkMode")}</b><small>{t(value === "light" ? "lightModeHint" : "darkModeHint")}</small></span>
                {theme === value && <Check size={18} />}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
