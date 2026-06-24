import { Link, useLocation } from "wouter";
import { UserButton, useUser, SignInButton } from "@clerk/react";
import { ShoppingBag, Store, LayoutDashboard, ShieldCheck, PlusCircle, Wrench } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "./cart-context";
import { Badge } from "./ui/badge";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const { itemCount } = useCart();
  const [location] = useLocation();

  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn, queryKey: getGetMeQueryKey() } });

  const isAdmin = me?.role === "ADMIN";
  const isBusinessOwner = me?.role === "BUSINESS_OWNER";

  const dashboardHref = isAdmin ? "/dashboard/admin" : "/dashboard/business";
  const dashboardLabel = isAdmin ? "Admin" : "Business Hub";
  const DashboardIcon = isAdmin ? ShieldCheck : LayoutDashboard;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <Store className="h-6 w-6 text-primary" />
              <span className="font-serif text-xl font-semibold tracking-tight text-primary">
                LocalOrderHub
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link
                href="/businesses"
                className={`transition-colors hover:text-foreground ${location === "/businesses" ? "text-foreground" : ""}`}
              >
                All Businesses
              </Link>

              {isLoaded && isSignedIn && (isAdmin || isBusinessOwner) && (
                <Link
                  href={dashboardHref}
                  className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${
                    location.startsWith("/dashboard") ? "text-foreground" : ""
                  }`}
                >
                  <DashboardIcon className="h-3.5 w-3.5" />
                  {dashboardLabel}
                </Link>
              )}

              {isLoaded && !isAdmin && !isBusinessOwner && (
                <Link
                  href="/list-your-business"
                  className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${
                    location === "/list-your-business" ? "text-foreground" : ""
                  }`}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  List Your Business
                </Link>
              )}

              {/* Setup link — visible to anyone not yet signed in or without a role */}
              {isLoaded && !isAdmin && !isBusinessOwner && (
                <Link
                  href="/setup"
                  className={`flex items-center gap-1.5 transition-colors hover:text-foreground ${
                    location === "/setup" ? "text-foreground" : ""
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Setup
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
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

            {isLoaded && !isSignedIn && (
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            )}

            {isLoaded && isSignedIn && (
              <div className="flex items-center gap-2">
                {(isAdmin || isBusinessOwner) && (
                  <Link href={dashboardHref} className="sm:hidden">
                    <Button variant="outline" size="icon">
                      <DashboardIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <UserButton />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-12 bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Store className="h-5 w-5 text-muted-foreground" />
            <span className="font-serif text-lg font-medium text-muted-foreground">LocalOrderHub</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Order Local. Support Local. The digital heart of your small town.
          </p>
        </div>
      </footer>
    </div>
  );
}
