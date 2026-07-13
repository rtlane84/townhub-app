import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Search, SlidersHorizontal, Star, Store } from "lucide-react";
import { useListBusinesses } from "@workspace/api-client-react";
import {
  isOrderingStorefrontMode,
  PUBLIC_BUSINESS_FILTERS,
} from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import {
  BusinessDirectoryRow,
  BusinessDirectoryRowsSkeleton,
  FeaturedBusinessCard,
  FeaturedBusinessesSkeleton,
} from "@/components/business-directory";
import { NativeEmptyState } from "@/components/native-empty-state";
import { PeekCarousel } from "@/components/peek-carousel";
import { SectionHeader } from "@/components/section-header";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

export default function Businesses() {
  const searchString = useSearch();
  const categoryRowRef = useRef<HTMLDivElement>(null);

  const { typeFromUrl, orderingOnly, searchFromUrl } = useMemo(() => {
    const params = new URLSearchParams(
      searchString.startsWith("?") ? searchString.slice(1) : searchString,
    );
    const type = params.get("type");
    const ordering = params.get("ordering");
    const searchParam = params.get("search") ?? params.get("q") ?? "";
    return {
      typeFromUrl:
        type && PUBLIC_BUSINESS_FILTERS.some((filter) => filter.value === type)
          ? type
          : "ALL",
      orderingOnly: ordering === "1" || ordering === "true",
      searchFromUrl: searchParam,
    };
  }, [searchString]);

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [selectedType, setSelectedType] = useState<string>(typeFromUrl);
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setSelectedType(typeFromUrl);
  }, [typeFromUrl]);

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  const { data: businesses, isLoading } = useListBusinesses({
    search: search || undefined,
    type: selectedType === "ALL" ? undefined : selectedType,
  });

  const visibleBusinesses = useMemo(() => {
    const list = businesses ?? [];
    if (!orderingOnly) return list;
    return list.filter(
      (business) =>
        isOrderingStorefrontMode(business) &&
        business.orderingEnabled !== false,
    );
  }, [businesses, orderingOnly]);

  const featuredBusinesses = useMemo(
    () => visibleBusinesses.filter((business) => business.featured),
    [visibleBusinesses],
  );

  const categories = PUBLIC_BUSINESS_FILTERS;
  const hasActiveFilters = Boolean(searchInput.trim()) || selectedType !== "ALL";

  function clearFilters() {
    setSearchInput("");
    setSelectedType("ALL");
  }

  function focusCategories() {
    categoryRowRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  return (
    <div
      className={cn(
        PAGE_CONTAINER,
        "bg-background py-6 md:py-8 native-animate-in",
      )}
    >
      <SectionHeader
        title={orderingOnly ? "Order Local" : "Local businesses"}
        description={
          orderingOnly
            ? "Businesses that accept online orders right now."
            : "Discover and support the best of our community."
        }
        size="lg"
        className="mb-5"
      />

      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search businesses, cuisine, products, or services..."
            className="h-11 w-full rounded-full border border-black/[0.08] bg-card pl-10 pr-11 text-[14px] text-foreground shadow-[0_1px_4px_rgba(15,23,42,0.04)] outline-none placeholder:text-muted-foreground/80 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search businesses"
          />
          <button
            type="button"
            onClick={focusCategories}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Filter by category"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          ref={categoryRowRef}
          className="flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar"
          role="listbox"
          aria-label="Business categories"
        >
          {categories.map((cat) => {
            const active = selectedType === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => setSelectedType(cat.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
                  active
                    ? "bg-[var(--platform-heading,#1e3a5f)] text-white"
                    : "border border-black/[0.08] bg-card text-foreground/80 hover:bg-muted/60",
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {orderingOnly ? (
          <p className="text-sm text-muted-foreground">
            Showing online-ordering businesses only.{" "}
            <Link href="/businesses" className="font-semibold text-primary">
              Browse all businesses
            </Link>
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <SkeletonHeading />
            </div>
            <FeaturedBusinessesSkeleton />
          </section>
          <section>
            <SkeletonHeading />
            <div className="mt-3">
              <BusinessDirectoryRowsSkeleton />
            </div>
          </section>
        </div>
      ) : visibleBusinesses.length === 0 ? (
        <NativeEmptyState
          icon={Store}
          title={
            orderingOnly
              ? "No online ordering yet"
              : hasActiveFilters
                ? "No businesses found"
                : "No businesses yet"
          }
          description={
            orderingOnly
              ? "None of the local shops accept online orders right now. Browse the full directory instead."
              : hasActiveFilters
                ? "Try adjusting your filters or search term."
                : "Check back soon for local shops and makers."
          }
          action={
            orderingOnly ? (
              <Link href="/businesses">
                <Button variant="outline" className="min-h-11 w-full">
                  Browse all businesses
                </Button>
              </Link>
            ) : hasActiveFilters ? (
              <Button
                variant="outline"
                className="w-full min-h-11"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          {featuredBusinesses.length > 0 ? (
            <section aria-labelledby="featured-businesses-heading">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2
                  id="featured-businesses-heading"
                  className="flex items-center gap-1.5 text-[17px] font-bold tracking-tight text-platform-heading"
                >
                  <Star
                    className="h-4 w-4 text-amber-500"
                    fill="currentColor"
                    aria-hidden
                  />
                  Featured businesses
                </h2>
                <button
                  type="button"
                  className="shrink-0 text-[13px] font-semibold text-primary"
                  onClick={() => {
                    document
                      .getElementById("all-businesses-heading")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View all
                </button>
              </div>
              <PeekCarousel
                label="Featured businesses"
                itemClassName="basis-[72%] sm:basis-[40%] lg:basis-[28%]"
              >
                {featuredBusinesses.map((business) => (
                  <FeaturedBusinessCard
                    key={business.id}
                    business={business}
                  />
                ))}
              </PeekCarousel>
            </section>
          ) : null}

          <section aria-labelledby="all-businesses-heading">
            <h2
              id="all-businesses-heading"
              className="mb-3 text-[17px] font-bold tracking-tight text-platform-heading"
            >
              All businesses
            </h2>
            <ul className="space-y-2.5">
              {visibleBusinesses.map((business) => (
                <BusinessDirectoryRow
                  key={business.id}
                  business={business}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function SkeletonHeading() {
  return (
    <div
      className="mb-3 h-5 w-40 animate-pulse rounded bg-muted"
      aria-hidden
    />
  );
}
