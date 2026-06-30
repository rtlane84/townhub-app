import { Link, useLocation, useRoute } from "wouter";
import { UserButton, useUser, SignInButton } from "@clerk/react";
import {
  ShoppingBag, Store, LayoutDashboard, ShieldCheck, PlusCircle,
  Wrench, Menu, ExternalLink, Calendar, Truck, Package,
} from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "./cart-context";
import { Badge } from "./ui/badge";
import { useGetMe, getGetMeQueryKey, useGetBusinessBySlug, getGetBusinessBySlugQueryKey } from "@workspace/api-client-react";
import { hidesStorefrontCart } from "@workspace/api-zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { clerkUserButtonAppearance } from "@/lib/clerk-appearance";
import { usePlatformBranding } from "@/components/theme-provider";

function PlatformLogo({ className }: { className?: string }) {
  const { logoUrl, platformName, logoSizePx } = usePlatformBranding();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={platformName}
        className={cn("object-contain shrink-0", className)}
        style={{ width: logoSizePx, height: logoSizePx }}
      />
    );
  }
  return (
    <Store
      className={cn("text-primary shrink-0", className)}
      style={{ width: logoSizePx, height: logoSizePx }}
    />
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { platformName, footerTagline } = usePlatformBranding();
  const { isSignedIn, isLoaded } = useUser();
  const { itemCount } = useCart();
  const [location] = useLocation();
  const [, storefrontParams] = useRoute("/businesses/:slug");
  const storefrontSlug = storefrontParams?.slug;
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() } });
  const { data: storefrontData } = useGetBusinessBySlug(storefrontSlug ?? "", {
    query: {
      enabled: !!storefrontSlug,
      queryKey: getGetBusinessBySlugQueryKey(storefrontSlug ?? ""),
    },
  });
  const hideCart = !!storefrontSlug && hidesStorefrontCart(storefrontData?.business ?? {});

  const isAdmin = me?.role === "ADMIN";
  const isBusinessOwner = me?.role === "BUSINESS_OWNER";
  const isCustomer = isLoaded && isSignedIn && !isAdmin && !isBusinessOwner;
  const isLoggedOut = isLoaded && !isSignedIn;

  const dashboardHref = isAdmin ? "/dashboard/admin" : "/dashboard/business";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Business Hub";
  const DashboardIcon = isAdmin ? ShieldCheck : LayoutDashboard;

  function navLinkClass(href: string) {
    const active = location === href || (href !== "/" && location.startsWith(href + "/"));
    return cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted");
  }

  function close() { setMobileOpen(false); }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background print:block print:min-h-0">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <PlatformLogo />
              <span className="font-serif text-xl font-semibold tracking-tight text-primary">
                {platformName}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Link href="/businesses" className={navLinkClass("/businesses")}>
                All Businesses
              </Link>
              <Link href="/events" className={navLinkClass("/events")}>
                Events
              </Link>
              <Link href="/food-trucks" className={navLinkClass("/food-trucks")}>
                Food Trucks
              </Link>

              {isCustomer && (
                <Link href="/my-orders" className={navLinkClass("/my-orders")}>
                  <Package className="h-3.5 w-3.5" />
                  My Orders
                </Link>
              )}

              {isLoaded && (isAdmin || isBusinessOwner) && (
                <Link href={dashboardHref} className={navLinkClass("/dashboard")}>
                  <DashboardIcon className="h-3.5 w-3.5" />
                  {isAdmin ? "Admin" : "Business Hub"}
                </Link>
              )}

              {(isLoggedOut || isCustomer) && (
                <Link href="/list-your-business" className={navLinkClass("/list-your-business")}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  List Your Business
                </Link>
              )}

              {(isLoggedOut || isCustomer) && (
                <Link href="/setup" className={navLinkClass("/setup")}>
                  <Wrench className="h-3.5 w-3.5" />
                  Admin Setup
                </Link>
              )}
            </nav>
          </div>

          {/* Right: cart + auth + mobile menu */}
          <div className="flex items-center gap-2">
            {!hideCart && (
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative text-foreground">
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full">
                      {itemCount}
                    </Badge>
                  )}
                  <span className="sr-only">Cart</span>
                </Button>
              </Link>
            )}

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button size="sm">Sign In</Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <UserButton appearance={clerkUserButtonAppearance} />
            )}

            {/* Mobile hamburger — shows nav on small screens */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-6 pb-4 border-b">
                  <SheetTitle className="font-serif text-left flex items-center gap-2">
                    <PlatformLogo className="h-5 w-5" />
                    {platformName}
                  </SheetTitle>
                </SheetHeader>

                <nav className="p-4 space-y-1">
                  <Link href="/businesses" onClick={close}>
                    <span className={navLinkClass("/businesses")}>
                      <Store className="h-4 w-4" /> All Businesses
                    </span>
                  </Link>
                  <Link href="/events" onClick={close}>
                    <span className={navLinkClass("/events")}>
                      <Calendar className="h-4 w-4" /> Events
                    </span>
                  </Link>
                  <Link href="/food-trucks" onClick={close}>
                    <span className={navLinkClass("/food-trucks")}>
                      <Truck className="h-4 w-4" /> Food Trucks
                    </span>
                  </Link>

                  {isCustomer && (
                    <Link href="/my-orders" onClick={close}>
                      <span className={navLinkClass("/my-orders")}>
                        <Package className="h-4 w-4" /> My Orders
                      </span>
                    </Link>
                  )}

                  {isLoaded && (isAdmin || isBusinessOwner) && (
                    <Link href={dashboardHref} onClick={close}>
                      <span className={navLinkClass("/dashboard")}>
                        <DashboardIcon className="h-4 w-4" /> {dashboardLabel}
                      </span>
                    </Link>
                  )}

                  {(isLoggedOut || isCustomer) && (
                    <Link href="/list-your-business" onClick={close}>
                      <span className={navLinkClass("/list-your-business")}>
                        <PlusCircle className="h-4 w-4" /> List Your Business
                      </span>
                    </Link>
                  )}

                  {(isLoggedOut || isCustomer) && (
                    <Link href="/setup" onClick={close}>
                      <span className={navLinkClass("/setup")}>
                        <Wrench className="h-4 w-4" /> Admin Setup
                        <span className="ml-auto text-xs text-muted-foreground">First-time</span>
                      </span>
                    </Link>
                  )}

                  {!isSignedIn && isLoaded && (
                    <div className="pt-3 border-t">
                      <SignInButton mode="modal">
                        <Button className="w-full" onClick={close}>Sign In</Button>
                      </SignInButton>
                    </div>
                  )}

                  {isSignedIn && isCustomer && (
                    <div className="pt-3 border-t">
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        Signed in as customer. Visit <strong>Admin Setup</strong> to claim admin access, or <strong>List Your Business</strong> to become a business owner.
                      </p>
                    </div>
                  )}
                </nav>

                {(isLoggedOut || isCustomer) && (
                  <div className="absolute bottom-6 left-4 right-4">
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary">First time here?</p>
                      <p className="text-xs text-muted-foreground">Sign in → go to Admin Setup → claim admin access to manage the platform.</p>
                      <Link href="/setup" onClick={close}>
                        <Button size="sm" className="w-full mt-1">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Go to Admin Setup
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-12 bg-muted/30 mt-auto print:hidden">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <PlatformLogo className="h-5 w-5 text-muted-foreground" />
            <span className="font-serif text-lg font-medium text-muted-foreground">{platformName}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {footerTagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
