import { useEffect, useRef, useState, lazy, Suspense, type ComponentType } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth, AuthenticateWithRedirectCallback } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { clerkAuthAppearance, nativeClerkAuthAppearance as nativeClerkAuthBase } from "@/lib/clerk-appearance";
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
import { AnimatedSplash } from "@/components/animated-splash";

import { RoutePageLoader } from "@/components/route-page-loader";
import { NativeGoogleSignInButton } from "@/components/native-google-sign-in-button";
import { isNativeApp } from "@/lib/native-platform";
import {
  buildNativeSsoDeepLinkFromLocation,
  NATIVE_SSO_HTTPS_BOUNCE_PATH,
} from "@/lib/native-oauth";
import { clearNativeOAuthPending } from "@/lib/native-oauth-resume";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Events from "@/pages/events";
import Businesses from "@/pages/businesses";
import Storefront from "@/pages/storefront";
import Cart from "@/pages/cart";
import OrderConfirmation from "@/pages/order-confirmation";
import MyOrders from "@/pages/my-orders";
import MyOrderDetail from "@/pages/my-order-detail";
import Help from "@/pages/help";
import Pricing from "@/pages/pricing";

const FoodTrucks = lazy(() => import("@/pages/food-trucks"));
const Setup = lazy(() => import("@/pages/setup"));
const ListYourBusiness = lazy(() => import("@/pages/list-your-business"));
const DebugSentryPage = lazy(() => import("@/pages/debug-sentry"));

const BusinessOverview = lazy(() => import("@/pages/dashboard/business/overview"));
const BusinessOrders = lazy(() => import("@/pages/dashboard/business/orders"));
const BusinessKitchen = lazy(() => import("@/pages/dashboard/business/kitchen"));
const BusinessOrderDetail = lazy(() => import("@/pages/dashboard/business/order-detail"));
const BusinessProducts = lazy(() => import("@/pages/dashboard/business/products"));
const BusinessProductOptions = lazy(() => import("@/pages/dashboard/business/product-options"));
const BusinessCategories = lazy(() => import("@/pages/dashboard/business/categories"));
const BusinessNotifications = lazy(() => import("@/pages/dashboard/business/notifications"));
const BusinessSettings = lazy(() => import("@/pages/dashboard/business/settings"));
const BusinessAppointments = lazy(() => import("@/pages/dashboard/business/appointments"));
const BusinessBilling = lazy(() => import("@/pages/dashboard/business/billing"));
const BusinessSubscription = lazy(() => import("@/pages/dashboard/business/subscription"));
const BusinessLocations = lazy(() => import("@/pages/dashboard/business/locations"));

const AdminOverview = lazy(() => import("@/pages/dashboard/admin/overview"));
const AdminApplications = lazy(() => import("@/pages/dashboard/admin/applications"));
const AdminBusinesses = lazy(() => import("@/pages/dashboard/admin/businesses"));
const AdminOrders = lazy(() => import("@/pages/dashboard/admin/orders"));
const AdminUsers = lazy(() => import("@/pages/dashboard/admin/users"));
const AdminEvents = lazy(() => import("@/pages/dashboard/admin/events"));
const AdminHighlights = lazy(() => import("@/pages/dashboard/admin/highlights"));
const AdminPlans = lazy(() => import("@/pages/dashboard/admin/plans"));
const AdminFeatures = lazy(() => import("@/pages/dashboard/admin/features"));
const AdminSettings = lazy(() => import("@/pages/dashboard/admin/settings"));
const AdminSystemStatus = lazy(() => import("@/pages/dashboard/admin/system-status"));
import { SelectedBusinessProvider } from "@/hooks/selected-business-context";
import { BusinessFeatureAccessProvider } from "@/hooks/business-feature-access";
import { BusinessHubGate } from "@/components/business-hub-gate";
import { AccountDisabledGate } from "@/components/account-disabled-gate";
import { NativePushRegistration } from "@/components/native-push-registration";
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";
import { SentryContextBridge } from "@/components/sentry-context-bridge";

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

/** Sign-in/up pages: native base + logo options (OAuth hidden via nativeClerkAuthBase). */
const nativeClerkAuthAppearance = {
  ...nativeClerkAuthBase,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
};

function SignInPage() {
  const native = isNativeApp();
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
        <p className="text-sm text-muted-foreground">You’re signed in — taking you home…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {native ? <NativeGoogleSignInButton /> : null}
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={native ? nativeClerkAuthAppearance : clerkAppearance}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  const native = isNativeApp();
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
        <p className="text-sm text-muted-foreground">You’re signed in — taking you home…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        {native ? <NativeGoogleSignInButton label="Continue with Google" /> : null}
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={native ? nativeClerkAuthAppearance : clerkAppearance}
        />
      </div>
    </div>
  );
}

/**
 * Safari-only after native Google OAuth.
 * Clerk redirects here (HTTPS), then we open the app via townhub://.
 * Must stay a separate path from /sso-callback so web Google login still works.
 */
function NativeSsoBouncePage() {
  const deepLink = buildNativeSsoDeepLinkFromLocation(
    typeof window !== "undefined" ? window.location.search : "",
    typeof window !== "undefined" ? window.location.hash : "",
  );

  useEffect(() => {
    window.location.replace(deepLink);
  }, [deepLink]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">Returning to TownHub…</p>
      <a
        href={deepLink}
        className="text-sm font-medium text-primary underline underline-offset-4"
      >
        Tap here if the app doesn’t open
      </a>
    </div>
  );
}

