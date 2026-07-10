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
import {
  Store, ArrowRight, Leaf, Coffee, Utensils, Calendar, Sparkles, MapPin, Clock, Truck,
} from "lucide-react";
import { BusinessType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/event-card";
import { QuickTownInfoSection } from "@/components/quick-town-info-section";
import { HomeHeroSection } from "@/components/home-hero-section";
import {
  HighlightCardSkeleton,
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

const LISTING_CARD_CLASS =
  "h-full hover-elevate cursor-pointer border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] group transition-all duration-200 native-pressable";

const CATEGORIES = [
  { name: "Food & Drink", type: BusinessType.FOOD_VENDOR, icon: <Utensils className="h-7 w-7" />, tint: "from-amber-500/15 to-orange-500/5" },
  { name: "Flowers", type: BusinessType.FLORIST, icon: <Leaf className="h-7 w-7 text-green-600" />, tint: "from-emerald-500/15 to-green-500/5" },
  { name: "Plants & Market", type: BusinessType.GARDEN_MARKET, icon: <Store className="h-7 w-7 text-primary" />, tint: "from-primary/15 to-primary/5" },
  { name: "Salon / Beauty", type: BusinessType.SALON, icon: <Sparkles className="h-7 w-7 text-pink-500" />, tint: "from-pink-500/15 to-rose-500/5" },
  { name: "Retail & General", type: BusinessType.RETAIL_STORE, icon: <Coffee className="h-7 w-7 text-sky-600" />, tint: "from-sky-500/15 to-blue-500/5" },
];

export default function Home() {
  const { weatherEnabled } = usePlatformBranding();

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

  const { data: highlights = [], isPending: highlightsPending } = useListHighlights({
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
  const upcomingEvents = allUpcomingEvents
    .filter((event) => !featuredEventIds.has(event.id))
    .slice(0, 6);
  const featuredHighlights = highlights.slice(0, 3);
  const featuredBusinesses = businesses?.slice(0, 6) ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <HomeHeroSection />

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

      {highlightsPending ? (
        <section className="border-y border-primary/20 bg-primary/10 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Seasonal Highlights</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <HighlightCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </section>
      ) : featuredHighlights.length > 0 ? (
        <section className="border-y border-primary/20 bg-primary/10 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Seasonal Highlights</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredHighlights.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-[1.25rem] border-0 bg-card/90 p-5 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)]">
                  {h.imageUrl && (
                    <img
                      src={h.imageUrl}
                      alt={h.title}
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{h.title}</p>
                    {h.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{h.description}</p>
                    )}
                    {h.buttonText && h.buttonUrl && (
                      <Link href={h.buttonUrl}>
                        <span className="mt-1 block text-xs font-medium text-primary hover:underline">
                          {h.buttonText} →
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-background py-16 native-animate-in native-animate-in-delay-1">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center font-serif text-3xl font-bold tracking-tight">Browse by Category</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {CATEGORIES.map((cat) => (
              <Link key={cat.type} href={`/businesses?type=${cat.type}`}>
                <Card className="group cursor-pointer overflow-hidden border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] transition-all duration-200 hover-elevate native-pressable">
                  <CardContent className={`flex flex-col items-center gap-4 bg-gradient-to-br ${cat.tint} p-7 text-center`}>
                    <div className="rounded-2xl bg-background/80 p-3.5 shadow-sm transition-transform duration-200 group-hover:scale-105">
                      {cat.icon}
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-foreground">{cat.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/15 py-16 native-animate-in native-animate-in-delay-2">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground">Featured Local Favorites</h2>
            <Link href="/businesses" className="hidden items-center font-medium text-primary hover:underline sm:flex">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

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
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
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
                    <CardContent className="px-6 pb-6 pt-10">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="line-clamp-1 font-serif text-xl font-bold text-foreground">{business.name}</h3>
                        {!business.active && <Badge variant="secondary">Closed</Badge>}
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
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

          <div className="mt-8 text-center sm:hidden">
            <Link href="/businesses">
              <Button variant="outline" className="w-full min-h-11">View all businesses</Button>
            </Link>
          </div>
        </div>
      </section>

      {todayTrucksPending && todayTrucks.length === 0 ? (
        <section className="border-y border-accent/20 bg-accent/10 py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold text-foreground">Food Trucks Today</h2>
            </div>
            <HomeFoodTrucksSkeleton />
          </div>
        </section>
      ) : todayTrucks.length > 0 ? (
        <section id="food-trucks-today" className="border-y border-accent/20 bg-accent/10 py-12">
          <div className="container mx-auto px-4">
            <div className="mb-6 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold text-foreground">Food Trucks Today</h2>
              <Badge className="ml-1 border-0 bg-primary/10 text-primary">Live</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {todayTrucks.map((truck) => (
                <Link key={truck.id} href={`/businesses/${truck.businessSlug}`}>
                  <Card className="group cursor-pointer border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] hover-elevate native-pressable">
                    <CardContent className="p-6">
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
                          <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                            {truck.businessName}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{truck.locationName}</span>
                          </div>
                          {formatFoodTruckTimeWindow(truck.startTime, truck.endTime) && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatFoodTruckTimeWindow(truck.startTime, truck.endTime)}</span>
                            </div>
                          )}
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

      <section className="border-t bg-white py-16">
        <div className="container mx-auto px-4">
          {eventsPending && featuredEvents.length === 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 md:p-8">
              <div className="mb-6">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-2xl font-bold text-foreground">Featured Events</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Promoted highlights picked by the platform — don&apos;t miss these.
                </p>
              </div>
              <HomeEventsSkeleton />
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 md:p-8">
              <div className="mb-6">
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="font-serif text-2xl font-bold text-foreground">Featured Events</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Promoted highlights picked by the platform — don&apos;t miss these.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <div className="mb-1 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold text-foreground">Upcoming Events</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              More local events happening soon in the community.
            </p>
          </div>

          {eventsPending && upcomingEvents.length === 0 ? (
            <HomeEventsSkeleton count={6} />
          ) : upcomingEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <NativeEmptyState
              icon={Calendar}
              title="No other upcoming events right now"
              description="Check back soon or browse the full events calendar."
            />
          )}

          <div className="mt-8 text-center">
            <Link href="/events">
              <Button variant="outline" className="min-h-11">View All Events</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
