import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdmin } from "../../admin-lib"
import { EventForm } from "../EventForm"

export const metadata = { title: "Tạo sự kiện | Quản trị BOAI" }

export default async function NewEventPage() {
  await requireAdmin()
  return (
    <>
      <header className="sc-head">
        <div>
          <small>
            <Link className="flex items-center gap-1" href="/quan-tri/su-kien">
              <ArrowLeft size={13} /> Quản lý sự kiện
            </Link>
          </small>
          <h1>Tạo sự kiện</h1>
        </div>
      </header>
      <EventForm />
    </>
  )
}
