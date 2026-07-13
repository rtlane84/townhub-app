import { useMemo, useRef, useState, type ComponentProps, type TouchEvent } from "react";
import { addMonths, format, isSameMonth, isToday } from "date-fns";
import type { Event } from "@workspace/api-client-react";
import { DayButton, getDefaultClassNames } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  buildEventDayIndicators,
  eventDotClass,
  type DayEventIndicators,
} from "@/lib/event-calendar";
import { toLocalIsoDate } from "@/lib/event-dates";
import { cn } from "@/lib/utils";

type EventsCalendarProps = {
  events: Event[];
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  className?: string;
};

const SWIPE_THRESHOLD_PX = 56;

function EventsDayButton({
  className,
  day,
  modifiers,
  indicators,
  ...props
}: ComponentProps<typeof DayButton> & {
  indicators: Map<string, DayEventIndicators>;
}) {
  const defaultClassNames = getDefaultClassNames();
  const iso = toLocalIsoDate(day.date);
  const dayIndicators = indicators.get(iso);
  const selected = Boolean(modifiers.selected);
  const today = Boolean(modifiers.today);
  const outside = Boolean(modifiers.outside);
  const { children: _children, ...buttonProps } = props;

  return (
    <button
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={selected || undefined}
      data-today={today || undefined}
      data-outside={outside || undefined}
      className={cn(
        defaultClassNames.day,
        "relative flex h-[--cell-size] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full p-0 text-[15px] font-medium leading-none transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        outside && "text-muted-foreground/40",
        today && !selected && "font-semibold text-primary",
        selected &&
          "bg-[var(--platform-heading,#1e3a5f)] text-white hover:bg-[var(--platform-heading,#1e3a5f)]",
        selected && today && "ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
        className,
      )}
      {...buttonProps}
    >
      <span className="relative z-[1] flex h-8 w-8 items-center justify-center rounded-full">
        {format(day.date, "d")}
      </span>
      {dayIndicators && dayIndicators.count > 0 ? (
        <span
          className="absolute bottom-[3px] left-1/2 z-[1] flex -translate-x-1/2 items-center gap-[3px]"
          aria-hidden
        >
          {dayIndicators.types.slice(0, 3).map((type) => (
            <span
              key={type}
              className={cn(
                "h-[5px] w-[5px] rounded-full",
                selected ? "bg-white/90" : eventDotClass(type),
              )}
            />
          ))}
        </span>
      ) : (
        <span className="absolute bottom-[3px] h-[5px]" aria-hidden />
      )}
    </button>
  );
}

export function EventsCalendar({
  events,
  selectedDay,
  onSelectDay,
  className,
}: EventsCalendarProps) {
  const [month, setMonth] = useState<Date>(() => selectedDay);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const indicators = useMemo(() => buildEventDayIndicators(events), [events]);
  const onToday =
    isToday(selectedDay) && isSameMonth(month, selectedDay);

  function goToMonth(next: Date) {
    setMonth(next);
  }

  function jumpToToday() {
    const today = new Date();
    setMonth(today);
    onSelectDay(today);
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.4) return;
    goToMonth(addMonths(month, dx < 0 ? 1 : -1));
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-card shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]",
        className,
      )}
      data-testid="events-calendar"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full bg-muted/60 text-foreground hover:bg-muted"
          onClick={() => goToMonth(addMonths(month, -1))}
          aria-label="Previous month"
          data-testid="button-events-prev-month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[17px] font-semibold tracking-tight text-platform-heading">
            {format(month, "MMMM yyyy")}
          </p>
          {onToday ? (
            <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">Today</p>
          ) : (
            <button
              type="button"
              className="mt-0.5 text-[12px] font-semibold text-primary"
              onClick={jumpToToday}
            >
              Today
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full bg-muted/60 text-foreground hover:bg-muted"
          onClick={() => goToMonth(addMonths(month, 1))}
          aria-label="Next month"
          data-testid="button-events-next-month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        selected={selectedDay}
        onSelect={(day) => {
          if (!day) return;
          onSelectDay(day);
          if (!isSameMonth(day, month)) setMonth(day);
        }}
        showOutsideDays
        className="w-full bg-transparent px-1 pb-3 pt-1 sm:px-2 [--cell-size:2.85rem] sm:[--cell-size:3rem]"
        classNames={{
          months: "relative flex w-full flex-col",
          month: "flex w-full flex-col gap-1",
          nav: "hidden",
          month_caption: "hidden",
          weekdays: "mb-1 flex w-full",
          weekday:
            "text-muted-foreground/80 flex-1 select-none text-center text-[11px] font-semibold uppercase tracking-[0.08em]",
          week: "mt-0.5 flex w-full",
          day: "relative flex flex-1 items-center justify-center p-0",
          today: "bg-transparent",
          outside: "opacity-100",
        }}
        formatters={{
          formatWeekdayName: (date) => format(date, "EEEEE"),
        }}
        components={{
          DayButton: (props) => (
            <EventsDayButton {...props} indicators={indicators} />
          ),
        }}
      />
    </div>
  );
}
