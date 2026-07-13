import { Link } from "wouter";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { PlatformBrandMark } from "@/components/platform-brand-mark";
import { usePlatformBranding } from "@/components/theme-provider";
import { useCart } from "@/components/cart-context";
import { Badge } from "@/components/ui/badge";
import { resolveNativeHeaderLogoPx } from "@/lib/platform-branding";
import { useNativePlatform } from "@/hooks/use-native-platform";
import { cn } from "@/lib/utils";
import { Store } from "lucide-react";

type StorefrontDetailHeaderProps = {
  hideCart?: boolean;
  className?: string;
};

export function StorefrontDetailHeader({
  hideCart = false,
  className,
}: StorefrontDetailHeaderProps) {
  const { platformName, logoUrl, logoSizePx } = usePlatformBranding();
  const { isNative } = useNativePlatform();
  const { itemCount } = useCart();
  const logoPx = isNative
    ? resolveNativeHeaderLogoPx(logoSizePx)
    : Math.min(logoSizePx, 28);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-black/[0.06] bg-background/95 backdrop-blur-md",
        isNative && "pt-[var(--safe-area-top)]",
        className,
      )}
    >
      <div className="mx-auto grid h-12 max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
        <div className="flex justify-start">
          <Link
            href="/businesses"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-[0.97]"
            aria-label="Back to businesses"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        <Link
          href="/"
          className="flex max-w-[min(60vw,14rem)] items-center justify-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={platformName}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="object-contain"
              style={{ width: logoPx, height: logoPx }}
            />
          ) : (
            <Store
              className="shrink-0 text-primary"
              style={{ width: logoPx, height: logoPx }}
              aria-hidden
            />
          )}
          <PlatformBrandMark name={platformName} compact className="truncate" />
        </Link>

        <div className="flex items-center justify-end">
          {!hideCart ? (
            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-[0.97]"
              aria-label="Cart"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
              {itemCount > 0 ? (
                <Badge className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]">
                  {itemCount}
                </Badge>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
