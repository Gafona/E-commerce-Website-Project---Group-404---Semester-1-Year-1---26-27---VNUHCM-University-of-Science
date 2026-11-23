import Link from "next/link"
import { ArrowRight, FlaskConical } from "lucide-react"
import { getTr } from "@/lib/i18n-server"

export async function AuthUnavailable() {
  const tr = await getTr()

  return (
    <div className="auth-unavailable" role="status">
      <span><FlaskConical size={24} /></span>
      <h3>{tr("Tính năng đang thử nghiệm", "Feature in testing")}</h3>
      <p>{tr(
        "Website hiện đang trong quá trình thử nghiệm nên chưa hỗ trợ đăng nhập và tạo tài khoản.",
        "This website is currently in testing, so sign-in and account registration are not available yet.",
      )}</p>
      <Link className="boai-button primary full" href="/">{tr("Tiếp tục khám phá", "Continue exploring")} <ArrowRight size={17} /></Link>
    </div>
  )
}
