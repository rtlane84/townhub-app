import { useMemo } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar, Loader2 } from "lucide-react";
import { EventCard } from "@/components/event-card";

export default function Events() {
  const { data: events = [], isLoading } = useListEvents({ upcoming: true });

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-serif font-bold text-foreground">Community Events</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Upcoming local events around town — including promoted highlights and regular community
          happenings.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium text-foreground">No upcoming events</h2>
          <p className="text-muted-foreground mt-1">Check back soon for new community events.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedEvents.map((event) => (
            <EventCard key={event.id} event={event} showFeaturedBadge />
          ))}
        </div>
      )}
    </div>
  );
}
