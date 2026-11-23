import { redirect } from "next/navigation"

// SportDNA v1.3.3 nay là bản chính ở /sportdna; giữ link cũ hoạt động.
export default async function LegacyV133Redirect({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params
  redirect(["/sportdna", ...slug.map(encodeURIComponent)].join("/"))
}
