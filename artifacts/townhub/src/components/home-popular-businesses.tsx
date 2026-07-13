import { Link } from "wouter";
import type { Business } from "@workspace/api-client-react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeEmptyState } from "@/components/native-empty-state";
import {
  getBusinessCategoryLine,
  getBusinessListingCta,
  getBusinessOpenStatus,
} from "@/lib/business-listing";
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

function BusinessRow({ business }: { business: Business }) {
  const status = getBusinessOpenStatus(business);
  const categoryLine = getBusinessCategoryLine(business);
  const thumb = business.logoUrl || business.heroImageUrl;
  const cta = getBusinessListingCta(business);
  const storefrontHref = `/businesses/${business.slug}`;

  return (
    <li>
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 transition-colors hover:bg-muted/30">
        <Link href={storefrontHref} className="shrink-0">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-muted">
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
        </Link>

        <Link href={storefrontHref} className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
            {business.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {categoryLine}
          </p>
          {status ? (
            <p
              className={cn(
                "mt-1 text-xs font-semibold",
                status.isOpen ? "text-emerald-600" : "text-red-600",
              )}
            >
              {status.label}
            </p>
          ) : null}
        </Link>

        {cta ? (
          cta.external ? (
            <a
              href={cta.href}
              className="shrink-0 rounded-full border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {cta.label}
            </a>
          ) : (
            <Link
              href={cta.href}
              className="shrink-0 rounded-full border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {cta.label}
            </Link>
          )
        ) : null}
      </div>
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
      aria-labelledby="featured-businesses-heading"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2
          id="featured-businesses-heading"
          className="text-lg font-bold tracking-tight text-platform-heading"
        >
          Featured Businesses
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
