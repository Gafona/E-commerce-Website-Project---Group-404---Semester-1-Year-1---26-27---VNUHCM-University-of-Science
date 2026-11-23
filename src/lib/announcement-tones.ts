export type AnnouncementTheme = "brand" | "dark" | "sale" | "light"

export const ANNOUNCEMENT_TONE: Record<AnnouncementTheme, { surface: string; accent: string; button: string }> = {
  brand: { surface: "bg-[#1677ff] text-white", accent: "text-white/75", button: "bg-[#071a33] text-white hover:bg-black" },
  dark: { surface: "bg-[#071a33] text-white", accent: "text-[#69b6ff]", button: "bg-[#1677ff] text-white hover:bg-[#0b5ed7]" },
  sale: { surface: "bg-[#df462c] text-white", accent: "text-white/80", button: "bg-white text-[#9f2417] hover:bg-[#fff1ec]" },
  light: { surface: "bg-[#eef5ff] text-[#071a33]", accent: "text-[#0b5ed7]", button: "bg-[#071a33] text-white hover:bg-black" },
}

