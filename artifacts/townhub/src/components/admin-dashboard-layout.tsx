import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Menu,
  Calendar,
  Sparkles,
  Layers,
  SlidersHorizontal,
  ClipboardList,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
                "cursor-pointer",
                active ? DASHBOARD_NAV_ACTIVE : DASHBOARD_NAV_IDLE,
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
    { href: "/dashboard/admin/highlights", label: "Spotlight", icon: Sparkles },
    { href: "/dashboard/admin/plans", label: "Plans", icon: Layers },
    { href: "/dashboard/admin/features", label: "Features", icon: Sparkles },
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
    <div className="flex min-h-[calc(100vh-var(--site-header-height,4rem))]">
      <aside className={DASHBOARD_SIDEBAR}>
        <div className="p-5 md:p-6">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Admin
          </p>
          <h2 className="mb-6 font-serif text-xl font-bold tracking-tight text-platform-heading">
            Platform
          </h2>
          <nav className="space-y-1">
            <NavLinks items={navItems} location={location} />
          </nav>
        </div>
      </aside>

      <div
        className={cn(
          "md:hidden fixed left-0 right-0 z-40 flex min-h-[3.5rem] items-center gap-3 border-b border-black/[0.04] bg-card/95 px-4 py-2 shadow-[0_1px_12px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md",
          DASHBOARD_MOBILE_NAV_TOP_CLASS,
        )}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-2xl"
              aria-label="Open sections menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-0 bg-card p-0">
            <SheetHeader className="px-6 pb-4 pt-[calc(1.5rem+var(--safe-area-top,0px))]">
              <SheetTitle className="text-left font-serif text-platform-heading">Platform Admin</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 px-3 pb-6">
              <NavLinks items={navItems} location={location} onNavigate={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-platform-heading">{activeLabel}</span>
      </div>

      <main className={cn(DASHBOARD_MAIN, "p-4 md:p-8 lg:p-10", DASHBOARD_MOBILE_MAIN_TOP_CLASS)}>
        {children}
      </main>
    </div>
  );
}
