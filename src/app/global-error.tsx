"use client"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body>
        <main className="global-error">
          <span>BOAI / ERROR</span>
          <h1>Đã có lỗi xảy ra</h1>
          <p>Chúng tôi chưa thể tải nội dung. Vui lòng thử lại sau ít phút.</p>
          <button onClick={reset}>Thử lại</button>
        </main>
      </body>
    </html>
  )
}
