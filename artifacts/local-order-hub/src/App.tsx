import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { clerkAuthAppearance } from "@/lib/clerk-appearance";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@clerk/react";
import { useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/components/cart-context";
import { PlatformThemeProvider } from "@/components/theme-provider";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Events from "@/pages/events";
import FoodTrucks from "@/pages/food-trucks";
import Businesses from "@/pages/businesses";
import Storefront from "@/pages/storefront";
import Cart from "@/pages/cart";
import OrderConfirmation from "@/pages/order-confirmation";
import MyOrders from "@/pages/my-orders";
import MyOrderDetail from "@/pages/my-order-detail";

import BusinessOverview from "@/pages/dashboard/business/overview";
import BusinessOrders from "@/pages/dashboard/business/orders";
import BusinessKitchen from "@/pages/dashboard/business/kitchen";
import BusinessOrderDetail from "@/pages/dashboard/business/order-detail";
import BusinessProducts from "@/pages/dashboard/business/products";
import BusinessCategories from "@/pages/dashboard/business/categories";
import BusinessSettings from "@/pages/dashboard/business/settings";
import BusinessAppointments from "@/pages/dashboard/business/appointments";
import BusinessBilling from "@/pages/dashboard/business/billing";
import BusinessLocations from "@/pages/dashboard/business/locations";

import AdminOverview from "@/pages/dashboard/admin/overview";
import AdminApplications from "@/pages/dashboard/admin/applications";
import AdminBusinesses from "@/pages/dashboard/admin/businesses";
import AdminOrders from "@/pages/dashboard/admin/orders";
import AdminUsers from "@/pages/dashboard/admin/users";
import AdminEvents from "@/pages/dashboard/admin/events";
import AdminHighlights from "@/pages/dashboard/admin/highlights";
import AdminPlans from "@/pages/dashboard/admin/plans";
import AdminSettings from "@/pages/dashboard/admin/settings";
import AdminSystemStatus from "@/pages/dashboard/admin/system-status";

import Setup from "@/pages/setup";
import ListYourBusiness from "@/pages/list-your-business";
import Help from "@/pages/help";
import { SelectedBusinessProvider } from "@/hooks/selected-business-context";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev (Clerk loads from its CDN directly). Auto-populated in prod by Replit.
// DO NOT hardcode or gate on NODE_ENV — any change here breaks prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  ...clerkAuthAppearance,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

/**
 * Wires the Clerk session JWT as a Bearer token for all API calls.
 *
 * In the Replit preview the app runs inside an iframe whose top-level origin is
 * replit.com, which makes janeway.replit.dev a cross-site context. Browsers
 * apply SameSite=Lax to Clerk's session cookies, so they are silently stripped
 * from every API request.  Sending the JWT as Authorization: Bearer sidesteps
 * the cookie restriction in both dev (iframe) and prod (published domain).
 */
function ClerkApiTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}

const PUBLIC_PATHS = ["/", "/businesses", "/events", "/food-trucks", "/sign-in", "/sign-up", "/setup", "/list-your-business"];

function PostSignInRedirector() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [redirectPending, setRedirectPending] = useState(false);
  const prevSignedIn = useRef<boolean | undefined>(undefined);

  const { data: me } = useGetMe(undefined, {
    query: {
      enabled: redirectPending,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (prevSignedIn.current === false && isSignedIn === true) {
      setRedirectPending(true);
    }
    prevSignedIn.current = isSignedIn ?? false;
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!redirectPending || !me?.role) return;
    setRedirectPending(false);

    const currentPath = window.location.pathname.replace(basePath, "") || "/";
    const onPublicPage = PUBLIC_PATHS.some((p) => currentPath === p || currentPath.startsWith(p + "/"));

    if (onPublicPage) {
      if (me.role === "ADMIN") {
        setLocation("/dashboard/admin");
      } else if (me.role === "BUSINESS_OWNER") {
        setLocation("/dashboard/business");
      }
    }
  }, [redirectPending, me, setLocation]);

  return null;
}

function BusinessDashboardRoute({
  component: Component,
  ...rest
}: {
  component: React.ComponentType<{ params: Record<string, string> }>;
  path: string;
}) {
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <SelectedBusinessProvider>
              <Component params={params as Record<string, string>} />
            </SelectedBusinessProvider>
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}

function ProtectedRoute({
  component: Component,
  ...rest
}: {
  component: React.ComponentType<{ params: Record<string, string> }>;
  path: string;
}) {
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <Component params={params as Record<string, string>} />
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkApiTokenBridge />
        <PostSignInRedirector />
        <PlatformThemeProvider>
        <CartProvider>
          <TooltipProvider>
            <Layout>
              <Switch>
                {/* Public routes */}
                <Route path="/" component={Home} />
                <Route path="/events" component={Events} />
                <Route path="/food-trucks" component={FoodTrucks} />
                <Route path="/businesses" component={Businesses} />
                <Route path="/businesses/:slug" component={Storefront} />
                <Route path="/cart" component={Cart} />
                <Route path="/order/:id" component={OrderConfirmation} />
                <ProtectedRoute path="/my-orders/:id" component={MyOrderDetail} />
                <ProtectedRoute path="/my-orders" component={MyOrders} />

                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                <Route path="/setup" component={Setup} />
                <Route path="/list-your-business" component={ListYourBusiness} />
                <Route path="/help" component={Help} />

                {/* Business owner dashboard */}
                <BusinessDashboardRoute path="/dashboard/business/orders/:id" component={BusinessOrderDetail} />
                <BusinessDashboardRoute path="/dashboard/business/orders" component={BusinessOrders} />
                <BusinessDashboardRoute path="/dashboard/business/kitchen" component={BusinessKitchen} />
                <BusinessDashboardRoute path="/dashboard/business/products" component={BusinessProducts} />
                <BusinessDashboardRoute path="/dashboard/business/categories" component={BusinessCategories} />
                <BusinessDashboardRoute path="/dashboard/business/locations" component={BusinessLocations} />
                <BusinessDashboardRoute path="/dashboard/business/billing" component={BusinessBilling} />
                <BusinessDashboardRoute path="/dashboard/business/appointments" component={BusinessAppointments} />
                <BusinessDashboardRoute path="/dashboard/business/settings" component={BusinessSettings} />
                <BusinessDashboardRoute path="/dashboard/business" component={BusinessOverview} />

                {/* Admin dashboard */}
                <ProtectedRoute path="/dashboard/admin/applications" component={AdminApplications} />
                <ProtectedRoute path="/dashboard/admin/businesses" component={AdminBusinesses} />
                <ProtectedRoute path="/dashboard/admin/orders" component={AdminOrders} />
                <ProtectedRoute path="/dashboard/admin/users" component={AdminUsers} />
                <ProtectedRoute path="/dashboard/admin/events" component={AdminEvents} />
                <ProtectedRoute path="/dashboard/admin/highlights" component={AdminHighlights} />
                <ProtectedRoute path="/dashboard/admin/plans" component={AdminPlans} />
                <ProtectedRoute path="/dashboard/admin/settings" component={AdminSettings} />
                <ProtectedRoute path="/dashboard/admin/system-status" component={AdminSystemStatus} />
                <ProtectedRoute path="/dashboard/admin" component={AdminOverview} />

                <Route component={NotFound} />
              </Switch>
            </Layout>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
        </PlatformThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
