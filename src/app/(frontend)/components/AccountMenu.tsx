"use client"

// Pages that don't pass the user resolve the session client-side.
// A full navigation remounts ShopProvider so account-scoped browser state
// cannot remain visible after the private session is cleared.

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronDown,
  GitCompare,
  Heart,
  LogIn,
  LogOut,
  MessageCircle,
  PackageSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  UserPlus,
} from "lucide-react"
import { getSessionUserAction, logoutAction } from "../auth-actions"
import { leaveAccount } from "@/lib/browser-state"
import { useShop } from "./ShopProvider"
import { useInbox } from "./ChatDock"

type SessionIdentity = {
  name: string
  email: string
  sellerStatus?: string
  role?: string
  /** undefined = not resolved yet; null = no photo (initial shown). */
  avatarUrl?: string | null
}
type SessionUser = SessionIdentity | null

export function AccountMenu({ user: initialUser }: { user?: SessionUser }) {
  const shop = useShop()
  const { t } = shop
  const inbox = useInbox()
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser>(initialUser ?? null)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = user?.name.trim().charAt(0).toUpperCase()
  useEffect(() => {
    if (initialUser === undefined)
      getSessionUserAction()
        .then(setUser)
        .catch(() => setUser(null))
    else {
      setUser(initialUser)
      // Pages pass only the display identity; resolve the role (staff links) and photo.
      if (initialUser && (!initialUser.role || initialUser.avatarUrl === undefined))
        getSessionUserAction()
          .then((session) =>
            session
              ? setUser((current) => (current ? { ...current, role: session.role, avatarUrl: session.avatarUrl } : current))
              : undefined,
          )
          .catch(() => undefined)
    }
  }, [initialUser])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  const logout = async () => {
    try {
      await logoutAction()
    } finally {
      // Cart, favorites, SportDNA results and drafts must not stay for the next person.
      leaveAccount("/")
    }
  }

  const item = (
    href: string,
    Icon: typeof User,
    label: string,
    badge?: number,
  ) => (
    <Link
      href={href}
      role="menuitem"
      className="account-menu-item"
      onClick={() => setOpen(false)}
    >
      <Icon size={17} />
      <span>{label}</span>
      {!!badge && <b>{badge}</b>}
    </Link>
  )

  return (
    <div className="account-menu" ref={ref}>
      <button
        className={`account-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("openMenu")}
      >
        <span className="account-avatar">
          {user?.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" fill sizes="30px" className="object-cover" />
          ) : initial ? (
            <b className="account-initial">{initial}</b>
          ) : (
            <User size={16} />
          )}
        </span>
        <ChevronDown size={15} className="account-chevron" />
        {(shop.favorites.length + shop.compare.length > 0 || inbox.unreadConversations > 0) && (
          <i className="account-dot" />
        )}
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-head">
            <span className="account-avatar lg">
              {user?.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name} fill sizes="44px" className="object-cover" />
              ) : initial ? (
                <b className="account-initial">{initial}</b>
              ) : (
                <User size={20} />
              )}
            </span>
            <div>
              <small>{t("hello")}</small>
              <b>{user ? user.name : t("guest")}</b>
              <em>{user ? user.email : t("signInPrompt")}</em>
            </div>
          </div>
          {!user && (
            <div className="account-auth">
              <Link
                className="boai-button primary"
                href="/dang-nhap"
                onClick={() => setOpen(false)}
              >
                <LogIn size={15} /> {t("login")}
              </Link>
              <Link
                className="boai-button"
                href="/dang-ky"
                onClick={() => setOpen(false)}
              >
                <UserPlus size={15} /> {t("register")}
              </Link>
            </div>
          )}
          <div className="account-group">
            {user && item("/tai-khoan", User, t("account"))}
            {item("/don-hang", PackageSearch, t("orders"))}
            {user && item("/tin-nhan", MessageCircle, shop.tr("Tin nhắn", "Messages"), inbox.unreadConversations)}
            {item("/yeu-thich", Heart, t("favorites"), shop.favorites.length)}
            {item("/so-sanh", GitCompare, t("compare"), shop.compare.length)}
            {item("/sportdna", Sparkles, t("sportdna"))}
          </div>
          <div className="account-group">
            {item(
              user?.sellerStatus === "approved"
                ? "/kenh-ban-hang"
                : user?.sellerStatus === "suspended"
                  ? "/khoa-cua-hang"
                  : "/dang-ky-ban-hang",
              Store,
              user?.sellerStatus === "approved"
                ? shop.tr("Kênh người bán", "Seller center")
                : user?.sellerStatus === "suspended"
                  ? shop.tr("Cửa hàng đang bị khóa", "Shop suspended")
                  : user?.sellerStatus === "pending"
                  ? shop.tr(
                      "Hồ sơ seller đang chờ duyệt",
                      "Seller application pending",
                    )
                  : shop.tr("Đăng ký bán hàng", "Become a seller"),
            )}
          </div>
          {user?.role === "admin" && (
            <div className="account-group">
              {item("/quan-tri", ShieldCheck, shop.tr("Quản trị BOAI", "BOAI admin"))}
            </div>
          )}
          <div className="account-group">
            {item("/cai-dat", Settings, t("settings"))}
            {user && (
              <button
                role="menuitem"
                className="account-menu-item"
                onClick={logout}
              >
                <LogOut size={17} />
                <span>{t("logout")}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
