import { Link } from "wouter";
import type { Business } from "@workspace/api-client-react";
import { Store } from "lucide-react";
import {
  getBusinessCategoryLine,
  getBusinessListingCta,
  getBusinessStorefrontBadge,
  getStorefrontStatusLine,
  type BusinessListingCta,
} from "@/lib/business-listing";
import {
  businessHeroPlaceholderStyle,
  businessIconAccentStyle,
} from "@/lib/theme-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const OPEN_STATUS_CLASS = "text-emerald-600";
const CLOSED_STATUS_CLASS = "text-red-600";

function openStatusClass(isOpen: boolean) {
  return isOpen ? OPEN_STATUS_CLASS : CLOSED_STATUS_CLASS;
}

function BusinessThumb({
  business,
  className,
  rounded = "rounded-xl",
}: {
  business: Business;
  className?: string;
  rounded?: string;
}) {
  const src = business.heroImageUrl || business.logoUrl;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        rounded,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40"
          style={businessHeroPlaceholderStyle(business.accentColor)}
        >
          <Store
            className="h-7 w-7"
            style={businessIconAccentStyle(business.accentColor)}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}

function ListingCtaButton({
  cta,
  className,
}: {
  cta: BusinessListingCta;
  className?: string;
}) {
  const classes = cn("h-9 rounded-full px-4 text-xs", className);

  if (cta.external) {
    return (
      <Button asChild size="sm" className={classes}>
        <a href={cta.href} onClick={(e) => e.stopPropagation()}>
          {cta.label}
        </a>
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className={classes}>
      <Link href={cta.href} onClick={(e) => e.stopPropagation()}>
        {cta.label}
      </Link>
    </Button>
  );
}

export function FeaturedBusinessCard({ business }: { business: Business }) {
  const categoryLine = getBusinessCategoryLine(business);
  const statusLine = getStorefrontStatusLine(business);
  const imageBadge = getBusinessStorefrontBadge(business);
  const cta = getBusinessListingCta(business);
  const hero = business.heroImageUrl || business.logoUrl;
  const storefrontHref = `/businesses/${business.slug}`;

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-card shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]">
      <Link href={storefrontHref} className="block min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {hero ? (
            <img
              src={hero}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40"
              style={businessHeroPlaceholderStyle(business.accentColor)}
            >
              <Store
                className="h-10 w-10"
                style={businessIconAccentStyle(business.accentColor)}
                aria-hidden
              />
            </div>
          )}
          {imageBadge ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-platform-heading shadow-sm">
              {imageBadge}
            </span>
          ) : null}
        </div>
        <div className="space-y-1 px-3 pt-2.5 pb-1">
          <h3 className="truncate text-[14px] font-semibold tracking-tight text-platform-heading">
            {business.name}
          </h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {categoryLine}
          </p>
          {statusLine ? (
            <div className="space-y-0.5">
              <p
                className={cn(
                  "text-[11px] font-semibold leading-snug",
                  openStatusClass(statusLine.isOpen),
                )}
              >
                {statusLine.statusLabel}
              </p>
              {statusLine.scheduleLabel ? (
                <p
                  className={cn(
                    "text-[10px] font-medium leading-snug",
                    openStatusClass(statusLine.isOpen),
                  )}
                >
                  {statusLine.scheduleLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
      {cta ? (
        <div className="mt-auto px-3 pb-3 pt-2">
          <ListingCtaButton cta={cta} className="w-full" />
        </div>
      ) : (
        <div className="h-2" aria-hidden />
      )}
    </article>
  );
}

export function FeaturedBusinessesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[12rem] shrink-0 sm:w-[13.5rem]">
          <Skeleton className="aspect-[4/3] w-full rounded-[1.25rem]" />
          <Skeleton className="mt-2.5 h-4 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
          <Skeleton className="mt-2 h-8 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function BusinessDirectoryRow({ business }: { business: Business }) {
  const categoryLine = getBusinessCategoryLine(business);
  const statusLine = getStorefrontStatusLine(business);
  const storefrontBadge = getBusinessStorefrontBadge(business);
  const cta = getBusinessListingCta(business);
  const storefrontHref = `/businesses/${business.slug}`;

  return (
    <li>
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
        <Link href={storefrontHref} className="shrink-0">
          <BusinessThumb
            business={business}
            className="h-[4.25rem] w-[4.25rem]"
            rounded="rounded-[0.9rem]"
          />
        </Link>

        <Link href={storefrontHref} className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-[15px] font-semibold tracking-tight text-platform-heading">
            {business.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {categoryLine}
          </p>
          {(statusLine || storefrontBadge) ? (
            <div className="mt-1 space-y-0.5 text-xs">
              {statusLine ? (
                <div className="space-y-0.5">
                  <p
                    className={cn(
                      "font-semibold leading-snug",
                      openStatusClass(statusLine.isOpen),
                    )}
                  >
                    {statusLine.statusLabel}
                  </p>
                  {statusLine.scheduleLabel ? (
                    <p
                      className={cn(
                        "font-medium leading-snug",
                        openStatusClass(statusLine.isOpen),
                      )}
                    >
                      {statusLine.scheduleLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {storefrontBadge ? (
                <p className="font-medium text-primary">{storefrontBadge}</p>
              ) : null}
            </div>
          ) : null}
        </Link>

        {cta ? <ListingCtaButton cta={cta} /> : null}
      </div>
    </li>
  );
}

export function BusinessDirectoryRowsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-card p-2.5"
        >
          <Skeleton className="h-[4.25rem] w-[4.25rem] shrink-0 rounded-[0.9rem]" />
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
