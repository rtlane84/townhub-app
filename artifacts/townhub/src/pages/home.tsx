import { keepPreviousData } from "@tanstack/react-query";
import {
  useListBusinesses,
  useListEvents,
  useListHighlights,
  useListTodayFoodTrucks,
  useGetWeather,
  getGetWeatherQueryKey,
  useGetMarketplaceStats,
  getListBusinessesQueryKey,
  getListEventsQueryKey,
  getListHighlightsQueryKey,
  getListTodayFoodTrucksQueryKey,
  getGetMarketplaceStatsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import {
  Store, ArrowRight, Leaf, Utensils, Calendar, Sparkles, MapPin, Clock, Truck,
} from "lucide-react";
import { BusinessType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/event-card";
import { QuickTownInfoSection } from "@/components/quick-town-info-section";
import { HomeHeroSection } from "@/components/home-hero-section";
import { SectionHeader } from "@/components/section-header";
import {
  HomeEventsSkeleton,
  HomeFeaturedBusinessesSkeleton,
  HomeFoodTrucksSkeleton,
} from "@/components/home-section-skeletons";
import { NativeEmptyState } from "@/components/native-empty-state";
import { usePlatformBranding } from "@/components/theme-provider";
import { BusinessListingCardMedia, BusinessLogoBadge } from "@/components/business-logo-badge";
import { BusinessTags } from "@/components/business-tags";
import {
  businessHeroPlaceholderStyle,
  businessIconAccentStyle,
  businessListingCardVars,
} from "@/lib/theme-colors";
import { formatFoodTruckTimeWindow } from "@/lib/food-truck-utils";
import { LISTING_CARD_CLASS, PAGE_CONTAINER, SECTION_Y } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Homepage IA (native-first):
 * 1. Greeting — who/where/when
 * 2. Today — glance cards (weather, trucks, events, marketplace)
 * 3. Spotlight — optional admin promos/announcements (only when live)
 * 4. Explore — category shortcuts
 * 5. Local favorites — featured businesses
 * 6. Food trucks — only if operating today
 * 7. Events — one combined calendar section
 */

const CATEGORIES = [
  { name: "Food & Drink", type: BusinessType.FOOD_VENDOR, icon: Utensils, tint: "bg-amber-500/10 text-amber-700" },
  { name: "Food Trucks", type: BusinessType.FOOD_TRUCK, icon: Truck, tint: "bg-orange-500/10 text-orange-700" },
  { name: "Flowers", type: BusinessType.FLORIST, icon: Leaf, tint: "bg-emerald-500/10 text-emerald-700" },
  { name: "Salon / Beauty", type: BusinessType.SALON, icon: Sparkles, tint: "bg-pink-500/10 text-pink-600" },
  { name: "Retail", type: BusinessType.RETAIL_STORE, icon: Store, tint: "bg-sky-500/10 text-sky-700" },
];

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { weatherEnabled, platformName, townName } = usePlatformBranding();
  const { user, isSignedIn } = useUser();
  const firstName = user?.firstName?.trim();
  const greeting = greetingForHour(new Date().getHours());
  const placeLabel = townName || platformName;

  const { data: weather, isError: weatherError, isPending: weatherPending } = useGetWeather({
    query: {
      queryKey: getGetWeatherQueryKey(),
      enabled: weatherEnabled,
      staleTime: 5 * 60 * 1000,
      retry: 1,
      placeholderData: keepPreviousData,
    },
  });

  const { data: businesses, isPending: businessesPending, isError: businessesError } = useListBusinesses(
    { featured: true },
    {
      query: {
        queryKey: getListBusinessesQueryKey({ featured: true }),
        placeholderData: keepPreviousData,
      },
    },
  );

  const { data: featuredEventsRaw = [], isPending: featuredEventsPending } = useListEvents(
    { upcoming: true, featured: true },
    {
      query: {
        queryKey: getListEventsQueryKey({ upcoming: true, featured: true }),
        placeholderData: keepPreviousData,
      },
    },
  );

  const { data: allUpcomingEvents = [], isPending: upcomingEventsPending } = useListEvents(
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

  const { data: todayTrucks = [], isPending: todayTrucksPending } = useListTodayFoodTrucks({
    query: {
      queryKey: getListTodayFoodTrucksQueryKey(),
      placeholderData: keepPreviousData,
    },
  });

  const { data: marketplaceStats, isPending: marketplaceStatsPending } = useGetMarketplaceStats({
    query: {
      queryKey: getGetMarketplaceStatsQueryKey(),
      placeholderData: keepPreviousData,
    },
  });

  const eventsPending = featuredEventsPending || upcomingEventsPending;
  const featuredEvents = featuredEventsRaw.slice(0, 3);
  const featuredEventIds = new Set(featuredEvents.map((event) => event.id));
  const otherUpcoming = allUpcomingEvents
    .filter((event) => !featuredEventIds.has(event.id))
    .slice(0, 6 - featuredEvents.length);
  const homeEvents = [...featuredEvents, ...otherUpcoming];
  const spotlightItems = highlights.slice(0, 3);
  const featuredBusinesses = businesses?.slice(0, 6) ?? [];

  return (
    <div className="flex flex-col bg-background">
      {/* Web-only marketing banner — skipped on native */}
      <HomeHeroSection />

      {/* 1. Greeting */}
      <section className={cn(PAGE_CONTAINER, "pt-5 pb-1 th-fade-up md:pt-8")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Today in {placeLabel}
        </p>
        <h1 className="mt-1 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-platform-heading md:text-4xl">
          {isSignedIn && firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
      </section>

      {/* 2. Today — at a glance */}
      <QuickTownInfoSection
        weatherEnabled={weatherEnabled}
        weather={weather}
        weatherError={weatherError}
        weatherLoading={weatherEnabled && weatherPending && !weather}
        todayTrucks={todayTrucks}
        todayTrucksLoading={todayTrucksPending && todayTrucks.length === 0}
        upcomingEvents={allUpcomingEvents}
        upcomingEventsLoading={upcomingEventsPending && allUpcomingEvents.length === 0}
        marketplaceStats={marketplaceStats}
        marketplaceStatsLoading={marketplaceStatsPending && !marketplaceStats}
      />

      {/* 3. Spotlight — optional; only when admin has live content */}
      {spotlightItems.length > 0 ? (
        <section className={cn(SECTION_Y, "pt-2 th-fade-up")}>
          <div className={PAGE_CONTAINER}>
            <SectionHeader
              title="Spotlight"
              description="Promotions, announcements, and what’s important right now."
              size="sm"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spotlightItems.map((h) => (
                <Card key={h.id} className="overflow-hidden rounded-[1.5rem]">
                  <CardContent className="flex items-start gap-3.5 p-4 md:p-5">
                    {h.imageUrl ? (
                      <img
                        src={h.imageUrl}
                        alt={h.title}
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight text-foreground">{h.title}</p>
                      {h.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.description}</p>
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
          </div>
        </section>
      ) : null}

      {/* 4. Explore */}
      <section className={cn(SECTION_Y, "th-fade-up th-fade-up-delay-1")}>
        <div className={PAGE_CONTAINER}>
          <SectionHeader title="Explore" size="sm" />
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:pb-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.type} href={`/businesses?type=${cat.type}`} className="min-w-[120px] shrink-0 md:min-w-0">
                  <Card className={cn(LISTING_CARD_CLASS, "rounded-[1.35rem]")}>
                    <CardContent className="flex flex-col items-center gap-2.5 p-4 text-center md:gap-3 md:p-5">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl md:h-14 md:w-14", cat.tint)}>
                        <Icon className="h-5 w-5 md:h-6 md:w-6" strokeWidth={1.85} />
                      </div>
                      <span className="text-[13px] font-semibold tracking-tight text-foreground md:text-sm">{cat.name}</span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Local favorites */}
      <section className={cn(SECTION_Y, "th-fade-up th-fade-up-delay-2")}>
        <div className={PAGE_CONTAINER}>
          <SectionHeader
            title="Local favorites"
            description="Featured shops and makers around town."
            actionHref="/businesses"
            actionLabel="See all"
          />

          {businessesPending && featuredBusinesses.length === 0 ? (
            <HomeFeaturedBusinessesSkeleton />
          ) : businessesError ? (
            <NativeEmptyState
              icon={Store}
              title="Couldn't load featured businesses"
              description="Please refresh or browse all businesses."
              action={
                <Link href="/businesses">
                  <Button variant="outline" className="w-full min-h-11">Browse Businesses</Button>
                </Link>
              }
            />
          ) : featuredBusinesses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {featuredBusinesses.map((business) => (
                <Link key={business.id} href={`/businesses/${business.slug}`}>
                  <Card className={LISTING_CARD_CLASS} style={businessListingCardVars(business.accentColor)}>
                    <BusinessListingCardMedia
                      heroImageUrl={business.heroImageUrl}
                      heroAlt={business.name}
                      logoUrl={business.logoUrl}
                      businessName={business.name}
                      placeholder={
                        <div
                          className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40"
                          style={businessHeroPlaceholderStyle(business.accentColor)}
                        >
                          <Store className="h-12 w-12" style={businessIconAccentStyle(business.accentColor)} />
                        </div>
                      }
                    />
                    <CardContent className="px-5 pb-5 pt-9">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 font-serif text-xl font-bold text-foreground">{business.name}</h3>
                        {!business.active && <Badge variant="secondary">Closed</Badge>}
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {business.description || "A local favorite."}
                      </p>
                      <BusinessTags
                        business={business}
                        accentColor={business.accentColor}
                        variant="listing"
                        listingLayout="inline"
                      />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <NativeEmptyState
              icon={Store}
              title="No featured businesses yet"
              description="Browse the directory to discover local shops."
              action={
                <Link href="/businesses">
                  <Button variant="outline" className="w-full min-h-11">Browse Businesses</Button>
                </Link>
              }
            />
          )}

          <div className="mt-5 sm:hidden">
            <Link href="/businesses">
              <Button variant="outline" className="w-full min-h-11">See all businesses</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Food trucks — only when relevant */}
      {todayTrucksPending && todayTrucks.length === 0 ? (
        <section className={SECTION_Y}>
          <div className={PAGE_CONTAINER}>
            <SectionHeader
              title="Food trucks today"
              actionHref="/food-trucks"
              size="sm"
            />
            <HomeFoodTrucksSkeleton />
          </div>
        </section>
      ) : todayTrucks.length > 0 ? (
        <section id="food-trucks-today" className={cn(SECTION_Y, "th-fade-up")}>
          <div className={PAGE_CONTAINER}>
            <SectionHeader
              title="Food trucks today"
              actionHref="/food-trucks"
              size="sm"
            />
            <div className="mb-3">
              <Badge variant="soft" className="gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Live now
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayTrucks.map((truck) => (
                <Link key={truck.id} href={`/businesses/${truck.businessSlug}`}>
                  <Card className={cn(LISTING_CARD_CLASS, "rounded-[1.5rem]")}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start gap-3.5">
                        {truck.businessLogoUrl ? (
                          <BusinessLogoBadge
                            src={truck.businessLogoUrl}
                            alt={`${truck.businessName} logo`}
                            size="sm"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                            {truck.businessName}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{truck.locationName}</span>
                          </div>
                          {formatFoodTruckTimeWindow(truck.startTime, truck.endTime) ? (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatFoodTruckTimeWindow(truck.startTime, truck.endTime)}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 7. Events — single combined section */}
      <section className={SECTION_Y}>
        <div className={PAGE_CONTAINER}>
          <SectionHeader
            title="Events"
            description="What’s happening around town."
            actionHref="/events"
            actionLabel="See all"
          />

          {eventsPending && homeEvents.length === 0 ? (
            <HomeEventsSkeleton count={6} />
          ) : homeEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {homeEvents.map((event) => (
                <EventCard key={event.id} event={event} showFeaturedBadge={event.featured} />
              ))}
            </div>
          ) : (
            <NativeEmptyState
              icon={Calendar}
              title="No upcoming events"
              description="Check back soon for community events."
            />
          )}

          <div className="mt-6 sm:hidden">
            <Link href="/events">
              <Button variant="outline" className="w-full min-h-11">See all events</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
