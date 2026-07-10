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
  ChevronRight,
} from "lucide-react";
import { SignInButton, useClerk, useUser } from "@clerk/react";
import { useUnregisterDevice } from "@workspace/api-client-react";
import { unregisterNativePushDevice } from "@/lib/native-push";
import { cn } from "@/lib/utils";
import { isAccountRoute, isNavActive } from "@/lib/native-platform";
import {
  triggerAccountCloseHaptic,
  triggerAccountOpenHaptic,
  triggerTabChangeHaptic,
} from "@/lib/native-haptics";
import { useNavAuthState } from "@/hooks/use-nav-auth-state";
import { useGetAdminBootstrapStatus, getGetAdminBootstrapStatusQueryKey } from "@workspace/api-client-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { NativeGoogleSignInButton } from "@/components/native-google-sign-in-button";
import { nativeClerkAuthAppearance } from "@/lib/clerk-appearance";

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
  const unregisterDevice = useUnregisterDevice();
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
        setAccountOpen(true);
      },
    },
  ];

  function handleTabPress(tab: TabItem) {
    if (tab.href === "#account") {
      triggerAccountOpenHaptic();
      tab.onPress?.();
      return;
    }
    triggerTabChangeHaptic();
    if (location !== tab.href) {
      setLocation(tab.href);
    }
  }

  function handleAccountOpenChange(open: boolean) {
    if (!open && accountOpen) {
      triggerAccountCloseHaptic();
    }
    setAccountOpen(open);
  }

  function closeAccount() {
    setAccountOpen(false);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    triggerTabChangeHaptic();
    try {
      await unregisterNativePushDevice(async (input) => {
        await unregisterDevice.mutateAsync({ data: input });
      });
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

  function accountRowClass(href: string) {
    const active = isNavActive(location, href);
    return cn(
      "flex min-h-12 items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-medium transition-colors w-full native-pressable",
      active ? "bg-primary/10 text-primary" : "text-foreground active:bg-muted/80",
    );
  }

  const displayName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Signed in";
  const email = user?.primaryEmailAddress?.emailAddress;
  const avatarUrl = user?.imageUrl;
  const initials = (user?.fullName || email || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <nav
        className="native-bottom-tab-bar fixed inset-x-0 bottom-0 z-50 print:hidden"
        aria-label="Main navigation"
      >
        <div className="native-bottom-tab-bar-inner mx-auto flex max-w-md items-stretch justify-around gap-0.5 px-2 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive(location);

            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => handleTabPress(tab)}
                className={cn(
                  "native-tab-item flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
              >
                <span
                  className={cn(
                    "native-tab-icon-wrap flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200",
                    active ? "bg-primary/12" : "bg-transparent",
                  )}
                >
                  <Icon
                    className="native-tab-icon h-[22px] w-[22px] transition-transform duration-200"
                    strokeWidth={active ? 2.35 : 1.85}
                  />
                </span>
                <span className={cn("text-[10px] font-medium leading-none tracking-wide", active && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Drawer open={accountOpen} onOpenChange={handleAccountOpenChange} shouldScaleBackground>
        <DrawerContent className="native-account-sheet px-0 pb-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Account</DrawerTitle>
          </DrawerHeader>

          <div className="px-5 pb-2 pt-1">
            {clerkLoaded && isSignedIn ? (
              <div className="flex items-center gap-4 rounded-[1.5rem] bg-card px-4 py-4 shadow-[0_2px_20px_-6px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-background shadow-sm"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-base font-semibold text-primary ring-2 ring-background">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-xl font-semibold tracking-tight text-foreground">{displayName}</p>
                  {email && displayName !== email ? (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{email}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] bg-card px-5 py-5 shadow-[0_2px_20px_-6px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03]">
                <p className="font-serif text-xl font-semibold tracking-tight text-foreground">Welcome</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Sign in to track orders and manage your business.
                </p>
              </div>
            )}
          </div>

          <nav className="mt-2 space-y-0.5 px-3" aria-label="Account navigation">
            {showMyOrdersNav && (
              <Link href="/my-orders" onClick={closeAccount}>
                <span className={accountRowClass("/my-orders")}>
                  <Package className="h-5 w-5 shrink-0 opacity-80" />
                  <span className="flex-1 text-left">My Orders</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                </span>
              </Link>
            )}

            {showBusinessHubNav && (
              <Link href={dashboardHref} onClick={closeAccount}>
                <span className={accountRowClass(dashboardHref)}>
                  <DashboardIcon className="h-5 w-5 shrink-0 opacity-80" />
                  <span className="flex-1 text-left">{dashboardLabel}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                </span>
              </Link>
            )}

            {showListYourBusinessNav && (
              <Link href="/list-your-business" onClick={closeAccount}>
                <span className={accountRowClass("/list-your-business")}>
                  <PlusCircle className="h-5 w-5 shrink-0 opacity-80" />
                  <span className="flex-1 text-left">List Your Business</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                </span>
              </Link>
            )}

            <Link href="/help" onClick={closeAccount}>
              <span className={accountRowClass("/help")}>
                <HelpCircle className="h-5 w-5 shrink-0 opacity-80" />
                <span className="flex-1 text-left">Help</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
              </span>
            </Link>

            {setupAvailable && (isLoggedOut || isCustomer) && (
              <Link href="/setup" onClick={closeAccount}>
                <span className={accountRowClass("/setup")}>
                  <Wrench className="h-5 w-5 shrink-0 opacity-80" />
                  <span className="flex-1 text-left">Admin Setup</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                </span>
              </Link>
            )}
          </nav>

          <div className="mt-3 border-t border-border/40 px-4 py-4 space-y-3">
            {clerkLoaded && !isSignedIn && (
              <div className="space-y-3">
                <NativeGoogleSignInButton />
                <SignInButton mode="modal" appearance={nativeClerkAuthAppearance}>
                  <Button className="w-full min-h-[50px]" onClick={closeAccount}>
                    Sign In with email
                  </Button>
                </SignInButton>
              </div>
            )}

            {clerkLoaded && isSignedIn && (
              <LoadingButton
                type="button"
                variant="ghost"
                className="w-full min-h-12 justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                loading={signingOut}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign Out
              </LoadingButton>
            )}

            {setupAvailable && (isLoggedOut || isCustomer) && (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-primary">First time here?</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sign in, then visit Admin Setup to claim platform admin access.
                </p>
                <Link href="/setup" onClick={closeAccount}>
                  <Button size="sm" className="mt-3 w-full min-h-11">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Go to Admin Setup
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
