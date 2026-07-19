import { Calendar, MapPin, Store } from "lucide-react";
import { PhoneFrame } from "@/components/app-marketing/phone-frame";
import eventsScreen from "@/assets/app-marketing/home-spotlight-explore.png";

const residentPoints = [
  { icon: Calendar, text: "Find events and announcements" },
  { icon: MapPin, text: "See where mobile businesses are today" },
  { icon: Store, text: "Discover shops, restaurants, and local products" },
] as const;

export function AppMarketingForResidents() {
  return (
    <section className="py-24 bg-white border-t border-gray-100 overflow-x-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px]">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 flex justify-center relative w-full overflow-hidden">
            <div
              className="absolute inset-0 bg-townhub-blue/5 rounded-full blur-3xl scale-150 -z-10"
              aria-hidden
            />
            <PhoneFrame
              src={eventsScreen}
              alt="TownHub home screen with community spotlight and events"
              size="xl"
              className="w-[min(280px,72vw)] max-w-[320px] shadow-2xl"
            />
          </div>
          <div className="lg:w-1/2">
            <p className="text-townhub-blue text-sm font-bold tracking-widest uppercase mb-4">
              For your community
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-primary mb-6 leading-tight font-serif">
              Know what&apos;s happening.
              <br />
              <span className="italic">Support what&apos;s local.</span>
            </h2>
            <p className="text-[17px] md:text-[18px] text-gray-600 mb-10 leading-relaxed max-w-lg font-sans">
              Stop searching through scattered posts to find business hours, event details,
              food-truck locations, and important announcements. TownHub puts the information you
              need in one easy place.
            </p>
            <ul className="space-y-5">
              {residentPoints.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-townhub-blue">
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <span className="text-gray-800 font-medium text-[17px] font-sans">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
