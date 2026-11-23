import { loadPublicPost } from "@/lib/community-og"
import { OgFrame, clip, embedImage, ogImage } from "@/lib/og"

/** 1200×630 preview of a public community post: author, text, first photo or SportDNA card. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await loadPublicPost(id)
  if (!post)
    return ogImage(
      <OgFrame eyebrow="Cộng đồng">
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800 }}>Cộng đồng BOAI</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#c9d8ea" }}>Chia sẻ đam mê bóng đá và cầu lông, chọn đúng trang bị.</div>
        </div>
      </OgFrame>,
      300,
    )
  const photo = await embedImage(post.image, new URL(request.url).origin, 520)
  const stat = post.achievement?.stats.find((item) => item.value !== null) ?? null
  const sport = post.sport === "badminton" ? "Cầu lông" : post.sport === "football" ? "Bóng đá" : "Cộng đồng"
  return ogImage(
    <OgFrame eyebrow={`Cộng đồng · ${sport}`}>
      <div style={{ display: "flex", width: "100%", gap: 48, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 60, height: 60, borderRadius: 60, alignItems: "center", justifyContent: "center", background: "#1677ff", fontSize: 30, fontWeight: 800 }}>
              {post.authorName.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>{clip(post.authorName, 30)}</div>
          </div>
          <div style={{ display: "flex", fontSize: photo || stat ? 38 : 48, fontWeight: 600, lineHeight: 1.35 }}>“{clip(post.content, photo || stat ? 150 : 220)}”</div>
        </div>
        {photo ? (
          <div style={{ display: "flex", width: 360, height: 360, overflow: "hidden", background: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered into a PNG by the OG renderer */}
            <img src={photo} alt="" width={360} height={360} style={{ objectFit: "cover", width: 360, height: 360 }} />
          </div>
        ) : stat ? (
          <div style={{ display: "flex", flexDirection: "column", width: 360, padding: 32, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.2)" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#8fc1ff", letterSpacing: 2 }}>{stat.label.toUpperCase()}</div>
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
            {stat.tier && <div style={{ display: "flex", marginTop: 12, fontSize: 26, fontWeight: 800 }}>Bậc {stat.tier}</div>}
          </div>
        ) : null}
      </div>
    </OgFrame>,
  )
}
