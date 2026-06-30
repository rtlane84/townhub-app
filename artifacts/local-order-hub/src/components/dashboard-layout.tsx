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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLiveOrderAlerts } from "@/hooks/use-live-order-alerts";
import { useLiveAppointmentAlerts } from "@/hooks/use-live-appointment-alerts";
import { OrderDashboardRefreshProvider } from "@/hooks/order-dashboard-refresh-context";
import { OrderAlertControls } from "@/components/order-alert-controls";
import { NewOrderAlertBanner } from "@/components/new-order-alert-banner";
import { NewAppointmentAlertBanner } from "@/components/new-appointment-alert-banner";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { BusinessSwitcher } from "@/components/business-switcher";
import { useBusinessFeatureAccess } from "@/hooks/business-feature-access";
import {
  BUSINESS_HUB_NAV_ITEMS,
  resolveBusinessHubFeatureKey,
} from "@/lib/business-hub-features";
import { FeatureLockedPage } from "@/components/locked-feature-modal";

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
  "/dashboard/business/settings": Settings,
} as const;

type NavIconHref = keyof typeof NAV_ICONS;

function BusinessNavLinks({
  location,
  onNavigate,
}: {
  location: string;
  onNavigate?: () => void;
}) {
  const { hasFeature, openLockedFeature } = useBusinessFeatureAccess();

  return (
    <>
      {BUSINESS_HUB_NAV_ITEMS.map((item) => {
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

export function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrderDashboardRefreshProvider>
      <BusinessDashboardLayoutInner>{children}</BusinessDashboardLayoutInner>
    </OrderDashboardRefreshProvider>
  );
}

function BusinessDashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { selectedBusinessId, business } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? undefined;
  const { hasFeature, getFeature, planName, isLoading } = useBusinessFeatureAccess();

  useLiveOrderAlerts(businessId);
  useLiveAppointmentAlerts(businessId, hasFeature("appointment_requests"));

  const routeFeatureKey = useMemo(() => resolveBusinessHubFeatureKey(location), [location]);
  const routeLocked =
    !isLoading && routeFeatureKey !== null && !hasFeature(routeFeatureKey);

  const activeLabel =
    BUSINESS_HUB_NAV_ITEMS.find(
      (item) =>
        location === item.href ||
        (item.href !== "/dashboard/business" && location.startsWith(item.href + "/")),
    )?.label ?? "Business Hub";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] print:block print:min-h-0">
      <aside className="w-64 border-r bg-muted/10 hidden md:block shrink-0 print:hidden">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-4">Business Hub</h2>
          <BusinessSwitcher />
          <nav className="space-y-1 mt-6">
            <BusinessNavLinks location={location} />
          </nav>
          <div className="mt-8">
            <OrderAlertControls />
          </div>
        </div>
      </aside>

      <div className="md:hidden fixed top-16 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 bg-background border-b shadow-sm print:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="font-serif text-left">Business Hub</SheetTitle>
            </SheetHeader>
            <div className="px-6 pb-4">
              <BusinessSwitcher compact />
            </div>
            <nav className="px-3 space-y-1">
              <BusinessNavLinks location={location} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="px-3 mt-6 pb-6">
              <OrderAlertControls compact />
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold truncate">{business?.name ?? activeLabel}</span>
      </div>

      <main className="flex-1 p-4 pt-20 md:pt-0 md:p-10 print:p-0">
        <div className="print:hidden">
          <NewOrderAlertBanner />
          <NewAppointmentAlertBanner />
        </div>
        {routeLocked && routeFeatureKey ? (
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
