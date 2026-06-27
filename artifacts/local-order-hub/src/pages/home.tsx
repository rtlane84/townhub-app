import {
  useListBusinesses,
  useListEvents,
  useListHighlights,
  useListTodayFoodTrucks,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Store, ArrowRight, Loader2, Leaf, Coffee, Utensils, Calendar, Sparkles, MapPin, Clock, Truck,
} from "lucide-react";
import { BusinessType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "@/components/event-card";
import { usePlatformBranding } from "@/components/theme-provider";
import { formatBusinessTypeLabel } from "@workspace/api-zod";
import { BusinessListingCardMedia, BusinessLogoBadge } from "@/components/business-logo-badge";
import { cn } from "@/lib/utils";
import {
  businessHeroPlaceholderStyle,
  businessIconAccentStyle,
  businessListingCardVars,
  businessTypeBadgeStyle,
} from "@/lib/theme-colors";

const LISTING_CARD_CLASS =
  "h-full hover-elevate cursor-pointer border-border/50 group transition-all duration-200 hover:border-[var(--biz-accent-border,hsl(var(--border)))]";

const CATEGORIES = [
  { name: "Food & Drink", type: BusinessType.FOOD_VENDOR, icon: <Utensils className="h-5 w-5" /> },
  { name: "Flowers", type: BusinessType.FLORIST, icon: <Leaf className="h-5 w-5 text-green-500" /> },
  { name: "Plants & Market", type: BusinessType.GARDEN_MARKET, icon: <Store className="h-5 w-5 text-primary" /> },
  { name: "Salon / Beauty", type: BusinessType.SALON, icon: <Sparkles className="h-5 w-5 text-pink-500" /> },
  { name: "Retail & General", type: BusinessType.RETAIL_STORE, icon: <Coffee className="h-5 w-5 text-blue-500" /> },
];

export default function Home() {
  const { heroTagline, heroHeadline, heroHeadlineAccentColor, shopCtaLabel, heroImageUrl, heroOverlayStyle, heroPrimaryButtonStyle } =
    usePlatformBranding();
  const { data: businesses, isLoading } = useListBusinesses({ featured: true });
  const { data: featuredEventsRaw = [], isLoading: featuredEventsLoading } = useListEvents({
    upcoming: true,
    featured: true,
  });
  const { data: allUpcomingEvents = [], isLoading: upcomingEventsLoading } = useListEvents({
    upcoming: true,
  });
  const { data: highlights = [] } = useListHighlights({});
  const { data: todayTrucks = [] } = useListTodayFoodTrucks({});

  const eventsLoading = featuredEventsLoading || upcomingEventsLoading;
  const featuredEvents = featuredEventsRaw.slice(0, 3);
  const featuredEventIds = new Set(featuredEvents.map((event) => event.id));
  const upcomingEvents = allUpcomingEvents
    .filter((event) => !featuredEventIds.has(event.id))
    .slice(0, 6);
  const featuredHighlights = highlights.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section
        className={cn(
          "relative py-24 overflow-hidden",
          heroImageUrl ? "min-h-[420px] flex items-center" : "bg-primary/5",
        )}
      >
        {heroImageUrl ? (
          <>
            <img
              src={heroImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden
            />
            <div className="absolute inset-0" style={heroOverlayStyle ?? undefined} aria-hidden />
          </>
        ) : null}
        <div
          className={cn(
            "container px-4 mx-auto relative z-10 text-center max-w-3xl",
            heroImageUrl && "text-white",
          )}
        >
          <h1
            className={cn(
              "text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight",
              heroImageUrl ? "text-white" : "text-foreground",
            )}
          >
            {heroHeadline.line1} <br />
            <span
              className={heroImageUrl ? "drop-shadow-sm" : undefined}
              style={{ color: heroHeadlineAccentColor }}
            >
              {heroHeadline.line2}
            </span>
          </h1>
          <p
            className={cn(
              "text-xl mb-10 leading-relaxed max-w-2xl mx-auto",
              heroImageUrl
                ? "font-medium text-white drop-shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {heroTagline}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/businesses">
              <Button
                variant={heroImageUrl ? "outline" : "default"}
                size="lg"
                style={heroPrimaryButtonStyle ?? undefined}
                className={cn(
                  "w-full sm:w-auto text-lg h-14 px-8 rounded-full font-semibold shadow-lg",
                  heroImageUrl && "shadow-xl hover:opacity-90",
                )}
              >
                {shopCtaLabel}
              </Button>
            </Link>
            <Link href="/list-your-business">
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "w-full sm:w-auto text-lg h-14 px-8 rounded-full font-medium",
                  heroImageUrl
                    ? "border-2 border-white bg-white/10 text-white hover:bg-white/20 hover:border-white shadow-sm"
                    : "bg-white text-foreground",
                )}
              >
                List Your Business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights banner */}
      {featuredHighlights.length > 0 && (
        <section className="py-8 bg-primary/10 border-y border-primary/20">
          <div className="container px-4 mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Seasonal Highlights</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredHighlights.map((h) => (
                <div key={h.id} className="flex gap-3 items-start bg-white rounded-xl p-4 shadow-sm border border-border/50">
                  {h.imageUrl && (
                    <img src={h.imageUrl} alt={h.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{h.title}</p>
                    {h.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.description}</p>
                    )}
                    {h.buttonText && h.buttonUrl && (
                      <Link href={h.buttonUrl}>
                        <span className="text-xs text-primary font-medium hover:underline mt-1 block">
                          {h.buttonText} →
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {CATEGORIES.map((cat) => (
              <Link key={cat.type} href={`/businesses?type=${cat.type}`}>
                <Card className="hover-elevate cursor-pointer transition-all border-border/50 group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Today's Food Trucks */}
      {todayTrucks.length > 0 && (
        <section className="py-12 bg-accent/10 border-y border-accent/20">
          <div className="container px-4 mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-serif font-bold text-foreground">Food Trucks Today</h2>
              <Badge className="bg-primary/10 text-primary border-0 ml-1">Live</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayTrucks.map((truck) => (
                <Link key={truck.id} href={`/businesses/${truck.businessSlug}`}>
                  <Card className="hover-elevate cursor-pointer border-primary/20 group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        {truck.businessLogoUrl ? (
                          <BusinessLogoBadge
                            src={truck.businessLogoUrl}
                            alt={`${truck.businessName} logo`}
                            size="sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{truck.businessName}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{truck.locationName}</span>
                          </div>
                          {(truck.startTime || truck.endTime) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              <span>{truck.startTime}{truck.endTime ? `–${truck.endTime}` : ""}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Businesses */}
      <section className="py-20 bg-muted/20">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-serif font-bold text-foreground">Featured Local Favorites</h2>
            <Link href="/businesses" className="hidden sm:flex items-center text-primary font-medium hover:underline">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {businesses?.slice(0, 6).map((business) => (
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
                    <CardContent className="pt-10 pb-6 px-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-serif font-bold text-foreground line-clamp-1">{business.name}</h3>
                        {!business.active && <Badge variant="secondary">Closed</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {business.description || "A local favorite."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="font-medium border-border bg-muted/50 text-foreground"
                          style={businessTypeBadgeStyle(business.accentColor)}
                        >
                          {formatBusinessTypeLabel(business.type)}
                        </Badge>
                        {business.pickupEnabled && (
                          <Badge
                            variant="outline"
                            className={business.accentColor ? undefined : "bg-primary/5 text-primary border-primary/20"}
                            style={business.accentColor ? businessTypeBadgeStyle(business.accentColor) : undefined}
                          >
                            Pickup
                          </Badge>
                        )}
                        {business.deliveryEnabled && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Delivery</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link href="/businesses">
              <Button variant="outline" className="w-full">View all businesses</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured & Upcoming Events */}
      {!eventsLoading && (
        <section className="py-16 bg-white border-t">
          <div className="container px-4 mx-auto space-y-12">
            {featuredEvents.length > 0 && (
              <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 md:p-8">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-serif font-bold text-foreground">Featured Events</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Promoted highlights picked by the platform — don&apos;t miss these.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-serif font-bold text-foreground">Upcoming Events</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  More local events happening soon in the community.
                </p>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-border border-dashed">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-foreground">No other upcoming events right now</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back soon or browse the full events calendar.
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <Link href="/events">
                <Button variant="outline">View All Events</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {eventsLoading && (
        <section className="py-16 bg-white border-t">
          <div className="container px-4 mx-auto flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </section>
      )}
    </div>
  );
}
