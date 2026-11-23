import type { ReactNode } from "react"

// Templates remount on navigation, so `.route-enter` replays the page-body
// entrance (styles.css → "Route transitions"). The wrapper is display:contents
// and never affects layout.
export default function RouteTemplate({ children }: { children: ReactNode }) {
  return <div className="route-enter">{children}</div>
}
