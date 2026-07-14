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
  UserRound,
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
  const { signOut, openUserProfile } = useClerk();
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
      isActive: (path) => isNavActive(path, "/businesses"),
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
      "flex min-h-[3.25rem] items-center gap-3 px-4 py-3.5 text-[15px] font-medium transition-colors w-full native-pressable",
      active
        ? "bg-primary/8 text-primary"
        : "bg-transparent text-foreground active:bg-muted/50",
    );
  }

  function accountIconClass(activeHref: string) {
    const active = isNavActive(location, activeHref);
    return cn("h-5 w-5 shrink-0 text-primary", active && "text-primary");
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
        className="native-bottom-tab-bar z-50 print:hidden"
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
                )}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
              >
                <span
                  className={cn(
                    "native-tab-icon-wrap flex h-8 w-8 items-center justify-center transition-all duration-200",
                  )}
                >
                  <Icon
                    className="native-tab-icon h-[22px] w-[22px] transition-opacity duration-200"
                    strokeWidth={active ? 2.25 : 1.7}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none tracking-wide",
                    active && "font-semibold",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <Drawer open={accountOpen} onOpenChange={handleAccountOpenChange} shouldScaleBackground>
        <DrawerContent className="native-account-sheet flex max-h-[92dvh] flex-col rounded-t-[1.35rem] bg-muted/90 px-0 pb-0">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Account</DrawerTitle>
          </DrawerHeader>

          <div className="native-account-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-1">
            {clerkLoaded && isSignedIn ? (
              <div className="mb-4 flex items-center gap-3.5 px-1 py-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {initials.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-foreground">
                    {displayName}
                  </p>
                  {email && displayName !== email ? (
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{email}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mb-4 px-1 py-2">
                <p className="text-[17px] font-semibold tracking-tight text-foreground">Welcome</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Sign in to track orders and manage your business.
                </p>
              </div>
            )}

            <nav
              className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.04]"
              aria-label="Account navigation"
            >
              {clerkLoaded && isSignedIn ? (
                <button
                  type="button"
                  className={accountRowClass("/account")}
                  onClick={() => {
                    closeAccount();
                    openUserProfile();
                  }}
                >
                  <UserRound className={accountIconClass("/account")} />
                  <span className="flex-1 text-left">Manage Account</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                </button>
              ) : null}

              {showMyOrdersNav && (
                <Link href="/my-orders" onClick={closeAccount}>
                  <span className={accountRowClass("/my-orders")}>
                    <Package className={accountIconClass("/my-orders")} />
                    <span className="flex-1 text-left">My Orders</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                  </span>
                </Link>
              )}

              {showBusinessHubNav && (
                <Link href={dashboardHref} onClick={closeAccount}>
                  <span className={accountRowClass(dashboardHref)}>
                    <DashboardIcon className={accountIconClass(dashboardHref)} />
                    <span className="flex-1 text-left">{dashboardLabel}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                  </span>
                </Link>
              )}

              {showListYourBusinessNav && (
                <Link href="/list-your-business" onClick={closeAccount}>
                  <span className={accountRowClass("/list-your-business")}>
                    <PlusCircle className={accountIconClass("/list-your-business")} />
                    <span className="flex-1 text-left">List Your Business</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                  </span>
                </Link>
              )}

              <Link href="/help" onClick={closeAccount}>
                <span className={accountRowClass("/help")}>
                  <HelpCircle className={accountIconClass("/help")} />
                  <span className="flex-1 text-left">Help</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                </span>
              </Link>

              {setupAvailable && (isLoggedOut || isCustomer) && (
                <Link href="/setup" onClick={closeAccount}>
                  <span className={accountRowClass("/setup")}>
                    <Wrench className={accountIconClass("/setup")} />
                    <span className="flex-1 text-left">Admin Setup</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/55" aria-hidden />
                  </span>
                </Link>
              )}
            </nav>

            <div className="mt-3 space-y-3">
              {clerkLoaded && !isSignedIn && (
                <div className="space-y-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <NativeGoogleSignInButton />
                  <SignInButton mode="modal" appearance={nativeClerkAuthAppearance}>
                    <Button className="w-full min-h-[48px]" onClick={closeAccount}>
                      Sign In with email
                    </Button>
                  </SignInButton>
                </div>
              )}

              {clerkLoaded && isSignedIn && (
                <LoadingButton
                  type="button"
                  variant="ghost"
                  className="h-12 w-full justify-center gap-2 rounded-2xl bg-card text-[15px] font-medium text-destructive shadow-sm ring-1 ring-black/[0.04] hover:bg-destructive/10 hover:text-destructive"
                  loading={signingOut}
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="h-5 w-5" aria-hidden />
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
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
