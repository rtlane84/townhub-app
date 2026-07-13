import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { format, parseISO } from "date-fns";
import { useSubmitEvent, useListEvents } from "@workspace/api-client-react";
import type { EventSubmitInput } from "@workspace/api-client-react";
import { Calendar as CalendarIcon, CalendarDays, List } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { NativeEmptyState } from "@/components/native-empty-state";
import { SectionHeader } from "@/components/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { eventOccursOnDate, toLocalIsoDate } from "@/lib/event-dates";
import { cn } from "@/lib/utils";
import { TimeRangePicker } from "@/components/time-picker";
import { PeekCarousel } from "@/components/peek-carousel";

const EVENT_TYPES = [
  { value: "COMMUNITY", label: "Community" },
  { value: "FOOD_TRUCK", label: "Food Truck" },
  { value: "SEASONAL", label: "Seasonal" },
  { value: "SALE", label: "Sale" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "MARKET", label: "Market" },
  { value: "OTHER", label: "Other" },
] as const;

const BLANK_SUBMIT: EventSubmitInput = {
  title: "",
  date: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  eventType: "COMMUNITY",
  submitterName: "",
  submitterEmail: "",
  website: "",
};

export default function Events() {
  const searchString = useSearch();
  const { toast } = useToast();
  const query = useMemo(() => {
    const params = new URLSearchParams(
      searchString.startsWith("?") ? searchString.slice(1) : searchString,
    );
    return (params.get("q") ?? params.get("search") ?? "").trim().toLowerCase();
  }, [searchString]);

  const { data: events = [], isLoading } = useListEvents({ upcoming: true });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventSubmitInput>({ ...BLANK_SUBMIT });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  const submitEvent = useSubmitEvent({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Event submitted",
          description: "Thanks! An admin will review it before it appears on the calendar.",
        });
        setForm({ ...BLANK_SUBMIT });
        setFormOpen(false);
      },
      onError: () =>
        toast({
          title: "Couldn’t submit event",
          description: "Please check the form and try again.",
          variant: "destructive",
        }),
    },
  });

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title?.trim() || !form.date) {
      toast({ title: "Title and date are required", variant: "destructive" });
      return;
    }
    if (form.endDate && form.endDate < form.date) {
      toast({
        title: "End date must be on or after the start date",
        variant: "destructive",
      });
      return;
    }

    submitEvent.mutate({
      data: {
        title: form.title.trim(),
        date: form.date,
        endDate: form.endDate || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location?.trim() || undefined,
        description: form.description?.trim() || undefined,
        eventType: form.eventType || "COMMUNITY",
        submitterName: form.submitterName?.trim() || undefined,
        submitterEmail: form.submitterEmail?.trim() || undefined,
        website: form.website || "",
      },
    });
  }

  return (
    <div className={cn(PAGE_CONTAINER, "bg-background py-6 md:py-8 native-animate-in")}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <SectionHeader
          title="Community events"
          description={
            query
              ? `Showing events matching “${query}”.`
              : "Upcoming local events around town"
          }
          size="lg"
          className="mb-0 min-w-0 flex-1"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            className="shrink-0"
            onClick={() => setFormOpen((v) => !v)}
          >
            {formOpen ? "Hide form" : "Submit an event"}
          </Button>
        </div>
      </div>

      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="relative mb-8 min-w-0 space-y-4 overflow-x-hidden rounded-[1.5rem] border border-black/[0.08] bg-muted/40 p-4 shadow-sm sm:p-6"
          noValidate
        >
          <div>
            <h2 className="font-serif text-xl font-semibold text-platform-heading">
              Submit an event
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share a community happening. Submissions are reviewed before they appear publicly.
            </p>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium">Event title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Farmers Market"
                required
                className="h-11"
              />
            </div>

            <div className="min-w-0 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">Start date *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                  className="h-11"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">End date</label>
                <Input
                  type="date"
                  value={form.endDate ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  min={form.date || undefined}
                  className="h-11"
                />
              </div>
            </div>

            <TimeRangePicker
              startValue={form.startTime ?? ""}
              endValue={form.endTime ?? ""}
              onStartChange={(startTime) => setForm((p) => ({ ...p, startTime }))}
              onEndChange={(endTime) => setForm((p) => ({ ...p, endTime }))}
              startLabel="Start time"
              endLabel="End time"
              showFriendlyHint={false}
            />

            <div className="min-w-0 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">Type</label>
                <Select
                  value={form.eventType ?? "COMMUNITY"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      eventType: v as EventSubmitInput["eventType"],
                    }))
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">Location</label>
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Town Square"
                  className="h-11"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-medium">Description</label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="What should people know?"
                className="min-h-[4.5rem]"
              />
            </div>

            <div className="min-w-0 space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">Your name</label>
                <Input
                  value={form.submitterName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, submitterName: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-sm font-medium">Your email</label>
                <Input
                  type="email"
                  value={form.submitterEmail ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, submitterEmail: e.target.value }))}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Honeypot — hidden from people, filled by some bots */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <LoadingButton type="submit" loading={submitEvent.isPending} loadingText="Submitting…">
              Submit for review
            </LoadingButton>
          </div>
        </form>
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
                  "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
              }}
              className="mx-auto w-full max-w-none shrink-0 [--cell-size:2.35rem] sm:[--cell-size:2.5rem]"
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
