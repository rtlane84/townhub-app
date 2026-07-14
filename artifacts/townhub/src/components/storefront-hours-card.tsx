import { Clock, Phone } from "lucide-react";
import {
  DAY_LABELS,
  formatTime12h,
  formatTimeRange12h,
  hasOpenHours,
  isOpenNow,
  normalizeWeeklyHours,
  parseStructuredHours,
} from "@workspace/api-zod";
import type { BusinessDayHours, FoodTruckLocation } from "@workspace/api-client-react";
import type { StorefrontStatusLine } from "@/lib/business-listing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StorefrontHoursCardProps = {
  structuredHours?: BusinessDayHours[] | null;
  fallbackHours?: string | null;
  hasHours: boolean;
  phone?: string | null;
  accentClassName?: string;
  /** When true, public mobile-stop availability is the source of truth. */
  isMobileBusiness?: boolean;
  /** Shared public availability (server summary or evaluatePublicAvailability). */
  availability?: StorefrontStatusLine | null;
  /** Active/upcoming stops for a compact today schedule (mobile only). */
  mobileStops?: FoodTruckLocation[];
  todayIso?: string;
};

export function StorefrontHoursCard({
  structuredHours,
  fallbackHours,
  hasHours,
  phone,
  isMobileBusiness = false,
  availability = null,
  mobileStops = [],
  todayIso,
}: StorefrontHoursCardProps) {
  const phoneHref = phone?.trim()
    ? `tel:${phone.replace(/[^\d+]/g, "")}`
    : null;

  if (isMobileBusiness) {
    const todayStops = todayIso
      ? mobileStops.filter(
          (stop) => stop.isActive !== false && stop.locationDate === todayIso,
        )
      : [];
    const isHere = availability?.isOpen === true;

    return (
      <section
        className="min-w-0 rounded-[1.15rem] border border-black/[0.05] bg-card p-3 shadow-sm sm:p-4"
        aria-labelledby="storefront-hours-heading"
      >
        <div className="mb-2 flex items-center justify-between gap-1 sm:mb-3 sm:gap-2">
          <h2
            id="storefront-hours-heading"
            className="flex items-center gap-1 text-[13px] font-bold tracking-tight text-platform-heading sm:gap-1.5 sm:text-[15px]"
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" aria-hidden />
            Hours
          </h2>
          {isHere ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 sm:px-2 sm:text-[11px]">
              Here now
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          {availability ? (
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-sm font-semibold leading-snug",
                  isHere ? "text-emerald-700" : "text-foreground",
                )}
              >
                {availability.statusLabel}
              </p>
              {availability.scheduleLabel ? (
                <p
                  className={cn(
                    "text-xs font-medium leading-snug",
                    isHere ? "text-emerald-700/90" : "text-muted-foreground",
                  )}
                >
                  {availability.scheduleLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">
                Not currently at a scheduled stop
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Check the location card for upcoming stops.
              </p>
            </div>
          )}

          {todayStops.length > 0 ? (
            <ul className="space-y-1.5">
              {todayStops.map((stop) => {
                const window = formatTimeRange12h(stop.startTime, stop.endTime);
                return (
                  <li
                    key={stop.id}
                    className="rounded-lg bg-muted/40 px-2.5 py-2 text-[11px] leading-snug"
                  >
                    <p className="font-semibold text-foreground">{stop.locationName}</p>
                    {window ? (
                      <p className="mt-0.5 text-muted-foreground">{window}</p>
                    ) : (
                      <p className="mt-0.5 text-muted-foreground">Today</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!availability?.isOpen && phoneHref ? (
            <Button asChild size="sm" className="h-9 rounded-full px-4">
              <a href={phoneHref}>
                <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Call
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  const parsed = Array.isArray(structuredHours)
    ? normalizeWeeklyHours(structuredHours)
    : parseStructuredHours(structuredHours);
  const todayIndex = new Date().getDay();
  const openNow =
    parsed && hasOpenHours(parsed) ? isOpenNow(parsed) : null;

  return (
    <section
      className="min-w-0 rounded-[1.15rem] border border-black/[0.05] bg-card p-3 shadow-sm sm:p-4"
      aria-labelledby="storefront-hours-heading"
    >
      <div className="mb-2 flex items-center justify-between gap-1 sm:mb-3 sm:gap-2">
        <h2
          id="storefront-hours-heading"
          className="flex items-center gap-1 text-[13px] font-bold tracking-tight text-platform-heading sm:gap-1.5 sm:text-[15px]"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" aria-hidden />
          Hours
        </h2>
        {openNow !== null ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:px-2 sm:text-[11px]",
              openNow
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            )}
          >
            {openNow ? "Open now" : "Closed now"}
          </span>
        ) : null}
      </div>

      {!hasHours ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Hours not provided
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Contact the business directly to confirm availability.
            </p>
          </div>
          {phoneHref ? (
            <Button asChild size="sm" className="h-9 rounded-full px-4">
              <a href={phoneHref}>
                <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Call
              </a>
            </Button>
          ) : null}
        </div>
      ) : parsed?.length ? (
        <ul className="space-y-1 sm:space-y-1.5">
          {parsed.map((day) => {
            const isToday = day.dayOfWeek === todayIndex;
            const closed = day.isClosed || !day.openTime || !day.closeTime;
            return (
              <li
                key={day.dayOfWeek}
                className={cn(
                  "flex items-baseline justify-between gap-1.5 text-[10px] sm:gap-3 sm:text-[12px]",
                  isToday && "font-semibold text-foreground",
                  !isToday && "text-muted-foreground",
                )}
              >
                <span className={cn(isToday && "text-platform-heading")}>
                  {DAY_LABELS[day.dayOfWeek]}
                </span>
                <span
                  className={cn(
                    "text-right tabular-nums",
                    closed && isToday && "text-red-600",
                    closed && !isToday && "text-muted-foreground",
                    !closed && isToday && "text-foreground",
                  )}
                >
                  {closed
                    ? "Closed"
                    : `${formatTime12h(day.openTime!)} – ${formatTime12h(day.closeTime!)}`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="whitespace-pre-line text-[12px] leading-relaxed text-foreground/80">
          {fallbackHours}
        </p>
      )}
    </section>
  );
}
