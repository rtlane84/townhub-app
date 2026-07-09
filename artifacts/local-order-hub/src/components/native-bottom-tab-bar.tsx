import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Store,
  Calendar,
  Truck,
  User,
  Package,
  LayoutDashboard,
  ShieldCheck,
  PlusCircle,
  HelpCircle,
  Wrench,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { SignInButton, useClerk, useUser } from "@clerk/react";
import { cn } from "@/lib/utils";
import { isAccountRoute, isNavActive } from "@/lib/native-platform";
import { triggerTabChangeHaptic } from "@/lib/native-haptics";
import { useNavAuthState } from "@/hooks/use-nav-auth-state";
import { useGetAdminBootstrapStatus, getGetAdminBootstrapStatusQueryKey } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";

type TabItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: (location: string) => boolean;
  onPress?: () => void;
};

export function NativeBottomTabBar() {
  const [location, setLocation] = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { isSignedIn, isLoaded: clerkLoaded, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const {
    authResolved,
    isAdmin,
    isCustomer,
    isLoggedOut,
    showBusinessHubNav,
    showListYourBusinessNav,
    showMyOrdersNav,
  } = useNavAuthState();

  const { data: bootstrapStatus, isPending: bootstrapPending } = useGetAdminBootstrapStatus({
    query: { queryKey: getGetAdminBootstrapStatusQueryKey() },
  });

  const setupAvailable = authResolved && !bootstrapPending && bootstrapStatus?.setupComplete === false;
  const dashboardHref = isAdmin ? "/dashboard/admin" : "/dashboard/business";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "Business Hub";
  const DashboardIcon = isAdmin ? ShieldCheck : LayoutDashboard;

  const tabs: TabItem[] = [
    {
      href: "/",
      label: "Home",
      icon: Home,
      isActive: (path) => path === "/",
    },
    {
      href: "/businesses",
      label: "Businesses",
      icon: Store,
      isActive: (path) => isNavActive(path, "/businesses") && !path.startsWith("/businesses/"),
    },
    {
      href: "/events",
      label: "Events",
      icon: Calendar,
      isActive: (path) => isNavActive(path, "/events"),
    },
    {
      href: "/food-trucks",
      label: "Trucks",
      icon: Truck,
      isActive: (path) => isNavActive(path, "/food-trucks"),
    },
    {
      href: "#account",
      label: "Account",
      icon: User,
      isActive: (path) => isAccountRoute(path) || accountOpen,
      onPress: () => {
        triggerTabChangeHaptic();
        setAccountOpen(true);
      },
    },
  ];

  function handleTabPress(tab: TabItem) {
    triggerTabChangeHaptic();
    if (tab.onPress) {
      tab.onPress();
      return;
    }
    if (location !== tab.href) {
      setLocation(tab.href);
    }
  }

  function closeAccount() {
    setAccountOpen(false);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    triggerTabChangeHaptic();
    try {
      await signOut();
      queryClient.clear();
      closeAccount();
      setLocation("/");
    } catch {
      // Keep sheet open so the user can retry.
    } finally {
      setSigningOut(false);
    }
  }

  function accountLinkClass(href: string) {
    const active = isNavActive(location, href);
    return cn(
      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors w-full",
      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
    );
  }

  const signedInLabel =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed in";

  return (
    <>
      <nav
        className="native-bottom-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive(location);
            const isAccountTab = tab.href === "#account";

            if (isAccountTab) {
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => handleTabPress(tab)}
                  className={cn(
                    "native-tab-item flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                  aria-label={tab.label}
                >
                  <Icon className={cn("h-5 w-5", active && "scale-105")} strokeWidth={active ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => {
                  handleTabPress(tab);
                  if (location !== tab.href) {
                    setLocation(tab.href);
                  }
                }}
                className={cn(
                  "native-tab-item flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "scale-105")} strokeWidth={active ? 2.5 : 2} />
                <span className={cn("text-[10px] font-medium leading-none", active && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent
          side="bottom"
          className="native-account-sheet rounded-t-2xl px-0 pb-0"
        >
          <SheetHeader className="px-6 pb-2 text-left">
            <SheetTitle className="font-serif">Account</SheetTitle>
          </SheetHeader>

          <nav className="space-y-1 px-4 pb-4" aria-label="Account navigation">
            {showMyOrdersNav && (
              <Link href="/my-orders" onClick={closeAccount}>
                <span className={accountLinkClass("/my-orders")}>
                  <Package className="h-4 w-4" />
                  My Orders
                </span>
              </Link>
            )}

            {showBusinessHubNav && (
              <Link href={dashboardHref} onClick={closeAccount}>
                <span className={accountLinkClass(dashboardHref)}>
                  <DashboardIcon className="h-4 w-4" />
                  {dashboardLabel}
                </span>
              </Link>
            )}

            {showListYourBusinessNav && (
              <Link href="/list-your-business" onClick={closeAccount}>
                <span className={accountLinkClass("/list-your-business")}>
                  <PlusCircle className="h-4 w-4" />
                  List Your Business
                </span>
              </Link>
            )}

            <Link href="/help" onClick={closeAccount}>
              <span className={accountLinkClass("/help")}>
                <HelpCircle className="h-4 w-4" />
                Help
              </span>
            </Link>

            {setupAvailable && (isLoggedOut || isCustomer) && (
              <Link href="/setup" onClick={closeAccount}>
                <span className={accountLinkClass("/setup")}>
                  <Wrench className="h-4 w-4" />
                  Admin Setup
                </span>
              </Link>
            )}
          </nav>

          <div className="border-t px-4 py-4 space-y-3">
            {clerkLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button className="w-full min-h-11" onClick={closeAccount}>
                  Sign In
                </Button>
              </SignInButton>
            )}

            {clerkLoaded && isSignedIn && (
              <div className="space-y-3">
                <div className="px-1">
                  <p className="text-sm font-medium text-foreground truncate">{signedInLabel}</p>
                  {user?.fullName && user?.primaryEmailAddress?.emailAddress ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {user.primaryEmailAddress.emailAddress}
                    </p>
                  ) : null}
                </div>
                <LoadingButton
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 justify-center gap-2"
                  loading={signingOut}
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign Out
                </LoadingButton>
              </div>
            )}

            {setupAvailable && (isLoggedOut || isCustomer) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-primary">First time here?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in, then visit Admin Setup to claim platform admin access.
                </p>
                <Link href="/setup" onClick={closeAccount}>
                  <Button size="sm" className="mt-3 w-full">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Go to Admin Setup
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
