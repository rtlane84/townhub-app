import { useRoute } from "wouter";
import {
  useGetBusinessBySlug,
  useListFoodTruckLocations,
  getListFoodTruckLocationsQueryKey,
  getGetBusinessBySlugQueryKey,
} from "@workspace/api-client-react";
import { MapPin, Clock, Phone, Store, ShoppingBag, Plus, ArrowLeft, Info, Truck, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { BusinessHoursDisplay } from "@/components/business-hours-display";
import { resolveBusinessHours } from "@/lib/business-hours";
import { resolvePaymentMode, paymentModeStorefrontNote, resolveStorefrontMode, storefrontCopy, isAppointmentStorefrontMode, isInformationStorefrontMode, showsStorefrontCatalog, informationPrimaryCtaLabel, formatTime12h, formatTimeRange12h, normalizeWebsiteUrl } from "@workspace/api-zod";
import { AppointmentBookingDialog } from "@/components/appointment-booking-dialog";
import { BusinessWebsiteCard } from "@/components/business-website-card";
import { BusinessThemeScope } from "@/components/business-theme-scope";
import { BusinessLogoBadge } from "@/components/business-logo-badge";
import { BusinessTags } from "@/components/business-tags";
import { accentTintStyle, mergePlatformTheme, normalizeHex } from "@/lib/theme-colors";
import { usePlatformBranding } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const categoryPillActiveClass =
  "rounded-full whitespace-nowrap bg-platform-button text-white border border-platform-button !shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-platform-button hover:text-white hover:!shadow-none active:!shadow-none";

const categoryPillInactiveClass =
  "rounded-full whitespace-nowrap border border-border bg-white text-foreground shadow-sm hover:bg-muted outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 active:shadow-sm";

export default function Storefront() {
  const [, params] = useRoute("/businesses/:slug");
  const slug = params?.slug || "";
  const { data: storefront, isLoading, error } = useGetBusinessBySlug(slug, {
    query: { enabled: !!slug, queryKey: getGetBusinessBySlugQueryKey(slug) },
  });

  const business = storefront?.business;
  const eventLocationEnabled = (business as Record<string, unknown> | undefined)?.eventLocationEnabled as boolean | undefined;

  const { data: foodTruckLocations = [] } = useListFoodTruckLocations(
    business?.id ?? 0,
    {
      query: {
        enabled: !!business?.id && !!eventLocationEnabled,
        queryKey: getListFoodTruckLocationsQueryKey(business?.id ?? 0),
      },
    },
  );

  const { addToCart } = useCart();
  const { toast } = useToast();
  const { theme } = usePlatformBranding();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentProductId, setAppointmentProductId] = useState<number | null>(null);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const addToCartLockRef = useRef(false);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="container mx-auto max-w-[1400px] px-4 pt-4 sm:pt-5 md:pt-6">
          <Skeleton className="mx-auto aspect-video w-[84%] rounded-xl sm:w-[86%] md:rounded-2xl" />
          <div className="relative z-10 -mt-[6.125rem] md:-mt-[7.125rem]">
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
              <div className="md:mt-[3.25rem] md:w-2/3 lg:w-3/4">
                <Skeleton className="h-10 w-1/2 mb-4" />
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <Store className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
        <h1 className="text-2xl font-serif font-bold mb-2">Business not found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the storefront you're looking for.</p>
        <Link href="/businesses">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const { categories, products } = storefront;
  const b = business!;
  const bx = b as unknown as Record<string, unknown>;
  const businessHours = resolveBusinessHours(b);

  const bannerText = bx.bannerText as string | undefined;
  const pickupInstructions = bx.pickupInstructions as string | undefined;
  const deliveryInstructions = bx.deliveryInstructions as string | undefined;
  const deliveryNotes = bx.deliveryNotes as string | undefined;
  const minimumOrderForDelivery = bx.minimumOrderForDelivery as number | undefined;
  const deliveryRadiusMiles = bx.deliveryRadiusMiles as number | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const upcomingLocations = foodTruckLocations
    .filter((l) => l.isActive && l.locationDate >= today)
    .slice(0, 5);

  const displayedProducts = activeCategory
    ? products.filter((p) => p.categoryId === activeCategory)
    : products;

  const paymentNote = paymentModeStorefrontNote(resolvePaymentMode(b));
  const storefrontMode = resolveStorefrontMode(b);
  const isAppointmentMode = isAppointmentStorefrontMode(b);
  const isInformationMode = isInformationStorefrontMode(b);
  const showCatalog = showsStorefrontCatalog(storefrontMode);
  const copy = storefrontCopy(storefrontMode);
  const contactCtaLabel = informationPrimaryCtaLabel(!!b.phone?.trim());
  const websiteUrl = normalizeWebsiteUrl(bx.websiteUrl as string | undefined);
  const showWebsiteCard = bx.showWebsiteCard === true && !!websiteUrl;

  const openAppointmentDialog = (productId?: number) => {
    setAppointmentProductId(productId ?? null);
    setAppointmentOpen(true);
  };

  const handleBookAppointment = () => {
    openAppointmentDialog();
  };

  async function handleAddToCart(product: { id: number; name: string; price: number; imageUrl?: string | null; available?: boolean | null }) {
    if (addToCartLockRef.current) return;
    if (isAppointmentMode) {
      openAppointmentDialog(product.id);
      return;
    }
    addToCartLockRef.current = true;
    setAddingProductId(product.id);
    try {
      addToCart(product as never, b.id, 1);
      toast({ title: copy.addToastTitle, description: copy.addToastDescription(product.name) });
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      addToCartLockRef.current = false;
      setAddingProductId(null);
    }
  }

  const accentHex = normalizeHex(b.accentColor) ?? mergePlatformTheme(theme).accentColor;

  return (
    <BusinessThemeScope business={b} className="min-h-screen bg-muted/10 pb-20">
      {/* Banner text */}
      {bannerText && (
        <div className="bg-primary text-primary-foreground text-sm font-medium text-center py-2.5 px-4">
          {bannerText}
        </div>
      )}

      <div className="container mx-auto max-w-[1400px] px-4 pt-4 sm:pt-5 md:pt-6">
        <div className="relative mx-auto w-[84%] overflow-hidden rounded-xl bg-muted shadow-lg shadow-black/[0.08] ring-1 ring-black/[0.05] sm:w-[86%] md:rounded-2xl">
          {b.heroImageUrl ? (
            <img
              src={b.heroImageUrl}
              alt=""
              aria-hidden
              className="block w-full h-auto"
            />
          ) : (
            <div className="flex aspect-video size-full items-center justify-center bg-primary/10">
              <Store className="h-16 w-16 text-primary/30 md:h-20 md:w-20" />
            </div>
          )}
        </div>

        <div className="relative z-10 -mt-[6.125rem] md:-mt-[7.125rem]">
          <div className={cn("flex flex-col gap-8", showCatalog && "md:flex-row")}>
          {/* Business details */}
          <div className={cn(showCatalog && "md:w-1/3 lg:w-1/4 flex-shrink-0")}>
            <Card className="sticky top-24 overflow-visible border-border/40 shadow-xl">
              <div className="flex flex-col items-center rounded-t-xl border-b bg-white p-6 pt-12 text-center">
                <BusinessLogoBadge
                  src={b.logoUrl}
                  alt={`${b.name} logo`}
                  size="lg"
                  ringClassName="ring-4"
                  className="-mt-[4.5rem] relative z-20 mb-4 shadow-md"
                />
                <h1 className="text-2xl font-serif font-bold text-foreground mb-1">{b.name}</h1>
                <BusinessTags business={b} accentColor={b.accentColor} variant="storefront" />
                {isInformationMode && copy.informationTagline && (
                  <p className="text-sm text-muted-foreground mt-2">{copy.informationTagline}</p>
                )}
                {!isAppointmentMode && !isInformationMode && (
                  <p className="text-xs text-muted-foreground mb-2">{paymentNote}</p>
                )}
                {isAppointmentMode && (
                  <Button
                    className="w-full rounded-full mt-2"
                    onClick={handleBookAppointment}
                    data-testid="button-book-appointment"
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {copy.primaryCtaLabel}
                  </Button>
                )}
                {isInformationMode && (
                  b.phone?.trim() ? (
                    <Button asChild className="w-full rounded-full mt-2">
                      <a href={`tel:${b.phone.replace(/\s/g, "")}`} data-testid="button-call-to-order">
                        <Phone className="h-4 w-4 mr-2" />
                        {contactCtaLabel}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full rounded-full mt-2"
                      onClick={() => document.getElementById("business-contact")?.scrollIntoView({ behavior: "smooth" })}
                      data-testid="button-contact-business"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {contactCtaLabel}
                    </Button>
                  )
                )}
              </div>

              <CardContent className="p-0 overflow-hidden rounded-b-xl">
                <div className="divide-y divide-border/50">
                  {b.description && (
                    <div className="p-5 text-sm text-foreground/90 leading-relaxed">
                      {b.description}
                    </div>
                  )}

                  <div id="business-contact" className="p-5 space-y-4">
                    {b.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground/80 hover:text-primary transition-colors"
                        >
                          {b.address}
                        </a>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-start gap-3 text-sm">
                        <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="text-foreground/80 hover:text-primary transition-colors">
                          {b.phone}
                        </a>
                      </div>
                    )}
                    {businessHours.hasHours && (
                      <div className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <BusinessHoursDisplay
                            structuredHours={businessHours.structuredHours}
                            fallbackHours={businessHours.fallbackHours}
                            showOpenNow
                          />
                        </div>
                      </div>
                    )}
                    {b.orderCutoffTime && !isAppointmentMode && !isInformationMode && (
                      <div className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{copy.cutoffLabel(formatTime12h(b.orderCutoffTime))}</span>
                      </div>
                    )}
                  </div>

                  {/* Fulfillment info */}
                  {!isAppointmentMode && !isInformationMode && (pickupInstructions || deliveryInstructions || deliveryNotes || minimumOrderForDelivery || deliveryRadiusMiles) && (
                    <div className="p-5 space-y-3">
                      {pickupInstructions && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-3">
                          <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-foreground block mb-0.5">Pickup</span>
                            {pickupInstructions}
                          </div>
                        </div>
                      )}
                      {(deliveryInstructions || deliveryNotes || minimumOrderForDelivery || deliveryRadiusMiles) && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 rounded-lg p-3">
                          <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <span className="font-medium text-foreground block">Delivery</span>
                            {deliveryInstructions && <p>{deliveryInstructions}</p>}
                            {deliveryNotes && <p>{deliveryNotes}</p>}
                            {minimumOrderForDelivery && (
                              <p>Minimum ${minimumOrderForDelivery.toFixed(2)} for delivery</p>
                            )}
                            {deliveryRadiusMiles && (
                              <p>Within {deliveryRadiusMiles} miles</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Food truck upcoming locations */}
                  {eventLocationEnabled && upcomingLocations.length > 0 && (
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Upcoming Locations</span>
                      </div>
                      <div className="space-y-2">
                        {upcomingLocations.map((loc) => (
                          <div key={loc.id} className="text-xs rounded-lg p-3 border border-primary/15" style={accentTintStyle(accentHex, 0.08)}>
                            <div className="font-medium text-foreground">{loc.locationName}</div>
                            <div className="text-muted-foreground mt-0.5">
                              {loc.locationDate === today ? (
                                <span className="text-primary font-medium">Today</span>
                              ) : (
                                loc.locationDate
                              )}
                              {formatTimeRange12h(loc.startTime, loc.endTime)
                                ? ` · ${formatTimeRange12h(loc.startTime, loc.endTime)}`
                                : ""}
                            </div>
                            {loc.address && <div className="text-muted-foreground">{loc.address}</div>}
                            {loc.locationNotes && <div className="text-muted-foreground italic mt-1">{loc.locationNotes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showWebsiteCard && (
                    <div className="p-5">
                      <BusinessWebsiteCard websiteUrl={websiteUrl} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Catalog grid */}
          {showCatalog && (
          <div className="md:mt-[3.25rem] md:w-2/3 lg:w-3/4">
            {(isAppointmentMode || isInformationMode) && copy.catalogHeading && (
              <div className="mb-4 md:pt-20">
                <h2 className="text-2xl font-serif font-bold text-foreground">{copy.catalogHeading}</h2>
                {copy.catalogSubtitle && (
                  <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{copy.catalogSubtitle}</p>
                )}
              </div>
            )}
            {categories.length > 0 && (
              <div className={`mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar ${!isAppointmentMode && !isInformationMode ? "md:pt-20" : ""}`}>
                <Button
                  variant="ghost"
                  onClick={() => setActiveCategory(null)}
                  className={activeCategory === null ? categoryPillActiveClass : categoryPillInactiveClass}
                  size="sm"
                >
                  {copy.allItemsLabel}
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    onClick={() => setActiveCategory(cat.id)}
                    className={activeCategory === cat.id ? categoryPillActiveClass : categoryPillInactiveClass}
                    size="sm"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}
            {!isAppointmentMode && !isInformationMode && categories.length === 0 && (
              <div className="md:pt-20" />
            )}

            {displayedProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium text-foreground">{copy.emptyTitle}</h3>
                <p className="text-muted-foreground text-sm mt-1">{copy.emptyDescription}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden flex flex-col border-border/40 shadow-sm hover:shadow-md transition-shadow">
                    {product.imageUrl && (
                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-medium leading-tight text-foreground">{product.name}</h4>
                        {!isAppointmentMode && (
                          <span className="font-semibold text-primary shrink-0">${product.price.toFixed(2)}</span>
                        )}
                      </div>

                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{product.description}</p>
                      )}

                      <div className="mt-auto pt-4 flex items-center justify-between">
                        {product.prepTimeMinutes ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {copy.prepTimeLabel(product.prepTimeMinutes)}
                          </span>
                        ) : (
                          <span />
                        )}
                        {!isInformationMode && (
                          <LoadingButton
                            size="sm"
                            variant={isAppointmentMode ? "default" : "secondary"}
                            className="rounded-full h-8"
                            onClick={() => void handleAddToCart(product)}
                            disabled={!product.available || !b.active || addingProductId !== null}
                            loading={addingProductId === product.id}
                            loadingText="Adding…"
                          >
                            <Plus className="h-4 w-4 mr-1" /> {copy.addButtonLabel}
                          </LoadingButton>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
        </div>
      </div>

      {isAppointmentMode && (
        <AppointmentBookingDialog
          open={appointmentOpen}
          onOpenChange={(open) => {
            setAppointmentOpen(open);
            if (!open) setAppointmentProductId(null);
          }}
          businessId={b.id}
          businessName={b.name}
          services={products.map((p) => ({ id: p.id, name: p.name }))}
          initialProductId={appointmentProductId}
        />
      )}
    </BusinessThemeScope>
  );
}
