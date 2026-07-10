import type { Event } from "@workspace/api-client-react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventSchedule } from "@/lib/event-dates";

export const EVENT_TYPE_COLORS: Record<string, string> = {
  COMMUNITY: "bg-blue-100 text-blue-700",
  FOOD_TRUCK: "bg-orange-100 text-orange-700",
  SEASONAL: "bg-green-100 text-green-700",
  SALE: "bg-red-100 text-red-700",
  HOLIDAY: "bg-purple-100 text-purple-700",
  MARKET: "bg-amber-100 text-amber-700",
  OTHER: "bg-gray-100 text-gray-700",
};

interface EventCardProps {
  event: Event;
  showFeaturedBadge?: boolean;
}

export function EventCard({ event, showFeaturedBadge = false }: EventCardProps) {
  return (
    <Card className="border-border/50 overflow-hidden h-full">
      {event.imageUrl && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER}`}
          >
            {event.eventType.replace("_", " ")}
          </span>
          {showFeaturedBadge && event.featured && (
            <Badge variant="secondary" className="text-xs">
              Featured
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2">{event.title}</h3>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatEventSchedule(event)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
