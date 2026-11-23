import Link from "next/link"
import { getTr } from "@/lib/i18n-server"

/**
 * Custom not-found page for the frontend.
 * This renders when `notFound()` is called from any page in the (frontend) route group.
 *
 * Customize this component to match your app's design and provide helpful navigation.
 */
export default async function NotFound() {
  const tr = await getTr()
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-8 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{tr("Không tìm thấy trang", "Page not found")}</h1>
      <p className="mt-4 text-[var(--muted)]">{tr("Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.", "The page you're looking for doesn't exist or has been moved.")}</p>
      <Link
        className="mt-6 font-medium text-blue-600 underline-offset-4 hover:underline"
        href="/"
      >
        &larr; {tr("Về trang chủ", "Back to home")}
      </Link>
    </main>
  )
}
