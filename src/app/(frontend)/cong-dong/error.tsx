"use client"

import { useShop } from "../components/ShopProvider"

export default function CommunityError({ reset }: { reset: () => void }) {
  const { tr } = useShop()
  return (
    <div className="mx-auto max-w-xl p-12 text-center">
      <h1 className="text-2xl font-bold">{tr("Chưa tải được cộng đồng", "Couldn't load the community")}</h1>
      <p className="my-4 text-[var(--muted)]">
        {tr(
          "Không thể tải nội dung lúc này. Vui lòng thử lại; nếu vừa gửi bài, hãy kiểm tra bảng tin trước khi gửi lại.",
          "Content can't be loaded right now. Please try again; if you just posted, check the feed before posting again.",
        )}
      </p>
      <button onClick={reset} className="rounded-lg bg-[var(--lime)] px-5 py-3 text-white">{tr("Thử lại", "Try again")}</button>
    </div>
  )
}
