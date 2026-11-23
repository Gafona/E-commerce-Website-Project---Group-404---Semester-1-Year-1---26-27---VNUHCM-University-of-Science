export const EVENT_FONT_FAMILIES = [
  "display",
  "body",
  "display-italic",
  "geometric",
  "condensed",
  "serif",
] as const

export type EventFontFamily = typeof EVENT_FONT_FAMILIES[number]

export const EVENT_FONT_OPTIONS: Array<{
  value: EventFontFamily
  label: string
}> = [
  { value: "display", label: "Thể thao đậm (Barlow Condensed)" },
  { value: "body", label: "Hiện đại, dễ đọc (Be Vietnam Pro)" },
  { value: "display-italic", label: "Thể thao nghiêng nổi bật" },
  { value: "geometric", label: "Hình học hiện đại (Montserrat)" },
  { value: "condensed", label: "Cô đọng mạnh mẽ (Oswald)" },
  { value: "serif", label: "Có chân thanh lịch (Roboto Slab)" },
]

export type EventTypography = {
  fontFamily: EventFontFamily
  color: string
  fontSize: number
}

export const DEFAULT_EVENT_TYPOGRAPHY = {
  shared: { fontFamily: "display", color: "#ffffff", fontSize: 16 },
  title: { fontFamily: "display", color: "#ffffff", fontSize: 80 },
  slogan: { fontFamily: "display", color: "#1677ff", fontSize: 28 },
  description: { fontFamily: "body", color: "#ffffff", fontSize: 14 },
} satisfies Record<string, EventTypography>
