import { Link, useLocation } from "wouter";
import { UserButton, useUser, SignInButton } from "@clerk/react";
import { ShoppingBag, Menu, Store, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "./cart-context";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { itemCount } = useCart();
  const [location] = useLocation();

  const isAdmin = user?.publicMetadata?.role === "ADMIN";
  const isBusinessOwner = user?.publicMetadata?.role === "BUSINESS_OWNER";

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
              <Link href="/businesses" className={`transition-colors hover:text-foreground ${location === '/businesses' ? 'text-foreground' : ''}`}>
                All Businesses
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
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
              <div className="flex items-center gap-4">
                {(isAdmin || isBusinessOwner) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/admin" className="w-full cursor-pointer">Admin Dashboard</Link>
                        </DropdownMenuItem>
                      )}
                      {isBusinessOwner && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/business" className="w-full cursor-pointer">Business Dashboard</Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <UserButton afterSignOutUrl="/" />
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
