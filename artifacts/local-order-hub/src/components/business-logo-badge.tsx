import { Store } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  lg: "h-24 w-24",
} as const;

const FALLBACK_ICON_CLASS = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

type BusinessLogoBadgeProps = {
  src?: string | null;
  alt: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  ringClassName?: string;
};

/** Circular business logo frame — object-contain so wide/tall logos are not cropped. */
export function BusinessLogoBadge({
  src,
  alt,
  size = "sm",
  className,
  ringClassName,
}: BusinessLogoBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-white p-1 shadow-md shrink-0 ring-2 ring-white",
        SIZE_CLASS[size],
        ringClassName,
        className,
      )}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-muted/25 p-0.5">
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Store className={cn("text-muted-foreground", FALLBACK_ICON_CLASS[size])} />
        )}
      </div>
    </div>
  );
}

/** Hero + overlapping logo layout for business listing cards. */
export function BusinessListingCardMedia({
  heroImageUrl,
  heroAlt,
  logoUrl,
  businessName,
  placeholder,
}: {
  heroImageUrl?: string | null;
  heroAlt: string;
  logoUrl?: string | null;
  businessName: string;
  placeholder: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={heroAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          placeholder
        )}
      </div>
      {logoUrl ? (
        <BusinessLogoBadge
          src={logoUrl}
          alt={`${businessName} logo`}
          size="sm"
          className="absolute bottom-0 left-6 z-10 translate-y-1/2"
        />
      ) : null}
    </div>
  );
}
