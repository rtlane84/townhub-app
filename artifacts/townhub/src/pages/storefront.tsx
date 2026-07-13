import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import {
  useGetBusinessBySlug,
  useListFoodTruckLocations,
  getListFoodTruckLocationsQueryKey,
  getGetBusinessBySlugQueryKey,
  type Product,
} from "@workspace/api-client-react";
import {
  MapPin,
  Phone,
  Store,
  ShoppingBag,
  Plus,
  ArrowLeft,
  Info,
  Truck,
  CalendarDays,
  Megaphone,
  Globe,
  Navigation,
  Share,
  type LucideIcon,
} from "lucide-react";
import {
  resolvePaymentMode,
  paymentModeStorefrontNote,
  resolveStorefrontMode,
  storefrontCopy,
  isAppointmentStorefrontMode,
  isInformationStorefrontMode,
  isOrderingStorefrontMode,
  showsStorefrontCatalog,
  informationPrimaryCtaLabel,
  formatTimeRange12h,
  normalizeWebsiteUrl,
  formatBusinessTypeLabel,
} from "@workspace/api-zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCart } from "@/components/cart-context";
import { useToast } from "@/hooks/use-toast";
import { AppointmentBookingDialog } from "@/components/appointment-booking-dialog";
import { ProductOptionsDialog } from "@/components/product-options-dialog";
import { BusinessThemeScope } from "@/components/business-theme-scope";
import { StorefrontDetailHeader } from "@/components/storefront-detail-header";
import { StorefrontHoursCard } from "@/components/storefront-hours-card";
import { StorefrontLocationCard } from "@/components/storefront-location-card";
import { resolveBusinessHours } from "@/lib/business-hours";
import { getStorefrontStatusLine } from "@/lib/business-listing";
import {
  googleMapsDirectionsUrl,
  isBusinessFavorited,
  resolveStorefrontPresence,
  shareStorefrontPage,
  toggleFavoriteBusiness,
} from "@/lib/storefront-presence";
import { cn } from "@/lib/utils";
import { triggerNativeHaptic } from "@/lib/native-haptics";
import { isNativeApp } from "@/lib/native-platform";

const categoryPillActiveClass =
  "rounded-full whitespace-nowrap bg-platform-button text-white border-0 !shadow-none outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-platform-button hover:text-white hover:!shadow-none active:!shadow-none";

const storefrontPrimaryButtonClass =
  "rounded-full bg-[var(--platform-heading,#1e3a5f)] text-white border-0 shadow-[0_2px_12px_-2px_rgba(30,58,138,0.35)] hover:opacity-90 hover:text-white";

const storefrontAddButtonClass =
  "h-9 min-w-[4.75rem] gap-1 rounded-full bg-platform-button px-3.5 text-[12px] font-semibold tracking-tight text-white border-0 shadow-[0_4px_14px_-4px_rgba(30,58,138,0.45)] transition-all duration-200 hover:bg-platform-button/90 hover:text-white active:scale-[0.96] disabled:opacity-45";

const categoryPillInactiveClass =
  "rounded-full whitespace-nowrap border-0 bg-card text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] hover:bg-muted outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

