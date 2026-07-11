import { useRoute } from "wouter";
import {
  useGetBusinessBySlug,
  useListFoodTruckLocations,
  getListFoodTruckLocationsQueryKey,
  getGetBusinessBySlugQueryKey,
} from "@workspace/api-client-react";
import { MapPin, Clock, Phone, Store, ShoppingBag, Plus, ArrowLeft, Info, Truck, CalendarDays, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { BusinessHoursDisplay } from "@/components/business-hours-display";
import { resolveBusinessHours } from "@/lib/business-hours";
import { resolvePaymentMode, paymentModeStorefrontNote, resolveStorefrontMode, storefrontCopy, isAppointmentStorefrontMode, isInformationStorefrontMode, showsStorefrontCatalog, informationPrimaryCtaLabel, formatTimeRange12h, normalizeWebsiteUrl } from "@workspace/api-zod";
import { AppointmentBookingDialog } from "@/components/appointment-booking-dialog";
import { ProductOptionsDialog } from "@/components/product-options-dialog";
import type { Product } from "@workspace/api-client-react";
import { BusinessWebsiteCard } from "@/components/business-website-card";
import { BusinessThemeScope } from "@/components/business-theme-scope";
import { BusinessLogoBadge } from "@/components/business-logo-badge";
import { BusinessTags } from "@/components/business-tags";
import { accentTintStyle, mergePlatformTheme, normalizeHex } from "@/lib/theme-colors";
import { usePlatformBranding } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { triggerNativeHaptic } from "@/lib/native-haptics";
import { isNativeApp } from "@/lib/native-platform";

const categoryPillActiveClass =
  "rounded-full whitespace-nowrap bg-platform-button text-white border-0 !shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-platform-button hover:text-white hover:!shadow-none active:!shadow-none";

const storefrontPrimaryButtonClass =
  "rounded-full bg-platform-button text-white border-0 shadow-[0_2px_12px_-2px_rgba(30,58,138,0.35)] hover:bg-platform-button/90 hover:text-white";

const storefrontAddButtonClass =
  "h-10 min-w-[5.5rem] gap-1.5 rounded-full bg-platform-button px-4 text-[13px] font-semibold tracking-tight text-white border-0 shadow-[0_4px_14px_-4px_rgba(30,58,138,0.45)] transition-all duration-200 hover:bg-platform-button/90 hover:text-white hover:shadow-[0_6px_18px_-4px_rgba(30,58,138,0.5)] active:scale-[0.96] disabled:opacity-45";

const categoryPillInactiveClass =
  "rounded-full whitespace-nowrap border-0 bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] hover:bg-muted outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

export default function Storefront() {
  const [, params] = useRoute("/businesses/:slug");
  const slug = params?.slug || "";
  const { data: storefront, isLoading, error } = useGetBusinessBySlug(slug, {
    query: { enabled: !!slug, queryKey: getGetBusinessBySlugQueryKey(slug) },
  });

  const business = storefront?.business;
  const isMobileBusiness = Boolean(
    (business as Record<string, unknown> | undefined)?.isMobileBusiness ??
      (business as Record<string, unknown> | undefined)?.eventLocationEnabled,
  );

  const { data: foodTruckLocations = [] } = useListFoodTruckLocations(
    business?.id ?? 0,
    {
      query: {
        enabled: !!business?.id && isMobileBusiness,
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
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
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

  const specials = products.filter((p) => p.featured && p.available !== false);
  const paymentNote = paymentModeStorefrontNote(resolvePaymentMode(b));
  const storefrontMode = resolveStorefrontMode(b);
  const isAppointmentMode = isAppointmentStorefrontMode(b);
  const isInformationMode = isInformationStorefrontMode(b);
  const showCatalog = showsStorefrontCatalog(storefrontMode);
  const copy = storefrontCopy(storefrontMode);
  const displayedProducts = (
    activeCategory
      ? products.filter((p) => p.categoryId === activeCategory)
      : products
  ).filter((p) => {
    // When the specials section is visible, keep those items out of the main grid
    // so the catalog doesn't look like a continuation of Special of the day.
    if (activeCategory === null && p.featured) return false;
    return true;
  });
  const catalogFullyEmpty = products.length === 0;
  const showSpecialsSection = showCatalog && specials.length > 0 && activeCategory === null;
  const categoryFilterEmpty =
    !catalogFullyEmpty && displayedProducts.length === 0 && !(showSpecialsSection && specials.length > 0);
  const contactCtaLabel = informationPrimaryCtaLabel(!!b.phone?.trim());
  const websiteUrl = normalizeWebsiteUrl(bx.websiteUrl as string | undefined);
  const showWebsiteCard = bx.showWebsiteCard === true && !!websiteUrl;
  const informationCatalogEmpty = isInformationMode && products.length === 0;
  const showCatalogColumn = showCatalog && !informationCatalogEmpty;

  const openAppointmentDialog = (productId?: number) => {
    setAppointmentProductId(productId ?? null);
    setAppointmentOpen(true);
  };

  const handleBookAppointment = () => {
    openAppointmentDialog();
  };

  async function handleAddToCart(product: Product) {
    if (addToCartLockRef.current) return;
    if (!product.available) return;
    if (isNativeApp()) triggerNativeHaptic("light");
    if (isAppointmentMode) {
      openAppointmentDialog(product.id);
      return;
    }
    if ((product.optionGroups?.length ?? 0) > 0) {
      setOptionsProduct(product);
      return;
    }
    addToCartLockRef.current = true;
    setAddingProductId(product.id);
    try {
      const added = addToCart(product, b.id, { quantity: 1 });
      if (!added) return;
      toast({ title: copy.addToastTitle, description: copy.addToastDescription(product.name) });
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      addToCartLockRef.current = false;
      setAddingProductId(null);
    }
  }

  async function handleConfirmOptions(payload: {
    selectedOptionIds: number[];
    selectedOptions: import("@/components/product-options-dialog").SelectedCartOption[];
    unitPrice: number;
  }) {
    if (!optionsProduct) return;
    addToCartLockRef.current = true;
    setAddingProductId(optionsProduct.id);
    try {
      const added = addToCart(optionsProduct, b.id, {
        quantity: 1,
        selectedOptionIds: payload.selectedOptionIds,
        selectedOptions: payload.selectedOptions,
        unitPrice: payload.unitPrice,
      });
      if (!added) return;
      toast({
        title: copy.addToastTitle,
        description: copy.addToastDescription(optionsProduct.name),
      });
      setOptionsProduct(null);
      await new Promise((resolve) => setTimeout(resolve, 400));
    } finally {
      addToCartLockRef.current = false;
      setAddingProductId(null);
    }
  }

  const accentHex = normalizeHex(b.accentColor) ?? mergePlatformTheme(theme).accentColor;

  return (
    <BusinessThemeScope business={b} className="min-h-0 bg-background pb-6">
      {/* Storefront banner */}
      {bannerText?.trim() ? (
        <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary via-primary to-primary/90">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 12% 50%, white 0, transparent 42%), radial-gradient(circle at 88% 50%, white 0, transparent 38%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-[1400px] items-center justify-center gap-2.5 px-4 py-3 text-center md:px-6">
            <Megaphone className="hidden h-4 w-4 shrink-0 text-primary-foreground/85 sm:block" aria-hidden />
            <p className="text-sm font-medium tracking-tight text-primary-foreground md:text-[15px]">
              {bannerText.trim()}
            </p>
          </div>
        </div>
      ) : null}

      <div className="container mx-auto max-w-[1400px] px-0 md:px-6 md:pt-6">
        {/* Hero — full-bleed on mobile; large rounded stage on desktop */}
        <div
          className={cn(
            "relative aspect-[16/10] overflow-hidden bg-muted sm:aspect-video",
            "w-full rounded-none",
            "md:mx-auto md:rounded-[2rem] md:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)]",
          )}
        >
          {b.heroImageUrl ? (
            <img
              src={b.heroImageUrl}
              alt=""
              aria-hidden
              decoding="async"
              fetchPriority="high"
              className="block h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video size-full items-center justify-center bg-primary/10">
              <Store className="h-16 w-16 text-primary/30 md:h-20 md:w-20" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent md:from-black/15" />
        </div>

        <div className="relative z-10 -mt-16 px-5 md:-mt-[7.125rem] md:px-0">
          <div className={cn("flex flex-col gap-8", showCatalogColumn && "md:flex-row")}>
          {/* Business details */}
          <div
            className={cn(
              "order-1 w-full",
              informationCatalogEmpty && "md:mx-auto md:max-w-md",
              showCatalogColumn && "md:w-1/3 lg:w-1/4 flex-shrink-0",
            )}
          >
            <Card className="sticky top-24 overflow-visible rounded-[1.75rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.16)]">
              <div className="flex flex-col items-center rounded-t-[1.75rem] border-b border-border/40 bg-card p-6 pt-10 text-center md:pt-12">
                <BusinessLogoBadge
                  src={b.logoUrl}
                  alt={`${b.name} logo`}
                  size="lg"
                  ringClassName="ring-4"
                  className="-mt-12 md:-mt-[4.5rem] relative z-20 mb-4 shadow-md"
                />
                <h1 className="mb-1 font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">{b.name}</h1>
                <BusinessTags business={b} accentColor={b.accentColor} variant="storefront" />
                {isInformationMode && copy.informationTagline && (
                  <p className="mt-2 text-sm text-muted-foreground">{copy.informationTagline}</p>
                )}
                {!isAppointmentMode && !isInformationMode && (
                  <p className="mb-2 text-xs text-muted-foreground">{paymentNote}</p>
                )}
                {isAppointmentMode && (
                  <Button
                    className={cn("mt-3 w-full", storefrontPrimaryButtonClass)}
                    onClick={handleBookAppointment}
                    data-testid="button-book-appointment"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {copy.primaryCtaLabel}
                  </Button>
                )}
                {isInformationMode && (
                  b.phone?.trim() ? (
                    <Button asChild className={cn("mt-3 w-full", storefrontPrimaryButtonClass)}>
                      <a href={`tel:${b.phone.replace(/\s/g, "")}`} data-testid="button-call-to-order">
                        <Phone className="mr-2 h-4 w-4" />
                        {contactCtaLabel}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-3 w-full rounded-full"
                      onClick={() => document.getElementById("business-contact")?.scrollIntoView({ behavior: "smooth" })}
                      data-testid="button-contact-business"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      {contactCtaLabel}
                    </Button>
                  )
                )}
              </div>

              <CardContent className="overflow-hidden rounded-b-[1.75rem] p-0">
                <div className="divide-y divide-border/40">
                  {b.description && (
                    <div className="p-5 text-sm leading-relaxed text-foreground/90">
                      {b.description}
                    </div>
                  )}

                  {(() => {
                    const hasContact =
                      Boolean(b.address) ||
                      Boolean(b.phone) ||
                      businessHours.hasHours;
                    if (!hasContact) return null;
                    return (
                  <div id="business-contact" className="space-y-4 p-5">
                    {b.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pt-1.5 text-foreground/80 transition-colors hover:text-primary"
                        >
                          {b.address}
                        </a>
                      </div>
                    )}
                    {b.phone && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Phone className="h-4 w-4" />
                        </span>
                        <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="pt-1.5 text-foreground/80 transition-colors hover:text-primary">
                          {b.phone}
                        </a>
                      </div>
                    )}
                    {businessHours.hasHours && (
                      <div className="flex items-start gap-3 text-sm">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 pt-1">
                          <BusinessHoursDisplay
                            structuredHours={businessHours.structuredHours}
                            fallbackHours={businessHours.fallbackHours}
                            showOpenNow
                          />
                        </div>
                      </div>
                    )}
                  </div>
                    );
                  })()}

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
                            {deliveryNotes && deliveryNotes !== deliveryInstructions && (
                              <p>{deliveryNotes}</p>
                            )}
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
                  {isMobileBusiness && upcomingLocations.length > 0 && (
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
          {showCatalogColumn && (
          <div className="order-2 md:mt-[3.25rem] md:w-2/3 lg:w-3/4">
            <div className="mb-4 md:pt-20">
              <h2 className="text-2xl font-serif font-bold text-foreground">{copy.catalogHeading}</h2>
              {copy.catalogSubtitle && (
                <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{copy.catalogSubtitle}</p>
              )}
            </div>
            {categories.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
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

            {showSpecialsSection ? (
              <div className="mb-10" data-testid="section-todays-special">
                <div className="mb-3">
                  <h3 className="font-serif text-xl font-bold text-foreground">Special of the day</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {specials.map((product) => (
                    <Card
                      key={`special-${product.id}`}
                      className="flex flex-col overflow-hidden rounded-[1.5rem] ring-1 ring-amber-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-10px_rgba(15,23,42,0.14)]"
                    >
                      {product.imageUrl && (
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        </div>
                      )}
                      <CardContent className="flex flex-1 flex-col p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold leading-tight tracking-tight text-foreground">{product.name}</h4>
                            {!product.available ? (
                              <Badge variant="secondary" className="mt-1.5 text-xs font-medium">
                                Sold out
                              </Badge>
                            ) : null}
                          </div>
                          {!isAppointmentMode && (
                            <span className="shrink-0 font-semibold text-primary">${product.price.toFixed(2)}</span>
                          )}
                        </div>
                        {product.description && (
                          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-4">
                          {product.prepTimeMinutes ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> {copy.prepTimeLabel(product.prepTimeMinutes)}
                            </span>
                          ) : (
                            <span />
                          )}
                          {!isInformationMode && (
                            product.available ? (
                              <LoadingButton
                                size="sm"
                                variant="default"
                                className={storefrontAddButtonClass}
                                onClick={() => void handleAddToCart(product)}
                                disabled={!b.active || addingProductId !== null}
                                loading={addingProductId === product.id}
                                loadingText="Adding…"
                              >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                {copy.addButtonLabel}
                              </LoadingButton>
                            ) : (
                              <Button size="sm" variant="secondary" className="rounded-full" disabled>
                                Sold out
                              </Button>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {showSpecialsSection && displayedProducts.length > 0 ? (
              <div className="mb-4 border-t border-border/50 pt-8">
                <h3 className="font-serif text-xl font-bold text-foreground">{copy.allItemsLabel}</h3>
              </div>
            ) : null}

            {displayedProducts.length === 0 ? (
              showSpecialsSection ? null : (
              <div className="rounded-[1.75rem] bg-card px-6 py-16 text-center shadow-[0_2px_24px_-6px_rgba(15,23,42,0.1)]">
                <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-30" />
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {categoryFilterEmpty ? copy.emptyCategoryTitle : copy.emptyTitle}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoryFilterEmpty ? copy.emptyCategoryDescription : copy.emptyDescription}
                </p>
                {!isInformationMode && !categoryFilterEmpty && b.phone?.trim() ? (
                  <Button asChild size="sm" className={cn("mt-6", storefrontPrimaryButtonClass)}>
                    <a href={`tel:${b.phone.replace(/\s/g, "")}`} data-testid="button-call-empty-shop">
                      <Phone className="mr-1 h-4 w-4" />
                      {contactCtaLabel}
                    </a>
                  </Button>
                ) : null}
              </div>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {displayedProducts.map((product) => (
                  <Card key={product.id} className="flex flex-col overflow-hidden rounded-[1.5rem] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-10px_rgba(15,23,42,0.14)]">
                    {product.imageUrl && (
                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                    )}
                    <CardContent className="flex flex-1 flex-col p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold leading-tight tracking-tight text-foreground">{product.name}</h4>
                          {!product.available ? (
                            <Badge variant="secondary" className="mt-1.5 text-xs font-medium">
                              Sold out
                            </Badge>
                          ) : null}
                        </div>
                        {!isAppointmentMode && (
                          <span className="shrink-0 font-semibold text-primary">${product.price.toFixed(2)}</span>
                        )}
                      </div>

                      {product.description && (
                        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-4">
                        {product.prepTimeMinutes ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {copy.prepTimeLabel(product.prepTimeMinutes)}
                          </span>
                        ) : (
                          <span />
                        )}
                        {!isInformationMode && (
                          product.available ? (
                            <LoadingButton
                              size="sm"
                              variant="default"
                              className={storefrontAddButtonClass}
                              onClick={() => void handleAddToCart(product)}
                              disabled={!b.active || addingProductId !== null}
                              loading={addingProductId === product.id}
                              loadingText="Adding…"
                            >
                              <Plus className="h-4 w-4" strokeWidth={2.5} />
                              {copy.addButtonLabel}
                            </LoadingButton>
                          ) : (
                            <Button size="sm" variant="secondary" className="rounded-full" disabled>
                              Sold out
                            </Button>
                          )
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
          services={products.filter((p) => p.available).map((p) => ({ id: p.id, name: p.name }))}
          initialProductId={appointmentProductId}
        />
      )}

      <ProductOptionsDialog
        product={optionsProduct}
        open={!!optionsProduct}
        onOpenChange={(open) => {
          if (!open) setOptionsProduct(null);
        }}
        onConfirm={handleConfirmOptions}
        loading={addingProductId !== null}
      />
    </BusinessThemeScope>
  );
}
