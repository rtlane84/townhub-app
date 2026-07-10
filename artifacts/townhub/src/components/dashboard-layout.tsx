import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Settings,
  Store,
  Menu,
  CreditCard,
  MapPin,
  CalendarDays,
  ChefHat,
  Lock,
  SlidersHorizontal,
  Bell,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiveOrderAlerts } from "@/hooks/use-live-order-alerts";
import { useLiveAppointmentAlerts } from "@/hooks/use-live-appointment-alerts";
import {
  BusinessLiveEventsProvider,
  useBusinessLiveEvents,
} from "@/hooks/business-live-events-provider";
import { BusinessLiveStatusIndicator } from "@/components/business-live-status-indicator";
import { resolveLiveIndicatorStatus } from "@/lib/business-live-indicator-status";
import { isBusinessHubAppointmentLivePage, isBusinessHubLiveEventsRoute, isBusinessHubOrderLivePage } from "@/lib/business-hub-features";
import { OrderDashboardRefreshProvider } from "@/hooks/order-dashboard-refresh-context";
import { NewOrderAlertBanner } from "@/components/new-order-alert-banner";
import { NewAppointmentAlertBanner } from "@/components/new-appointment-alert-banner";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { BusinessSwitcher } from "@/components/business-switcher";
import { useBusinessFeatureAccess } from "@/hooks/business-feature-access";
import {
  BUSINESS_HUB_NAV_ITEMS,
  BUSINESS_HUB_NAV_SECTIONS,
  getVisibleBusinessHubNavItems,
  isBusinessHubRouteHiddenByStorefrontMode,
  resolveBusinessHubFeatureKey,
  resolveBusinessHubNavItem,
  type BusinessHubNavItem,
} from "@/lib/business-hub-features";
import { cn } from "@/lib/utils";
import { FeatureLockedPage, StorefrontModeRestrictedPage } from "@/components/locked-feature-modal";
import {
  DASHBOARD_MOBILE_MAIN_TOP_CLASS,
  DASHBOARD_MOBILE_NAV_TOP_CLASS,
} from "@/lib/platform-branding";
import { isAppointmentStorefrontMode, isOrderingStorefrontMode, resolveStorefrontMode } from "@workspace/api-zod";

const NAV_ICONS = {
  "/dashboard/business": LayoutDashboard,
  "/dashboard/business/orders": ShoppingBag,
  "/dashboard/business/kitchen": ChefHat,
  "/dashboard/business/appointments": CalendarDays,
  "/dashboard/business/products": Store,
  "/dashboard/business/product-options": SlidersHorizontal,
  "/dashboard/business/categories": Tags,
  "/dashboard/business/locations": MapPin,
  "/dashboard/business/subscription": CreditCard,
  "/dashboard/business/notifications": Bell,
  "/dashboard/business/settings": Settings,
} as const;

type NavIconHref = keyof typeof NAV_ICONS;

function BusinessNavLinks({
  location,
  onNavigate,
  navItems,
}: {
  location: string;
  onNavigate?: () => void;
  navItems: BusinessHubNavItem[];
}) {
  const { hasFeature, openLockedFeature } = useBusinessFeatureAccess();

  return (
    <>
      {navItems.map((item) => {
        const Icon = NAV_ICONS[item.href as NavIconHref] ?? LayoutDashboard;
        const active =
          location === item.href ||
          (item.href !== "/dashboard/business" && location.startsWith(item.href + "/"));
        const locked = item.featureKey !== null && !hasFeature(item.featureKey);

        const className = cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
          locked && "opacity-60 cursor-not-allowed",
          !locked && "cursor-pointer",
          active && !locked && "bg-primary text-primary-foreground",
          !active && !locked && "text-muted-foreground hover:bg-muted hover:text-foreground",
          active && locked && "bg-muted text-muted-foreground",
        );

        const content = (
          <>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          </>
        );

        if (locked) {
          return (
            <button
              key={item.href}
              type="button"
              className={className}
              onClick={() => {
                onNavigate?.();
                if (item.featureKey) openLockedFeature(item.featureKey);
              }}
              aria-label={`${item.label} (locked)`}
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={item.href} href={item.href}>
            <span onClick={onNavigate} className={className}>
              {content}
            </span>
          </Link>
        );
      })}
    </>
  );
}

function BusinessNavSections({
  location,
  onNavigate,
  navItems,
}: {
  location: string;
  onNavigate?: () => void;
  navItems: BusinessHubNavItem[];
}) {
  const navByHref = useMemo(() => new Map(navItems.map((item) => [item.href, item])), [navItems]);

  return (
    <>
      {BUSINESS_HUB_NAV_SECTIONS.map((section, index) => {
        const sectionItems = section.hrefs
          .map((href) => navByHref.get(href))
          .filter((item): item is BusinessHubNavItem => Boolean(item));
        if (!sectionItems.length) return null;

        return (
          <div
            key={section.label}
            className={cn(index > 0 && "pt-4 mt-4 border-t border-border/50")}
            data-testid={`nav-section-${section.label.toLowerCase()}`}
          >
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
              {section.label}
            </p>
            <div className="space-y-1">
              <BusinessNavLinks location={location} navItems={sectionItems} onNavigate={onNavigate} />
            </div>
          </div>
        );
      })}
    </>
  );
}

