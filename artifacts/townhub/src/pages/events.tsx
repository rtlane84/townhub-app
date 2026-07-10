import { useMemo } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar, Loader2 } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { NativeEmptyState } from "@/components/native-empty-state";

export default function Events() {
  const { data: events = [], isLoading } = useListEvents({ upcoming: true });

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 native-animate-in">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2.5">
          <Calendar className="h-6 w-6 text-primary" strokeWidth={1.9} />
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
            Community Events
          </h1>
        </div>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          Upcoming local events around town — including promoted highlights and regular community
          happenings.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedEvents.length === 0 ? (
        <NativeEmptyState
          icon={Calendar}
          title="No upcoming events"
          description="Check back soon for new community events."
          centered
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEvents.map((event) => (
            <EventCard key={event.id} event={event} showFeaturedBadge />
          ))}
        </div>
      )}
    </div>
  );
}
