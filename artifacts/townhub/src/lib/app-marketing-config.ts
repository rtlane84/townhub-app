/**
 * Single source of truth for the public `/app` marketing page store links
 * and contact targets. Update placeholders here before launch.
 */
export const appMarketingConfig = {
  /** Placeholder until the public App Store listing URL is confirmed. */
  appStoreUrl: "https://apps.apple.com/app/townhub/idPLACEHOLDER",
  /** App Store Connect numeric ID (Smart App Banner). Confirm before launch. */
  appStoreId: "6791258844",
  /** In-app business application flow. */
  businessSignupUrl: "/list-your-business",
  supportEmail: "Ronnie@Lanetechwv.com",
  launchCommunity: "Clay, West Virginia",
  /** When false, the Play Store control shows “Coming Soon” and is not a link. */
  androidAvailable: false,
  pageTitle: "TownHub App: Local businesses, events & ordering",
  metaDescription:
    "Download TownHub for iPhone. Discover local businesses, events, food trucks, community updates, and online ordering, launching first in Clay, West Virginia.",
  ogImagePath: "/opengraph.jpg",
  canonicalPath: "/app",
} as const;

export type AppMarketingConfig = typeof appMarketingConfig;
