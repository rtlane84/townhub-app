import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Tags, Settings, Store, Users, Menu, CreditCard, Calendar, Sparkles, MapPin, Layers, SlidersHorizontal, ClipboardList, CalendarDays, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useGetMe, useGetMyBusiness } from "@workspace/api-client-react";
import { acceptsAppointmentRequests } from "@workspace/api-zod";
import { useLiveOrderAlerts } from "@/hooks/use-live-order-alerts";
import { OrderDashboardRefreshProvider } from "@/hooks/order-dashboard-refresh-context";
import { OrderAlertControls } from "@/components/order-alert-controls";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

function NavLinks({ items, location, onNavigate }: { items: NavItem[]; location: string; onNavigate?: () => void }) {
  return (
    <>
      {items.map((item) => {
        const active =
          location === item.href ||
          (item.href !== "/dashboard/business" &&
            item.href !== "/dashboard/admin" &&
            location.startsWith(item.href + "/"));
        return (
          <Link key={item.href} href={item.href}>
            <span
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
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
  const { data: me } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const businessId = me?.businessId ?? undefined;

  useLiveOrderAlerts(businessId);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { href: "/dashboard/business", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/business/orders", label: "Orders", icon: ShoppingBag },
    ];
    if (acceptsAppointmentRequests(business ?? {})) {
      items.push({ href: "/dashboard/business/appointments", label: "Appointments", icon: CalendarDays });
    }
    items.push(
      { href: "/dashboard/business/products", label: "Products", icon: Store },
      { href: "/dashboard/business/categories", label: "Categories", icon: Tags },
      { href: "/dashboard/business/locations", label: "Locations", icon: MapPin },
      { href: "/dashboard/business/billing", label: "Billing", icon: CreditCard },
      { href: "/dashboard/business/settings", label: "Settings", icon: Settings },
    );
    return items;
  }, [business?.type, business?.storefrontMode]);

  const activeLabel =
    navItems.find(
      (item) =>
        location === item.href ||
        (item.href !== "/dashboard/business" && location.startsWith(item.href + "/")),
    )?.label ?? "Business Hub";

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r bg-muted/10 hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-6">Business Hub</h2>
          <nav className="space-y-1">
            <NavLinks items={navItems} location={location} />
          </nav>
          <div className="mt-8">
            <OrderAlertControls />
          </div>
        </div>
      </aside>

      {/* Mobile top bar with hamburger */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 bg-background border-b shadow-sm">
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
            <nav className="px-3 space-y-1">
              <NavLinks items={navItems} location={location} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="px-3 mt-6 pb-6">
              <OrderAlertControls compact />
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">{activeLabel}</span>
      </div>

      <main className="flex-1 p-4 pt-20 md:pt-0 md:p-10">
        {children}
      </main>
    </div>
  );
}

export function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/applications", label: "Applications", icon: ClipboardList },
    { href: "/dashboard/admin/businesses", label: "Businesses", icon: Store },
    { href: "/dashboard/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard/admin/users", label: "Users", icon: Users },
    { href: "/dashboard/admin/events", label: "Events", icon: Calendar },
    { href: "/dashboard/admin/highlights", label: "Highlights", icon: Sparkles },
    { href: "/dashboard/admin/plans", label: "Plans", icon: Layers },
    { href: "/dashboard/admin/system-status", label: "System Status", icon: Activity },
    { href: "/dashboard/admin/settings", label: "Settings", icon: SlidersHorizontal },
  ];

  const activeLabel =
    navItems.find(
      (item) =>
        location === item.href ||
        (item.href !== "/dashboard/admin" && location.startsWith(item.href + "/")),
    )?.label ?? "Platform Admin";

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r bg-muted/10 hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-6">Platform Admin</h2>
          <nav className="space-y-1">
            <NavLinks items={navItems} location={location} />
          </nav>
        </div>
      </aside>

      {/* Mobile top bar with hamburger */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 bg-background border-b shadow-sm">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle className="font-serif text-left">Platform Admin</SheetTitle>
            </SheetHeader>
            <nav className="px-3 space-y-1">
              <NavLinks items={navItems} location={location} onNavigate={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">{activeLabel}</span>
      </div>

      <main className="flex-1 p-4 pt-20 md:pt-0 md:p-10">
        {children}
      </main>
    </div>
  );
}
