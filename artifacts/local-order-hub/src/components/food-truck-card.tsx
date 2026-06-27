import { Link } from "wouter";
import { Clock, MapPin, Navigation, Store } from "lucide-react";
import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessListingCardMedia } from "@/components/business-logo-badge";
import {
  foodTruckDirectionsUrl,
  foodTruckOrderingEnabled,
  formatFoodTruckTimeWindow,
} from "@/lib/food-truck-utils";

export function FoodTruckTodayCard({ truck }: { truck: FoodTruckLocationWithBusiness }) {
  const timeWindow = formatFoodTruckTimeWindow(truck.startTime, truck.endTime);
  const description = truck.locationNotes?.trim() || truck.businessDescription?.trim();
  const slug = truck.businessSlug ?? String(truck.businessId);
  const businessName = truck.businessName ?? "Food truck";

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/50 shadow-sm">
      <BusinessListingCardMedia
        heroImageUrl={truck.businessHeroImageUrl}
        heroAlt={businessName}
        logoUrl={truck.businessLogoUrl}
        businessName={businessName}
        placeholder={
          <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40">
            <Store className="h-12 w-12" />
          </div>
        }
      />
      <CardContent className="flex flex-1 flex-col px-6 pb-6 pt-10">
        <h3 className="mb-2 font-serif text-xl font-bold text-foreground">{businessName}</h3>
        <div className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0">
            <span>{truck.locationName}</span>
            {truck.address && <p className="mt-0.5 text-xs">{truck.address}</p>}
            {timeWindow && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{timeWindow}</span>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">{description}</p>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          {foodTruckOrderingEnabled(truck) && (
            <Link href={`/businesses/${slug}`}>
              <Button size="sm" className="rounded-full">
                Order
              </Button>
            </Link>
          )}
          <a href={foodTruckDirectionsUrl(truck)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="rounded-full">
              <Navigation className="mr-1.5 h-3.5 w-3.5" />
              Directions
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function FoodTruckScheduleItem({ truck }: { truck: FoodTruckLocationWithBusiness }) {
  const timeWindow = formatFoodTruckTimeWindow(truck.startTime, truck.endTime);
  const slug = truck.businessSlug ?? String(truck.businessId);

  return (
    <div className="flex flex-col gap-2 border-b border-border/40 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link href={`/businesses/${slug}`}>
          <span className="font-medium text-foreground hover:text-primary hover:underline">
            {truck.businessName}
          </span>
        </Link>
        <p className="text-sm text-muted-foreground">{truck.locationName}</p>
        {truck.address && <p className="text-xs text-muted-foreground">{truck.address}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {timeWindow && <p className="text-sm text-muted-foreground">{timeWindow}</p>}
        <a href={foodTruckDirectionsUrl(truck)} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
            <Navigation className="mr-1 h-3 w-3" />
            Directions
          </Button>
        </a>
      </div>
    </div>
  );
}
