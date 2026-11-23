"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "./Logo"
import { useShop } from "./ShopProvider"
import { useSiteContent } from "./SiteContentProvider"

/** Work areas and full-screen test flows keep their own chrome. */
const HIDDEN_PREFIXES = ["/kenh-ban-hang", "/quan-tri", "/khoa-cua-hang", "/tin-nhan", "/sportdna/kiem-tra", "/sportdna/assessment", "/sportdna/bank"]

/** One shared footer (hotline + social links from site content) on every main page. */
export function SiteFooter() {
  const path = usePathname() ?? "/"
  const { tr } = useShop()
  const { t: copy } = useSiteContent()
  if (HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null
  const hotline = copy("contact.hotline")
  const socials = (
    [
      ["Zalo", "contact.zalo"],
      ["Facebook", "contact.facebook"],
      ["TikTok", "contact.tiktok"],
      ["Instagram", "contact.instagram"],
      ["YouTube", "contact.youtube"],
    ] as const
  )
    .map(([label, key]) => ({ label, href: copy(key) }))
    .filter((link) => link.href)
  return (
    <footer className="footer">
      <div className="page-shell footer-inner">
        <Logo />
        <p>{copy("footer.tagline")}</p>
        <nav className="footer-links" aria-label={tr("Liên kết chân trang", "Footer links")}>
          <Link href="/don-hang">{tr("Tra cứu đơn", "Track order")}</Link>
          <Link href="/xac-thuc">{tr("Kiểm tra mã xác thực", "Verify authenticity")}</Link>
          <Link href="/tai-khoan">{tr("Tài khoản", "Account")}</Link>
          {hotline && <a href={`tel:${hotline.replace(/[^\d+]/g, "")}`}>Hotline {hotline}</a>}
          {socials.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </nav>
        <small>
          © {new Date().getFullYear()} {copy("footer.copyright")}
        </small>
      </div>
    </footer>
  )
}
