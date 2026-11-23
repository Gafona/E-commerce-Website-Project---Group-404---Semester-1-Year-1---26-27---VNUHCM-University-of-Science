import { redirect } from "next/navigation"

// Bóng đá đã có bộ câu hỏi riêng; đưa các đường dẫn cũ về đó.
export default function FootballRedirect() {
  redirect("/sportdna/bank/bong-da")
}
