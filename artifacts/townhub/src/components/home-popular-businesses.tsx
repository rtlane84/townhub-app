import { Link } from "wouter";
import type { Business } from "@workspace/api-client-react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeEmptyState } from "@/components/native-empty-state";
import { BusinessLogoThumb } from "@/components/business-logo-thumb";
import {
  getBusinessCategoryLine,
  getBusinessListingCta,
  getBusinessOpenStatus,
  getBusinessStorefrontBadge,
} from "@/lib/business-listing";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const OPEN_STATUS_CLASS = "text-emerald-700";
const CLOSED_STATUS_CLASS = "text-red-600";

function openStatusClass(isOpen: boolean) {
  return isOpen ? OPEN_STATUS_CLASS : CLOSED_STATUS_CLASS;
}

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
          <Skeleton className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-[0.9rem]" />
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
  const categoryLine = getBusinessCategoryLine(business);
  const openStatus = getBusinessOpenStatus(business);
  const storefrontBadge = getBusinessStorefrontBadge(business);
  const cta = getBusinessListingCta(business);
  const storefrontHref = `/businesses/${business.slug}`;

  return (
    <li>
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 transition-colors hover:bg-muted/30">
        <Link href={storefrontHref} className="shrink-0" aria-label={`View ${business.name}`}>
          <BusinessLogoThumb
            logoUrl={business.logoUrl}
            accentColor={business.accentColor}
            alt=""
            className="h-[4.25rem] w-[4.25rem]"
            rounded="rounded-[0.9rem]"
            sizes="68px"
            framed
          />
        </Link>

        <Link href={storefrontHref} className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
            {business.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {categoryLine}
          </p>
          <div className="mt-1 space-y-0.5 text-xs">
            {/* Status only — no "Opens at…" / "Next stop…" schedule line. */}
            <p
              className={cn(
                "min-h-[1rem] truncate font-semibold leading-4",
                openStatus
                  ? openStatusClass(openStatus.isOpen)
                  : "invisible",
              )}
              aria-hidden={!openStatus}
            >
              {openStatus?.label ?? "Closed"}
            </p>
            {/* Reserve badge line height so rows match with or without Order/Book online. */}
            <p
              className={cn(
                "min-h-[1rem] font-medium leading-4",
                storefrontBadge ? "text-primary" : "invisible",
              )}
              aria-hidden={!storefrontBadge}
            >
              {storefrontBadge ?? "Order online"}
            </p>
          </div>
        </Link>

        {cta ? (
          cta.external ? (
            <Button asChild size="sm" className="h-9 shrink-0 rounded-full px-4 text-xs">
              <a href={cta.href} onClick={(e) => e.stopPropagation()}>
                {cta.label}
              </a>
            </Button>
          ) : (
            <Button asChild size="sm" className="h-9 shrink-0 rounded-full px-4 text-xs">
              <Link href={cta.href} onClick={(e) => e.stopPropagation()}>
                {cta.label}
              </Link>
            </Button>
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
