import { useState } from "react";
import { Link } from "wouter";
import { Search, MapPin, Store, Filter } from "lucide-react";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const SEARCH_DEBOUNCE_MS = 300;

const LISTING_CARD_CLASS =
  "h-full hover-elevate cursor-pointer border-border/60 group transition-all duration-200 hover:border-[var(--biz-accent-border,hsl(var(--border)))]";

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Local Businesses</h1>
          <p className="text-muted-foreground mt-1">Discover and support the best of our community.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search businesses..." 
            className="pl-9 h-11"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="flex overflow-x-auto pb-2 -mb-2 gap-2 hide-scrollbar">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedType === cat.value ? "default" : "outline"}
              onClick={() => setSelectedType(cat.value)}
              className="rounded-full whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          ))}
        </div>
      ) : businesses?.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No businesses found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
          <Button 
            variant="link" 
            onClick={() => { setSearchInput(""); setSelectedType("ALL"); }}
            className="mt-2"
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <CardContent className="pt-10 pb-6 px-6 flex flex-col h-[calc(100%-56.25%)]">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-serif font-bold text-foreground line-clamp-1">{business.name}</h3>
                    {!business.active && <Badge variant="secondary">Closed</Badge>}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground mb-3 gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" style={businessIconAccentStyle(business.accentColor)} />
                    <span className="line-clamp-1">{business.address || "Online"}</span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
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
