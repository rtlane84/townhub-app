import { MapPin } from "lucide-react";
import { PhoneFrame } from "@/components/app-marketing/phone-frame";
import { AppStoreButton, PlayStoreButton } from "@/components/app-marketing/store-buttons";
import { appMarketingConfig } from "@/lib/app-marketing-config";
import heroHome from "@/assets/app-marketing/hero-home-desktop.png";
import businessDetail from "@/assets/app-marketing/business-detail-duck-donuts.png";

export function AppMarketingHero() {
  return (
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-background">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-600 mb-6 shadow-sm">
              <MapPin className="w-4 h-4 text-townhub-orange" aria-hidden />
              Launching first in {appMarketingConfig.launchCommunity}
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-primary leading-[1.05] mb-6 font-serif">
              Your town.
              <br />
              <span className="text-townhub-blue italic">Right at your fingertips.</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans">
              Discover local businesses, upcoming events, important community updates, food trucks,
              online ordering, and more, all in one simple app.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <AppStoreButton />
              <PlayStoreButton />
            </div>
            <p className="mt-4 text-sm text-gray-500 text-center lg:text-left">
              Free to download. Built for the communities you call home.
            </p>
          </div>

          <div className="relative min-h-[560px] md:min-h-[720px] flex justify-center items-center mt-8 lg:mt-0 lg:translate-x-12">
            <div
              className="absolute inset-0 bg-gradient-to-tr from-townhub-blue/5 to-townhub-orange/5 rounded-full blur-3xl -z-10 scale-110"
              aria-hidden
            />

            <div className="relative z-10 md:-rotate-3 motion-safe:transition-transform motion-safe:hover:-rotate-1 motion-safe:duration-700 motion-safe:ease-out">
              <PhoneFrame
                src={heroHome}
                alt="TownHub home screen showing today's community highlights"
                size="xl"
                loading="eager"
              />
            </div>

            <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 rotate-6 translate-x-12 z-0 opacity-90 blur-[1px]">
              <PhoneFrame
                src={businessDetail}
                alt="TownHub business storefront for a local bakery"
                size="lg"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
