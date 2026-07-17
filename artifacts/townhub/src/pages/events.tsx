import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { format, isToday } from "date-fns";
import { useListEvents } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, CalendarDays, List, Plus } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EventSubmitForm } from "@/components/event-submit-form";
import { EventsCalendar } from "@/components/events-calendar";
import { NativeEmptyState } from "@/components/native-empty-state";
import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { asArray } from "@/lib/as-array";
import { eventOccursOnDate, toLocalIsoDate } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import { PeekCarousel } from "@/components/peek-carousel";

function EventsViewToggle({
  value,
  onChange,
}: {
  value: "list" | "calendar";
  onChange: (next: "list" | "calendar") => void;
}) {
  return (
    <div
      className="grid h-9 flex-1 grid-cols-2 rounded-[10px] bg-black/[0.06] p-0.5 sm:max-w-[15.5rem]"
      role="group"
      aria-label="Events view"
    >
      {(
        [
          { id: "list" as const, label: "List", icon: List },
          { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            data-testid={`button-events-view-${id}`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2 text-[13px] font-semibold transition-all",
              active
                ? "bg-card text-platform-heading shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function Events() {
  const searchString = useSearch();
  const query = useMemo(() => {
    const params = new URLSearchParams(
      searchString.startsWith("?") ? searchString.slice(1) : searchString,
    );
    return (params.get("q") ?? params.get("search") ?? "").trim().toLowerCase();
  }, [searchString]);

  const { data: eventsData, isLoading } = useListEvents({ upcoming: true });
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const events = asArray(eventsData);

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

  const selectedDayIso = toLocalIsoDate(selectedDay);
  const eventsOnSelectedDay = useMemo(
    () => sortedEvents.filter((event) => eventOccursOnDate(event, selectedDayIso)),
    [sortedEvents, selectedDayIso],
  );

  const selectedDayHeading = isToday(selectedDay)
    ? "Today"
    : format(selectedDay, "EEEE");
  const selectedDaySubheading = format(selectedDay, "MMMM d, yyyy");

  return (
    <div className={cn(PAGE_CONTAINER, "bg-background py-6 md:py-8 native-animate-in")}>
      <SectionHeader
        title="Community events"
        description={
          query
            ? `Showing events matching “${query}”.`
            : "Upcoming local events around town"
        }
        size="lg"
        className="mb-4"
      />

      <div className="mb-5 flex items-center gap-2.5">
        <EventsViewToggle value={viewMode} onChange={setViewMode} />
        <Button
          type="button"
          variant={formOpen ? "secondary" : "outline"}
          className="h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold"
          onClick={() => setFormOpen((v) => !v)}
          data-testid="button-events-submit-toggle"
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          {formOpen ? "Hide" : "Submit Event"}
        </Button>
      </div>

      {formOpen ? (
        <EventSubmitForm
          onCancel={() => setFormOpen(false)}
          onSubmitted={() => setFormOpen(false)}
        />
      ) : null}

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-[22rem] w-full rounded-[1.25rem]" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] w-full rounded-[1.25rem]" />
            ))}
          </div>
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
          action={
            !query ? (
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={() => setFormOpen(true)}
              >
                Submit an event
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "calendar" ? (
        <div className="space-y-5" data-testid="events-calendar-view">
          <EventsCalendar
            events={sortedEvents}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            className="mx-auto w-full max-w-xl md:max-w-2xl"
          />

          <section aria-labelledby="events-on-day-heading" className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {selectedDaySubheading}
                </p>
                <h2
                  id="events-on-day-heading"
                  className="mt-0.5 text-[20px] font-bold tracking-tight text-platform-heading"
                >
                  {selectedDayHeading}
                </h2>
              </div>
              <p className="shrink-0 pb-1 text-[13px] font-medium text-muted-foreground">
                {eventsOnSelectedDay.length === 0
                  ? "No events"
                  : `${eventsOnSelectedDay.length} event${eventsOnSelectedDay.length === 1 ? "" : "s"}`}
              </p>
            </div>

            {eventsOnSelectedDay.length === 0 ? (
              <NativeEmptyState
                icon={CalendarDays}
                title="Nothing on this day"
                description="Pick another day on the calendar, or submit a community event for review."
                className="rounded-[1.25rem] py-10 shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={() => setFormOpen(true)}
                  >
                    Submit an event
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {eventsOnSelectedDay.map((event, index) => (
                  <EventCard key={event.id} event={event} showFeaturedBadge priority={index === 0} />
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
                {featured.map((event, index) => (
                  <EventCard key={event.id} event={event} showFeaturedBadge priority={index === 0} />
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showFeaturedBadge
                  priority={featured.length === 0 && index === 0}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
