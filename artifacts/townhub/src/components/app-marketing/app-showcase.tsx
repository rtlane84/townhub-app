import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "@/components/app-marketing/phone-frame";
import homeScreen from "@/assets/app-marketing/home-today-in-clay.png";
import eventsScreen from "@/assets/app-marketing/events-featured-carousel.png";
import businessesScreen from "@/assets/app-marketing/businesses-local-directory.png";
import accountScreen from "@/assets/app-marketing/account-welcome-sign-in.png";
import trucksOnTheMove from "@/assets/app-marketing/trucks-on-the-move.png";
import trucksTodaysMap from "@/assets/app-marketing/trucks-todays-map.png";

const showcaseItems = [
  {
    src: homeScreen,
    title: "Daily Dashboard",
    description: "See what's happening in your town at a glance.",
  },
  {
    src: eventsScreen,
    title: "Events & What's Happening",
    description: "Find upcoming community events in one place.",
  },
  {
    src: businessesScreen,
    title: "Business Discovery",
    description: "Explore local shops, restaurants, and services.",
  },
  {
    src: trucksOnTheMove,
    title: "On the Move",
    description: "Find food trucks and mobile stops around town.",
  },
  {
    src: trucksTodaysMap,
    title: "Today's Map",
    description: "See where mobile businesses are today.",
  },
  {
    src: accountScreen,
    title: "Account & Business Access",
    description: "Manage your profile and business tools.",
  },
] as const;

export function AppMarketingShowcase() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const itemWidth = Math.min(container.clientWidth - 32, 300);
      const newIndex = Math.round(container.scrollLeft / Math.max(itemWidth, 1));
      setActiveIndex(Math.min(Math.max(newIndex, 0), showcaseItems.length - 1));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="py-24 bg-gray-50 overflow-hidden" aria-labelledby="app-showcase-heading">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2
            id="app-showcase-heading"
            className="text-4xl md:text-5xl font-bold tracking-tight text-primary mb-4 font-serif"
          >
            Designed for <span className="italic text-townhub-blue">clarity.</span>
          </h2>
          <p className="text-[17px] md:text-[18px] text-gray-600 font-sans">
            A beautiful, intuitive interface that makes finding local information effortless.
          </p>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="w-full flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-12 pt-4 app-marketing-hide-scrollbar px-4 md:px-0 md:justify-center"
        tabIndex={0}
        role="region"
        aria-label="App screenshot gallery"
      >
        <div className="flex gap-4 md:gap-8 w-max mx-auto md:px-4">
          {showcaseItems.map((item) => (
            <div
              key={item.title}
              className="snap-center shrink-0 w-[260px] sm:w-[280px] md:w-[300px] motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:-translate-y-4 flex flex-col items-center"
            >
              <PhoneFrame src={item.src} alt={item.title} size="lg" />
              <div className="text-center mt-6 px-2">
                <p className="font-bold text-primary text-xl mb-2 font-serif">{item.title}</p>
                <p className="text-gray-600 text-[15px] font-sans">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4 md:hidden" aria-hidden>
        {showcaseItems.map((item, index) => (
          <div
            key={item.title}
            className={`h-2 rounded-full motion-safe:transition-all motion-safe:duration-300 ${
              activeIndex === index ? "w-6 bg-primary" : "w-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
