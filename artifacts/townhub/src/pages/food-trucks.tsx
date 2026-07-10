import { useMemo } from "react";
import {
  useListTodayFoodTrucks,
  useListUpcomingFoodTrucks,
  getListTodayFoodTrucksQueryKey,
  getListUpcomingFoodTrucksQueryKey,
} from "@workspace/api-client-react";
import { CalendarClock, Loader2, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FoodTruckScheduleItem, FoodTruckTodayCard } from "@/components/food-truck-card";
import { FoodTruckMapSection } from "@/components/food-truck-map";
import { NativeEmptyState } from "@/components/native-empty-state";
import { formatFoodTruckDateHeading, groupFoodTrucksByDate } from "@/lib/food-truck-utils";

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
    <div className="container mx-auto max-w-7xl px-4 py-8 native-animate-in">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2.5">
          <Truck className="h-6 w-6 text-primary" strokeWidth={1.9} />
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            Food Trucks Around Town
          </h1>
        </div>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          See who&apos;s serving today and where to find them.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <h2 className="mb-5 font-serif text-2xl font-bold tracking-tight text-foreground">
              Today&apos;s Trucks
            </h2>
            {todayTrucks.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="mb-5 font-serif text-2xl font-bold tracking-tight text-foreground">
              Upcoming Schedule
            </h2>
            {upcomingByDate.length > 0 ? (
              <div className="space-y-5">
                {upcomingByDate.map(([date, locations]) => (
                  <Card key={date} className="border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)]">
                    <CardContent className="p-6">
                      <h3 className="mb-3 font-serif text-lg font-semibold text-foreground">
                        {formatFoodTruckDateHeading(date)}
                      </h3>
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
