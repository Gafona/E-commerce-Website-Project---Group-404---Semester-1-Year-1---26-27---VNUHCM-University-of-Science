"use client"

import Link from "next/link"
import { Fragment } from "react"
import { usePathname } from "next/navigation"
import {
  Bell,
  Boxes,
  CalendarDays,
  Megaphone,
  MessageCircle,
  LayoutDashboard,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  Shirt,
  Store,
  Truck,
  Wallet,
} from "lucide-react"
import { useShop } from "../components/ShopProvider"

const links = [
  ["/kenh-ban-hang", LayoutDashboard, "Tổng quan"],
  ["/kenh-ban-hang/san-pham", Package, "Sản phẩm"],
  ["/kenh-ban-hang/quang-ba", Megaphone, "Đề xuất trả phí"],
  ["/kenh-ban-hang/su-kien", CalendarDays, "Sự kiện"],
  ["/kenh-ban-hang/don-hang", Truck, "Đơn hàng"],
  ["/kenh-ban-hang/tien-cho-nhan", Wallet, "Tiền chờ nhận"],
  ["/kenh-ban-hang/doi-tra", RotateCcw, "Đổi trả"],
  ["/kenh-ban-hang/custom-ao", Shirt, "Đặt may custom"],
  ["/kenh-ban-hang/tin-nhan", MessageCircle, "Tin nhắn"],
  ["/kenh-ban-hang/ton-kho", Boxes, "Tồn kho"],
  ["/kenh-ban-hang/xac-thuc", ShieldCheck, "Mã xác thực"],
  ["/kenh-ban-hang/cai-dat", Settings, "Hồ sơ & cài đặt"],
  ["/thong-bao", Bell, "Thông báo"],
] as const

export function SellerNav({ badge, chatBadge = 0, noticeBadge = 0, customBadge = 0, returnBadge = 0, paused = false }: { badge: number; chatBadge?: number; noticeBadge?: number; customBadge?: number; returnBadge?: number; paused?: boolean }) {
  const path = usePathname()
  const { tr } = useShop()
  return (
    <nav className="sc-nav">
      {links.map(([href, Icon, label]) => (
        <Fragment key={href}>
        <Link
          href={href}
          className={[
            (href === "/kenh-ban-hang" ? path === href : path.startsWith(href)) ? "active" : "",
            // While a company shop is paused, only settings and notifications stay usable.
            paused && href !== "/kenh-ban-hang/cai-dat" && href !== "/thong-bao" ? "opacity-45" : "",
          ].join(" ")}
          aria-disabled={paused && href !== "/kenh-ban-hang/cai-dat" && href !== "/thong-bao" ? true : undefined}
        >
          <Icon size={18} />
          <span>{tr(label)}</span>
          {href.endsWith("don-hang") && badge > 0 && <b>{badge}</b>}
          {href.endsWith("tin-nhan") && chatBadge > 0 && <b>{chatBadge}</b>}
          {href.endsWith("custom-ao") && customBadge > 0 && <b>{customBadge}</b>}
          {href.endsWith("doi-tra") && returnBadge > 0 && <b>{returnBadge}</b>}
          {href === "/thong-bao" && noticeBadge > 0 && <b>{noticeBadge > 99 ? "99+" : noticeBadge}</b>}
        </Link>
        </Fragment>
      ))}
      <Link href="/" className="sc-exit">
        <Store size={18} />
        <span>{tr("Về cửa hàng BOAI", "Back to BOAI store")}</span>
      </Link>
    </nav>
  )
}
