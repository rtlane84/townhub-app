import { Link } from "wouter";
import { Clock, MapPin, Navigation, Store } from "lucide-react";
import type { FoodTruckLocationWithBusiness } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  foodTruckDirectionsUrl,
  foodTruckOrderingEnabled,
  formatFoodTruckTimeWindow,
} from "@/lib/food-truck-utils";
import { cn } from "@/lib/utils";

export function FoodTruckTodayCard({ truck }: { truck: FoodTruckLocationWithBusiness }) {
  const timeWindow = formatFoodTruckTimeWindow(truck.startTime, truck.endTime);
  const description = truck.locationNotes?.trim() || truck.businessDescription?.trim();
  const slug = truck.businessSlug ?? String(truck.businessId);
  const businessName = truck.businessName ?? "Mobile business";
  const storefrontHref = `/businesses/${slug}`;
  const hero = truck.businessHeroImageUrl || truck.businessLogoUrl;

  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-card shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]">
      <Link href={storefrontHref} className="block min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {hero ? (
            <img
              src={hero}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40">
              <Store className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="space-y-1 px-3 pt-2.5 pb-1">
          <h3 className="truncate text-[14px] font-semibold tracking-tight text-platform-heading">
            {businessName}
          </h3>
          <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="truncate">{truck.locationName}</p>
              {timeWindow ? (
                <p className="mt-0.5 flex items-center gap-1 truncate">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden />
                  <span>{timeWindow}</span>
                </p>
              ) : null}
            </div>
          </div>
          {description ? (
            <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="mt-auto flex flex-wrap gap-2 px-3 pb-3 pt-2">
        <Link href={storefrontHref} className="min-w-0 flex-1">
          <Button size="sm" className="h-9 w-full rounded-full px-4 text-xs">
            {foodTruckOrderingEnabled(truck) ? "Order" : "View"}
          </Button>
        </Link>
        <a
          href={foodTruckDirectionsUrl(truck)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1"
        >
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full rounded-full px-4 text-xs"
          >
            <Navigation className="mr-1 h-3 w-3" aria-hidden />
            Directions
          </Button>
        </a>
      </div>
    </article>
  );
}

export function FoodTruckScheduleItem({ truck }: { truck: FoodTruckLocationWithBusiness }) {
  const timeWindow = formatFoodTruckTimeWindow(truck.startTime, truck.endTime);
  const slug = truck.businessSlug ?? String(truck.businessId);

  return (
    <div className="flex flex-col gap-2 border-b border-border/30 py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link href={`/businesses/${slug}`}>
          <span className="font-semibold tracking-tight text-foreground transition-colors hover:text-primary">
            {truck.businessName}
          </span>
        </Link>
        <p className="mt-0.5 text-sm text-muted-foreground">{truck.locationName}</p>
        {truck.address ? <p className="text-xs text-muted-foreground">{truck.address}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {timeWindow ? <p className="text-sm text-muted-foreground">{timeWindow}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Link href={`/businesses/${slug}`}>
            <Button size="sm" variant="outline" className="h-9 rounded-full px-3.5 text-xs">
              View
            </Button>
          </Link>
          <a href={foodTruckDirectionsUrl(truck)} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-9 rounded-full px-3.5 text-xs">
              <Navigation className="mr-1 h-3 w-3" />
              Directions
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