export function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrderDashboardRefreshProvider>
      <BusinessDashboardLayoutWithLiveEvents>{children}</BusinessDashboardLayoutWithLiveEvents>
    </OrderDashboardRefreshProvider>
  );
}

function BusinessDashboardLayoutWithLiveEvents({ children }: { children: React.ReactNode }) {
  const { selectedBusinessId } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? undefined;

  return (
    <BusinessLiveEventsProvider businessId={businessId} enabled={!!businessId}>
      <BusinessDashboardLayoutInner>{children}</BusinessDashboardLayoutInner>
    </BusinessLiveEventsProvider>
  );
}

function BusinessDashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? undefined;
  const { hasFeature, getFeature, planName, isLoading: featureLoading } = useBusinessFeatureAccess();

  const storefrontMode = resolveStorefrontMode(business ?? {});
  const visibleNavItems = useMemo(
    () => getVisibleBusinessHubNavItems(storefrontMode),
    [storefrontMode],
  );
  const appointmentsEnabled =
    hasFeature("appointment_requests") && isAppointmentStorefrontMode(business ?? {});
  const orderingEnabled =
    hasFeature("online_ordering") && isOrderingStorefrontMode(business ?? {});

  const showLiveStatus = isBusinessHubLiveEventsRoute(location);
  const { status: liveStatus, usePollingFallback } = useBusinessLiveEvents(businessId);
  const liveIndicatorStatus = resolveLiveIndicatorStatus(liveStatus, usePollingFallback);

  const showOrderNotificationBanner =
    orderingEnabled && !isBusinessHubOrderLivePage(location);
  const showAppointmentNotificationBanner =
    appointmentsEnabled && !isBusinessHubAppointmentLivePage(location);

  useLiveOrderAlerts(orderingEnabled ? businessId : undefined);
  useLiveAppointmentAlerts(businessId, appointmentsEnabled);

  const routeFeatureKey = useMemo(() => resolveBusinessHubFeatureKey(location), [location]);
  const routeNavItem = useMemo(() => resolveBusinessHubNavItem(location), [location]);
  const routeHiddenByStorefrontMode = useMemo(
    () => isBusinessHubRouteHiddenByStorefrontMode(location, storefrontMode),
    [location, storefrontMode],
  );
  const routeLocked =
    !featureLoading && routeFeatureKey !== null && !hasFeature(routeFeatureKey);

  const activeLabel =
    routeNavItem?.label ??
    BUSINESS_HUB_NAV_ITEMS.find(
      (item) =>
        location === item.href ||
        (item.href !== "/dashboard/business" && location.startsWith(item.href + "/")),
    )?.label ??
    "Business Hub";

  return (
    <div className="flex min-h-[calc(100vh-var(--site-header-height,4rem))] print:block print:min-h-0">
      <aside className="w-64 border-r bg-muted/10 hidden md:block shrink-0 print:hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h2 className="font-serif font-bold text-lg">Business Hub</h2>
            {showLiveStatus ? (
              <BusinessLiveStatusIndicator status={liveIndicatorStatus} className="shrink-0 pt-0.5" />
            ) : null}
          </div>
          <BusinessSwitcher />
          <nav className="mt-6">
            <BusinessNavSections location={location} navItems={visibleNavItems} />
          </nav>
        </div>
      </aside>

      <div
        className={cn(
          "md:hidden fixed left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 bg-background border-b shadow-sm print:hidden",
          DASHBOARD_MOBILE_NAV_TOP_CLASS,
        )}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-10 gap-1.5 px-3 shrink-0">
              <Menu className="h-4 w-4" />
              <span className="text-xs font-medium">Sections</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="font-serif text-left">Business Hub</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-4">
              <BusinessSwitcher compact onNavigate={() => setOpen(false)} />
            </div>
            <nav className="px-3 pb-6">
              <BusinessNavSections
                location={location}
                navItems={visibleNavItems}
                onNavigate={() => setOpen(false)}
              />
            </nav>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold truncate">{business?.name ?? activeLabel}</span>
        {showLiveStatus ? (
          <BusinessLiveStatusIndicator status={liveIndicatorStatus} className="ml-auto shrink-0" />
        ) : null}
      </div>

      <main className={cn("flex-1 p-4 md:p-10 print:p-0 overflow-x-hidden", DASHBOARD_MOBILE_MAIN_TOP_CLASS)}>
        <div className="print:hidden">
          {showOrderNotificationBanner ? <NewOrderAlertBanner /> : null}
          {showAppointmentNotificationBanner ? <NewAppointmentAlertBanner /> : null}
        </div>
        {routeHiddenByStorefrontMode && routeNavItem ? (
          <StorefrontModeRestrictedPage
            sectionLabel={routeNavItem.label}
            currentMode={storefrontMode}
          />
        ) : routeLocked && routeFeatureKey ? (
          <FeatureLockedPage
            featureKey={routeFeatureKey}
            feature={getFeature(routeFeatureKey)}
            planName={planName}
          />
        ) : (
          children
        )}
      </main>
    </div>
  );
}

// Admin layout unchanged below — re-export from same file
export { AdminDashboardLayout } from "./admin-dashboard-layout";
