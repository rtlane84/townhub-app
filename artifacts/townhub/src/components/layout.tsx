import { Link, useLocation, useRoute } from "wouter";
import { UserButton, useUser, SignInButton } from "@clerk/react";
import {
  ShoppingBag, Store, LayoutDashboard, ShieldCheck, PlusCircle,
  Wrench, Menu, ExternalLink, Calendar, Truck, Package, HelpCircle, ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "./cart-context";
import { Badge } from "./ui/badge";
import { useGetBusinessBySlug, getGetBusinessBySlugQueryKey, useGetAdminBootstrapStatus, getGetAdminBootstrapStatusQueryKey } from "@workspace/api-client-react";
import { hidesStorefrontCart } from "@workspace/api-zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { clerkUserButtonAppearance } from "@/lib/clerk-appearance";
import { usePlatformBranding } from "@/components/theme-provider";
import { resolveHeaderMinHeightPx, SITE_HEADER_HEIGHT_CSS_VAR, NATIVE_BOTTOM_TAB_HEIGHT_CSS_VAR, NATIVE_BOTTOM_TAB_HEIGHT_PX, NATIVE_MAIN_BOTTOM_PADDING_CLASS } from "@/lib/platform-branding";
import { useNavAuthState } from "@/hooks/use-nav-auth-state";
import { isDashboardRoute } from "@/lib/native-platform";
import { useNativeBottomTabs, useNativePlatform, useNativePullToRefresh } from "@/hooks/use-native-platform";
import { NativeBottomTabBar } from "@/components/native-bottom-tab-bar";
import { NativePullToRefresh } from "@/components/native-pull-to-refresh";
import { triggerTabChangeHaptic } from "@/lib/native-haptics";

function PlatformLogo({ className, sizePx }: { className?: string; sizePx?: number }) {
  const { logoUrl, platformName, logoSizePx } = usePlatformBranding();
  const displaySize = sizePx ?? logoSizePx;
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={platformName}
        className={cn("object-contain shrink-0", className)}
        style={{ width: displaySize, height: displaySize }}
      />
    );
  }
  return (
    <Store
      className={cn("text-primary shrink-0", className)}
      style={{ width: displaySize, height: displaySize }}
    />
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { platformName, footerTagline, logoSizePx } = usePlatformBranding();
  const headerMinHeightPx = resolveHeaderMinHeightPx(logoSizePx);
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const {
    authResolved,
    isAdmin,
    isCustomer,
    isLoggedOut,
    showBusinessHubNav,
    showListYourBusinessNav,
    showMyOrdersNav,
  } = useNavAuthState();
  const { itemCount } = useCart();
  const [location] = useLocation();
  const [, storefrontParams] = useRoute("/businesses/:slug");
  const storefrontSlug = storefrontParams?.slug;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isNative } = useNativePlatform();
  const showNativeTabs = useNativeBottomTabs();
  const showNativePullToRefresh = useNativePullToRefresh();

  const { data: bootstrapStatus, isPending: bootstrapPending } = useGetAdminBootstrapStatus({
    query: { queryKey: getGetAdminBootstrapStatusQueryKey() },
  });
  const { data: storefrontData } = useGetBusinessBySlug(storefrontSlug ?? "", {
    query: {
      enabled: !!storefrontSlug,
      queryKey: getGetBusinessBySlugQueryKey(storefrontSlug ?? ""),
    },
  });
  const hideCart = !!storefrontSlug && hidesStorefrontCart(storefrontData?.business ?? {});

  const hideFooter =
    location === "/dashboard/admin/system-status" ||
    location.startsWith("/dashboard/admin/system-status/") ||
    showNativeTabs;

  const inDashboard = isDashboardRoute(location);
  const setupAvailable = authResolved && !bootstrapPending && bootstrapStatus?.setupComplete === false;
  const dashboardHref = isAdmin ? "/dashboard/admin" : "/dashboard/business";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Business Hub";
  const dashboardShortLabel = isAdmin ? "Admin" : "Business Hub";
  const DashboardIcon = isAdmin ? ShieldCheck : LayoutDashboard;

  function isNavActive(href: string) {
    return location === href || (href !== "/" && location.startsWith(href + "/"));
  }

  function navLinkClass(href: string) {
    const active = isNavActive(href);
    return cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );
  }

  function close() { setMobileOpen(false); }

  function headerActionButtonClass(active: boolean) {
    return cn(
      "bg-background text-foreground border-border hover:bg-muted",
      active && "bg-muted",
    );
  }

  function headerActionMobileClass(href: string) {
    const active = isNavActive(href);
    return cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full border",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      headerActionButtonClass(active),
    );
  }

  function returnToMarketplaceClass() {
    return cn(
      "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors",
      "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
    );
  }

  const showRoleNav = authResolved;
  const showListYourBusinessAction = showRoleNav && showListYourBusinessNav && !inDashboard;
  const showMyOrders = showRoleNav && showMyOrdersNav && !inDashboard;
  const showDashboardAction = showRoleNav && showBusinessHubNav;
  const dashboardActive = isNavActive(dashboardHref);
  const listYourBusinessActive = isNavActive("/list-your-business");
  /** Account lives in the native bottom tab sheet — hide duplicate header auth. */
  const hideHeaderAccount = isNative && showNativeTabs;
  /** Native dashboards hide bottom tabs; show an obvious exit control. */
  const showNativeDashboardBack = isNative && inDashboard;

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col bg-background print:block print:min-h-0",
        isNative && "native-app-shell",
      )}
      style={{
        [SITE_HEADER_HEIGHT_CSS_VAR]: `${headerMinHeightPx}px`,
        [NATIVE_BOTTOM_TAB_HEIGHT_CSS_VAR]: `${NATIVE_BOTTOM_TAB_HEIGHT_PX}px`,
      } as CSSProperties}
    >
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 print:hidden native-site-header">
        <div
          className="container mx-auto flex items-center justify-between px-5 sm:px-6"
          style={{ minHeight: headerMinHeightPx }}
        >

          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-5 min-w-0">
            {showNativeDashboardBack ? (
              <Link
                href="/"
                className={cn(
                  returnToMarketplaceClass(),
                  "shrink-0 gap-1.5 px-2 py-2 -ml-1 min-h-11",
                )}
                aria-label="Back to app"
              >
                <ArrowLeft className="h-[22px] w-[22px] shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-foreground">Back</span>
              </Link>
            ) : null}
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              <PlatformLogo />
              <span
                className={cn(
                  "font-serif text-lg font-semibold tracking-tight text-primary sm:text-xl",
                  showNativeDashboardBack && "hidden sm:inline",
                )}
              >
                {platformName}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground"
              aria-label="Main navigation"
            >
              {inDashboard ? (
                <>
                  <Link
                    href="/businesses"
                    className={returnToMarketplaceClass()}
                    aria-label="Back to marketplace"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    Back
                  </Link>
                  <Link
                    href="/help"
                    className={navLinkClass("/help")}
                    aria-current={isNavActive("/help") ? "page" : undefined}
                  >
                    Help
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/businesses"
                    className={navLinkClass("/businesses")}
                    aria-current={isNavActive("/businesses") ? "page" : undefined}
                  >
                    Businesses
                  </Link>
                  <Link
                    href="/events"
                    className={navLinkClass("/events")}
                    aria-current={isNavActive("/events") ? "page" : undefined}
                  >
                    Events
                  </Link>
                  <Link
                    href="/food-trucks"
                    className={navLinkClass("/food-trucks")}
                    aria-current={isNavActive("/food-trucks") ? "page" : undefined}
                  >
                    Food Trucks
                  </Link>

                  <Link
                    href="/help"
                    className={navLinkClass("/help")}
                    aria-current={isNavActive("/help") ? "page" : undefined}
                  >
                    Help
                  </Link>

                  {showMyOrders && (
                    <Link
                      href="/my-orders"
                      className={navLinkClass("/my-orders")}
                      aria-current={isNavActive("/my-orders") ? "page" : undefined}
                    >
                      <Package className="h-3.5 w-3.5" aria-hidden />
                      My Orders
                    </Link>
                  )}

                  {setupAvailable && (isLoggedOut || isCustomer) && (
                    <Link
                      href="/setup"
                      className={navLinkClass("/setup")}
                      aria-current={isNavActive("/setup") ? "page" : undefined}
                    >
                      <Wrench className="h-3.5 w-3.5" aria-hidden />
                      Admin Setup
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Right: action CTAs + cart + auth + mobile menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showListYourBusinessAction && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className={cn("hidden md:inline-flex", headerActionButtonClass(listYourBusinessActive))}
              >
                <Link
                  href="/list-your-business"
                  aria-current={listYourBusinessActive ? "page" : undefined}
                >
                  <PlusCircle className="h-3.5 w-3.5" aria-hidden />
                  List Your Business
                </Link>
              </Button>
            )}

            {showDashboardAction && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className={cn("hidden md:inline-flex", headerActionButtonClass(dashboardActive))}
              >
                <Link
                  href={dashboardHref}
                  aria-current={dashboardActive ? "page" : undefined}
                >
                  <DashboardIcon className="h-3.5 w-3.5" aria-hidden />
                  {dashboardShortLabel}
                </Link>
              </Button>
            )}

            {!hideCart && (
              <Link
                href="/cart"
                onClick={() => {
                  if (isNative) triggerTabChangeHaptic();
                }}
              >
                <Button variant="ghost" size="icon" className="relative text-foreground h-11 w-11">
                  <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center px-1 text-[10px] rounded-full">
                      {itemCount}
                    </Badge>
                  )}
                  <span className="sr-only">Cart</span>
                </Button>
              </Link>
            )}

            {!hideHeaderAccount && clerkLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button size="sm">Sign In</Button>
              </SignInButton>
            )}

            {!hideHeaderAccount && clerkLoaded && isSignedIn && (
              <UserButton appearance={clerkUserButtonAppearance} />
            )}

            {/* Mobile hamburger — hidden in Capacitor (bottom tabs replace it) */}
            {!isNative && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="p-6 pb-4 border-b">
                  <SheetTitle className="font-serif text-left flex items-center gap-2">
                    <PlatformLogo className="h-5 w-5" sizePx={20} />
                    {platformName}
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile navigation">
                  {inDashboard ? (
                    <>
                      <Link href="/businesses" onClick={close} aria-label="Back to marketplace">
                        <span className={cn(returnToMarketplaceClass(), "w-full px-3 py-2.5 rounded-lg hover:bg-muted")}>
                          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                          Back to marketplace
                        </span>
                      </Link>
                      <Link href="/help" onClick={close}>
                        <span
                          className={navLinkClass("/help")}
                          aria-current={isNavActive("/help") ? "page" : undefined}
                        >
                          <HelpCircle className="h-4 w-4" aria-hidden /> Help
                        </span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Browse
                      </p>
                      <Link href="/businesses" onClick={close}>
                        <span
                          className={navLinkClass("/businesses")}
                          aria-current={isNavActive("/businesses") ? "page" : undefined}
                        >
                          <Store className="h-4 w-4" aria-hidden /> Businesses
                        </span>
                      </Link>
                      <Link href="/events" onClick={close}>
                        <span
                          className={navLinkClass("/events")}
                          aria-current={isNavActive("/events") ? "page" : undefined}
                        >
                          <Calendar className="h-4 w-4" aria-hidden /> Events
                        </span>
                      </Link>
                      <Link href="/food-trucks" onClick={close}>
                        <span
                          className={navLinkClass("/food-trucks")}
                          aria-current={isNavActive("/food-trucks") ? "page" : undefined}
                        >
                          <Truck className="h-4 w-4" aria-hidden /> Food Trucks
                        </span>
                      </Link>

                      <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Support
                      </p>
                      <Link href="/help" onClick={close}>
                        <span
                          className={navLinkClass("/help")}
                          aria-current={isNavActive("/help") ? "page" : undefined}
                        >
                          <HelpCircle className="h-4 w-4" aria-hidden /> Help
                        </span>
                      </Link>

                      {(showMyOrders || showDashboardAction || showListYourBusinessAction) && (
                        <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Your account
                        </p>
                      )}

                      {showListYourBusinessAction && (
                        <Link href="/list-your-business" onClick={close}>
                          <span
                            className={headerActionMobileClass("/list-your-business")}
                            aria-current={listYourBusinessActive ? "page" : undefined}
                          >
                            <PlusCircle className="h-4 w-4" aria-hidden /> List Your Business
                          </span>
                        </Link>
                      )}

                      {showMyOrders && (
                        <Link href="/my-orders" onClick={close}>
                          <span
                            className={navLinkClass("/my-orders")}
                            aria-current={isNavActive("/my-orders") ? "page" : undefined}
                          >
                            <Package className="h-4 w-4" aria-hidden /> My Orders
                          </span>
                        </Link>
                      )}

                      {showDashboardAction && (
                        <Link href={dashboardHref} onClick={close}>
                          <span
                            className={headerActionMobileClass(dashboardHref)}
                            aria-current={dashboardActive ? "page" : undefined}
                          >
                            <DashboardIcon className="h-4 w-4" aria-hidden /> {dashboardLabel}
                          </span>
                        </Link>
                      )}

                      {setupAvailable && (isLoggedOut || isCustomer) && (
                        <Link href="/setup" onClick={close}>
                          <span className={navLinkClass("/setup")}>
                            <Wrench className="h-4 w-4" aria-hidden /> Admin Setup
                            <span className="ml-auto text-xs text-muted-foreground">First-time</span>
                          </span>
                        </Link>
                      )}
                    </>
                  )}

                  {clerkLoaded && !isSignedIn && (
                    <div className="pt-3 border-t mt-3">
                      <SignInButton mode="modal">
                        <Button className="w-full" onClick={close}>Sign In</Button>
                      </SignInButton>
                    </div>
                  )}

                  {showRoleNav && isSignedIn && isCustomer && setupAvailable && !inDashboard && (
                    <div className="pt-3 border-t mt-3">
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        Signed in as customer. Visit <strong>Admin Setup</strong> to claim admin access on first deploy, or <strong>List Your Business</strong> to become a business owner.
                      </p>
                    </div>
                  )}
                </nav>

                {setupAvailable && (isLoggedOut || isCustomer) && !inDashboard && (
                  <div className="p-4 border-t">
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
            )}
          </div>
        </div>
      </header>

      <main className={cn("flex-1 flex flex-col min-h-0", showNativeTabs && NATIVE_MAIN_BOTTOM_PADDING_CLASS)}>
        <NativePullToRefresh enabled={showNativePullToRefresh}>
          {children}
        </NativePullToRefresh>
      </main>

      {showNativeTabs && <NativeBottomTabBar />}

      <footer className={cn("border-t py-12 bg-muted/30 mt-auto print:hidden", hideFooter && "hidden")}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <PlatformLogo className="h-5 w-5 text-muted-foreground" sizePx={20} />
            <span className="font-serif text-lg font-medium text-muted-foreground">{platformName}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {footerTagline}
          </p>
          <p className="text-muted-foreground text-sm mt-3">
            <Link href="/help" className="hover:text-foreground transition-colors underline-offset-4 hover:underline">
              Help Center
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
