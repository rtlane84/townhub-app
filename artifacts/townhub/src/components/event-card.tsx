import type { Event } from "@workspace/api-client-react";
import { Calendar, CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEventSchedule } from "@/lib/event-dates";
import { truncateEventDescription } from "@/lib/event-description";
import { cn } from "@/lib/utils";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { CARD_IMAGE_WIDTHS } from "@/lib/optimized-image";

export const EVENT_TYPE_COLORS: Record<string, string> = {
  COMMUNITY: "bg-blue-500/10 text-blue-700",
  FOOD_TRUCK: "bg-orange-500/10 text-orange-700",
  SEASONAL: "bg-emerald-500/10 text-emerald-700",
  SALE: "bg-rose-500/10 text-rose-700",
  HOLIDAY: "bg-violet-500/10 text-violet-700",
  MARKET: "bg-amber-500/10 text-amber-800",
  OTHER: "bg-muted text-muted-foreground",
};

interface EventCardProps {
  event: Event;
  showFeaturedBadge?: boolean;
  priority?: boolean;
  /**
   * Featured-carousel layout: always shows the 4:3 media area (placeholder
   * when no image) so slides align; outer height equalizes via slide stretch.
   */
  uniform?: boolean;
}

export function EventCard({
  event,
  showFeaturedBadge = false,
  priority = false,
  uniform = false,
}: EventCardProps) {
  const schedule = formatEventSchedule(event);
  const datePill = schedule.split("·")[0]?.trim() || schedule;
  const descriptionPreview = truncateEventDescription(event.description);

  const media = (
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted">
      {event.imageUrl ? (
        <OptimizedMediaImage
          src={event.imageUrl}
          widths={CARD_IMAGE_WIDTHS}
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 40vw, 72vw"
          priority={priority}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40">
          <CalendarDays className="h-10 w-10" aria-hidden />
        </div>
      )}
      <div className="absolute left-2.5 top-2.5">
        <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-platform-heading shadow-sm backdrop-blur-sm">
          {datePill}
        </span>
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-card",
        "shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]",
      )}
      data-testid={`event-card-${event.id}`}
    >
      {uniform ? media : event.imageUrl ? media : null}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col p-3.5",
          !uniform && !event.imageUrl && "pt-3.5",
        )}
      >
        {/* Single-line badge row — avoid wrap height differences across cards. */}
        <div className="mb-2 flex min-h-[1.375rem] flex-nowrap items-center gap-1.5 overflow-hidden">
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER,
            )}
          >
            {event.eventType.replace("_", " ")}
          </span>
          {showFeaturedBadge && event.featured ? (
            <Badge variant="soft" className="shrink-0 text-[11px]">
              Featured
            </Badge>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-platform-heading">
          {event.title}
        </h3>
        <div className="mt-1.5 space-y-1 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{schedule}</span>
          </div>
          {event.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </div>
          ) : null}
        </div>
        {descriptionPreview ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {descriptionPreview}
          </p>
        ) : null}
      </div>
    </article>
  );
}
