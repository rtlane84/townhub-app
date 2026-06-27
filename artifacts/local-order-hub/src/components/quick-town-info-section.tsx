import { Link } from "wouter";
import type {
  Event,
  FoodTruckLocationWithBusiness,
  MarketplaceStats,
  WeatherForecast,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { WeatherCardContent, WeatherUnavailableContent } from "@/components/weather-widget";
import { QuickTownInfo, QuickTownInfoCard } from "@/components/quick-town-info";
import { formatEventSchedule } from "@/lib/event-dates";

type QuickTownInfoSectionProps = {
  weatherEnabled: boolean;
  weather: WeatherForecast | undefined;
  weatherError: boolean;
  todayTrucks: FoodTruckLocationWithBusiness[];
  upcomingEvents: Event[];
  marketplaceStats: MarketplaceStats | undefined;
  marketplaceStatsLoading: boolean;
};

function WeatherDashboardCard({
  weatherEnabled,
  weather,
  weatherError,
}: Pick<QuickTownInfoSectionProps, "weatherEnabled" | "weather" | "weatherError">) {
  return (
    <QuickTownInfoCard title="Weather" icon="☀️">
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

function FoodTrucksDashboardCard({ todayTrucks }: { todayTrucks: FoodTruckLocationWithBusiness[] }) {
  const count = todayTrucks.length;

  return (
    <QuickTownInfoCard title="Food Trucks Today" icon="🚚">
      <div className="flex flex-1 flex-col">
        {count > 0 ? (
          <>
            <p className="text-2xl font-serif font-bold text-foreground">{count}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {count === 1 ? "truck operating today" : "trucks operating today"}
            </p>
            <div className="mt-auto pt-4">
              <Link href="/food-trucks">
                <Button variant="outline" size="sm" className="rounded-full">
                  View Today&apos;s Trucks
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">No food trucks today.</p>
            <div className="mt-auto pt-4">
              <Link href="/food-trucks">
                <Button variant="outline" size="sm" className="rounded-full">
                  View Food Trucks
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
  const shops = marketplaceStats?.localShopsCount ?? 0;
  const items = marketplaceStats?.uniqueItemsCount ?? 0;

  return (
    <QuickTownInfoCard title="Local Marketplace" icon="🏪">
      <div className="flex flex-1 flex-col">
        {marketplaceStatsLoading ? (
          <p className="text-sm text-muted-foreground">Loading marketplace stats…</p>
        ) : (
          <>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">{shops}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {shops === 1 ? "local shop" : "local shops"}
                </p>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">{items}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {items === 1 ? "unique item" : "unique items"}
                </p>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <Link href="/businesses">
                <Button variant="outline" size="sm" className="rounded-full">
                  Browse Businesses
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </QuickTownInfoCard>
  );
}

function EventsDashboardCard({ upcomingEvents }: { upcomingEvents: Event[] }) {
  const sorted = [...upcomingEvents].sort((a, b) => a.date.localeCompare(b.date));
  const nextEvent = sorted[0];
  const count = sorted.length;

  return (
    <QuickTownInfoCard title="Upcoming Events" icon="📅">
      <div className="flex flex-1 flex-col">
        {count > 0 ? (
          <>
            <p className="text-2xl font-serif font-bold text-foreground">{count}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {count === 1 ? "upcoming event" : "upcoming events"}
            </p>
            {nextEvent && (
              <div className="mt-3 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{nextEvent.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatEventSchedule(nextEvent)}
                </p>
              </div>
            )}
            <div className="mt-auto pt-4">
              <Link href="/events">
                <Button variant="outline" size="sm" className="rounded-full">
                  View Events
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        )}
      </div>
    </QuickTownInfoCard>
  );
}

export function QuickTownInfoSection({
  weatherEnabled,
  weather,
  weatherError,
  todayTrucks,
  upcomingEvents,
  marketplaceStats,
  marketplaceStatsLoading,
}: QuickTownInfoSectionProps) {
  return (
    <QuickTownInfo>
      <WeatherDashboardCard
        weatherEnabled={weatherEnabled}
        weather={weather}
        weatherError={weatherError}
      />
      <FoodTrucksDashboardCard todayTrucks={todayTrucks} />
      <EventsDashboardCard upcomingEvents={upcomingEvents} />
      <LocalMarketplaceDashboardCard
        marketplaceStats={marketplaceStats}
        marketplaceStatsLoading={marketplaceStatsLoading}
      />
    </QuickTownInfo>
  );
}
