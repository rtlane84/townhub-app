import { Link } from "wouter";
import type { Event } from "@workspace/api-client-react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function formatEventDate(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function EventRow({ event }: { event: Event }) {
  const subtitle = [formatEventDate(event.date), event.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href="/events"
        className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 transition-colors hover:bg-muted/30 active:scale-[0.995]"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/40">
              <CalendarDays className="h-6 w-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
            {event.title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary">
          View
        </span>
      </Link>
    </li>
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
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}
