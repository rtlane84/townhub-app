import { useMemo } from "react";
import {
  useListTodayFoodTrucks,
  useListUpcomingFoodTrucks,
  getListTodayFoodTrucksQueryKey,
  getListUpcomingFoodTrucksQueryKey,
} from "@workspace/api-client-react";
import { Loader2, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FoodTruckScheduleItem, FoodTruckTodayCard } from "@/components/food-truck-card";
import { FoodTruckMapSection } from "@/components/food-truck-map";
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
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-serif font-bold text-foreground">Food Trucks Around Town</h1>
        </div>
        <p className="max-w-2xl text-muted-foreground">
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
            <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Today&apos;s Trucks</h2>
            {todayTrucks.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {todayTrucks.map((truck) => (
                  <FoodTruckTodayCard key={truck.id} truck={truck} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
                <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
                <p className="font-medium text-foreground">No food trucks are operating today.</p>
              </div>
            )}
          </section>

          <FoodTruckMapSection todayTrucks={todayTrucks} />

          <section>
            <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Upcoming Schedule</h2>
            {upcomingByDate.length > 0 ? (
              <div className="space-y-6">
                {upcomingByDate.map(([date, locations]) => (
                  <Card key={date} className="border-border/50 shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">
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
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-12 text-center">
                <p className="text-muted-foreground">No upcoming food truck locations scheduled.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
