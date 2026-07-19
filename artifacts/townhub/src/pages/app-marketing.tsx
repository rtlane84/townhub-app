import { useEffect } from "react";
import { AppMarketingHeader } from "@/components/app-marketing/header";
import { AppMarketingHero } from "@/components/app-marketing/hero";
import { AppMarketingFeatureOverview } from "@/components/app-marketing/feature-overview";
import { AppMarketingShowcase } from "@/components/app-marketing/app-showcase";
import { AppMarketingForResidents } from "@/components/app-marketing/for-residents";
import { AppMarketingForBusinesses } from "@/components/app-marketing/for-businesses";
import { AppMarketingCommunityMessage } from "@/components/app-marketing/community-message";
import { AppMarketingFinalCta } from "@/components/app-marketing/final-cta";
import { AppMarketingFooter } from "@/components/app-marketing/footer";
import { applyAppMarketingMeta } from "@/lib/app-marketing-meta";

export default function AppMarketingPage() {
  useEffect(() => applyAppMarketingMeta(), []);

  return (
    <div
      id="top"
      className="app-marketing min-h-[100dvh] w-full flex flex-col font-sans bg-background text-foreground"
    >
      <AppMarketingHeader />
      <main className="flex-1">
        <AppMarketingHero />
        <AppMarketingFeatureOverview />
        <AppMarketingShowcase />
        <AppMarketingForResidents />
        <AppMarketingForBusinesses />
        <AppMarketingCommunityMessage />
        <AppMarketingFinalCta />
      </main>
      <AppMarketingFooter />
    </div>
  );
}
