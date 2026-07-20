import { Store, Calendar, Truck, Bell, ShoppingBag, Sun } from "lucide-react";
import { PhoneFrame, PHONE_FRAME_DUAL_CLASS } from "@/components/app-marketing/phone-frame";
import { cn } from "@/lib/utils";
import orderLocal from "@/assets/app-marketing/order-summary-checkout.png";
import businessDetail from "@/assets/app-marketing/business-detail-order-local.png";

const features = [
  {
    icon: Store,
    title: "Local Businesses",
    description:
      "Find nearby shops, restaurants, services, hours, directions, and everything they offer.",
    color: "bg-blue-100 text-blue-700",
  },
  {
    icon: Calendar,
    title: "Events",
    description: "See what's happening around town and never miss a community event.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: Truck,
    title: "On the Move",
    description:
      "Find food trucks, mobile markets, and traveling businesses, and see where they are today.",
    color: "bg-orange-100 text-orange-700",
  },
  {
    icon: Bell,
    title: "Community Updates",
    description:
      "Stay informed with important announcements, school information, weather updates, and local alerts.",
    color: "bg-red-100 text-red-700",
  },
  {
    icon: ShoppingBag,
    title: "Order Local",
    description:
      "Browse products and place pickup or delivery orders with participating businesses.",
    color: "bg-green-100 text-green-700",
  },
  {
    icon: Sun,
    title: "Today in Town",
    description:
      "Get a quick daily view of what is open, what is happening, and what you need to know.",
    color: "bg-yellow-100 text-yellow-700",
  },
] as const;

const orderHighlights = [
  "Browse local products and menus",
  "Pay online or at pickup when offered",
  "Receive clear order status updates",
] as const;

export function AppMarketingFeatureOverview() {
  return (
    <section id="features" className="py-24 bg-white relative scroll-mt-24">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px]">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary mb-6 font-serif">
            Everything local,{" "}
            <span className="italic text-townhub-blue">all in one place.</span>
          </h2>
          <p className="text-[17px] md:text-[18px] text-gray-600 font-sans">
            TownHub brings local businesses, events, announcements, mobile vendors, and online
            ordering together in one convenient place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="bg-gray-50 rounded-3xl p-8 border border-gray-100 motion-safe:transition-transform motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg motion-safe:duration-300"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.color}`}
              >
                <feature.icon className="w-7 h-7" aria-hidden />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3 font-serif">{feature.title}</h3>
              <p className="text-base text-gray-600 leading-relaxed font-sans">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 bg-primary rounded-[3rem] p-6 sm:p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center overflow-hidden relative">
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-townhub-blue rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3"
            aria-hidden
          />

          <div className="text-white z-10 min-w-0">
            <p className="text-townhub-orange text-sm font-bold tracking-widest uppercase mb-4">
              Shop close to home
            </p>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-6 leading-tight text-white">
              Discover it locally.
              <br />
              Order it simply.
            </h3>
            <p className="text-white/75 text-[17px] md:text-[18px] mb-8 leading-relaxed font-sans">
              Browse products from participating businesses, order from your phone, and choose the
              fulfillment options each business offers.
            </p>
            <ul className="space-y-4">
              {orderHighlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="font-medium text-[17px] font-sans text-white">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 w-full min-w-0 px-2 sm:px-4 flex justify-center items-end gap-2.5 sm:gap-4">
            <PhoneFrame
              src={businessDetail}
              alt="Local bakery storefront on TownHub"
              size="lg"
              className={cn(PHONE_FRAME_DUAL_CLASS, "shadow-[0_20px_50px_rgba(0,0,0,0.35)]")}
            />
            <PhoneFrame
              src={orderLocal}
              alt="Order summary and pay at pickup on TownHub"
              size="lg"
              className={cn(PHONE_FRAME_DUAL_CLASS, "shadow-[0_20px_50px_rgba(0,0,0,0.35)]")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
