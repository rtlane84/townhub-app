import { Link } from "wouter";
import type { Event } from "@workspace/api-client-react";
import { CalendarDays, MapPin } from "lucide-react";
import { formatEventSchedule } from "@/lib/event-dates";
import { truncateEventDescription } from "@/lib/event-description";
import { cn } from "@/lib/utils";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { THUMBNAIL_IMAGE_WIDTHS } from "@/lib/optimized-image";

type EventListRowProps = {
  event: Event;
  /** When set, the row is a link. Homepage uses `/events`. */
  href?: string;
  className?: string;
  priority?: boolean;
};

/**
 * Compact white-card event row: fixed 4:3 rectangular thumbnail + title,
 * date/time schedule, and optional location. Used on homepage featured
 * events and the events-page All events list.
 */
export function EventListRow({
  event,
  href,
  className,
  priority = false,
}: EventListRowProps) {
  const schedule = formatEventSchedule(event);
  const descriptionPreview = truncateEventDescription(event.description);

  const body = (
    <>
      <div className="relative h-[3.75rem] w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        {event.imageUrl ? (
          <OptimizedMediaImage
            src={event.imageUrl}
            widths={THUMBNAIL_IMAGE_WIDTHS}
            sizes="80px"
            priority={priority}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/40">
            <CalendarDays className="h-6 w-6" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
          {event.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {schedule}
        </p>
        {event.location ? (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{event.location}</span>
          </p>
        ) : null}
        {descriptionPreview ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/90">
            {descriptionPreview}
          </p>
        ) : null}
      </div>
    </>
  );

  const shellClass = cn(
    "flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]",
    href && "transition-colors hover:bg-muted/30 active:scale-[0.995]",
    className,
  );

  if (href) {
    return (
      <li data-testid={`event-row-${event.id}`}>
        <Link href={href} className={shellClass}>
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li data-testid={`event-row-${event.id}`}>
      <div className={shellClass}>{body}</div>
    </li>
  );
}
