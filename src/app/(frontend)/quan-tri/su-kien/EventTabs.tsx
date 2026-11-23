import { Tabs } from "../ui"

export function EventTabs({ active, pending }: { active: "events" | "registrations"; pending: number }) {
  return (
    <Tabs
      active={active}
      items={[
        { key: "events", href: "/quan-tri/su-kien", label: "Sự kiện toàn website" },
        { key: "registrations", href: "/quan-tri/su-kien/dang-ky", label: "Đăng ký của shop", count: pending },
      ]}
    />
  )
}
