/**
 * Single source of truth for the public `/app` marketing page store links
 * and contact targets.
 */
export const appMarketingConfig = {
  /** Public App Store listing; the numeric ID remains stable through the rebrand. */
  appStoreUrl: "https://apps.apple.com/us/app/townhaven/id6791258844",
  /** App Store Connect numeric ID (Smart App Banner). */
  appStoreId: "6791258844",
  /** In-app business application flow. */
  businessSignupUrl: "/list-your-business",
  supportEmail: "Ronnie@Lanetechwv.com",
  launchCommunity: "Clay, West Virginia",
  /** When false, the Play Store control shows “Coming Soon” and is not a link. */
  androidAvailable: false,
  pageTitle: "TownHaven App: Local businesses, events & ordering",
  metaDescription:
    "Download TownHaven for iPhone. Discover local businesses, events, food trucks, community updates, and online ordering, launching first in Clay, West Virginia.",
  ogImagePath: "/opengraph.jpg",
  canonicalPath: "/app",
} as const;

export type AppMarketingConfig = typeof appMarketingConfig;
