import type { ReactNode } from "react";
import { Link } from "wouter";
import type {
  Business,
  Event,
  FoodTruckLocationWithBusiness,
  MarketplaceStats,
} from "@workspace/api-client-react";
import { CalendarDays, Store, Truck } from "lucide-react";
import { filterEventsThisWeek } from "@/lib/weather-outlook";
import { getBusinessOpenShortLabel } from "@/lib/business-listing";
import { cn } from "@/lib/utils";

type TodayInTownSectionProps = {
  placeLabel: string;
  todayTrucks: FoodTruckLocationWithBusiness[];
  todayTrucksLoading: boolean;
  upcomingTrucks?: FoodTruckLocationWithBusiness[];
  upcomingEvents: Event[];
  upcomingEventsLoading: boolean;
  businesses?: Business[];
  marketplaceStats: MarketplaceStats | undefined;
  marketplaceStatsLoading: boolean;
};

function SummaryCard({
  tag,
  tagClassName,
  icon,
  iconTint,
  children,
  href,
}: {
  tag: string;
  tagClassName: string;
  icon: ReactNode;
  iconTint: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col overflow-hidden",
        "min-h-[8.75rem] rounded-[1.1rem] border border-black/[0.06] bg-card p-2.5",
        "shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-colors hover:bg-muted/30 active:scale-[0.985] sm:min-h-[9.25rem] sm:p-3",
      )}
    >
      <article className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              iconTint,
            )}
            aria-hidden
          >
            {icon}
          </span>
          <p
            className={cn(
              "min-w-0 whitespace-nowrap text-[8px] font-bold uppercase leading-none tracking-[0.02em] sm:text-[9px]",
              tagClassName,
            )}
          >
            {tag}
          </p>
        </div>
        <div className="flex flex-1 flex-col text-[12px] leading-snug text-foreground sm:text-[13px]">
          {children}
        </div>
      </article>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div
      className="min-h-[8.75rem] min-w-0 flex-1 animate-pulse rounded-[1.1rem] border border-black/[0.04] bg-muted/50 p-2.5 sm:min-h-[9.25rem]"
      aria-hidden
    >
      <div className="mb-2 h-6 w-6 rounded-full bg-muted" />
      <div className="mb-2 h-3 w-16 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
    </div>
  );
}

function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatWeekdayLong(dateKey: string): string | null {
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, { weekday: "long" });
}

function nextUpcomingEventName(events: Event[], now = new Date()): string | null {
  const todayKey = localDateKey(now);
  const upcoming = events
    .filter((event) => {
      const end = event.endDate?.trim() || event.date;
      return end >= todayKey;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  return upcoming[0]?.title?.trim() || null;
}

function nextStopWeekday(
  upcomingTrucks: FoodTruckLocationWithBusiness[],
  now = new Date(),
): string | null {
  const todayKey = localDateKey(now);
  const next = [...upcomingTrucks]
    .filter((truck) => truck.locationDate > todayKey)
    .sort((a, b) => a.locationDate.localeCompare(b.locationDate))[0];
  if (!next) return null;
  return formatWeekdayLong(next.locationDate);
}

function countOpenNow(businesses: Business[]): number {
  return businesses.reduce((count, business) => {
    const status = getBusinessOpenShortLabel(business);
    return status?.isOpen ? count + 1 : count;
  }, 0);
}

export function TodayInTownSection({
  placeLabel,
  todayTrucks,
  todayTrucksLoading,
  upcomingTrucks = [],
  upcomingEvents,
  upcomingEventsLoading,
  businesses,
  marketplaceStats,
  marketplaceStatsLoading,
}: TodayInTownSectionProps) {
  const truckCount = todayTrucks.length;
  const eventsThisWeek = filterEventsThisWeek(upcomingEvents);
  const weekCount = eventsThisWeek.length;
  const nextEventName = weekCount > 0 ? nextUpcomingEventName(eventsThisWeek) : null;
  const totalShops = marketplaceStats?.localShopsCount ?? 0;
  const openShops =
    businesses && businesses.length > 0
      ? countOpenNow(businesses)
      : (marketplaceStats?.openShopsCount ?? 0);
  const items = marketplaceStats?.uniqueItemsCount ?? 0;
  const firstTruck = todayTrucks[0];
  const nextStopDay = truckCount === 0 ? nextStopWeekday(upcomingTrucks) : null;
  const hasMarketplaceStats = totalShops > 0 || openShops > 0 || items > 0;

  return (
    <section className="th-fade-up" aria-labelledby="today-in-town-heading">
      <h2
        id="today-in-town-heading"
        className="mb-3 text-lg font-bold tracking-tight text-platform-heading"
      >
        Today in {placeLabel}
      </h2>

      <div className="flex items-stretch gap-1.5 sm:gap-2.5">
        {todayTrucksLoading ? (
          <CardSkeleton />
        ) : (
          <SummaryCard
            tag="On the move"
            tagClassName="text-sky-600"
            icon={<Truck className="h-3 w-3" />}
            iconTint="bg-sky-500/12 text-sky-600"
            href="/food-trucks"
          >
            {truckCount > 0 ? (
              <>
                <p className="font-semibold text-platform-heading">
                  {truckCount} {truckCount === 1 ? "stop" : "stops"} today
                </p>
                {firstTruck ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground sm:text-[12px]">
                    {firstTruck.businessName}
                    {firstTruck.locationName
                      ? ` · ${firstTruck.locationName}`
                      : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">No mobile stops today</p>
                {nextStopDay ? (
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-[12px]">
                    Next stop {nextStopDay}
                  </p>
                ) : null}
              </>
            )}
          </SummaryCard>
        )}

        {upcomingEventsLoading ? (
          <CardSkeleton />
        ) : (
          <SummaryCard
            tag="Events"
            tagClassName="text-emerald-600"
            icon={<CalendarDays className="h-3 w-3" />}
            iconTint="bg-emerald-500/12 text-emerald-600"
            href="/events"
          >
            {weekCount > 0 ? (
              <>
                <p className="font-semibold text-platform-heading">
                  {weekCount} {weekCount === 1 ? "event" : "events"} this week
                </p>
                {nextEventName ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground sm:text-[12px]">
                    Next: {nextEventName}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                No upcoming events this week.
              </p>
            )}
          </SummaryCard>
        )}

        {marketplaceStatsLoading ? (
          <CardSkeleton />
        ) : (
          <SummaryCard
            tag="Marketplace"
            tagClassName="text-orange-600"
            icon={<Store className="h-3 w-3" />}
            iconTint="bg-orange-500/12 text-orange-600"
            href="/businesses"
          >
            {hasMarketplaceStats ? (
              <div className="space-y-0.5 text-[11px] leading-snug sm:text-[12px]">
                <p className="font-semibold text-platform-heading">
                  {totalShops} {totalShops === 1 ? "shop" : "shops"}
                </p>
                <p className="text-muted-foreground">
                  {openShops} open now
                </p>
                <p className="text-muted-foreground">
                  {items} total {items === 1 ? "item" : "items"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Browse local shops and makers.
              </p>
            )}
          </SummaryCard>
        )}
      </div>
    </section>
  );
}
