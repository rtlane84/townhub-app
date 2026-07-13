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
import { StripeConnectAlertBanner } from "@/components/stripe-connect-alert-banner";
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
import { useKitchenDisplayMode } from "@/hooks/kitchen-display-mode";
import { isKitchenDisplayRoute } from "@/lib/kitchen-display-mode";
import { cn } from "@/lib/utils";
import { FeatureLockedPage, StorefrontModeRestrictedPage } from "@/components/locked-feature-modal";
import {
  DASHBOARD_MOBILE_MAIN_TOP_CLASS,
  DASHBOARD_MOBILE_NAV_TOP_CLASS,
} from "@/lib/platform-branding";
import {
  DASHBOARD_MAIN,
  DASHBOARD_NAV_ACTIVE,
  DASHBOARD_NAV_IDLE,
  DASHBOARD_SIDEBAR,
} from "@/lib/design-tokens";
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
          "w-full text-left",
          locked && "cursor-not-allowed opacity-60",
          !locked && "cursor-pointer",
          active && !locked ? DASHBOARD_NAV_ACTIVE : DASHBOARD_NAV_IDLE,
          active && locked && "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
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
  const { active: kitchenModeActive } = useKitchenDisplayMode();
  const onKitchenRoute = isKitchenDisplayRoute(location);

  const storefrontMode = resolveStorefrontMode(business ?? {});
  const visibleNavItems = useMemo(
    () => getVisibleBusinessHubNavItems(storefrontMode),
    [storefrontMode],
  );
  const appointmentsEnabled =
    hasFeature("appointment_requests") && isAppointmentStorefrontMode(business ?? {});
  const orderingEnabled =
    hasFeature("online_ordering") && isOrderingStorefrontMode(business ?? {});

  const showLiveStatus = isBusinessHubLiveEventsRoute(location) && !onKitchenRoute;
  const { status: liveStatus, usePollingFallback } = useBusinessLiveEvents(businessId);
  const liveIndicatorStatus = resolveLiveIndicatorStatus(liveStatus, usePollingFallback);

  const showOrderNotificationBanner =
    orderingEnabled && !isBusinessHubOrderLivePage(location) && !kitchenModeActive;
  const showAppointmentNotificationBanner =
    appointmentsEnabled && !isBusinessHubAppointmentLivePage(location) && !kitchenModeActive;

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
    <div
      className={cn(
        "flex min-h-[calc(100vh-var(--site-header-height,4rem))] print:block print:min-h-0",
        kitchenModeActive && "min-h-[100dvh]",
      )}
    >
      <aside className={cn(DASHBOARD_SIDEBAR, "print:hidden", kitchenModeActive && "hidden")}>
        <div className="p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                Dashboard
              </p>
              <h2 className="font-serif text-xl font-bold tracking-tight text-platform-heading">
                Business Hub
              </h2>
            </div>
            {showLiveStatus ? (
              <BusinessLiveStatusIndicator status={liveIndicatorStatus} className="shrink-0 pt-1" />
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
          "md:hidden fixed left-0 right-0 z-40 flex items-center gap-2 border-b border-black/[0.04] bg-card/95 px-3 shadow-[0_1px_12px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md print:hidden",
          onKitchenRoute ? "min-h-11 py-1.5" : "min-h-[3.5rem] px-4 py-2",
          DASHBOARD_MOBILE_NAV_TOP_CLASS,
          kitchenModeActive && "hidden",
        )}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "shrink-0 gap-1.5 rounded-2xl px-3",
                onKitchenRoute ? "min-h-9" : "min-h-10",
              )}
            >
              <Menu className="h-4 w-4" />
              <span className="text-xs font-medium">Sections</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 bg-card p-0">
            <SheetHeader className="px-6 pb-4 pt-[calc(1.5rem+var(--safe-area-top,0px))]">
              <SheetTitle className="text-left font-serif text-platform-heading">Business Hub</SheetTitle>
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
        <span className="truncate text-sm font-semibold text-platform-heading">
          {business?.name ?? activeLabel}
        </span>
        {showLiveStatus ? (
          <BusinessLiveStatusIndicator status={liveIndicatorStatus} className="ml-auto shrink-0" />
        ) : null}
      </div>

      <main
        className={cn(
          DASHBOARD_MAIN,
          kitchenModeActive
            ? "p-2 pt-[max(0.5rem,var(--safe-area-top,0px))] md:p-3 lg:p-4"
            : cn(
                "p-4 md:p-8 lg:p-10",
                onKitchenRoute ? "md:p-5 lg:p-6" : null,
                DASHBOARD_MOBILE_MAIN_TOP_CLASS,
              ),
          "print:p-0",
        )}
      >
        <div className="print:hidden">
          <StripeConnectAlertBanner />
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
