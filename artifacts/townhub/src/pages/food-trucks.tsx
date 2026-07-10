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
    <div className={cn(PAGE_CONTAINER, "py-8 md:py-10 native-animate-in")}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title="Food trucks"
          description="See who's serving today and where to find them."
          size="lg"
          className="mb-0"
          icon={<Truck className="h-4 w-4" />}
        />
        {!isLoading && todayTrucks.length > 0 ? (
          <Badge variant="soft" className="gap-1.5">
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
        <div className="space-y-12">
          <section>
            <SectionHeader title="Today's trucks" size="sm" className="mb-5" />
            {todayTrucks.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {todayTrucks.map((truck) => (
                  <FoodTruckTodayCard key={truck.id} truck={truck} />
                ))}
              </div>
            ) : (
              <NativeEmptyState
                icon={Truck}
                title="No food trucks today"
                description="No food trucks are operating today. Check the upcoming schedule below."
              />
            )}
          </section>

          <FoodTruckMapSection todayTrucks={todayTrucks} />

          <section>
            <SectionHeader title="Upcoming schedule" size="sm" className="mb-5" />
            {upcomingByDate.length > 0 ? (
              <div className="space-y-4">
                {upcomingByDate.map(([date, locations]) => (
                  <Card key={date} className="overflow-hidden rounded-[1.5rem]">
                    <CardContent className="p-5 md:p-6">
                      <div className="mb-3 flex items-center gap-2">
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
                description="No upcoming food truck locations are scheduled yet."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
