import { OgFrame, ogImage } from "@/lib/og"

/** Default BOAI link preview for pages without a specific image. */
export async function GET() {
  return ogImage(
    <OgFrame eyebrow="Bóng đá · Cầu lông">
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 1.02 }}>
          <span>Vượt giới hạn.</span>
          <span style={{ color: "#8fc1ff" }}>Chất riêng lên tiếng.</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "#c9d8ea" }}>Trang bị chính hãng, cá nhân hóa theo lối chơi với SportDNA.</div>
      </div>
    </OgFrame>,
    86_400,
  )
}
