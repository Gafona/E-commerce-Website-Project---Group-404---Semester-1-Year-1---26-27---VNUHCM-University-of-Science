import { headlineStat, loadPublicDnaShare } from "@/lib/dna-share-public"
import { OgFrame, clip, ogImage } from "@/lib/og"
import { axisText } from "@/lib/sportdna-axes"

/** 1200×630 preview of a shared SportDNA result (Facebook, Zalo, X…). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const share = await loadPublicDnaShare(id)
  if (!share)
    return ogImage(
      <OgFrame eyebrow="SportDNA">
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Liên kết không còn được chia sẻ</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#c9d8ea" }}>Làm bài test SportDNA để biết ELO và lối chơi của bạn.</div>
        </div>
      </OgFrame>,
      300,
    )
  const { card } = share
  const stat = headlineStat(card)
  const sport = card.sport === "badminton" ? "Cầu lông" : "Bóng đá"
  const axes = card.axes.filter((axis) => axis.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 4)
  const who = share.name ? clip(share.name, 28) : "Một người chơi BOAI"
  return ogImage(
    <OgFrame eyebrow={`SportDNA · ${sport}`} footer="Làm bài test SportDNA miễn phí trên BOAI">
      <div style={{ display: "flex", width: "100%", gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 64, height: 64, borderRadius: 64, alignItems: "center", justifyContent: "center", background: "#1677ff", fontSize: 32, fontWeight: 800 }}>
              {who.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{who}</div>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 26, fontWeight: 600, color: "#8fc1ff", letterSpacing: 2 }}>{stat ? stat.label.toUpperCase() : "KẾT QUẢ SPORTDNA"}</div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>{stat?.value ?? "—"}</div>
          {stat?.tier && (
            <div style={{ display: "flex", marginTop: 16, alignSelf: "flex-start", background: "#ffffff", color: "#071a33", padding: "8px 18px", fontSize: 28, fontWeight: 800 }}>
              Bậc {stat.tier}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 18 }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#9fb3cc", letterSpacing: 2 }}>ĐIỂM MẠNH NỔI BẬT</div>
          {axes.length ? (
            axes.map((axis) => (
              <div key={axis.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 600 }}>
                  <span>{clip(axisText(card.sport, axis.id).vi, 26)}</span>
                  <span style={{ fontWeight: 800 }}>{axis.value}</span>
                </div>
                <div style={{ display: "flex", height: 12, background: "rgba(255,255,255,0.15)" }}>
                  <div style={{ display: "flex", width: `${Math.max(4, Math.min(100, axis.value ?? 0))}%`, background: "#1677ff" }} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", fontSize: 26, color: "#c9d8ea" }}>Chưa đủ dữ liệu kỹ năng.</div>
          )}
        </div>
      </div>
    </OgFrame>,
  )
}
