import Link from "next/link"
import { ArrowRight, CheckCircle2, LogIn, UserRound } from "lucide-react"
import { appAuth } from "@/lib/app-auth"
import { getTr, localizedTitle } from "@/lib/i18n-server"
import { SiteHeader } from "../components/SiteHeader"
import { ProfileForm } from "../tai-khoan/ProfileForm"
import { SettingsView } from "./SettingsView"
import { CommunityIdentitySettings } from "./CommunityIdentitySettings"
import { ChangePasswordCard, DeleteAccountCard, NotificationPrefsCard } from "./AccountSettings"
import { DnaShareLinks, type ShareLinkRow } from "./DnaShareLinks"
import { readDnaShare } from "@/lib/sportdna-share"
import { headlineStat } from "@/lib/dna-share-public"
import { getPayloadClient } from "@/lib/payload"
import { pendingFollowWhere } from "@/lib/community-privacy"

export async function generateMetadata() {
  return localizedTitle("Cài đặt — BOAI", "Settings — BOAI")
}

// Personal details are account-specific, so this page renders per request.
export default async function SettingsPage() {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  const [community, shareLinks] = user ? await Promise.all([readCommunitySettings(user), readShareLinks(user)]) : [null, [] as ShareLinkRow[]]
  const missing = user
    ? ([
        !user.phone && tr("số điện thoại", "phone number"),
        !(user.addresses ?? []).length &&
          tr("địa chỉ giao hàng", "delivery address"),
      ].filter(Boolean) as string[])
    : []

  return (
    <main className="search-page">
      <SiteHeader />
      <SettingsView>
        {user ? (
          <div className="mb-6 grid gap-4">
            {missing.length > 0 ? (
              <section className="profile-completion m-0!">
                <span>
                  <UserRound size={22} />
                </span>
                <div>
                  <small>{tr("BƯỚC TIẾP THEO", "NEXT STEP")}</small>
                  <h2>{tr("Hoàn thiện thông tin cá nhân", "Complete your details")}</h2>
                  <p>
                    {tr(
                      `Bổ sung ${missing.join(" và ")} để thanh toán nhanh hơn và không phải nhập lại ở lần mua sau.`,
                      `Add your ${missing.join(" and ")} for faster checkout next time.`,
                    )}
                  </p>
                </div>
              </section>
            ) : (
              <section className="profile-completion done m-0!">
                <span>
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <small>{tr("THÔNG TIN ĐÃ SẴN SÀNG", "DETAILS READY")}</small>
                  <h2>{tr("Thanh toán nhanh đã sẵn sàng", "Faster checkout is ready")}</h2>
                  <p>
                    {tr(
                      "Thông tin liên hệ và địa chỉ mặc định sẽ được điền sẵn khi bạn mua hàng.",
                      "Your contact details and default address will be prefilled at checkout.",
                    )}
                  </p>
                </div>
              </section>
            )}
            <ProfileForm
              user={{
                name: user.name,
                email: user.email,
                phone: user.phone ?? "",
                addresses: (user.addresses ?? []).map((item) => ({
                  id: item.id ?? undefined,
                  label: item.label,
                  recipientName: item.recipientName,
                  phone: item.phone,
                  addressLine: item.addressLine,
                  ward: item.ward ?? "",
                  district: item.district,
                  province: item.province,
                  lat: item.lat ?? null,
                  lng: item.lng ?? null,
                  isDefault: Boolean(item.isDefault),
                })),
              }}
            />
            {community && <CommunityIdentitySettings {...community} />}
            <NotificationPrefsCard
              initial={{
                following: user.notificationPrefs?.following !== false,
                community: user.notificationPrefs?.community !== false,
                orders: user.notificationPrefs?.orders !== false,
                messages: user.notificationPrefs?.messages !== false,
                promotions: user.notificationPrefs?.promotions !== false,
              }}
            />
            <DnaShareLinks links={shareLinks} />
            <ChangePasswordCard email={user.email} />
            <DeleteAccountCard isSeller={user.sellerStatus === "approved" || user.sellerStatus === "suspended"} />
          </div>
        ) : (
          <section className="form-card settings-card" id="ho-so">
            <div className="settings-head">
              <span>
                <UserRound size={20} />
              </span>
              <div>
                <h3>{tr("Thông tin cá nhân", "Personal details")}</h3>
                <p className="hint">
                  {tr(
                    "Đăng nhập để cập nhật họ tên, số điện thoại và địa chỉ giao hàng.",
                    "Sign in to update your name, phone number and delivery addresses.",
                  )}
                </p>
              </div>
            </div>
            <Link href="/dang-nhap" className="boai-button primary">
              <LogIn size={16} /> {tr("Đăng nhập", "Sign in")} <ArrowRight size={16} />
            </Link>
          </section>
        )}
      </SettingsView>
    </main>
  )
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof appAuth.currentUser>>>

async function readCommunitySettings(user: SessionUser) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: "community-profiles",
    where: { account: { equals: user.id } },
    depth: 0,
    limit: 1,
    select: { handle: true, visibility: true },
    overrideAccess: false,
    user,
  })
  const profile = docs[0]
  const pending = profile
    ? await payload.count({
        collection: "community-follows",
        where: { and: [{ targetProfile: { equals: profile.id } }, pendingFollowWhere] },
        overrideAccess: false,
        user,
      })
    : null
  return {
    profileId: profile?.id ?? null,
    handle: profile?.handle ?? null,
    visibility: profile?.visibility === "private" ? ("private" as const) : ("public" as const),
    pendingRequests: pending?.totalDocs ?? 0,
  }
}

/** SportDNA result links this member created (newest first). */
async function readShareLinks(user: NonNullable<Awaited<ReturnType<typeof appAuth.currentUser>>>): Promise<ShareLinkRow[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload
    .find({ collection: "dna-shares", where: { owner: { equals: user.id } }, sort: "-createdAt", limit: 20, depth: 0, overrideAccess: false, user })
    .catch(() => ({ docs: [] }))
  return docs.map((doc) => {
    const card = readDnaShare(doc.card)
    const stat = card ? headlineStat(card) : null
    return { id: String(doc.id), sport: doc.sport, createdAt: doc.createdAt, active: doc.active !== false, elo: stat?.value ?? null, tier: stat?.tier ?? null }
  })
}
