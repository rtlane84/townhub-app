import { useState } from "react";
import { Link } from "wouter";
import { Search, MapPin, Store } from "lucide-react";
import { useListBusinesses } from "@workspace/api-client-react";
import { PUBLIC_BUSINESS_FILTERS } from "@workspace/api-zod";
import {
  businessHeroPlaceholderStyle,
  businessIconAccentStyle,
  businessListingCardVars,
} from "@/lib/theme-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessListingCardMedia } from "@/components/business-logo-badge";
import { BusinessTags } from "@/components/business-tags";
import { NativeEmptyState } from "@/components/native-empty-state";
import { SectionHeader } from "@/components/section-header";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { LISTING_CARD_CLASS, PAGE_CONTAINER } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

export default function Businesses() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const { data: businesses, isLoading } = useListBusinesses({
    search: search || undefined,
    type: selectedType === "ALL" ? undefined : selectedType,
  });

  const categories = PUBLIC_BUSINESS_FILTERS;

  return (
    <div className={cn(PAGE_CONTAINER, "py-8 md:py-10 native-animate-in")}>
      <SectionHeader
        title="Local businesses"
        description="Discover and support the best of our community."
        size="lg"
        className="mb-8"
      />

      {/* Search + filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            className="h-12 pl-11 text-base"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search businesses"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {categories.map((cat) => {
            const active = selectedType === cat.value;
            return (
              <Button
                key={cat.value}
                variant={active ? "default" : "outline"}
                onClick={() => setSelectedType(cat.value)}
                className={cn(
                  "shrink-0 rounded-full whitespace-nowrap",
                  !active && "bg-card",
                )}
              >
                {cat.label}
              </Button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="aspect-[16/10] w-full rounded-[1.75rem]" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[50%]" />
            </div>
          ))}
        </div>
      ) : businesses?.length === 0 ? (
        <NativeEmptyState
          icon={Store}
          title="No businesses found"
          description="Try adjusting your filters or search term."
          action={
            <Button
              variant="outline"
              className="w-full min-h-11"
              onClick={() => {
                setSearchInput("");
                setSelectedType("ALL");
              }}
            >
              Clear all filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {businesses?.map((business) => (
            <Link key={business.id} href={`/businesses/${business.slug}`}>
              <Card className={LISTING_CARD_CLASS} style={businessListingCardVars(business.accentColor)}>
                <BusinessListingCardMedia
                  heroImageUrl={business.heroImageUrl}
                  heroAlt={business.name}
                  logoUrl={business.logoUrl}
                  businessName={business.name}
                  placeholder={
                    <div
                      className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40"
                      style={businessHeroPlaceholderStyle(business.accentColor)}
                    >
                      <Store className="h-12 w-12" style={businessIconAccentStyle(business.accentColor)} />
                    </div>
                  }
                />
                <CardContent className="flex h-[calc(100%-56.25%)] flex-col px-5 pb-5 pt-9">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-serif text-xl font-bold text-foreground">{business.name}</h3>
                    {!business.active && <Badge variant="secondary">Closed</Badge>}
                  </div>

                  <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" style={businessIconAccentStyle(business.accentColor)} />
                    <span className="line-clamp-1">{business.address || "Online"}</span>
                  </div>

                  <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {business.description || "A local favorite in our community."}
                  </p>

                  <BusinessTags
                    business={business}
                    accentColor={business.accentColor}
                    variant="listing"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
