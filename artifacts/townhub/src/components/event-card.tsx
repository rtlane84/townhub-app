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
    <Card className="h-full overflow-hidden border-0 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.08)] transition-transform duration-200 native-pressable">
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
      <CardContent className="p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENT_TYPE_COLORS[event.eventType] ?? EVENT_TYPE_COLORS.OTHER}`}
          >
            {event.eventType.replace("_", " ")}
          </span>
          {showFeaturedBadge && event.featured && (
            <Badge variant="secondary" className="text-xs">
              Featured
            </Badge>
          )}
        </div>
        <h3 className="mb-2 line-clamp-2 text-base font-semibold tracking-tight text-foreground">{event.title}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatEventSchedule(event)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        {event.description && (
          <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
