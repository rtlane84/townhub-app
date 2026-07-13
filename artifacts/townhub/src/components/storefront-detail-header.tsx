import { Link } from "wouter";
import { ArrowLeft, Heart, Share } from "lucide-react";
import { PlatformBrandMark } from "@/components/platform-brand-mark";
import { usePlatformBranding } from "@/components/theme-provider";
import { resolveNativeHeaderLogoPx } from "@/lib/platform-branding";
import { useNativePlatform } from "@/hooks/use-native-platform";
import { cn } from "@/lib/utils";
import { Store } from "lucide-react";

type StorefrontDetailHeaderProps = {
  favorited: boolean;
  onShare: () => void;
  onToggleFavorite: () => void;
  className?: string;
};

export function StorefrontDetailHeader({
  favorited,
  onShare,
  onToggleFavorite,
  className,
}: StorefrontDetailHeaderProps) {
  const { platformName, logoUrl, logoSizePx } = usePlatformBranding();
  const { isNative } = useNativePlatform();
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

        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-[0.97]"
            aria-label="Share business"
          >
            <Share className="h-[18px] w-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted active:scale-[0.97]",
              favorited ? "text-rose-500" : "text-foreground",
            )}
            aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
            aria-pressed={favorited}
          >
            <Heart
              className="h-[18px] w-[18px]"
              fill={favorited ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </header>
  );
}
