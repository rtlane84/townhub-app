import { useMemo } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { NativeEmptyState } from "@/components/native-empty-state";
import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function Events() {
  const { data: events = [], isLoading } = useListEvents({ upcoming: true });

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const featured = sortedEvents.filter((e) => e.featured);
  const rest = sortedEvents.filter((e) => !e.featured);

  return (
    <div className={cn(PAGE_CONTAINER, "py-8 md:py-10 native-animate-in")}>
      <SectionHeader
        title="Community events"
        description="Upcoming local events around town — including promoted highlights and regular community happenings."
        size="lg"
        className="mb-8"
        icon={<Calendar className="h-4 w-4" />}
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[16/10] w-full rounded-[1.75rem]" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : sortedEvents.length === 0 ? (
        <NativeEmptyState
          icon={Calendar}
          title="No upcoming events"
          description="Check back soon for new community events."
          centered
        />
      ) : (
        <div className="space-y-12">
          {featured.length > 0 ? (
            <section>
              <SectionHeader title="Featured" size="sm" className="mb-5" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((event) => (
                  <EventCard key={event.id} event={event} showFeaturedBadge />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {featured.length > 0 ? (
              <SectionHeader title="All upcoming" size="sm" className="mb-5" />
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(featured.length > 0 ? rest : sortedEvents).map((event) => (
                <EventCard key={event.id} event={event} showFeaturedBadge />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
