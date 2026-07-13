import { Suspense, useMemo } from "react";
import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NativeEmptyState } from "@/components/native-empty-state";
import { getMappableFoodTrucks } from "@/lib/food-truck-utils";
import { getFoodTruckMapEmptyMessage } from "@/lib/food-truck-location-form";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const FoodTruckMapCanvas = lazyWithRetry(() => import("./food-truck-map-canvas"));

function MapLoadingFallback() {
  return (
    <div className="flex h-[min(420px,60vh)] w-full items-center justify-center rounded-[1.25rem] bg-muted/20">
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
      <h2 className="mb-5 font-serif text-2xl font-bold tracking-tight text-platform-heading">
        Today&apos;s Map
      </h2>
      <Card className="border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5">
          {mappableTrucks.length > 0 ? (
            <Suspense fallback={<MapLoadingFallback />}>
              <FoodTruckMapCanvas trucks={mappableTrucks} />
            </Suspense>
          ) : (
            <NativeEmptyState
              icon={MapPin}
              title={emptyMessage.title}
              description={emptyMessage.description}
              className="py-10 shadow-none"
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
