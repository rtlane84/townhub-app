import { Link } from "wouter";
import type { Business } from "@workspace/api-client-react";
import {
  formatBusinessTypeLabel,
  formatTime12h,
  hasOpenHours,
  isOpenNow,
  isOrderingStorefrontMode,
  normalizeWeeklyHours,
  parseStructuredHours,
} from "@workspace/api-zod";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeEmptyState } from "@/components/native-empty-state";
import { resolveBusinessHours } from "@/lib/business-hours";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type HomePopularBusinessesProps = {
  businesses: Business[];
  pending: boolean;
  error: boolean;
};

function PopularBusinessesSkeleton({ count = 3 }: { count?: number }) {
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
          <Skeleton className="h-8 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

function openStatusLabel(business: Business): string | null {
  const hours = resolveBusinessHours(business);
  if (!hours.hasHours || !hours.structuredHours) {
    if (business.active === false) return "Closed";
    return null;
  }
  const parsed = Array.isArray(hours.structuredHours)
    ? normalizeWeeklyHours(hours.structuredHours)
    : parseStructuredHours(hours.structuredHours);
  if (!parsed || !hasOpenHours(parsed)) return null;

  const open = isOpenNow(parsed);
  const today = parsed[new Date().getDay()];
  if (open && today?.closeTime) {
    return `Open · Closes ${formatTime12h(today.closeTime)}`;
  }
  if (!open) return "Closed";
  return "Open";
}

function ctaLabelForBusiness(business: Business): string {
  if (isOrderingStorefrontMode(business)) return "Order Now";
  return "View";
}

function BusinessRow({ business }: { business: Business }) {
  const status = openStatusLabel(business);
  const typeLabel = formatBusinessTypeLabel(business.type);
  const thumb = business.logoUrl || business.heroImageUrl;
  const cta = ctaLabelForBusiness(business);

  return (
    <li>
      <Link
        href={`/businesses/${business.slug}`}
        className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 transition-colors hover:bg-muted/30 active:scale-[0.995]"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/40">
              <Store className="h-6 w-6" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
            {business.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {typeLabel}
          </p>
          {status ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status.startsWith("Open")
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              {status}
            </p>
          ) : null}
        </div>

        <span className="shrink-0 rounded-full border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary">
          {cta}
        </span>
      </Link>
    </li>
  );
}

export function HomePopularBusinesses({
  businesses,
  pending,
  error,
}: HomePopularBusinessesProps) {
  return (
    <section
      className="th-fade-up"
      aria-labelledby="popular-businesses-heading"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2
          id="popular-businesses-heading"
          className="text-lg font-bold tracking-tight text-platform-heading"
        >
          Popular Businesses
        </h2>
        <Link
          href="/businesses"
          className="shrink-0 text-[13px] font-semibold text-primary"
        >
          View all
        </Link>
      </div>

      {pending && businesses.length === 0 ? (
        <PopularBusinessesSkeleton />
      ) : error ? (
        <NativeEmptyState
          icon={Store}
          title="Couldn't load businesses"
          description="Please refresh or browse the directory."
          action={
            <Link href="/businesses">
              <Button variant="outline" className="min-h-11 w-full">
                Browse Businesses
              </Button>
            </Link>
          }
        />
      ) : businesses.length > 0 ? (
        <ul className="space-y-2.5">
          {businesses.map((business) => (
            <BusinessRow key={business.id} business={business} />
          ))}
        </ul>
      ) : (
        <NativeEmptyState
          icon={Store}
          title="No featured businesses yet"
          description="Browse the directory to discover local shops."
          action={
            <Link href="/businesses">
              <Button variant="outline" className="min-h-11 w-full">
                Browse Businesses
              </Button>
            </Link>
          }
        />
      )}
    </section>
  );
}
