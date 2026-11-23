import type { AnnouncementTheme } from "@/lib/announcement-tones"

export type AnnouncementDraft = {
  id?: string
  title: string
  message: string
  displayType: "popup" | "banner"
  scope: "home" | "all"
  theme: AnnouncementTheme
  ctaLabel: string
  ctaHref: string
  startAt: string | null
  endAt: string | null
  active: boolean
  imageUrl: string | null
}

export const EMPTY_ANNOUNCEMENT: AnnouncementDraft = {
  title: "",
  message: "",
  displayType: "popup",
  scope: "home",
  theme: "brand",
  ctaLabel: "",
  ctaHref: "",
  startAt: null,
  endAt: null,
  active: true,
  imageUrl: null,
}
