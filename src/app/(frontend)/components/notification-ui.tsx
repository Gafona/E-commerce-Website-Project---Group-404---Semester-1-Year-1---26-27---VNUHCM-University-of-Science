"use client"

import Image from "next/image"
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  Megaphone,
  MessageCircle,
  Package,
  PackagePlus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { NotificationCategory, NotificationView } from "@/lib/notification-view"

type Tone = { Icon: LucideIcon; tone: string }

const CATEGORY_TONE: Record<NotificationCategory, Tone> = {
  shop: { Icon: Store, tone: "bg-[#e8f1ff] text-[#0b5ed7]" },
  community: { Icon: Users, tone: "bg-[#f1ebff] text-[#6d3fd6]" },
  order: { Icon: Package, tone: "bg-[#e7f6ec] text-[#1d7a38]" },
  event: { Icon: CalendarDays, tone: "bg-[#fff2e0] text-[#b4610e]" },
  account: { Icon: ShieldAlert, tone: "bg-[#fdecec] text-[#a42626]" },
  system: { Icon: Megaphone, tone: "bg-[#e9edf3] text-[#071a33]" },
}

const DANGER = "bg-[#fdecec] text-[#a42626]"
const SUCCESS = "bg-[#e7f6ec] text-[#1d7a38]"

const KIND_TONE: Record<string, Tone> = {
  "shop-suspended": { Icon: ShieldAlert, tone: DANGER },
  "appeal-rejected": { Icon: ShieldAlert, tone: DANGER },
  "seller-rejected": { Icon: ShieldAlert, tone: DANGER },
  "seller-revoked": { Icon: ShieldAlert, tone: DANGER },
  "post-removed": { Icon: Trash2, tone: DANGER },
  "post-hidden": { Icon: Trash2, tone: DANGER },
  "comment-removed": { Icon: Trash2, tone: DANGER },
  "registration-rejected": { Icon: CalendarDays, tone: DANGER },
  "shop-restored": { Icon: ShieldCheck, tone: SUCCESS },
  "seller-approved": { Icon: BadgeCheck, tone: SUCCESS },
  "registration-approved": { Icon: BadgeCheck, tone: SUCCESS },
  "post-restored": { Icon: ShieldCheck, tone: SUCCESS },
  "product-created": { Icon: PackagePlus, tone: SUCCESS },
  "follow-product": { Icon: Sparkles, tone: CATEGORY_TONE.shop.tone },
  "follow-event": { Icon: Sparkles, tone: CATEGORY_TONE.event.tone },
  "new-follower": { Icon: UserPlus, tone: CATEGORY_TONE.community.tone },
  "friend-request": { Icon: UserPlus, tone: CATEGORY_TONE.community.tone },
  "follow-request": { Icon: UserPlus, tone: CATEGORY_TONE.community.tone },
  "follow-request-done": { Icon: UserCheck, tone: SUCCESS },
  "follow-accepted": { Icon: UserCheck, tone: CATEGORY_TONE.community.tone },
  "friend-accepted": { Icon: Heart, tone: CATEGORY_TONE.community.tone },
  "post-comment": { Icon: MessageCircle, tone: CATEGORY_TONE.community.tone },
  "comment-reply": { Icon: MessageCircle, tone: CATEGORY_TONE.community.tone },
  "product-review": { Icon: Star, tone: "bg-[#fff6db] text-[#a46a00]" },
  "order-shipping": { Icon: Truck, tone: CATEGORY_TONE.order.tone },
  "order-cancelled": { Icon: Package, tone: DANGER },
  "order-cancelled-seller": { Icon: Package, tone: DANGER },
}

export const toneOf = (item: Pick<NotificationView, "kind" | "category">) => KIND_TONE[item.kind] ?? CATEGORY_TONE[item.category] ?? CATEGORY_TONE.system

export const CATEGORY_LABEL: Record<NotificationCategory, [string, string]> = {
  shop: ["Cửa hàng", "Shop"],
  community: ["Cộng đồng", "Community"],
  order: ["Đơn hàng", "Orders"],
  event: ["Sự kiện", "Events"],
  account: ["Tài khoản", "Account"],
  system: ["BOAI", "BOAI"],
}

export function relativeTime(iso: string, lang: "vi" | "en") {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  if (Math.abs(diff) < 60) return lang === "vi" ? "Vừa xong" : "Just now"
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]]
  for (const [unit, sec] of steps) if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit)
  return rtf.format(0, "minute")
}

export function NotificationIcon({ item, size = "md" }: { item: NotificationView; size?: "md" | "lg" }) {
  const { Icon, tone } = toneOf(item)
  const box = size === "lg" ? "size-12" : "size-10"
  return (
    <span className={`relative grid ${box} shrink-0 place-items-center overflow-hidden ${tone}`}>
      {item.imageUrl ? (
        <>
          <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
          <span className={`absolute right-0 bottom-0 grid size-[18px] place-items-center ${tone}`}>
            <Icon size={11} strokeWidth={2.4} />
          </span>
        </>
      ) : (
        <Icon size={size === "lg" ? 20 : 18} strokeWidth={2} />
      )}
    </span>
  )
}
