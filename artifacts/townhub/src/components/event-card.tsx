import type { Event } from "@workspace/api-client-react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventSchedule } from "@/lib/event-dates";
import { CARD_INTERACTIVE } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

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
}

export function EventCard({ event, showFeaturedBadge = false }: EventCardProps) {
  const schedule = formatEventSchedule(event);
  const datePill = schedule.split("·")[0]?.trim() || schedule;

  return (
    <Card className={cn("h-full overflow-hidden rounded-[1.75rem]", CARD_INTERACTIVE)}>
      {event.imageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
              {datePill}
            </span>
          </div>
        </div>
      ) : null}
      <CardContent className={cn("p-5", !event.imageUrl && "pt-5")}>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER,
            )}
          >
            {event.eventType.replace("_", " ")}
          </span>
          {showFeaturedBadge && event.featured ? (
            <Badge variant="soft" className="text-xs">
              Featured
            </Badge>
          ) : null}
        </div>
        <h3 className="mb-2 line-clamp-2 font-serif text-lg font-bold tracking-tight text-foreground">
          {event.title}
        </h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {!event.imageUrl ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{schedule}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{schedule}</span>
            </div>
          )}
          {event.location ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          ) : null}
        </div>
        {event.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
