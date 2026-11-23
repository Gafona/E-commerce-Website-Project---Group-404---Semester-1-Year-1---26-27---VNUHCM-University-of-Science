import { db, requireAdmin } from "../admin-lib"
import { ContentEditor, type EditorValues } from "../ContentEditor"
import { PageHead, param, type SearchParams, Tabs } from "../ui"
import {
  CONTENT_PAGES,
  SITE_CONTENT,
  resolveContent,
  type ContentKey,
  type ContentSectionDef,
} from "@/lib/site-content-schema"

export const metadata = { title: "Nội dung website | Quản trị BOAI" }

export default async function SiteContentPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin()
  const requested = param((await searchParams).trang)
  const page = CONTENT_PAGES.find((p) => p.key === requested) ?? CONTENT_PAGES[0]
  const doc = await (await db()).findGlobal({ slug: "site-content", depth: 0, overrideAccess: false, user: admin })
  const resolved = resolveContent(doc)
  const sections = (SITE_CONTENT as readonly ContentSectionDef[]).filter((s) => s.page === page.key)
  const initial: EditorValues = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const key = `${section.key}.${field.key}` as ContentKey
      initial[key] = { vi: resolved[key].vi, en: field.single ? "" : resolved[key].en }
    }
  }

  return (
    <>
      <PageHead eyebrow="Website" title="Nội dung website" />
      <Tabs
        active={page.key}
        items={CONTENT_PAGES.map((p) => ({ key: p.key, label: p.label, href: `/quan-tri/noi-dung?trang=${p.key}` }))}
      />
      <ContentEditor key={page.key} page={page.key} sections={sections} initial={initial} />
    </>
  )
}
