import { lazy, Suspense, useMemo } from "react";
import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getMappableFoodTrucks } from "@/lib/food-truck-utils";
import { getFoodTruckMapEmptyMessage } from "@/lib/food-truck-location-form";

const FoodTruckMapCanvas = lazy(() => import("./food-truck-map-canvas"));

function MapLoadingFallback() {
  return (
    <div className="flex h-[min(420px,60vh)] w-full items-center justify-center rounded-xl border border-border/50 bg-muted/20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading map" />
    </div>
  );
}

type FoodTruckMapSectionProps = {
  todayTrucks: FoodTruckLocationWithBusiness[];
};

export function FoodTruckMapSection({ todayTrucks }: FoodTruckMapSectionProps) {
  const mappableTrucks = useMemo(() => getMappableFoodTrucks(todayTrucks), [todayTrucks]);
  const emptyMessage = getFoodTruckMapEmptyMessage(todayTrucks.length);

  return (
    <section>
      <h2 className="mb-6 font-serif text-2xl font-bold text-foreground">Today&apos;s Map</h2>
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5">
          {mappableTrucks.length > 0 ? (
            <Suspense fallback={<MapLoadingFallback />}>
              <FoodTruckMapCanvas trucks={mappableTrucks} />
            </Suspense>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
              <p className="font-medium text-foreground">{emptyMessage.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyMessage.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
