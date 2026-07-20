import { PhoneFrame } from "@/components/app-marketing/phone-frame";
import { AppStoreButton, PlayStoreButton } from "@/components/app-marketing/store-buttons";
import { TownhubLogoMark } from "@/components/app-marketing/townhub-logo-mark";
import { appMarketingConfig } from "@/lib/app-marketing-config";
import { cn } from "@/lib/utils";
import heroHome from "@/assets/app-marketing/hero-home-desktop.png";
import businessDetail from "@/assets/app-marketing/business-detail-duck-donuts.png";

export function AppMarketingFinalCta() {
  return (
    <section className="py-24 bg-background relative overflow-x-clip">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px] relative z-10">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-visible">
          <div className="lg:w-1/2 text-center lg:text-left relative z-10">
            <div className="mb-6 flex justify-center lg:justify-start">
              <TownhubLogoMark sizePx={28} wordmarkClassName="text-base" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary mb-6 font-serif">
              Your community is waiting.
            </h2>
            <p className="text-[17px] md:text-[18px] text-gray-600 mb-10 max-w-md mx-auto lg:mx-0 font-sans">
              Download TownHub and discover what&apos;s happening close to home.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4">
              <AppStoreButton />
              <PlayStoreButton />
            </div>
            <p className="mt-4 text-sm text-gray-400 text-center lg:text-left">
              Launching first in {appMarketingConfig.launchCommunity}
            </p>
          </div>

          {/* Dual-phone stack: back phone peeks clearly on mobile. */}
          <div className="lg:w-1/2 relative w-full min-w-0 mt-4 lg:mt-0 overflow-visible">
            <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[440px] h-[440px] sm:h-[520px] md:h-[580px]">
              <div
                className="absolute inset-0 bg-townhub-blue/5 rounded-full blur-3xl scale-125 z-0"
                aria-hidden
              />
              <div className="absolute left-[38%] sm:left-[34%] md:left-[28%] top-[8%] rotate-6 z-0 opacity-95">
                <PhoneFrame
                  src={businessDetail}
                  alt="Featured local business on TownHub"
                  size="lg"
                  className={cn("w-[min(190px,50vw)] sm:w-[220px] md:w-[250px]")}
                />
              </div>
              <div className="absolute left-0 sm:left-[2%] top-0 -rotate-2 z-10">
                <PhoneFrame
                  src={heroHome}
                  alt="TownHub home screen"
                  size="xl"
                  className={cn(
                    "w-[min(260px,68vw)] sm:w-[min(280px,72vw)] md:w-[min(300px,78vw)] max-w-[320px]",
                    "shadow-2xl",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
