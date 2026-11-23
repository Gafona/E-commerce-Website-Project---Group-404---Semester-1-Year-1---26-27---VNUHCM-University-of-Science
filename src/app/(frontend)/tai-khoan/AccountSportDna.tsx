"use client"

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { useShop } from "../components/ShopProvider"

export function AccountSportDna() {
  const { tr } = useShop()

  return (
    <section className="form-card account-card account-dna-card">
      <div className="account-card-head">
        <span>
          <Sparkles size={20} />
        </span>
        <div>
          <h3>SportDNA</h3>
          <p>
            {tr(
              "Môn yêu thích và trình độ được quản lý riêng theo từng môn.",
              "Favorite sports and skill levels are managed separately by sport.",
            )}
          </p>
        </div>
      </div>
      <div className="account-dna-list">
        <Link href="#the-thao">
          <span>{tr("Hồ sơ thể thao", "Sports profile")}</span>
          <b>{tr("ELO, huy hiệu và mạng nhện", "ELO, badges and radar")}</b>
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
