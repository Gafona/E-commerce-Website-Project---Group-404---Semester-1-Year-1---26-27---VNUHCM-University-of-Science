import Link from "next/link"
import { getTr } from "@/lib/i18n-server"
import { Logo } from "../components/Logo"
import { appAuth } from "@/lib/app-auth"
import { redirect } from "next/navigation"
import { Clock3, LogIn, ShieldCheck } from "lucide-react"
import { SellerApplicationForm } from "./SellerApplicationForm"

export default async function SellerRegisterPage() {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (user?.sellerStatus === "approved") redirect("/kenh-ban-hang")
  if (user?.sellerStatus === "suspended") redirect("/khoa-cua-hang")
  const pending = user?.sellerStatus === "pending"
  return (
    <main className="auth-page">
      <div className="auth-visual register-visual"><Logo /><div><span>BOAI SELLER</span><h1>{tr("BÁN CÙNG", "SELL WITH")}<br />BOAI.</h1><p>{tr("Tiếp cận cộng đồng thể thao, quản lý sản phẩm, đơn hàng và doanh thu tại một nơi.", "Reach the sports community and manage products, orders and revenue in one place.")}</p></div></div>
      <section className="auth-panel">
        <div className="auth-box"><Logo /><div className="eyebrow">{tr("TRỞ THÀNH NGƯỜI BÁN", "BECOME A SELLER")}</div>
          <h2>{pending ? tr("Đang chờ duyệt", "Review pending") : tr("Mở cửa hàng", "Open your shop")}</h2>
          <p>{pending ? tr("Hồ sơ đã được gửi tới BOAI. Sau khi được duyệt, bạn có thể đăng sản phẩm và xử lý đơn hàng của cửa hàng.", "BOAI is reviewing your application. Once approved, you can publish products and process your shop's orders.") : tr("Đăng nhập, gửi thông tin cửa hàng và chờ BOAI duyệt trước khi bắt đầu bán hàng.", "Sign in, submit your shop details, and wait for BOAI approval before selling.")}</p>
          {!user ? (
            <div className="auth-form">
              <Link className="boai-button primary full" href="/dang-nhap"><LogIn size={16} /> {tr("Đăng nhập để đăng ký", "Sign in to apply")}</Link>
              <Link className="boai-button full" href="/dang-ky">{tr("Tạo tài khoản mới", "Create an account")}</Link>
            </div>
          ) : pending ? (
            <div className="auth-security"><Clock3 size={16} /><span>{tr("Chỉ tài khoản đã duyệt mới truy cập được Kênh người bán.", "Only approved accounts can access the Seller Center.")}</span></div>
          ) : (
            <SellerApplicationForm rejected={user.sellerStatus === "rejected"} />
          )}
          <div className="auth-security"><ShieldCheck size={15} /><span>{tr("Mỗi seller chỉ xem và xử lý đơn chứa sản phẩm thuộc cửa hàng của mình.", "Each seller can only view and process orders containing their own products.")}</span></div>
          <Link className="auth-back-link" href="/">{tr("Quay lại trang chủ", "Back to home")}</Link>
        </div>
      </section>
    </main>
  )
}
