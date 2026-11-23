"use client"

import { Moon, Sun } from "lucide-react"
import { useShop } from "./ShopProvider"

/**
 * Language (VI | EN) and light/dark switches for the header. Uses the same
 * ShopProvider setters as /cai-dat (cookie + localStorage + account sync +
 * router.refresh), so both places always show the same state.
 */
export function PreferenceToggles({ variant = "bar" }: { variant?: "bar" | "menu" }) {
  const { lang, setLang, theme, setTheme, tr } = useShop()
  const nextTheme = theme === "dark" ? "light" : "dark"
  const box = variant === "bar" ? "desktop-only items-center gap-1.5" : "grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3"
  const button =
    variant === "bar"
      ? "icon-button"
      : "flex h-10 items-center justify-center gap-2 border border-[var(--line)] bg-[var(--white)] text-[11px] font-extrabold uppercase"
  return (
    <div className={`${box} ${variant === "bar" ? "flex" : ""}`} role="group" aria-label={tr("Ngôn ngữ và giao diện", "Language and appearance")}>
      <button
        type="button"
        className={`${button} ${variant === "bar" ? "w-auto! px-2.5 text-[10px] font-extrabold" : ""}`}
        onClick={() => setLang(lang === "vi" ? "en" : "vi")}
        aria-label={lang === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
        title={lang === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
      >
        <span className={lang === "vi" ? "text-[var(--lime-dark)]" : "opacity-45"}>VI</span>
        <span aria-hidden className="mx-0.5 opacity-35">|</span>
        <span className={lang === "en" ? "text-[var(--lime-dark)]" : "opacity-45"}>EN</span>
      </button>
      <button
        type="button"
        className={button}
        onClick={() => setTheme(nextTheme)}
        aria-label={nextTheme === "dark" ? tr("Bật giao diện tối", "Switch to dark mode") : tr("Bật giao diện sáng", "Switch to light mode")}
        title={nextTheme === "dark" ? tr("Giao diện tối", "Dark mode") : tr("Giao diện sáng", "Light mode")}
        aria-pressed={theme === "dark"}
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        {variant === "menu" && <span>{theme === "dark" ? tr("Sáng", "Light") : tr("Tối", "Dark")}</span>}
      </button>
    </div>
  )
}
