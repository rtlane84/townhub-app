import { Store, Package, ShoppingBag, Clock, Truck, Bell } from "lucide-react";
import { DualPhonePair } from "@/components/app-marketing/dual-phone-pair";
import bizOverview from "@/assets/app-marketing/business-hub-overview.png";
import bizMenu from "@/assets/app-marketing/business-hub-drawer.png";

const businessPoints = [
  { icon: Store, text: "Create and manage a local storefront" },
  { icon: Package, text: "Add products and organize categories" },
  { icon: ShoppingBag, text: "Accept and manage online orders" },
  { icon: Clock, text: "Update hours, availability, and business information" },
  { icon: Truck, text: "Share mobile locations and schedules" },
  { icon: Bell, text: "Configure business notifications" },
] as const;

export function AppMarketingForBusinesses() {
  return (
    <section id="businesses" className="py-24 bg-white border-t border-gray-100 scroll-mt-24 overflow-x-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text first on mobile so phones never cover the headline. */}
          <div className="w-full lg:w-1/2 relative z-10 order-1 lg:order-2">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-6 border border-blue-100">
              For Businesses
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary mb-6 font-serif">
              Built for local <br className="hidden md:block" /> businesses, too.
            </h2>
            <p className="text-[17px] md:text-[18px] text-gray-600 mb-8 leading-relaxed max-w-lg font-sans">
              TownHub gives local businesses a dedicated place to share information, reach nearby
              customers, manage products, and receive online orders, without relying on social
              media alone.
            </p>

            <div className="space-y-6">
              {businessPoints.map((item) => (
                <div key={item.text} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-primary mt-0.5">
                    <item.icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="text-gray-800 font-medium leading-tight pt-2 text-[17px] font-sans">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-1/2 relative order-2 lg:order-1 overflow-hidden">
            <div
              className="absolute inset-0 bg-townhub-blue/5 rounded-full blur-3xl scale-150 -z-10"
              aria-hidden
            />
            <DualPhonePair
              front={{
                src: bizOverview,
                alt: "Business Hub overview with orders and revenue",
              }}
              back={{
                src: bizMenu,
                alt: "Business Hub navigation menu",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
