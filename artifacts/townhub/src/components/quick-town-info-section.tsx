import { Link } from "wouter";
import type {
  Event,
  FoodTruckLocationWithBusiness,
  MarketplaceStats,
  WeatherForecast,
} from "@workspace/api-client-react";
import { ArrowRight, CalendarDays, CloudSun, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherCardContent, WeatherUnavailableContent } from "@/components/weather-widget";
import { QuickTownInfo, QuickTownInfoCard } from "@/components/quick-town-info";
import { QuickTownInfoCardSkeleton } from "@/components/home-section-skeletons";
import { formatEventSchedule } from "@/lib/event-dates";

type QuickTownInfoSectionProps = {
  weatherEnabled: boolean;
  weather: WeatherForecast | undefined;
  weatherError: boolean;
  weatherLoading: boolean;
  todayTrucks: FoodTruckLocationWithBusiness[];
  todayTrucksLoading: boolean;
  upcomingEvents: Event[];
  upcomingEventsLoading: boolean;
  marketplaceStats: MarketplaceStats | undefined;
  marketplaceStatsLoading: boolean;
};

function WeatherDashboardCard({
  weatherEnabled,
  weather,
  weatherError,
  weatherLoading,
}: Pick<QuickTownInfoSectionProps, "weatherEnabled" | "weather" | "weatherError" | "weatherLoading">) {
  if (weatherEnabled && weatherLoading) {
    return <QuickTownInfoCardSkeleton />;
  }

  return (
    <QuickTownInfoCard title="Weather" icon={<CloudSun className="h-4 w-4 text-primary" />}>
      {!weatherEnabled ? (
        <p className="text-sm text-muted-foreground">Weather is not enabled for this marketplace.</p>
      ) : weather?.enabled && weather.current && weather.locationLabel ? (
        <WeatherCardContent
          locationLabel={weather.locationLabel}
          current={weather.current}
          daily={weather.daily ?? []}
        />
      ) : weather?.unavailable ? (
        <WeatherUnavailableContent message={weather.message ?? "Unable to load weather."} />
      ) : weatherError ? (
        <WeatherUnavailableContent message="Unable to load weather right now." />
      ) : (
        <p className="text-sm text-muted-foreground">Loading weather…</p>
      )}
    </QuickTownInfoCard>
  );
}

function FoodTrucksDashboardCard({
  todayTrucks,
  todayTrucksLoading,
}: Pick<QuickTownInfoSectionProps, "todayTrucks" | "todayTrucksLoading">) {
  if (todayTrucksLoading) {
    return <QuickTownInfoCardSkeleton />;
  }

  const count = todayTrucks.length;

  return (
    <QuickTownInfoCard title="On the Move Today" icon={<Truck className="h-4 w-4 text-primary" />}>
      <div className="flex flex-1 flex-col">
        {count > 0 ? (
          <>
            <p className="text-3xl font-serif font-bold tracking-tight text-foreground">{count}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {count === 1 ? "stop scheduled today" : "stops scheduled today"}
            </p>
            <div className="mt-auto pt-5">
              <Link href="/food-trucks">
                <Button variant="outline" size="sm" className="min-h-10 rounded-full px-4">
                  View schedule
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">No mobile stops today.</p>
            <div className="mt-auto pt-5">
              <Link href="/food-trucks">
                <Button variant="outline" size="sm" className="min-h-10 rounded-full px-4">
                  View schedule
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </QuickTownInfoCard>
  );
}

function LocalMarketplaceDashboardCard({
  marketplaceStats,
  marketplaceStatsLoading,
}: Pick<QuickTownInfoSectionProps, "marketplaceStats" | "marketplaceStatsLoading">) {
  if (marketplaceStatsLoading) {
    return <QuickTownInfoCardSkeleton />;
  }

  const shops = marketplaceStats?.localShopsCount ?? 0;
  const items = marketplaceStats?.uniqueItemsCount ?? 0;

  return (
    <QuickTownInfoCard title="Local Marketplace" icon={<Store className="h-4 w-4 text-primary" />}>
      <div className="flex flex-1 flex-col">
        <div className="flex gap-8">
          <div>
            <p className="text-3xl font-serif font-bold tracking-tight text-foreground">{shops}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {shops === 1 ? "local shop" : "local shops"}
            </p>
          </div>
          <div>
            <p className="text-3xl font-serif font-bold tracking-tight text-foreground">{items}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {items === 1 ? "unique item" : "unique items"}
            </p>
          </div>
        </div>
        <div className="mt-auto pt-5">
          <Link href="/businesses">
            <Button variant="outline" size="sm" className="min-h-10 rounded-full px-4">
              Browse Businesses
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </QuickTownInfoCard>
  );
}

function EventsDashboardCard({
  upcomingEvents,
  upcomingEventsLoading,
}: Pick<QuickTownInfoSectionProps, "upcomingEvents" | "upcomingEventsLoading">) {
  if (upcomingEventsLoading) {
    return <QuickTownInfoCardSkeleton />;
  }

  const sorted = [...upcomingEvents].sort((a, b) => a.date.localeCompare(b.date));
  const nextEvent = sorted[0];
  const count = sorted.length;

  return (
    <QuickTownInfoCard title="Upcoming Events" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
      <div className="flex flex-1 flex-col">
        {count > 0 ? (
          <>
            <p className="text-3xl font-serif font-bold tracking-tight text-foreground">{count}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {count === 1 ? "upcoming event" : "upcoming events"}
            </p>
            {nextEvent && (
              <div className="mt-4 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{nextEvent.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventSchedule(nextEvent)}
                </p>
              </div>
            )}
            <div className="mt-auto pt-5">
              <Link href="/events">
                <Button variant="outline" size="sm" className="min-h-10 rounded-full px-4">
                  View Events
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">No upcoming events.</p>
        )}
      </div>
    </QuickTownInfoCard>
  );
}

export function QuickTownInfoSection({
  weatherEnabled,
  weather,
  weatherError,
  weatherLoading,
  todayTrucks,
  todayTrucksLoading,
  upcomingEvents,
  upcomingEventsLoading,
  marketplaceStats,
  marketplaceStatsLoading,
}: QuickTownInfoSectionProps) {
  return (
    <QuickTownInfo>
      <WeatherDashboardCard
        weatherEnabled={weatherEnabled}
        weather={weather}
        weatherError={weatherError}
        weatherLoading={weatherLoading}
      />
      <FoodTrucksDashboardCard todayTrucks={todayTrucks} todayTrucksLoading={todayTrucksLoading} />
      <EventsDashboardCard
        upcomingEvents={upcomingEvents}
        upcomingEventsLoading={upcomingEventsLoading}
      />
      <LocalMarketplaceDashboardCard
        marketplaceStats={marketplaceStats}
        marketplaceStatsLoading={marketplaceStatsLoading}
      />
    </QuickTownInfo>
  );
}
