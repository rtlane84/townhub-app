import type { ReactNode } from "react";
import { Link } from "wouter";
import type {
  Business,
  Event,
  FoodTruckLocationWithBusiness,
  MarketplaceStats,
} from "@workspace/api-client-react";
import { hasActiveMobileLocationNow, formatCivilDateInTimeZone } from "@workspace/api-zod";
import { ArrowRight, CalendarDays, Store, Truck } from "lucide-react";
import { filterEventsThisWeek } from "@/lib/weather-outlook";
import { getBusinessOpenShortLabel } from "@/lib/business-listing";
import { cn } from "@/lib/utils";
import { usePlatformBranding } from "@/components/theme-provider";

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
  footerClassName,
  footerLabel,
  children,
  href,
}: {
  tag: string;
  tagClassName: string;
  icon: ReactNode;
  iconTint: string;
  footerClassName: string;
  footerLabel: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col overflow-hidden",
        "min-h-[13.5rem] rounded-[1.1rem] border border-black/[0.06] bg-card",
        "shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-transform hover:bg-muted/30 active:scale-[0.985] sm:min-h-[14.5rem]",
      )}
    >
      <article className="flex min-h-0 flex-1 flex-col p-2.5 sm:p-3">
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
              "min-w-0 whitespace-nowrap text-[10px] font-bold uppercase leading-none tracking-[0.02em] sm:text-[11px]",
              tagClassName,
            )}
          >
            {tag}
          </p>
        </div>
        <div className="flex flex-1 flex-col text-[12px] font-bold leading-snug text-foreground sm:text-[13px]">
          {children}
        </div>
      </article>
      <div
        className={cn(
          "flex min-h-11 items-center justify-between border-t border-black/[0.08] px-2.5 py-2 text-[11px] font-bold sm:min-h-12 sm:px-3 sm:text-[12px]",
          footerClassName,
        )}
      >
        <span className="min-w-0 truncate">{footerLabel}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </div>
    </Link>
  );
}

function SummaryMetric({
  value,
  children,
  className,
}: {
  value: number;
  children: ReactNode;
  className: string;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
      <span className={cn("text-base font-bold sm:text-lg", className)}>{value}</span>
      <span>{children}</span>
    </p>
  );
}

function CardSkeleton() {
  return (
    <div
      className="min-h-[13.5rem] min-w-0 flex-1 animate-pulse rounded-[1.1rem] border border-black/[0.04] bg-muted/50 p-2.5 sm:min-h-[14.5rem]"
      aria-hidden
    >
      <div className="mb-2 h-6 w-6 rounded-full bg-muted" />
      <div className="mb-2 h-3 w-16 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
    </div>
  );
}

