import type { Metadata } from "next"
import { SiteHeader } from "../components/SiteHeader"
import { readCommunityFeed, readCommunityMembers } from "@/lib/community"
import { communitySession } from "./actions"
import { Community } from "./Community"
import { getSiteImages } from "@/lib/site-images"
import { getTr } from "@/lib/i18n-server"
import { appAuth } from "@/lib/app-auth"
import { suggestCommunityMembers } from "@/lib/community-directory"
import { loadPublicPost } from "@/lib/community-og"

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ post?: string | string[] }> }): Promise<Metadata> {
  const [tr, params] = await Promise.all([getTr(), searchParams])
  // A shared post link (/cong-dong?post=…) previews that post; private or hidden posts fall back to the feed.
  const shared = typeof params.post === "string" ? await loadPublicPost(params.post) : null
  if (shared) {
    const title = tr(`${shared.authorName} trên Cộng đồng BOAI`, `${shared.authorName} on the BOAI Community`)
    const description = shared.content.slice(0, 180)
    const image = { url: `/api/og/bai-viet/${shared.id}`, width: 1200, height: 630, alt: title }
    return {
      title,
      description,
      openGraph: { title, description, type: "article", url: `/cong-dong?post=${shared.id}`, images: [image] },
      twitter: { card: "summary_large_image", title, description, images: [image] },
    }
  }
  return {
    title: tr("Cộng đồng BOAI — Chia sẻ đam mê, chọn đúng trang bị", "BOAI Community — Share the passion, pick the right gear"),
    description: tr(
      "Giao lưu cùng người chơi bóng đá và cầu lông. Chia sẻ kinh nghiệm, hỏi đáp và đánh giá trang bị thể thao.",
      "Connect with football and badminton players. Share experiences, ask questions and review sports gear.",
    ),
  }
}

// Live UGC and account-specific interactions, intentionally request-time.
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{
    post?: string | string[]
    member?: string | string[]
  }>
}) {
  const params = await searchParams
  const post =
    typeof params.post === "string" ? params.post.slice(0, 100) : undefined
  const member =
    typeof params.member === "string" ? params.member.slice(0, 100) : undefined
  const user = await appAuth.currentUser()
  const [feed, session, members, images, suggested] = await Promise.all([
    readCommunityFeed({ post, member }, user ?? undefined),
    communitySession(),
    readCommunityMembers(member),
    getSiteImages(["community-cover"] as const),
    suggestCommunityMembers(user).catch(() => ({ members: [], total: 0 })),
  ])
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <SiteHeader />
      <Community
        key={`${post ?? "feed"}:${member ?? "all"}`}
        initialFeed={feed}
        session={session}
        selectedPost={post}
        members={members}
        suggested={suggested.members}
        selectedMember={member}
        cover={images["community-cover"] ?? null}
      />
    </main>
  )
}
