import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Store } from "lucide-react"
import { db, requireAdmin } from "../../admin-lib"
import { EventForm } from "../EventForm"
import { RegistrationCard } from "../RegistrationCard"

export const metadata = { title: "Chỉnh sửa sự kiện | Quản trị BOAI" }

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await requireAdmin()
  const payload = await db()
  const scoped = { overrideAccess: false, user: admin } as const
  const event = await payload.findByID({ collection: "events", id, depth: 1, ...scoped }).catch(() => null)
  if (!event) notFound()
  const { docs: registrations } = await payload.find({
    collection: "event-registrations",
    where: { event: { equals: event.id } },
    sort: "reviewStatus",
    limit: 100,
    depth: 2,
    ...scoped,
  })

  return (
    <>
      <header className="sc-head">
        <div>
          <small>
            <Link className="flex items-center gap-1" href="/quan-tri/su-kien">
              <ArrowLeft size={13} /> Quản lý sự kiện
            </Link>
          </small>
          <h1>Chỉnh sửa sự kiện</h1>
        </div>
      </header>
      <EventForm
        event={{
          id: String(event.id),
          name: event.name,
          slogan: event.slogan,
          description: event.description,
          campaignImage:
            event.campaignImage && typeof event.campaignImage === "object" ? event.campaignImage.url : null,
          backgroundColor: event.backgroundColor,
          textColor: event.textColor,
          fontFamily: event.fontFamily,
          fontSize: event.fontSize,
          titleTypography: event.titleTypography,
          sloganTypography: event.sloganTypography,
          descriptionTypography: event.descriptionTypography,
          textPosition: event.textPosition,
          displayPlacement: event.displayPlacement,
          category: event.category,
          occasion: event.occasion,
          customOccasion: event.customOccasion,
          startDate: event.startDate,
          endDate: event.endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          maxDiscount: event.maxDiscount,
          allowedProductTypes: event.allowedProductTypes,
          status: event.status,
        }}
      />
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--display)] text-2xl font-black uppercase">
          <Store size={20} /> Shop đăng ký ({registrations.length})
        </h2>
        {registrations.length ? (
          <div className="grid gap-3.5 xl:grid-cols-2">
            {registrations.map((registration) => (
              <RegistrationCard key={registration.id} registration={registration} showEvent={false} />
            ))}
          </div>
        ) : (
          <p className="m-0 border border-dashed border-[var(--line)] bg-[var(--white)] p-6 text-center text-sm text-[var(--muted)]">
            Chưa có shop nào đăng ký sự kiện này.
          </p>
        )}
      </section>
    </>
  )
}
