import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { format, parseISO } from "date-fns";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, CalendarDays, List } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EventSubmitForm } from "@/components/event-submit-form";
import { NativeEmptyState } from "@/components/native-empty-state";
import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { eventOccursOnDate, toLocalIsoDate } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import { PeekCarousel } from "@/components/peek-carousel";

export default function Events() {
  const searchString = useSearch();
  const query = useMemo(() => {
    const params = new URLSearchParams(
      searchString.startsWith("?") ? searchString.slice(1) : searchString,
    );
    return (params.get("q") ?? params.get("search") ?? "").trim().toLowerCase();
  }, [searchString]);

  const { data: events = [], isLoading } = useListEvents({ upcoming: true });
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    if (!query) return sorted;
    return sorted.filter((event) => {
      const haystack = [
        event.title,
        event.description,
        event.location,
        event.eventType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [events, query]);

  const featured = sortedEvents.filter((e) => e.featured);

  const eventDays = useMemo(() => {
    const days: Date[] = [];
    for (const event of sortedEvents) {
      const endIso = event.endDate?.trim() || event.date;
      let cursor = parseISO(event.date);
      const end = parseISO(endIso);
      while (cursor <= end) {
        days.push(new Date(cursor));
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return days;
  }, [sortedEvents]);

  const selectedDayIso = toLocalIsoDate(selectedDay);
  const eventsOnSelectedDay = useMemo(
    () => sortedEvents.filter((event) => eventOccursOnDate(event, selectedDayIso)),
    [sortedEvents, selectedDayIso],
  );

  return (
    <div className={cn(PAGE_CONTAINER, "bg-background py-6 md:py-8 native-animate-in")}>
      <div className="mb-5 space-y-3">
        <SectionHeader
          title="Community events"
          description={
            query
              ? `Showing events matching “${query}”.`
              : "Upcoming local events around town"
          }
          size="lg"
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full border border-black/[0.08] bg-muted/50 p-0.5"
            role="group"
            aria-label="Events view"
          >
            <Button
              type="button"
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-9 rounded-full px-3"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              data-testid="button-events-view-list"
            >
              <List className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              className="h-9 rounded-full px-3"
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
              data-testid="button-events-view-calendar"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Calendar
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 rounded-full"
            onClick={() => setFormOpen((v) => !v)}
          >
            {formOpen ? "Hide form" : "Submit an event"}
          </Button>
        </div>
      </div>

      {formOpen ? (
        <EventSubmitForm
          onCancel={() => setFormOpen(false)}
          onSubmitted={() => setFormOpen(false)}
        />
      ) : null}

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
          icon={CalendarIcon}
          title={query ? "No matching events" : "No upcoming events"}
          description={
            query
              ? "Try a different search, or browse all upcoming events."
              : "Check back soon for new community events — or submit one for review."
          }
          centered
        />
      ) : viewMode === "calendar" ? (
        <div className="space-y-5" data-testid="events-calendar-view">
          <div className="shrink-0 rounded-[1.25rem] border border-black/[0.06] bg-card p-3 shadow-sm sm:p-4">
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={(day) => {
                if (day) setSelectedDay(day);
              }}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{
                hasEvent:
                  "relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[selected-single=true]:after:bg-primary-foreground",
              }}
              className="mx-auto w-full shrink-0"
            />
          </div>
          <section aria-labelledby="events-on-day-heading">
            <h2
              id="events-on-day-heading"
              className="mb-3 text-[17px] font-bold tracking-tight text-platform-heading"
            >
              {format(selectedDay, "EEEE, MMM d")}
            </h2>
            {eventsOnSelectedDay.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No events on this day.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {eventsOnSelectedDay.map((event) => (
                  <EventCard key={event.id} event={event} showFeaturedBadge />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          {featured.length > 0 ? (
            <section aria-labelledby="featured-events-heading">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2
                  id="featured-events-heading"
                  className="text-[17px] font-bold tracking-tight text-platform-heading"
                >
                  Featured events
                </h2>
                <button
                  type="button"
                  className="shrink-0 text-[13px] font-semibold text-primary"
                  onClick={() => {
                    document
                      .getElementById("all-events-heading")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View all
                </button>
              </div>
              <PeekCarousel label="Featured events">
                {featured.map((event) => (
                  <EventCard key={event.id} event={event} showFeaturedBadge />
                ))}
              </PeekCarousel>
            </section>
          ) : null}

          <section aria-labelledby="all-events-heading">
            <h2
              id="all-events-heading"
              className="mb-3 text-[17px] font-bold tracking-tight text-platform-heading"
            >
              All events
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} showFeaturedBadge />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
