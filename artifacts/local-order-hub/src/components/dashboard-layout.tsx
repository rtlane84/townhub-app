import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Tags, Settings, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard/business", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/business/orders", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard/business/products", label: "Products", icon: Store },
    { href: "/dashboard/business/categories", label: "Categories", icon: Tags },
    { href: "/dashboard/business/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-64 border-r bg-muted/10 hidden md:block">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-6">Business Hub</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard/business");
              return (
                <Link key={item.href} href={item.href}>
                  <span className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}

export function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/businesses", label: "Businesses", icon: Store },
    { href: "/dashboard/admin/orders", label: "Orders", icon: ShoppingBag },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="w-64 border-r bg-muted/10 hidden md:block">
        <div className="p-6">
          <h2 className="font-serif font-bold text-lg mb-6">Platform Admin</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location === item.href || (location.startsWith(item.href) && item.href !== "/dashboard/admin");
              return (
                <Link key={item.href} href={item.href}>
                  <span className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
