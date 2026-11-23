import { CircleHelp, Search, ShoppingBag, Sparkles, Trophy, Users } from "lucide-react"

/** Community post topics; the first entry is the "all posts" filter. */
export const topics = [
  { id: "", vi: "Tất cả bài viết", en: "All posts", icon: Users },
  { id: "offer", vi: "Shop chào sản phẩm", en: "Shop offers", icon: ShoppingBag },
  { id: "wanted", vi: "Tìm mua sản phẩm", en: "Looking to buy", icon: Search },
  { id: "experience", vi: "Chia sẻ trải nghiệm", en: "Experiences", icon: Sparkles },
  { id: "question", vi: "Hỏi cộng đồng", en: "Ask the community", icon: CircleHelp },
  { id: "review", vi: "Đánh giá sản phẩm", en: "Gear reviews", icon: ShoppingBag },
  { id: "tips", vi: "Mẹo chọn đồ", en: "Gear tips", icon: Trophy },
]
