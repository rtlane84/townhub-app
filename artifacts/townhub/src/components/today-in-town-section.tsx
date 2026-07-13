import type { ReactNode } from "react";
import { Link } from "wouter";
import type {
  Event,
  FoodTruckLocationWithBusiness,
  MarketplaceStats,
} from "@workspace/api-client-react";
import { CalendarDays, Store, Truck } from "lucide-react";
import { filterEventsThisWeek } from "@/lib/weather-outlook";
import { cn } from "@/lib/utils";

type TodayInTownSectionProps = {
  placeLabel: string;
  todayTrucks: FoodTruckLocationWithBusiness[];
  todayTrucksLoading: boolean;
  upcomingEvents: Event[];
  upcomingEventsLoading: boolean;
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
        "flex min-w-0 flex-1 flex-col overflow-hidden",
        "min-h-[10.5rem] rounded-[1.1rem] border border-black/[0.06] bg-card p-2.5",
        "shadow-[0_1px_4px_rgba(15,23,42,0.04)] transition-colors hover:bg-muted/30 active:scale-[0.985] sm:p-3",
      )}
    >
      <article className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex min-w-0 items-center gap-1.5">
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
        <div className="flex min-h-[3.25rem] flex-1 flex-col text-[12px] leading-snug text-foreground sm:text-[13px]">
          {children}
        </div>
      </article>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div
      className="min-h-[10.5rem] min-w-0 flex-1 animate-pulse rounded-[1.1rem] border border-black/[0.04] bg-muted/50 p-2.5"
      aria-hidden
    >
      <div className="mb-2 h-6 w-6 rounded-full bg-muted" />
      <div className="mb-2 h-3 w-16 rounded bg-muted" />
      <div className="h-10 w-full rounded bg-muted" />
    </div>
  );
}

function EventThumbnails({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-2.5 flex items-center" aria-hidden>
      {events.map((event, index) =>
        event.imageUrl ? (
          <img
            key={event.id}
            src={event.imageUrl}
            alt=""
            className={cn(
              "h-8 w-8 rounded-full border-2 border-card object-cover sm:h-9 sm:w-9",
              index > 0 && "-ml-2",
            )}
          />
        ) : (
          <span
            key={event.id}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-emerald-500/15 text-emerald-700 sm:h-9 sm:w-9",
              index > 0 && "-ml-2",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        ),
      )}
    </div>
  );
}

export function TodayInTownSection({
  placeLabel,
  todayTrucks,
  todayTrucksLoading,
  upcomingEvents,
  upcomingEventsLoading,
  marketplaceStats,
  marketplaceStatsLoading,
}: TodayInTownSectionProps) {
  const truckCount = todayTrucks.length;
  const eventsThisWeek = filterEventsThisWeek(upcomingEvents);
  const weekCount = eventsThisWeek.length;
  const totalShops = marketplaceStats?.localShopsCount ?? 0;
  const openShops = marketplaceStats?.openShopsCount ?? 0;
  const items = marketplaceStats?.uniqueItemsCount ?? 0;
  const firstTruck = todayTrucks[0];
  const hasMarketplaceStats = totalShops > 0 || openShops > 0 || items > 0;

  return (
    <section className="th-fade-up" aria-labelledby="today-in-town-heading">
      <h2
        id="today-in-town-heading"
        className="mb-3 text-lg font-bold tracking-tight text-platform-heading"
      >
        Today in {placeLabel}
      </h2>

      <div className="flex gap-1.5 sm:gap-2.5">
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
              <p className="text-muted-foreground">
                No mobile stops scheduled today.
              </p>
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
                <EventThumbnails events={eventsThisWeek} />
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