function localDateKey(d = new Date(), timeZone?: string) {
  if (timeZone) return formatCivilDateInTimeZone(d, timeZone);
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

function nextUpcomingEventName(
  events: Event[],
  now = new Date(),
  timeZone?: string,
): string | null {
  const todayKey = localDateKey(now, timeZone);
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
  timeZone?: string,
): string | null {
  const todayKey = localDateKey(now, timeZone);
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

function countUniqueMobileBusinesses(
  trucks: FoodTruckLocationWithBusiness[],
): number {
  return new Set(trucks.map((truck) => truck.businessId)).size;
}

function countActiveMobileBusinessesNow(
  trucks: FoodTruckLocationWithBusiness[],
  now = new Date(),
  timeZone?: string,
): number {
  const todayKey = localDateKey(now, timeZone);
  const activeIds = new Set<number>();
  for (const truck of trucks) {
    // todayTrucks are already today's stops; evaluate the time window on the
    // platform civil date so UTC host drift does not zero out "active now".
    if (
      hasActiveMobileLocationNow(
        [{ ...truck, locationDate: todayKey }],
        now,
        0,
        timeZone,
      )
    ) {
      activeIds.add(truck.businessId);
    }
  }
  return activeIds.size;
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
  const { timezone } = usePlatformBranding();
  const truckCount = todayTrucks.length;
  const mobileBusinessCount = countUniqueMobileBusinesses(todayTrucks);
  const activeMobileNow = countActiveMobileBusinessesNow(
    todayTrucks,
    new Date(),
    timezone,
  );
  const eventsThisWeek = filterEventsThisWeek(upcomingEvents);
  const weekCount = eventsThisWeek.length;
  const nextEventName =
    weekCount > 0
      ? nextUpcomingEventName(eventsThisWeek, new Date(), timezone)
      : null;
  const totalShops = marketplaceStats?.localShopsCount ?? 0;
  const openShops =
    businesses && businesses.length > 0
      ? countOpenNow(businesses)
      : (marketplaceStats?.openShopsCount ?? 0);
  const items = marketplaceStats?.uniqueItemsCount ?? 0;
  const nextStopDay =
    truckCount === 0
      ? nextStopWeekday(upcomingTrucks, new Date(), timezone)
      : null;
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
            tagClassName="text-sky-700"
            icon={<Truck className="h-3 w-3" />}
            iconTint="bg-sky-500/12 text-sky-700"
            footerClassName="bg-sky-500/[0.08] text-sky-700"
            footerLabel="View all on the move"
            href="/food-trucks"
          >
            {truckCount > 0 ? (
              <div className="space-y-1 text-[11px] leading-snug sm:text-[12px]">
                <SummaryMetric value={mobileBusinessCount} className="text-sky-700">
                  {mobileBusinessCount === 1
                    ? "mobile business"
                    : "mobile businesses"}
                </SummaryMetric>
                <SummaryMetric value={activeMobileNow} className="text-sky-700">
                  active now
                </SummaryMetric>
                <SummaryMetric value={truckCount} className="text-sky-700">
                  {truckCount === 1 ? "stop" : "stops"} today
                </SummaryMetric>
              </div>
            ) : (
              <>
                <p>No mobile stops today</p>
                {nextStopDay ? (
                  <p className="mt-1 text-[11px] sm:text-[12px]">
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
            tagClassName="text-emerald-700"
            icon={<CalendarDays className="h-3 w-3" />}
            iconTint="bg-emerald-500/12 text-emerald-700"
            footerClassName="bg-emerald-500/[0.08] text-emerald-700"
            footerLabel="View all events"
            href="/events"
          >
            {weekCount > 0 ? (
              <>
                <SummaryMetric value={weekCount} className="text-emerald-700">
                  {weekCount === 1 ? "event" : "events"} this week
                </SummaryMetric>
                {nextEventName ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-normal text-muted-foreground sm:text-[12px]">
                      Next up
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] sm:text-[12px]">
                      {nextEventName}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p>No upcoming events this week.</p>
            )}
          </SummaryCard>
        )}

        {marketplaceStatsLoading ? (
          <CardSkeleton />
        ) : (
          <SummaryCard
            tag="Marketplace"
            tagClassName="text-orange-700"
            icon={<Store className="h-3 w-3" />}
            iconTint="bg-orange-500/12 text-orange-700"
            footerClassName="bg-orange-500/[0.08] text-orange-700"
            footerLabel="Browse marketplace"
            href="/businesses"
          >
            {hasMarketplaceStats ? (
              <div className="space-y-1 text-[11px] leading-snug sm:text-[12px]">
                <SummaryMetric value={totalShops} className="text-orange-700">
                  {totalShops === 1 ? "business" : "businesses"}
                </SummaryMetric>
                <SummaryMetric value={openShops} className="text-orange-700">
                  open now
                </SummaryMetric>
                <SummaryMetric value={items} className="text-orange-700">
                  total {items === 1 ? "item" : "items"}
                </SummaryMetric>
              </div>
            ) : (
              <p>Browse local businesses and makers.</p>
            )}
          </SummaryCard>
        )}
      </div>
    </section>
  );
}