/** WebView / web: finish Clerk OAuth session, then go home. */
function SsoCallbackPage() {
  useEffect(() => {
    clearNativeOAuthPending();
  }, []);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
        continueSignUpUrl="/sign-up"
      />
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
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

const PUBLIC_PATHS = ["/", "/businesses", "/events", "/food-trucks", "/pricing", "/sign-in", "/sign-up", "/setup", "/list-your-business", "/help"];

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
        const hasBusinesses = (me.businessIds?.length ?? 0) > 0;
        setLocation(hasBusinesses ? "/dashboard/business" : "/list-your-business");
      }
    }
  }, [redirectPending, me, setLocation]);

  return null;
}

function LazyRoutePage({
  component: Component,
  params,
}: {
  component: ComponentType<{ params: Record<string, string> }>;
  params: Record<string, string>;
}) {
  return (
    <Suspense fallback={<RoutePageLoader />}>
      <Component params={params} />
    </Suspense>
  );
}

function BusinessDashboardRoute({
  component: Component,
  ...rest
}: {
  component: ComponentType<{ params: Record<string, string> }>;
  path: string;
}) {
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <AccountDisabledGate>
              <SelectedBusinessProvider>
                <BusinessFeatureAccessProvider>
                  <BusinessHubGate>
                    <LazyRoutePage
                      component={Component}
                      params={params as Record<string, string>}
                    />
                  </BusinessHubGate>
                </BusinessFeatureAccessProvider>
              </SelectedBusinessProvider>
            </AccountDisabledGate>
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
  component: ComponentType<{ params: Record<string, string> }>;
  path: string;
}) {
  return (
    <Route {...rest}>
      {(params) => (
        <>
          <Show when="signed-in">
            <AccountDisabledGate>
              <LazyRoutePage component={Component} params={params as Record<string, string>} />
            </AccountDisabledGate>
          </Show>
          <Show when="signed-out">
            <Redirect to="/sign-in" />
          </Show>
        </>
      )}
    </Route>
  );
}

function SuspenseRoute({
  component: Component,
  ...rest
}: {
  component: ComponentType;
  path: string;
}) {
  return (
    <Route {...rest}>
      <Suspense fallback={<RoutePageLoader />}>
        <Component />
      </Suspense>
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
        <SentryContextBridge />
        <ClerkQueryClientCacheInvalidator />
        <ClerkApiTokenBridge />
        <NativePushRegistration />
        <PostSignInRedirector />
        <PlatformThemeProvider>
        <AnimatedSplash />
        <CartProvider>
          <TooltipProvider>
            <Layout>
              <Switch>
                {/* Public routes */}
                <Route path="/" component={Home} />
                <Route path="/events" component={Events} />
                <Route path="/food-trucks">
                  <Suspense fallback={<RoutePageLoader />}>
                    <FoodTrucks />
                  </Suspense>
                </Route>
                <Route path="/businesses" component={Businesses} />
                <Route path="/businesses/:slug" component={Storefront} />
                <Route path="/cart" component={Cart} />
                <Route path="/order/:id" component={OrderConfirmation} />
                <ProtectedRoute path="/my-orders/:id" component={MyOrderDetail} />
                <ProtectedRoute path="/my-orders" component={MyOrders} />

                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                <Route path={NATIVE_SSO_HTTPS_BOUNCE_PATH} component={NativeSsoBouncePage} />
                <Route path="/sso-callback" component={SsoCallbackPage} />
                <Route path="/sso-callback/*?" component={SsoCallbackPage} />
                <SuspenseRoute path="/setup" component={Setup} />
                <SuspenseRoute path="/list-your-business" component={ListYourBusiness} />
                <Route path="/help" component={Help} />
                <Route path="/pricing" component={Pricing} />
                {import.meta.env.DEV ? (
                  <SuspenseRoute path="/debug/sentry" component={DebugSentryPage} />
                ) : null}

                {/* Business owner dashboard */}
                <BusinessDashboardRoute path="/dashboard/business/orders/:id" component={BusinessOrderDetail} />
                <BusinessDashboardRoute path="/dashboard/business/orders" component={BusinessOrders} />
                <BusinessDashboardRoute path="/dashboard/business/kitchen" component={BusinessKitchen} />
                <BusinessDashboardRoute path="/dashboard/business/products" component={BusinessProducts} />
                <BusinessDashboardRoute path="/dashboard/business/product-options" component={BusinessProductOptions} />
                <Route path="/dashboard/business/modifier-groups">
                  <Redirect to="/dashboard/business/product-options" />
                </Route>
                <BusinessDashboardRoute path="/dashboard/business/categories" component={BusinessCategories} />
                <BusinessDashboardRoute path="/dashboard/business/locations" component={BusinessLocations} />
                <BusinessDashboardRoute path="/dashboard/business/billing" component={BusinessBilling} />
                <BusinessDashboardRoute path="/dashboard/business/subscription" component={BusinessSubscription} />
                <BusinessDashboardRoute path="/dashboard/business/appointments" component={BusinessAppointments} />
                <BusinessDashboardRoute path="/dashboard/business/notifications" component={BusinessNotifications} />
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
                <ProtectedRoute path="/dashboard/admin/features" component={AdminFeatures} />
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
    <SentryErrorBoundary>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </SentryErrorBoundary>
  );
}
