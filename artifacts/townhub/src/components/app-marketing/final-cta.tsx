import { PhoneFrame } from "@/components/app-marketing/phone-frame";
import { AppStoreButton, PlayStoreButton } from "@/components/app-marketing/store-buttons";
import { TownhubLogoMark } from "@/components/app-marketing/townhub-logo-mark";
import { appMarketingConfig } from "@/lib/app-marketing-config";
import homeScreen from "@/assets/app-marketing/home-today-in-clay.png";
import otherScreen from "@/assets/app-marketing/home-featured-businesses.png";

export function AppMarketingFinalCta() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px] relative z-10">
        <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-xl border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-12 overflow-hidden relative">
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

          <div className="lg:w-1/2 relative h-[500px] md:h-[600px] w-full mt-8 lg:mt-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md flex justify-center">
              <div
                className="absolute inset-0 bg-townhub-blue/5 rounded-full blur-3xl scale-150 z-0"
                aria-hidden
              />
              <div className="translate-x-12 md:translate-x-20 rotate-6 translate-y-12 z-10">
                <PhoneFrame
                  src={otherScreen}
                  alt="Featured local businesses on TownHub"
                  size="lg"
                  className="opacity-80 scale-90 blur-[2px]"
                />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 md:-translate-y-20 -rotate-2 z-20">
                <PhoneFrame
                  src={homeScreen}
                  alt="TownHub home screen"
                  size="xl"
                  className="shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
