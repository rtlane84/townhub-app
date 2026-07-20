import { Link, useLocation, useRoute } from "wouter";
import { UserButton, useUser, SignInButton } from "@clerk/react";
import {
  ShoppingBag, Store, LayoutDashboard, ShieldCheck, PlusCircle,
  Wrench, Menu, ExternalLink, Calendar, Truck, Package, HelpCircle, ArrowLeft,
  AlertTriangle,
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
import { isNativeApp } from "@/lib/native-platform";
import { NativeSocialSignInButtons } from "@/components/native-google-sign-in-button";
import { usePlatformBranding } from "@/components/theme-provider";
import { resolveHeaderMinHeightPx, SITE_HEADER_HEIGHT_CSS_VAR, NATIVE_BOTTOM_TAB_HEIGHT_CSS_VAR, NATIVE_BOTTOM_TAB_HEIGHT_PX, resolveNativeHeaderLogoPx } from "@/lib/platform-branding";
import { PlatformBrandMark } from "@/components/platform-brand-mark";
import { useNavAuthState } from "@/hooks/use-nav-auth-state";
import { isDashboardRoute } from "@/lib/native-platform";
import { isAppMarketingPath } from "@/lib/app-marketing-meta";
import { useNativeBottomTabs, useNativePlatform, useNativePullToRefresh } from "@/hooks/use-native-platform";
import { NativeBottomTabBar } from "@/components/native-bottom-tab-bar";
import { NativePullToRefresh } from "@/components/native-pull-to-refresh";
import { triggerTabChangeHaptic } from "@/lib/native-haptics";
import { useKitchenDisplayMode } from "@/hooks/kitchen-display-mode";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { LOGO_IMAGE_WIDTHS } from "@/lib/optimized-image";

function PlatformLogo({
  className,
  sizePx,
  eager = false,
}: {
  className?: string;
  sizePx?: number;
  eager?: boolean;
}) {
  const { logoUrl, platformName, logoSizePx } = usePlatformBranding();
  const displaySize = sizePx ?? logoSizePx;
  if (logoUrl) {
    return (
      <OptimizedMediaImage
        src={logoUrl}
        widths={LOGO_IMAGE_WIDTHS}
        sizes={`${displaySize}px`}
        eager={eager}
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

const accountPageHref = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/account` || "/account";

function HeaderUserButton() {
  return (
    <UserButton appearance={clerkUserButtonAppearance}>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Delete TownHub account"
          labelIcon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          href={accountPageHref}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { platformName, footerTagline, logoSizePx } = usePlatformBranding();
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { isNative } = useNativePlatform();
  const headerMinHeightPx = resolveHeaderMinHeightPx(logoSizePx, { native: isNative });
  const nativeHeaderLogoPx = isNative ? resolveNativeHeaderLogoPx(logoSizePx) : logoSizePx;
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
  const showNativeTabs = useNativeBottomTabs();
  const showNativePullToRefresh = useNativePullToRefresh();
  const { active: kitchenModeActive } = useKitchenDisplayMode();

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
  /** Business detail uses its own compact header chrome. Kitchen Mode hides marketplace chrome. */
  const hideSiteHeader = !!storefrontSlug || kitchenModeActive;

  const inDashboard = isDashboardRoute(location);

  const hideFooter =
    location === "/dashboard/admin/system-status" ||
    location.startsWith("/dashboard/admin/system-status/") ||
    showNativeTabs ||
    (isNative && inDashboard);

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
      "flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold tracking-tight transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
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

  /** Public `/app` marketing page owns its own chrome — skip marketplace shell. */
  if (isAppMarketingPath(location)) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col bg-background print:block print:min-h-0",
        isNative && "native-app-shell h-[100dvh] max-h-[100dvh] overflow-hidden",
      )}
      style={{
        [SITE_HEADER_HEIGHT_CSS_VAR]: `${headerMinHeightPx}px`,
        [NATIVE_BOTTOM_TAB_HEIGHT_CSS_VAR]: `${NATIVE_BOTTOM_TAB_HEIGHT_PX}px`,
      } as CSSProperties}
    >
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/30 bg-background print:hidden native-site-header",
          !isNative && "bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60",
          isNative && "!sticky relative top-auto",
          hideSiteHeader && "hidden",
        )}
      >
        <div
          className={cn(
            "container mx-auto flex items-center px-5 sm:px-6 lg:px-8",
            isNative ? "px-4" : "justify-between",
          )}
          style={{ minHeight: headerMinHeightPx }}
        >
          {isNative ? (
            <>
              {/* 3-column native header: sides balance so logo+title stay centered */}
              <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex min-w-0 items-center justify-start" />

                <Link
                  href="/"
                  className="flex max-w-[min(70vw,16rem)] items-center justify-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                >
                  <PlatformLogo sizePx={nativeHeaderLogoPx} eager />
                  <PlatformBrandMark name={platformName} compact />
                </Link>

                <div className="flex min-w-0 items-center justify-end gap-1.5">
                  {!hideCart && (
                    <Link
                      href="/cart"
                      onClick={() => {
                        triggerTabChangeHaptic();
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
                    <Link href="/sign-in">
                      <Button size="sm">Sign In</Button>
                    </Link>
                  )}
                  {!hideHeaderAccount && clerkLoaded && isSignedIn && (
                    <HeaderUserButton />
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Left: logo + desktop nav */}
          <div className="flex items-center min-w-0 gap-5">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            >
              <PlatformLogo sizePx={nativeHeaderLogoPx} eager />
              <PlatformBrandMark
                name={platformName}
                className="text-lg sm:text-xl"
              />
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
                    On the Move
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
              isNativeApp() ? (
                <Link href="/sign-in">
                  <Button size="sm">Sign In</Button>
                </Link>
              ) : (
                <SignInButton mode="modal">
                  <Button size="sm">Sign In</Button>
                </SignInButton>
              )
            )}

            {!hideHeaderAccount && clerkLoaded && isSignedIn && (
              <HeaderUserButton />
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
                    <PlatformBrandMark name={platformName} />
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
                          <Truck className="h-4 w-4" aria-hidden /> On the Move
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
                    <div className="pt-3 border-t mt-3 space-y-3">
                      {isNativeApp() ? <NativeSocialSignInButtons /> : null}
                      {isNativeApp() ? (
                        <Link href="/sign-in" onClick={close}>
                          <Button className="w-full">Sign In with email</Button>
                        </Link>
                      ) : (
                        <SignInButton mode="modal">
                          <Button className="w-full" onClick={close}>
                            Sign In
                          </Button>
                        </SignInButton>
                      )}
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
            </>
          )}
        </div>
      </header>

      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          isNative && "native-scroll-root",
        )}
        data-native-scroll-root={isNative ? "true" : undefined}
      >
        <NativePullToRefresh enabled={showNativePullToRefresh}>
          {children}
          {/* Web footer scrolls with content; native tabs hide it */}
          <footer className={cn("mt-auto border-t border-border/40 bg-background py-14 print:hidden", hideFooter && "hidden")}>
            <div className="container mx-auto px-5 text-center sm:px-6">
              <div className="mb-4 flex items-center justify-center gap-2.5">
                <PlatformLogo className="h-5 w-5 text-muted-foreground" sizePx={20} />
                <span className="font-serif text-lg font-semibold tracking-tight">
                <PlatformBrandMark name={platformName} className="text-foreground/80" />
              </span>
              </div>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                {footerTagline}
              </p>
              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <Link href="/help" className="font-medium text-primary transition-colors hover:text-primary/80 underline-offset-4 hover:underline">
                  Help Center
                </Link>
                <Link href="/privacy-policy" className="font-medium text-primary transition-colors hover:text-primary/80 underline-offset-4 hover:underline">
                  Privacy
                </Link>
                <Link href="/terms-of-service" className="font-medium text-primary transition-colors hover:text-primary/80 underline-offset-4 hover:underline">
                  Terms
                </Link>
              </p>
            </div>
          </footer>
        </NativePullToRefresh>
      </main>

      {/* Keep tabs mounted on all marketplace screens (including storefront + cart) */}
      {showNativeTabs ? <NativeBottomTabBar /> : null}
    </div>
  );
}
