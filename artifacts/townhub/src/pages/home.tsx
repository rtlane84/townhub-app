import { keepPreviousData } from "@tanstack/react-query";
import {
  useListBusinesses,
  useListEvents,
  useListHighlights,
  useListTodayFoodTrucks,
  useListUpcomingFoodTrucks,
  useGetWeather,
  getGetWeatherQueryKey,
  useGetMarketplaceStats,
  getListBusinessesQueryKey,
  getListEventsQueryKey,
  getListHighlightsQueryKey,
  getListTodayFoodTrucksQueryKey,
  getListUpcomingFoodTrucksQueryKey,
  getGetMarketplaceStatsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Store,
  ArrowRight,
  Leaf,
  Coffee,
  Utensils,
  Sparkles,
  Cake,
  ShoppingBasket,
  Flower2,
  Wrench,
  Briefcase,
  Tent,
  MapPin,
  Clock,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasActiveMobileLocationNow, PUBLIC_EXPLORE_CATEGORIES } from "@workspace/api-zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HomeHeroSection } from "@/components/home-hero-section";
import { HomeWelcomeSection } from "@/components/home-welcome-section";
import { TodayInTownSection } from "@/components/today-in-town-section";
import { HomeFeaturedEvents } from "@/components/home-featured-events";
import { HomePopularBusinesses } from "@/components/home-popular-businesses";
import { HomeFoodTrucksSkeleton } from "@/components/home-section-skeletons";
import { BusinessLogoBadge } from "@/components/business-logo-badge";
import { usePlatformBranding } from "@/components/theme-provider";
import { formatFoodTruckTimeWindow } from "@/lib/food-truck-utils";
import { LISTING_CARD_CLASS, PAGE_CONTAINER } from "@/lib/design-tokens";
import { asArray } from "@/lib/as-array";
import { cn } from "@/lib/utils";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { THUMBNAIL_IMAGE_WIDTHS } from "@/lib/optimized-image";

/**
 * Homepage IA (refined native layout):
 * 1. Greeting + weather + outlook sentence
 * 2. Town-photo carousel
 * 3. Search (events / businesses)
 * 4. Today in {town}
 * 5. Spotlight (when live)
 * 6. Explore {town}
 * 7. Featured events (when any)
 * 8. On the move today (when trucks exist)
 * 9. Featured businesses
 */

const EXPLORE_ICONS: Record<string, { icon: LucideIcon; tint: string }> = {
  FOOD_VENDOR: { icon: Utensils, tint: "bg-amber-500/10 text-amber-700" },
  COFFEE_SHOP: { icon: Coffee, tint: "bg-orange-500/10 text-orange-700" },
  BAKERY: { icon: Cake, tint: "bg-rose-500/10 text-rose-700" },
  GROCERY: { icon: ShoppingBasket, tint: "bg-lime-500/10 text-lime-700" },
  FLORIST: { icon: Flower2, tint: "bg-emerald-500/10 text-emerald-700" },
  GARDEN_MARKET: { icon: Leaf, tint: "bg-green-500/10 text-green-700" },
  RETAIL_STORE: { icon: Store, tint: "bg-sky-500/10 text-sky-700" },
  BUILDING_SUPPLY: { icon: Wrench, tint: "bg-slate-500/10 text-slate-700" },
  SALON: { icon: Sparkles, tint: "bg-pink-500/10 text-pink-600" },
  SERVICE_PROVIDER: {
    icon: Briefcase,
    tint: "bg-indigo-500/10 text-indigo-700",
  },
  RECREATION: { icon: Tent, tint: "bg-teal-500/10 text-teal-700" },
};

