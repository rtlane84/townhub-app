import type { Event } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EventListRow } from "@/components/event-list-row";

type HomeFeaturedEventsProps = {
  events: Event[];
  pending?: boolean;
};

function FeaturedEventsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5"
        >
          <Skeleton className="h-[3.75rem] w-20 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HomeFeaturedEvents({
  events,
  pending = false,
}: HomeFeaturedEventsProps) {
  if (pending && events.length === 0) {
    return <FeaturedEventsSkeleton />;
  }

  if (events.length === 0) return null;

  return (
    <ul className={cn("space-y-2.5")}>
      {events.map((event) => (
        <EventListRow key={event.id} event={event} href="/events" />
      ))}
    </ul>
  );
}
