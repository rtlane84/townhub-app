import { useMemo } from "react";
import {
  useListTodayFoodTrucks,
  useListUpcomingFoodTrucks,
  getListTodayFoodTrucksQueryKey,
  getListUpcomingFoodTrucksQueryKey,
} from "@workspace/api-client-react";
import { CalendarClock, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FoodTruckScheduleItem, FoodTruckTodayCard } from "@/components/food-truck-card";
import { FoodTruckMapSection } from "@/components/food-truck-map";
import { NativeEmptyState } from "@/components/native-empty-state";
import { PeekCarousel } from "@/components/peek-carousel";
import { SectionHeader } from "@/components/section-header";
import { formatFoodTruckDateHeading, groupFoodTrucksByDate } from "@/lib/food-truck-utils";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function FoodTrucks() {
  const { data: todayTrucks = [], isLoading: todayLoading } = useListTodayFoodTrucks({
    query: { queryKey: getListTodayFoodTrucksQueryKey() },
  });
  const { data: upcomingTrucks = [], isLoading: upcomingLoading } = useListUpcomingFoodTrucks({
    query: { queryKey: getListUpcomingFoodTrucksQueryKey() },
  });

  const upcomingByDate = useMemo(
    () => groupFoodTrucksByDate(upcomingTrucks),
    [upcomingTrucks],
  );

  const isLoading = todayLoading || upcomingLoading;

  return (
    <div className={cn(PAGE_CONTAINER, "bg-background py-6 md:py-8 native-animate-in")}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title="On the move"
          description="Food trucks, mobile markets, and other traveling businesses around town."
          size="lg"
          className="mb-0 min-w-0 flex-1"
        />
        {!isLoading && todayTrucks.length > 0 ? (
          <Badge variant="soft" className="gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            {todayTrucks.length} live today
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-[1.75rem]" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-[1.75rem]" />
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="today-trucks-heading">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2
                id="today-trucks-heading"
                className="text-[17px] font-bold tracking-tight text-platform-heading"
              >
                Today’s trucks
              </h2>
              {upcomingByDate.length > 0 ? (
                <button
                  type="button"
                  className="shrink-0 text-[13px] font-semibold text-primary"
                  onClick={() => {
                    document
                      .getElementById("upcoming-trucks-heading")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View all
                </button>
              ) : null}
            </div>
            {todayTrucks.length > 0 ? (
              <PeekCarousel
                label="Today’s trucks"
                itemClassName="basis-[72%] sm:basis-[40%] lg:basis-[28%]"
              >
                {todayTrucks.map((truck) => (
                  <FoodTruckTodayCard key={truck.id} truck={truck} />
                ))}
              </PeekCarousel>
            ) : (
              <NativeEmptyState
                icon={Truck}
                title="Nobody on the schedule today"
                description="No mobile businesses are operating today. Check the upcoming schedule below."
              />
            )}
          </section>

          <FoodTruckMapSection todayTrucks={todayTrucks} />

          <section aria-labelledby="upcoming-trucks-heading">
            <h2
              id="upcoming-trucks-heading"
              className="mb-3 text-[17px] font-bold tracking-tight text-platform-heading"
            >
              All upcoming
            </h2>
            {upcomingByDate.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingByDate.map(([date, locations]) => (
                  <Card key={date} className="overflow-hidden rounded-2xl border border-black/[0.05] shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                    <CardContent className="p-4 sm:p-5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {formatFoodTruckDateHeading(date)}
                        </span>
                      </div>
                      <div>
                        {locations.map((truck) => (
                          <FoodTruckScheduleItem key={truck.id} truck={truck} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <NativeEmptyState
                icon={CalendarClock}
                title="No upcoming locations"
                description="No upcoming mobile locations are scheduled yet."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
