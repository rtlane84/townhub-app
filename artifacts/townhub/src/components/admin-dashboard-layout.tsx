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
      <aside className="w-64 border-r bg-muted/10 hidden md:block shrink-0">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-6">Platform Admin</h2>
          <nav className="space-y-1">
            <NavLinks items={navItems} location={location} />
          </nav>
        </div>
      </aside>

      <div
        className={cn(
          "md:hidden fixed left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 bg-background border-b shadow-sm",
          DASHBOARD_MOBILE_NAV_TOP_CLASS,
        )}
      >
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 shrink-0">
              <Menu className="h-4 w-4" />
              <span className="text-xs font-medium">Sections</span>
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

      <main className={cn("flex-1 p-4 md:p-10 overflow-x-hidden", DASHBOARD_MOBILE_MAIN_TOP_CLASS)}>
        {children}
      </main>
    </div>
  );
}
