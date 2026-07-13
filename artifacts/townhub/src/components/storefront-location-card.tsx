import type { FoodTruckLocation } from "@workspace/api-client-react";
import { formatTimeRange12h } from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  type StorefrontPresence,
} from "@/lib/storefront-presence";
import { MapPin, Navigation, Truck } from "lucide-react";

type StorefrontLocationCardProps = {
  presence: StorefrontPresence;
  address?: string | null;
  upcomingLocations: FoodTruckLocation[];
  todayIso: string;
  stopsAnchorId?: string;
};

export function StorefrontLocationCard({
  presence,
  address,
  upcomingLocations,
  todayIso,
  stopsAnchorId = "upcoming-stops",
}: StorefrontLocationCardProps) {
  const trimmed = address?.trim() || null;

  return (
    <section
      className="min-w-0 rounded-[1.15rem] border border-black/[0.05] bg-card p-3 shadow-sm sm:p-4"
      aria-labelledby="storefront-location-heading"
    >
      <h2
        id="storefront-location-heading"
        className="mb-2 flex items-center gap-1 text-[13px] font-bold tracking-tight text-platform-heading sm:mb-3 sm:gap-1.5 sm:text-[15px]"
      >
        <MapPin className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" aria-hidden />
        Location
      </h2>

      {presence === "mobile" ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Truck className="h-4 w-4 text-primary" aria-hidden />
            Mobile business
          </p>
          {upcomingLocations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Next stop</p>
              {upcomingLocations.slice(0, 3).map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-xl border border-black/[0.05] bg-muted/40 px-3 py-2.5 text-xs"
                >
                  <p className="font-semibold text-foreground">
                    {loc.locationName}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    {loc.locationDate === todayIso ? (
                      <span className="font-medium text-primary">Today</span>
                    ) : (
                      loc.locationDate
                    )}
                    {formatTimeRange12h(loc.startTime, loc.endTime)
                      ? ` · ${formatTimeRange12h(loc.startTime, loc.endTime)}`
                      : ""}
                  </p>
                  {loc.address ? (
                    <p className="mt-0.5 text-muted-foreground">{loc.address}</p>
                  ) : null}
                </div>
              ))}
              <a
                href={`#${stopsAnchorId}`}
                className="inline-flex text-[12px] font-semibold text-primary"
              >
                View all upcoming stops
              </a>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No upcoming stops are posted yet.
            </p>
          )}
        </div>
      ) : presence === "online" ? (
        <div>
          <p className="text-sm font-semibold text-foreground">Online business</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            This business does not list a public storefront.
          </p>
        </div>
      ) : trimmed ? (
        <div className="space-y-3">
          {/* Address present; no coordinates in data model — never render a broken map */}
          <div className="flex items-start gap-2">
            <a
              href={googleMapsSearchUrl(trimmed)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm leading-snug text-foreground/90 transition-colors hover:text-primary"
            >
              {trimmed}
            </a>
          </div>
          <Button asChild size="sm" variant="outline" className="h-9 rounded-full">
            <a
              href={googleMapsDirectionsUrl(trimmed)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Directions
            </a>
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-foreground">
            Location not provided
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Contact the business for location details.
          </p>
        </div>
      )}
    </section>
  );
}
