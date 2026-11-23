"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Star } from "lucide-react"
import { submitReviewAction, type ReviewState } from "../shop-actions"
import { useShop } from "./ShopProvider"

export function ReviewForm({ productId, slug, loggedIn }: { productId: string; slug: string; loggedIn: boolean }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReviewAction, { ok: false })
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const { tr } = useShop()
  if (!loggedIn) return <div className="form-card review-form"><h3>{tr("Viết đánh giá", "Write a review")}</h3><p className="hint"><Link href="/dang-nhap">{tr("Đăng nhập")}</Link> {tr("để chia sẻ trải nghiệm của bạn về sản phẩm này.", "to share your experience with this product.")}</p></div>
  return (
    <form className="form-card review-form" action={action}>
      <h3>{tr("Viết đánh giá", "Write a review")}</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div className="star-picker" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} aria-label={tr(`${n} sao`, `${n} stars`)} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
            <Star size={26} fill={(hover || rating) >= n ? "currentColor" : "none"} />
          </button>
        ))}
        <span>{tr(["", "Tệ", "Chưa tốt", "Ổn", "Tốt", "Tuyệt vời"][hover || rating], ["", "Poor", "Fair", "Okay", "Good", "Excellent"][hover || rating])}</span>
      </div>
      <label className="field"><span>{tr("Nhận xét", "Comment")}</span><textarea name="comment" rows={4} placeholder={tr("Cảm nhận về chất lượng, kích cỡ, hiệu năng khi thi đấu...", "Thoughts on quality, fit, performance in play...")} /></label>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.message && <p className="form-ok">{state.message}</p>}
      <button className="boai-button primary" disabled={pending}>{pending ? tr("Đang gửi...", "Sending...") : tr("Gửi đánh giá", "Submit review")}</button>
    </form>
  )
}