const EXPLORE_FALLBACK = { icon: Store, tint: "bg-primary/10 text-primary" };

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionTitle({
  id,
  title,
  actionHref,
  actionLabel = "View all",
}: {
  id: string;
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2
        id={id}
        className="text-lg font-bold tracking-tight text-platform-heading"
      >
        {title}
      </h2>
      {actionHref ? (
        <Link
          href={actionHref}
          className="shrink-0 text-[13px] font-semibold text-primary"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function Home() {
  const { weatherEnabled, platformName, townName, timezone } = usePlatformBranding();
  const { user, isSignedIn } = useUser();
  const firstName = user?.firstName?.trim();
  const greeting = greetingForHour(new Date().getHours());
  const placeLabel = townName || platformName;

  const {
    data: weather,
    isError: weatherError,
    isPending: weatherPending,
  } = useGetWeather({
    query: {
      queryKey: getGetWeatherQueryKey(),
      enabled: weatherEnabled,
      staleTime: 5 * 60 * 1000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const {
    data: businesses,
    isPending: businessesPending,
    isError: businessesError,
  } = useListBusinesses(
    { featured: true },
    {
      query: {
        queryKey: getListBusinessesQueryKey({ featured: true }),
        placeholderData: keepPreviousData,
      },
    },
  );

  const { data: allBusinesses = [] } = useListBusinesses(undefined, {
    query: {
      queryKey: getListBusinessesQueryKey(),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  });

  const { data: featuredEventsRaw = [], isPending: featuredEventsPending } =
    useListEvents(
      { upcoming: true, featured: true },
      {
        query: {
          queryKey: getListEventsQueryKey({ upcoming: true, featured: true }),
          placeholderData: keepPreviousData,
        },
      },
    );

  const { data: allUpcomingEvents = [], isPending: upcomingEventsPending } =
    useListEvents(
      { upcoming: true },
      {
        query: {
          queryKey: getListEventsQueryKey({ upcoming: true }),
          placeholderData: keepPreviousData,
        },
      },
    );

  const { data: highlights = [] } = useListHighlights({
    query: {
      queryKey: getListHighlightsQueryKey(),
      placeholderData: keepPreviousData,
    },
  });

  const { data: todayTrucks = [], isPending: todayTrucksPending } =
    useListTodayFoodTrucks({
      query: {
        queryKey: getListTodayFoodTrucksQueryKey(),
        placeholderData: keepPreviousData,
      },
    });

  const { data: upcomingTrucks = [] } = useListUpcomingFoodTrucks({
    query: {
      queryKey: getListUpcomingFoodTrucksQueryKey(),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    },
  });

  const { data: marketplaceStats, isPending: marketplaceStatsPending } =
    useGetMarketplaceStats({
      query: {
        queryKey: getGetMarketplaceStatsQueryKey(),
        placeholderData: keepPreviousData,
      },
    });

  const highlightList = asArray(highlights);
  const businessList = asArray(businesses);
  const allBusinessList = asArray(allBusinesses);
  const featuredEventList = asArray(featuredEventsRaw);
  const upcomingEventList = asArray(allUpcomingEvents);
  const todayTruckList = asArray(todayTrucks);
  const upcomingTruckList = asArray(upcomingTrucks);
  const liveTodayTruckList = todayTruckList.filter((truck) =>
    hasActiveMobileLocationNow([truck], new Date(), 0, timezone),
  );

  const spotlightItems = highlightList.slice(0, 3);
  const featuredBusinesses = businessList.slice(0, 6);
  const featuredEvents = featuredEventList.slice(0, 3);

  return (
    <div className="flex flex-col bg-background">
      <div
        className={cn(
          PAGE_CONTAINER,
          "space-y-5 pt-4 pb-2 md:space-y-6 md:pt-6",
        )}
      >
        <HomeWelcomeSection
          greeting={greeting}
          firstName={firstName}
          isSignedIn={!!isSignedIn}
          placeLabel={placeLabel}
          weatherEnabled={weatherEnabled}
          weather={weather}
          weatherError={weatherError}
          weatherLoading={weatherEnabled && weatherPending && !weather}
        />
      </div>

      <HomeHeroSection />

      <div
        className={cn(
          PAGE_CONTAINER,
          "space-y-6 pb-10 pt-2 md:space-y-8 md:pb-14",
        )}
      >
        <TodayInTownSection
          placeLabel={placeLabel}
          todayTrucks={todayTruckList}
          todayTrucksLoading={todayTrucksPending && todayTruckList.length === 0}
          upcomingTrucks={upcomingTruckList}
          upcomingEvents={upcomingEventList}
          upcomingEventsLoading={
            upcomingEventsPending && upcomingEventList.length === 0
          }
          businesses={allBusinessList}
          marketplaceStats={marketplaceStats}
          marketplaceStatsLoading={marketplaceStatsPending && !marketplaceStats}
        />

        {/* Community highlights / announcements */}
        {spotlightItems.length > 0 ? (
          <section className="th-fade-up" aria-labelledby="spotlight-heading">
            <SectionTitle id="spotlight-heading" title="Spotlight" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spotlightItems.map((h) => (
                <Card
                  key={h.id}
                  className="overflow-hidden rounded-[1.25rem] border border-black/[0.05] shadow-sm"
                >
                  <CardContent className="flex items-start gap-3 p-3.5">
                    {h.imageUrl ? (
                      <OptimizedMediaImage
                        src={h.imageUrl}
                        widths={THUMBNAIL_IMAGE_WIDTHS}
                        sizes="80px"
                        alt={h.title}
                        width={80}
                        height={60}
                        className="h-[3.75rem] w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-[3.75rem] w-20 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight text-foreground">
                        {h.title}
                      </p>
                      {h.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {h.description}
                        </p>
                      ) : null}
                      {h.buttonText && h.buttonUrl ? (
                        <Link href={h.buttonUrl}>
                          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                            {h.buttonText}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </Link>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* Explore */}
        <section className="th-fade-up" aria-labelledby="explore-town-heading">
          <SectionTitle
            id="explore-town-heading"
            title={`Explore ${placeLabel}`}
            actionHref="/businesses"
          />
          <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
            {PUBLIC_EXPLORE_CATEGORIES.map((cat) => {
              const visual = EXPLORE_ICONS[cat.value] ?? EXPLORE_FALLBACK;
              const Icon = visual.icon;
              return (
                <Link
                  key={cat.value}
                  href={`/businesses?type=${cat.value}`}
                  className="min-w-[5.25rem] shrink-0"
                >
                  <div className="flex flex-col items-center gap-2 rounded-[1.1rem] border border-black/[0.05] bg-card px-3 py-3 text-center shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-colors hover:bg-muted/40 active:scale-[0.98]">
                    <div
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        visual.tint,
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.85} />
                    </div>
                    <span className="text-[11px] font-semibold leading-tight tracking-tight text-platform-heading">
                      {cat.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured events — only when featured records exist */}
        {featuredEventsPending &&
        featuredEvents.length === 0 ? null : featuredEvents.length > 0 ? (
          <section
            className="th-fade-up"
            aria-labelledby="featured-events-heading"
          >
            <SectionTitle
              id="featured-events-heading"
              title="Featured Events"
              actionHref="/events"
            />
            <HomeFeaturedEvents events={featuredEvents} />
          </section>
        ) : null}

        {/* On the move today — list only when trucks exist (Today card already summarizes empty) */}
        {todayTrucksPending && todayTruckList.length === 0 ? (
          <section
            className="th-fade-up"
            aria-labelledby="trucks-today-heading"
          >
            <SectionTitle
              id="trucks-today-heading"
              title="On the Move"
              actionHref="/food-trucks"
            />
            <HomeFoodTrucksSkeleton />
          </section>
        ) : liveTodayTruckList.length > 0 ? (
          <section
            id="food-trucks-today"
            className="th-fade-up"
            aria-labelledby="trucks-today-heading"
          >
            <SectionTitle
              id="trucks-today-heading"
              title="On the Move"
              actionHref="/food-trucks"
            />
            <div className="mb-3">
              <Badge variant="soft" className="gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden
                />
                Live now
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {liveTodayTruckList.map((truck) => (
                <Link key={truck.id} href={`/businesses/${truck.businessSlug}`}>
                  <Card className={cn(LISTING_CARD_CLASS, "rounded-[1.35rem]")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3.5">
                        {truck.businessLogoUrl ? (
                          <BusinessLogoBadge
                            src={truck.businessLogoUrl}
                            alt={`${truck.businessName} logo`}
                            size="sm"
                            ringClassName="ring-0 border-[3px] border-card shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25)]"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-card bg-primary/10 shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25)]">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-foreground">
                            {truck.businessName}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {truck.locationName}
                            </span>
                          </div>
                          {formatFoodTruckTimeWindow(
                            truck.startTime,
                            truck.endTime,
                          ) ? (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {formatFoodTruckTimeWindow(
                                  truck.startTime,
                                  truck.endTime,
                                )}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <HomePopularBusinesses
          businesses={featuredBusinesses}
          pending={businessesPending}
          error={!!businessesError}
        />
      </div>
    </div>
  );
}
