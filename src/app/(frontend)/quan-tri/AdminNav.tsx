"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarCheck2,
  FileText,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  MessagesSquare,
  ReceiptText,
  RotateCcw,
  Scale,
  Sparkles,
  Store,
  TicketPercent,
  Truck,
  Users,
} from "lucide-react"

const links = [
  ["/quan-tri", LayoutDashboard, "Tổng quan", null],
  ["/quan-tri/nguoi-ban", Store, "Duyệt người bán", "sellers"],
  ["/quan-tri/su-kien", CalendarCheck2, "Quản lý sự kiện", "events"],
  ["/quan-tri/cong-dong", MessagesSquare, "Nội dung cộng đồng", null],
  ["/quan-tri/danh-gia", MessageSquareText, "Đánh giá & bình luận", null],
  ["/quan-tri/thanh-vien", Users, "Thành viên", null],
  ["/quan-tri/don-hang", ReceiptText, "Đơn hàng", "payments"],
  ["/quan-tri/doi-soat", Scale, "Đối soát & chi trả", "refunds"],
  ["/quan-tri/van-chuyen", Truck, "Biểu phí vận chuyển", null],
  ["/quan-tri/ma-giam-gia", TicketPercent, "Mã giảm giá", null],
  ["/quan-tri/de-xuat", Sparkles, "Đề xuất trả phí", "recommendations"],
  ["/quan-tri/doi-tra", RotateCcw, "Đổi trả", "returns"],
  ["/quan-tri/thong-bao", Megaphone, "Pop-up & thông báo", null],
  ["/quan-tri/noi-dung", FileText, "Nội dung website", null],
  ["/quan-tri/thu-vien-anh", Images, "Thư viện ảnh", null],
] as const

export function AdminNav({ badges }: { badges: { sellers: number; events: number; payments: number; refunds: number; returns: number; recommendations: number } }) {
  const path = usePathname()
  return (
    <nav className="sc-nav" aria-label="Quản trị">
      {links.map(([href, Icon, label, badge]) => {
        const active = href === "/quan-tri" ? path === href : path.startsWith(href)
        const count = badge ? badges[badge] : 0
        return (
          <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <Icon size={18} />
            <span>{label}</span>
            {count > 0 && <b>{count}</b>}
          </Link>
        )
      })}
      <Link href="/" className="sc-exit">
        <Store size={18} />
        <span>Về cửa hàng BOAI</span>
      </Link>
    </nav>
  )
}
