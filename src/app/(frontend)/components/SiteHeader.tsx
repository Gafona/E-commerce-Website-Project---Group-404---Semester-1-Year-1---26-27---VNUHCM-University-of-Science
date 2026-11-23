"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { Menu, Search, ShoppingBag, X, Zap } from "lucide-react"
import { Logo } from "./Logo"
import { useShop } from "./ShopProvider"
import { AccountMenu } from "./AccountMenu"
import { ExploreMenu } from "./ExploreMenu"
import { SportDnaMenu } from "./SportDnaMenu"
import { SearchBox } from "./SearchBox"
import { NotificationBell } from "./NotificationBell"
import { PreferenceToggles } from "./PreferenceToggles"
import type { SearchItem, ShopSearchItem } from "@/lib/search"

type HeaderUser = {
  name: string
  email: string
  sellerStatus?: string
} | null

export function SiteHeader({
  user,
  searchItems,
  searchShops,
  defaultSearch,
  onCartClick,
  actionSlot,
  saleDiscount,
}: {
  user?: HeaderUser
  searchItems?: SearchItem[]
  searchShops?: ShopSearchItem[]
  defaultSearch?: string
  onCartClick?: () => void
  actionSlot?: ReactNode
  saleDiscount?: number
} = {}) {
  const { count, t, tr } = useShop()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="header site-header">
      <button
        className="icon-button header-menu-toggle"
        aria-label={
          menuOpen ? tr("Đóng menu", "Close menu") : tr("Mở menu", "Open menu")
        }
        aria-expanded={menuOpen}
        aria-controls="site-primary-nav"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <Logo />
      <nav
        id="site-primary-nav"
        className={`nav ${menuOpen ? "mobile-menu-open" : ""}`}
        aria-label={tr("Điều hướng chính", "Primary navigation")}
      >
        <ExploreMenu onSelect={() => setMenuOpen(false)} />
        <Link
          className="nav-item"
          href="/custom-ao"
          onClick={() => setMenuOpen(false)}
        >
          {t("navCustom")}
        </Link>
        <SportDnaMenu onSelect={() => setMenuOpen(false)} />
        <Link
          className="nav-item"
          href="/cong-dong"
          onClick={() => setMenuOpen(false)}
        >
          {tr("Cộng đồng", "Community")}
        </Link>
        <Link
          className="nav-item sale"
          href="/giam-gia"
          onClick={() => setMenuOpen(false)}
        >
          <Zap size={13} fill="currentColor" /> Sale
          {saleDiscount ? <span>−{saleDiscount}%</span> : null}
        </Link>
        <div className="mobile-only">
          <PreferenceToggles variant="menu" />
        </div>
      </nav>
      <div className="site-actions">
        {searchItems ? (
          <SearchBox
            items={searchItems}
            shops={searchShops}
            defaultValue={defaultSearch}
            className="desktop-search"
          />
        ) : (
          <Link
            href="/tim-kiem"
            className="icon-button desktop-only"
            aria-label={tr("Tìm kiếm", "Search")}
          >
            <Search size={19} />
          </Link>
        )}
        {actionSlot}
        <PreferenceToggles />
        <NotificationBell />
        <AccountMenu user={user} />
        {onCartClick ? (
          <button
            type="button"
            onClick={onCartClick}
            className="icon-button bag-button"
            aria-label={t("cart")}
            title={t("cart")}
          >
            <ShoppingBag size={19} />
            {count > 0 && <b key={count}>{count}</b>}
          </button>
        ) : (
          <Link
            href="/gio-hang"
            className="icon-button bag-button"
            aria-label={t("cart")}
            title={t("cart")}
          >
            <ShoppingBag size={19} />
            {count > 0 && <b key={count}>{count}</b>}
          </Link>
        )}
      </div>
    </header>
  )
}