function QuickAction({
  label,
  icon: Icon,
  href,
  onClick,
  external,
}: {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}) {
  const className = "flex w-[3.35rem] flex-col items-center gap-1 text-center";
  const circleClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-card text-foreground shadow-sm ring-1 ring-black/[0.04] transition-colors hover:bg-muted active:scale-[0.96]";

  const inner = (
    <>
      <span className={circleClass}>
        <Icon className="h-4 w-4" strokeWidth={1.85} aria-hidden />
      </span>
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={className}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

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
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentProductId, setAppointmentProductId] = useState<number | null>(null);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null);
  const [favorited, setFavorited] = useState(false);
  const addToCartLockRef = useRef(false);

  useEffect(() => {
    if (business?.id) {
      setFavorited(isBusinessFavorited(business.id));
    }
  }, [business?.id]);

  if (isLoading) {
    return (
      <div className="animate-pulse pb-8">
        <div className="h-12 border-b border-black/[0.04] bg-background" />
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <Skeleton className="aspect-[16/10] w-full rounded-[1.5rem]" />
          <Skeleton className="mt-6 h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Skeleton className="h-40 rounded-[1.35rem]" />
            <Skeleton className="h-40 rounded-[1.35rem]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <Store className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-30" />
        <h1 className="mb-2 font-serif text-2xl font-bold">Business not found</h1>
        <p className="mb-6 text-muted-foreground">
          We couldn&apos;t find the storefront you&apos;re looking for.
        </p>
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
  const statusLine = getStorefrontStatusLine(b);
  const presence = resolveStorefrontPresence({
    address: b.address,
    isMobileBusiness,
    eventLocationEnabled: bx.eventLocationEnabled as boolean | undefined,
  });

  const bannerText = bx.bannerText as string | undefined;
  const pickupEnabled = b.pickupEnabled === true;
  const deliveryEnabled = b.deliveryEnabled === true;
  const pickupInstructions = pickupEnabled
    ? (bx.pickupInstructions as string | undefined)
    : undefined;
  const deliveryInstructions = deliveryEnabled
    ? (bx.deliveryInstructions as string | undefined)
    : undefined;
  const deliveryNotes = deliveryEnabled
    ? (bx.deliveryNotes as string | undefined)
    : undefined;
  const minimumOrderForDelivery = deliveryEnabled
    ? (bx.minimumOrderForDelivery as number | undefined)
    : undefined;
  const deliveryRadiusMiles = deliveryEnabled
    ? (bx.deliveryRadiusMiles as number | undefined)
    : undefined;

  const today = new Date().toISOString().slice(0, 10);
  const upcomingLocations = foodTruckLocations
    .filter((l) => l.isActive && l.locationDate >= today)
    .slice(0, 5);

  const specials = products.filter((p) => p.featured && p.available !== false);
  const paymentNote = paymentModeStorefrontNote(resolvePaymentMode(b));
  const storefrontMode = resolveStorefrontMode(b);
  const isAppointmentMode = isAppointmentStorefrontMode(b);
  const isInformationMode = isInformationStorefrontMode(b);
  const isOrderingMode = isOrderingStorefrontMode(b);
  const showCatalog = showsStorefrontCatalog(storefrontMode);
  const copy = storefrontCopy(storefrontMode);
  const displayedProducts = (
    activeCategory
      ? products.filter((p) => p.categoryId === activeCategory)
      : products
  ).filter((p) => {
    if (activeCategory === null && p.featured) return false;
    return true;
  });
  const catalogFullyEmpty = products.length === 0;
  const showSpecialsSection =
    showCatalog && specials.length > 0 && activeCategory === null;
  const categoryFilterEmpty =
    !catalogFullyEmpty &&
    displayedProducts.length === 0 &&
    !(showSpecialsSection && specials.length > 0);
  const contactCtaLabel = informationPrimaryCtaLabel(!!b.phone?.trim());
  const websiteUrl = normalizeWebsiteUrl(bx.websiteUrl as string | undefined);
  const showWebsiteLink = !!websiteUrl;
  const showCatalogSection = showCatalog && !catalogFullyEmpty;
  const commerceHeading = isAppointmentMode
    ? "Services"
    : isInformationMode
      ? "Menu"
      : "Shop";

  const typeLabel = formatBusinessTypeLabel(b.type);
  const phoneDigits = b.phone?.trim()?.replace(/[^\d+]/g, "") || null;
  const address = b.address?.trim() || null;
  const pageUrl =
    typeof window !== "undefined" ? window.location.href : `/businesses/${b.slug}`;

  const primaryCta = (() => {
    if (isOrderingMode) {
      return {
        label: "Order Now",
        icon: ShoppingBag,
        onClick: () =>
          document
            .getElementById("storefront-commerce")
            ?.scrollIntoView({ behavior: "smooth" }),
      };
    }
    if (isAppointmentMode) {
      return {
        label: "Book Now",
        icon: CalendarDays,
        onClick: () => openAppointmentDialog(),
      };
    }
    if (showCatalogSection) {
      return {
        label: "View Menu",
        icon: ShoppingBag,
        onClick: () =>
          document
            .getElementById("storefront-commerce")
            ?.scrollIntoView({ behavior: "smooth" }),
      };
    }
    if (phoneDigits) {
      return {
        label: contactCtaLabel,
        icon: Phone,
        href: `tel:${phoneDigits}`,
      };
    }
    return null;
  })();

  function openAppointmentDialog(productId?: number) {
    setAppointmentProductId(productId ?? null);
    setAppointmentOpen(true);
  }

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
      toast({
        title: copy.addToastTitle,
        description: copy.addToastDescription(product.name),
      });
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

  async function handleShare() {
    const result = await shareStorefrontPage({
      title: b.name,
      text: `Check out ${b.name} on TownHub`,
      url: pageUrl,
    });
    if (result === "copied") {
      toast({ title: "Link copied", description: "Storefront link copied to clipboard." });
    } else if (result === "failed") {
      // Abort or unavailable — stay quiet unless clipboard failed after share cancel
    }
  }

  function handleToggleFavorite() {
    const next = toggleFavoriteBusiness(b.id);
    setFavorited(next);
    if (isNativeApp()) triggerNativeHaptic("light");
  }

  return (
    <BusinessThemeScope business={b} className="min-h-0 bg-[hsl(220_16%_94%)] pb-8">
      <StorefrontDetailHeader
        favorited={favorited}
        onShare={() => void handleShare()}
        onToggleFavorite={handleToggleFavorite}
      />

      {bannerText?.trim() ? (
        <div className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary via-primary to-primary/90">
          <div className="relative mx-auto flex max-w-3xl items-center justify-center gap-2.5 px-4 py-2.5 text-center">
            <Megaphone
              className="hidden h-4 w-4 shrink-0 text-primary-foreground/85 sm:block"
              aria-hidden
            />
            <p className="text-sm font-medium tracking-tight text-primary-foreground">
              {bannerText.trim()}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-3 pt-3 pb-2 sm:px-4">
        <div className="rounded-[1.5rem] bg-card shadow-[0_8px_32px_-12px_rgba(15,23,42,0.16)] ring-1 ring-black/[0.04]">
          {/* Hero — overflow clipped here so the logo can hang over the content seam */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-t-[1.5rem] bg-muted sm:aspect-[2/1]">
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
              <div className="flex size-full items-center justify-center bg-primary/10">
                <Store className="h-14 w-14 text-primary/30" aria-hidden />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          </div>

          {/* Logo overlaps hero → white sheet seam */}
          <div className="relative z-10 -mt-7 ml-4 sm:-mt-8 sm:ml-5">
            <div className="flex h-[4rem] w-[4rem] items-center justify-center overflow-hidden rounded-[1rem] border-[3px] border-card bg-card shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25)] sm:h-[4.5rem] sm:w-[4.5rem]">
              {b.logoUrl ? (
                <img
                  src={b.logoUrl}
                  alt={`${b.name} logo`}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Store className="h-7 w-7 text-primary/40" aria-hidden />
              )}
            </div>
          </div>

          {/* Content sheet */}
          <div className="px-4 pb-6 pt-3 sm:px-5 sm:pt-3.5">
            {/* Name + primary CTA / quick actions column */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[1.65rem] font-bold leading-tight tracking-tight text-platform-heading sm:text-3xl">
                  {b.name}
                </h1>
                {statusLine ? (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px]">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-semibold",
                        statusLine.isOpen ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          statusLine.isOpen ? "bg-emerald-500" : "bg-red-500",
                        )}
                        aria-hidden
                      />
                      {statusLine.statusLabel}
                    </span>
                    {statusLine.scheduleLabel ? (
                      <span className="text-muted-foreground">
                        · {statusLine.scheduleLabel}
                      </span>
                    ) : null}
                  </p>
                ) : b.active === false ? (
                  <p className="mt-1.5 text-[13px] font-semibold text-red-600">
                    Closed
                  </p>
                ) : null}
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {typeLabel}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-3">
                {primaryCta
                  ? (() => {
                      const CtaIcon = primaryCta.icon;
                      if (primaryCta.href) {
                        return (
                          <Button
                            asChild
                            className={cn(
                              "shrink-0",
                              storefrontPrimaryButtonClass,
                            )}
                          >
                            <a
                              href={primaryCta.href}
                              data-testid="button-storefront-primary"
                            >
                              <CtaIcon className="mr-1.5 h-4 w-4" aria-hidden />
                              {primaryCta.label}
                            </a>
                          </Button>
                        );
                      }
                      return (
                        <Button
                          className={cn(
                            "shrink-0",
                            storefrontPrimaryButtonClass,
                          )}
                          onClick={primaryCta.onClick}
                          data-testid="button-storefront-primary"
                        >
                          <CtaIcon className="mr-1.5 h-4 w-4" aria-hidden />
                          {primaryCta.label}
                        </Button>
                      );
                    })()
                  : null}

                <div className="flex flex-wrap justify-end gap-2.5">
                  {phoneDigits ? (
                    <QuickAction
                      label="Call"
                      icon={Phone}
                      href={`tel:${phoneDigits}`}
                    />
                  ) : null}
                  {address && presence === "physical" ? (
                    <QuickAction
                      label="Directions"
                      icon={Navigation}
                      href={googleMapsDirectionsUrl(address)}
                      external
                    />
                  ) : null}
                  {showWebsiteLink && websiteUrl ? (
                    <QuickAction
                      label="Website"
                      icon={Globe}
                      href={websiteUrl}
                      external
                    />
                  ) : null}
                  <QuickAction
                    label="Share"
                    icon={Share}
                    onClick={() => void handleShare()}
                  />
                </div>
              </div>
            </div>

            {!isAppointmentMode && !isInformationMode && paymentNote ? (
              <p className="mt-2 text-xs text-muted-foreground">{paymentNote}</p>
            ) : null}
            {isInformationMode && copy.informationTagline ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {copy.informationTagline}
              </p>
            ) : null}

            {b.description ? (
              <p className="mt-4 text-sm leading-relaxed text-foreground/85">
                {b.description}
              </p>
            ) : null}

            {/* Hours + Location — side by side on all widths */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <StorefrontHoursCard
                structuredHours={businessHours.structuredHours}
                fallbackHours={businessHours.fallbackHours}
                hasHours={businessHours.hasHours}
                phone={b.phone}
              />
              <StorefrontLocationCard
                presence={presence}
                address={b.address}
                upcomingLocations={upcomingLocations}
                todayIso={today}
              />
            </div>

        {/* Fulfillment notes */}
        {!isAppointmentMode &&
        !isInformationMode &&
        (pickupInstructions ||
          deliveryInstructions ||
          deliveryNotes ||
          minimumOrderForDelivery ||
          deliveryRadiusMiles) ? (
          <div className="mt-4 space-y-2">
            {pickupInstructions ? (
              <div className="flex items-start gap-2 rounded-[1.15rem] border border-black/[0.05] bg-card p-3 text-xs text-muted-foreground shadow-sm">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div>
                  <span className="mb-0.5 block font-medium text-foreground">
                    Pickup
                  </span>
                  {pickupInstructions}
                </div>
              </div>
            ) : null}
            {(deliveryInstructions ||
              deliveryNotes ||
              minimumOrderForDelivery ||
              deliveryRadiusMiles) && (
              <div className="flex items-start gap-2 rounded-[1.15rem] border border-black/[0.05] bg-card p-3 text-xs text-muted-foreground shadow-sm">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <span className="block font-medium text-foreground">
                    Delivery
                  </span>
                  {deliveryInstructions ? <p>{deliveryInstructions}</p> : null}
                  {deliveryNotes && deliveryNotes !== deliveryInstructions ? (
                    <p>{deliveryNotes}</p>
                  ) : null}
                  {minimumOrderForDelivery ? (
                    <p>Minimum ${minimumOrderForDelivery.toFixed(2)} for delivery</p>
                  ) : null}
                  {deliveryRadiusMiles ? (
                    <p>Within {deliveryRadiusMiles} miles</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Full upcoming stops for mobile */}
        {isMobileBusiness && upcomingLocations.length > 0 ? (
          <section id="upcoming-stops" className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-[15px] font-bold tracking-tight text-platform-heading">
                Upcoming stops
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {upcomingLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="min-w-0 rounded-[1.1rem] border border-black/[0.05] bg-card px-3 py-3 text-sm shadow-[0_1px_4px_rgba(15,23,42,0.04)]"
                >
                  <p className="line-clamp-2 font-semibold text-foreground">
                    {loc.locationName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {loc.locationDate === today ? (
                      <span className="font-medium text-primary">Today</span>
                    ) : (
                      loc.locationDate
                    )}
                    {formatTimeRange12h(loc.startTime, loc.endTime)
                      ? ` · ${formatTimeRange12h(loc.startTime, loc.endTime)}`
                      : ""}
                  </p>
                  {loc.address ? (
                    <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      <span className="line-clamp-2">{loc.address}</span>
                    </p>
                  ) : null}
                  {loc.locationNotes ? (
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                      {loc.locationNotes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Commerce */}
        {showCatalogSection ? (
          <section id="storefront-commerce" className="mt-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="flex items-center gap-1.5 text-[17px] font-bold tracking-tight text-platform-heading">
                <ShoppingBag className="h-4 w-4 text-primary" aria-hidden />
                {commerceHeading}
              </h2>
            </div>
            {copy.catalogSubtitle ? (
              <p className="mb-3 text-sm text-muted-foreground">
                {copy.catalogSubtitle}
              </p>
            ) : null}

            {categories.length > 0 ? (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <Button
                  variant="ghost"
                  onClick={() => setActiveCategory(null)}
                  className={
                    activeCategory === null
                      ? categoryPillActiveClass
                      : categoryPillInactiveClass
                  }
                  size="sm"
                >
                  {copy.allItemsLabel}
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    onClick={() => setActiveCategory(cat.id)}
                    className={
                      activeCategory === cat.id
                        ? categoryPillActiveClass
                        : categoryPillInactiveClass
                    }
                    size="sm"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            ) : null}

            {showSpecialsSection ? (
              <div className="mb-6" data-testid="section-todays-special">
                <h3 className="mb-3 text-[15px] font-bold text-platform-heading">
                  Special of the day
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory hide-scrollbar">
                  {specials.map((product) => (
                    <ProductCard
                      key={`special-${product.id}`}
                      product={product}
                      isAppointmentMode={isAppointmentMode}
                      isInformationMode={isInformationMode}
                      businessActive={b.active !== false}
                      addingProductId={addingProductId}
                      addLabel={copy.addButtonLabel}
                      onAdd={() => void handleAddToCart(product)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {displayedProducts.length === 0 ? (
              showSpecialsSection ? null : (
                <div className="rounded-[1.5rem] bg-card px-6 py-14 text-center shadow-[0_2px_24px_-6px_rgba(15,23,42,0.1)]">
                  <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-30" />
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    {categoryFilterEmpty
                      ? copy.emptyCategoryTitle
                      : copy.emptyTitle}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {categoryFilterEmpty
                      ? copy.emptyCategoryDescription
                      : copy.emptyDescription}
                  </p>
                  {!isInformationMode &&
                  !categoryFilterEmpty &&
                  phoneDigits ? (
                    <Button
                      asChild
                      size="sm"
                      className={cn("mt-6", storefrontPrimaryButtonClass)}
                    >
                      <a
                        href={`tel:${phoneDigits}`}
                        data-testid="button-call-empty-shop"
                      >
                        <Phone className="mr-1 h-4 w-4" />
                        {contactCtaLabel}
                      </a>
                    </Button>
                  ) : null}
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {displayedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isAppointmentMode={isAppointmentMode}
                    isInformationMode={isInformationMode}
                    businessActive={b.active !== false}
                    addingProductId={addingProductId}
                    addLabel={copy.addButtonLabel}
                    onAdd={() => void handleAddToCart(product)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : catalogFullyEmpty && showCatalog ? (
          <section id="storefront-commerce" className="mt-8">
            <div className="rounded-[1.5rem] bg-card px-6 py-14 text-center shadow-[0_2px_24px_-6px_rgba(15,23,42,0.1)]">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-30" />
              <h3 className="font-serif text-lg font-bold text-foreground">
                {isAppointmentMode
                  ? "Services not posted yet"
                  : isInformationMode
                    ? "Menu not posted yet"
                    : copy.emptyTitle}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.emptyDescription}
              </p>
              {!isInformationMode && phoneDigits ? (
                <Button
                  asChild
                  size="sm"
                  className={cn("mt-6", storefrontPrimaryButtonClass)}
                >
                  <a
                    href={`tel:${phoneDigits}`}
                    data-testid="button-call-empty-shop"
                  >
                    <Phone className="mr-1 h-4 w-4" />
                    {contactCtaLabel}
                  </a>
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}
          </div>
        </div>
      </div>

      {isAppointmentMode ? (
        <AppointmentBookingDialog
          open={appointmentOpen}
          onOpenChange={(open) => {
            setAppointmentOpen(open);
            if (!open) setAppointmentProductId(null);
          }}
          businessId={b.id}
          businessName={b.name}
          services={products
            .filter((p) => p.available)
            .map((p) => ({ id: p.id, name: p.name }))}
          initialProductId={appointmentProductId}
        />
      ) : null}

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

function ProductCard({
  product,
  isAppointmentMode,
  isInformationMode,
  businessActive,
  addingProductId,
  addLabel,
  onAdd,
  compact = false,
}: {
  product: Product;
  isAppointmentMode: boolean;
  isInformationMode: boolean;
  businessActive: boolean;
  addingProductId: number | null;
  addLabel: string;
  onAdd: () => void;
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.06] shadow-[0_2px_10px_-6px_rgba(15,23,42,0.12)]",
        compact && "w-[9.5rem] shrink-0 snap-start sm:w-[11rem]",
      )}
    >
      {product.imageUrl ? (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted/60">
          <ShoppingBag className="h-7 w-7 text-muted-foreground/40" aria-hidden />
        </div>
      )}
      <CardContent className="flex flex-1 flex-col p-3">
        <h4 className="line-clamp-2 text-[13px] font-bold uppercase leading-snug tracking-tight text-foreground">
          {product.name}
        </h4>
        {!product.available ? (
          <Badge variant="secondary" className="mt-1.5 w-fit text-[10px]">
            Sold out
          </Badge>
        ) : null}
        {!isAppointmentMode ? (
          <p className="mt-1 text-[13px] font-semibold text-amber-700">
            ${product.price.toFixed(2)}
          </p>
        ) : null}
        {!isInformationMode ? (
          <div className="mt-auto pt-2.5">
            {product.available ? (
              <LoadingButton
                size="sm"
                variant="default"
                className={storefrontAddButtonClass}
                onClick={onAdd}
                disabled={!businessActive || addingProductId !== null}
                loading={addingProductId === product.id}
                loadingText="…"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                {addLabel}
              </LoadingButton>
            ) : (
              <Button size="sm" variant="secondary" className="h-9 rounded-full" disabled>
                Sold out
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
