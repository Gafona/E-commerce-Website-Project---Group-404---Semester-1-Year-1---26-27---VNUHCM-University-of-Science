import { Images } from "lucide-react"
import { db, requireAdmin } from "../admin-lib"
import { SiteImageCard, SiteImageUpload, type ManagedImage } from "../SiteImageManager"
import { Empty, PageHead } from "../ui"
import { isSiteImagePlacement, SITE_IMAGE_PLACEMENTS } from "@/lib/site-image-placements"

export const metadata = { title: "Thư viện ảnh | Quản trị BOAI" }

export default async function SiteImageLibraryPage() {
  const admin = await requireAdmin()
  const { docs } = await (await db()).find({
    collection: "site-images",
    depth: 1,
    limit: 300,
    pagination: false,
    sort: "-updatedAt",
    overrideAccess: false,
    user: admin,
  })
  const images: ManagedImage[] = docs.flatMap((doc) => {
    const media = typeof doc.image === "object" ? doc.image : null
    if (!media?.url) return []
    return [
      {
        id: String(doc.id),
        title: doc.title,
        url: media.url,
        objectPosition: `${media.focalX ?? 50}% ${media.focalY ?? 50}%`,
        placements: (doc.placements ?? []).filter(isSiteImagePlacement),
        active: Boolean(doc.active),
        credit: doc.credit?.author ?? null,
      },
    ]
  })

  return (
    <>
      <PageHead eyebrow="Website" title="Thư viện ảnh" />
      <section className="sc-card mb-3.5 p-6">
        <div className="sc-section-head">
          <div>
            <small>Tải ảnh mới</small>
            <h3>Thêm ảnh vào website</h3>
          </div>
          <small className="max-w-[380px] text-right">
            Mỗi vị trí có thể có nhiều ảnh. Mỗi lần khách mở trang, website chọn ngẫu nhiên một ảnh đang hiện.
          </small>
        </div>
        <SiteImageUpload />
      </section>

      {SITE_IMAGE_PLACEMENTS.map((placement) => {
        const group = images.filter((image) => image.placements.includes(placement.value))
        const live = group.filter((image) => image.active).length
        return (
          <section key={placement.value} className="sc-card mb-3.5 p-6">
            <div className="sc-section-head">
              <div>
                <small>
                  {live} ảnh đang xoay vòng{group.length > live ? ` · ${group.length - live} đang ẩn` : ""}
                </small>
                <h3>{placement.label}</h3>
              </div>
              <small className="max-w-[340px] text-right">{placement.hint}</small>
            </div>
            {group.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {group.map((image) => (
                  <SiteImageCard key={`${placement.value}-${image.id}-${image.placements.join()}-${image.active}`} image={image} />
                ))}
              </div>
            ) : (
              <Empty
                icon={<Images size={22} />}
                title="Chưa có ảnh"
                text="Vị trí này đang dùng nền màu mặc định. Tải ảnh lên và chọn vị trí này để hiển thị."
              />
            )}
          </section>
        )
      })}
    </>
  )
}
