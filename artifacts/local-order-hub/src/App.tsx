import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useUser } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/components/cart-context";
import { PlatformThemeProvider } from "@/components/theme-provider";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Businesses from "@/pages/businesses";
import Storefront from "@/pages/storefront";
import Cart from "@/pages/cart";
import OrderConfirmation from "@/pages/order-confirmation";

import BusinessOverview from "@/pages/dashboard/business/overview";
import BusinessOrders from "@/pages/dashboard/business/orders";
import BusinessOrderDetail from "@/pages/dashboard/business/order-detail";
import BusinessProducts from "@/pages/dashboard/business/products";
import BusinessCategories from "@/pages/dashboard/business/categories";
import BusinessSettings from "@/pages/dashboard/business/settings";
import BusinessBilling from "@/pages/dashboard/business/billing";
import BusinessLocations from "@/pages/dashboard/business/locations";

import AdminOverview from "@/pages/dashboard/admin/overview";
import AdminBusinesses from "@/pages/dashboard/admin/businesses";
import AdminOrders from "@/pages/dashboard/admin/orders";
import AdminUsers from "@/pages/dashboard/admin/users";
import AdminEvents from "@/pages/dashboard/admin/events";
import AdminHighlights from "@/pages/dashboard/admin/highlights";
import AdminPlans from "@/pages/dashboard/admin/plans";
import AdminSettings from "@/pages/dashboard/admin/settings";

import Setup from "@/pages/setup";
import ListYourBusiness from "@/pages/list-your-business";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = `${window.location.origin}/api/__clerk`;
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
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
  },
  variables: {
    colorPrimary: "hsl(25, 80%, 45%)",
    colorForeground: "hsl(20, 20%, 15%)",
    colorMutedForeground: "hsl(20, 10%, 45%)",
    colorDanger: "hsl(0, 70%, 50%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(30, 15%, 85%)",
    colorInputForeground: "hsl(20, 20%, 15%)",
    colorNeutral: "hsl(30, 15%, 85%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-serif text-foreground font-semibold tracking-tight",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium text-foreground",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary font-medium hover:underline",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-white",
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

const PUBLIC_PATHS = ["/", "/businesses", "/sign-in", "/sign-up", "/setup", "/list-your-business"];

function PostSignInRedirector() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const [redirectPending, setRedirectPending] = useState(false);
  const prevSignedIn = useRef<boolean | undefined>(undefined);

  const { data: me } = useGetMe({
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
        <PostSignInRedirector />
        <PlatformThemeProvider>
        <CartProvider>
          <TooltipProvider>
            <Layout>
              <Switch>
                {/* Public routes */}
                <Route path="/" component={Home} />
                <Route path="/businesses" component={Businesses} />
                <Route path="/businesses/:slug" component={Storefront} />
                <Route path="/cart" component={Cart} />
                <Route path="/order/:id" component={OrderConfirmation} />

                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                <Route path="/setup" component={Setup} />
                <Route path="/list-your-business" component={ListYourBusiness} />

                {/* Business owner dashboard */}
                <ProtectedRoute path="/dashboard/business/orders/:id" component={BusinessOrderDetail} />
                <ProtectedRoute path="/dashboard/business/orders" component={BusinessOrders} />
                <ProtectedRoute path="/dashboard/business/products" component={BusinessProducts} />
                <ProtectedRoute path="/dashboard/business/categories" component={BusinessCategories} />
                <ProtectedRoute path="/dashboard/business/locations" component={BusinessLocations} />
                <ProtectedRoute path="/dashboard/business/billing" component={BusinessBilling} />
                <ProtectedRoute path="/dashboard/business/settings" component={BusinessSettings} />
                <ProtectedRoute path="/dashboard/business" component={BusinessOverview} />

                {/* Admin dashboard */}
                <ProtectedRoute path="/dashboard/admin/businesses" component={AdminBusinesses} />
                <ProtectedRoute path="/dashboard/admin/orders" component={AdminOrders} />
                <ProtectedRoute path="/dashboard/admin/users" component={AdminUsers} />
                <ProtectedRoute path="/dashboard/admin/events" component={AdminEvents} />
                <ProtectedRoute path="/dashboard/admin/highlights" component={AdminHighlights} />
                <ProtectedRoute path="/dashboard/admin/plans" component={AdminPlans} />
                <ProtectedRoute path="/dashboard/admin/settings" component={AdminSettings} />
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
