import type { Event } from "@workspace/api-client-react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEventSchedule } from "@/lib/event-dates";
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
}

export function EventCard({ event, showFeaturedBadge = false, priority = false }: EventCardProps) {
  const schedule = formatEventSchedule(event);
  const datePill = schedule.split("·")[0]?.trim() || schedule;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-card",
        "shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]",
      )}
      data-testid={`event-card-${event.id}`}
    >
      {event.imageUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <OptimizedMediaImage
            src={event.imageUrl}
            widths={CARD_IMAGE_WIDTHS}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
            priority={priority}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute left-2.5 top-2.5">
            <span className="inline-flex items-center rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-platform-heading shadow-sm backdrop-blur-sm">
              {datePill}
            </span>
          </div>
        </div>
      ) : null}
      <div className={cn("flex flex-1 flex-col p-3.5", !event.imageUrl && "pt-3.5")}>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER,
            )}
          >
            {event.eventType.replace("_", " ")}
          </span>
          {showFeaturedBadge && event.featured ? (
            <Badge variant="soft" className="text-[11px]">
              Featured
            </Badge>
          ) : null}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold tracking-tight text-platform-heading">
          {event.title}
        </h3>
        <div className="mt-2 space-y-1 text-[12px] text-muted-foreground">
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
        {event.description ? (
          <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null}
      </div>
    </article>
  );
}
