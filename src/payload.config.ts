import path from "path"
import { buildFigmaConfig } from "@payloadcms/figma"
import { nodemailerAdapter } from "@payloadcms/email-nodemailer"
import { mcpPlugin } from "@payloadcms/plugin-mcp"
import { en as adminLanguage } from "@payloadcms/translations/languages/en"
import { fileURLToPath } from "url"
import { Admins } from "./collections/Admins"
import { Media } from "./collections/Media"
import { Folders } from "./collections/Folders"
import { Tags } from "./collections/Tags"
import { Posts } from "./collections/Posts"
import { Products } from "./collections/Products"
import { ProductTaxonomies } from "./collections/ProductTaxonomies"
import { Orders } from "./collections/Orders"
import { Reviews } from "./collections/Reviews"
import { ProductComments } from "./collections/ProductComments"
import { Users } from "./collections/Users"
import { JerseyDesigns } from "./collections/JerseyDesigns"
import { CustomJerseyRequests } from "./collections/CustomJerseyRequests"
import {
  CommunityPosts,
  CommunityComments,
  CommunityLikes,
  CommunityCommentReactions,
  CommunityDemoShares,
} from "./collections/Community"
import { CommunityProfiles } from "./collections/CommunityProfiles"
import {
  CommunityFollows,
  CommunityFriendships,
} from "./collections/CommunityConnections"
import { StoryMusic } from "./collections/StoryMusic"
import {
  CommunityStories,
  CommunityConversations,
  CommunityMessages,
  CommunityStoryReactions,
  CommunityStoryViews,
} from "./collections/CommunitySocial"
import { ReturnRequests } from "./collections/ReturnRequests"
import { AuthenticityCodes } from "./collections/AuthenticityCodes"
import { Events } from "./collections/Events"
import { EventRegistrations } from "./collections/EventRegistrations"
import { SportAssessments } from "./collections/SportAssessments"
import { SportTestRuns } from "./collections/SportTestRuns"
import { SportDnaResults } from "./collections/SportDnaResults"
import { CompetitionEvents } from "./collections/CompetitionEvents"
import { UserAchievements } from "./collections/UserAchievements"
import {
  TournamentEvents,
  TournamentRegistrations,
  TournamentMatches,
  TournamentResults,
  MatchRatingHistory,
} from "./collections/Tournaments"
import { RatingProfiles } from "./collections/RatingProfiles"
import { SiteAnnouncements } from "./collections/SiteAnnouncements"
import { Notifications } from "./collections/Notifications"
import { AthleteStories } from "./collections/AthleteStories"
import { SiteImages } from "./collections/SiteImages"
import { ShopConversations, ShopMessages } from "./collections/ShopChat"
import { DiscountCodes } from "./collections/DiscountCodes"
import { RecommendationRequests } from "./collections/RecommendationRequests"
import { DnaShares } from "./collections/DnaShares"
import { SiteContent } from "./globals/SiteContent"
import { ShippingSettings } from "./globals/ShippingSettings"
import { PaymentSettings } from "./globals/PaymentSettings"
import { RecommendationSettings } from "./globals/RecommendationSettings"
import { smtpSettings } from "./lib/email-settings"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Real email delivery (password reset) needs SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS and EMAIL_FROM. Without them Payload writes emails to the server log.
const smtp = smtpSettings()

export default buildFigmaConfig({
  ...(smtp
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: smtp.fromAddress,
          defaultFromName: smtp.fromName,
          // Verifying on boot would add an SMTP round-trip to every cold start.
          skipVerify: true,
          transportOptions: {
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: { user: smtp.user, pass: smtp.pass },
          },
        }),
      }
    : {}),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    dashboard: {
      widgets: [],
      defaultLayout: [
        { widgetSlug: "activity", width: "full" },
        { widgetSlug: "collections", width: "full" },
      ],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en: adminLanguage },
  },
  collections: [
    Admins,
    Users,
    JerseyDesigns,
    CustomJerseyRequests,
    Media,
    Folders,
    Tags,
    Posts,
    ProductTaxonomies,
    Products,
    Events,
    EventRegistrations,
    RecommendationRequests,
    Orders,
    DiscountCodes,
    ReturnRequests,
    AuthenticityCodes,
    ShopConversations,
    ShopMessages,
    Reviews,
    ProductComments,
    CommunityProfiles,
    CommunityFollows,
    CommunityFriendships,
    StoryMusic,
    CommunityStories,
    CommunityStoryReactions,
    CommunityStoryViews,
    CommunityConversations,
    CommunityMessages,
    CommunityPosts,
    CommunityComments,
    CommunityLikes,
    CommunityCommentReactions,
    CommunityDemoShares,
    SportAssessments,
    SportTestRuns,
    SportDnaResults,
    DnaShares,
    CompetitionEvents,
    UserAchievements,
    TournamentEvents,
    TournamentRegistrations,
    TournamentMatches,
    TournamentResults,
    MatchRatingHistory,
    RatingProfiles,
    SiteAnnouncements,
    Notifications,
    AthleteStories,
    SiteImages,
  ],
  globals: [SiteContent, ShippingSettings, PaymentSettings, RecommendationSettings],
  localization: {
    locales: [{ code: "en", label: "English" }],
    fallback: true,
    defaultLocale: "en",
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  plugins: [mcpPlugin({})],
  figma: {},
})
