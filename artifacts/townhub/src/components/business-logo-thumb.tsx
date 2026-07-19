import { Store } from "lucide-react";
import {
  businessHeroPlaceholderStyle,
  businessIconAccentStyle,
} from "@/lib/theme-colors";
import { cn } from "@/lib/utils";
import { OptimizedMediaImage } from "@/components/optimized-media-image";
import { THUMBNAIL_IMAGE_WIDTHS } from "@/lib/optimized-image";

type BusinessLogoThumbProps = {
  logoUrl?: string | null;
  accentColor?: string | null;
  alt?: string;
  className?: string;
  rounded?: string;
  sizes?: string;
  priority?: boolean;
  /** Soft card border + shadow like the storefront overlapping logo. */
  framed?: boolean;
  iconClassName?: string;
};

/**
 * Rounded-square logo holder matching the storefront detail page:
 * object-contain logo on bg-card, Store icon fallback when missing.
 */
export function BusinessLogoThumb({
  logoUrl,
  accentColor,
  alt = "",
  className,
  rounded = "rounded-[0.9rem]",
  sizes = "68px",
  priority = false,
  framed = false,
  iconClassName = "h-7 w-7",
}: BusinessLogoThumbProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-card",
        framed &&
          "border-[3px] border-card shadow-[0_4px_16px_-4px_rgba(15,23,42,0.25)]",
        rounded,
        className,
      )}
    >
      {logoUrl ? (
        <OptimizedMediaImage
          src={logoUrl}
          widths={THUMBNAIL_IMAGE_WIDTHS}
          sizes={sizes}
          priority={priority}
          alt={alt}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/40"
          style={businessHeroPlaceholderStyle(accentColor)}
        >
          <Store
            className={iconClassName}
            style={businessIconAccentStyle(accentColor)}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
