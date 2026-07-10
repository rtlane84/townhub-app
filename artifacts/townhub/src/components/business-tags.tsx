import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Truck, CalendarDays, ShoppingBag, Info } from "lucide-react";
import {
  formatBusinessTypeLabel,
  resolveStorefrontMode,
  storefrontModePublicBadge,
  type StorefrontMode,
} from "@workspace/api-zod";
import { businessServiceBadgeStyle } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

export type BusinessTagsSource = {
  type: string;
  storefrontMode?: StorefrontMode | null;
  active?: boolean;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
  eventLocationEnabled?: boolean;
};

type BusinessTagsProps = {
  business: BusinessTagsSource;
  accentColor?: string | null;
  variant: "listing" | "storefront";
  /** Listing cards: "footer" adds top border (directory); "inline" keeps tags in content flow (homepage). */
  listingLayout?: "footer" | "inline";
  /** Storefront shows Closed in the tag row; listing cards show it in the title row. */
  showClosedInTags?: boolean;
  className?: string;
};

const SERVICE_TAG_FALLBACK_CLASS = "border-primary bg-primary/10 text-primary";

function BusinessTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="outline" className="border-border bg-muted font-medium text-muted-foreground">
      {formatBusinessTypeLabel(type)}
    </Badge>
  );
}

function ServiceTag({
  accentColor,
  children,
}: {
  accentColor?: string | null;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      className={accentColor ? undefined : SERVICE_TAG_FALLBACK_CLASS}
      style={businessServiceBadgeStyle(accentColor)}
    >
      {children}
    </Badge>
  );
}

function StorefrontModeBadge({
  mode,
  accentColor,
}: {
  mode: StorefrontMode;
  accentColor?: string | null;
}) {
  const badge = storefrontModePublicBadge(mode);
  const icon =
    badge.icon === "appointment" ? (
      <CalendarDays className="mr-1 h-3 w-3" />
    ) : badge.icon === "information" ? (
      <Info className="mr-1 h-3 w-3" />
    ) : (
      <ShoppingBag className="mr-1 h-3 w-3" />
    );

  return (
    <ServiceTag accentColor={accentColor}>
      {icon}
      {badge.label}
    </ServiceTag>
  );
}

function BusinessServiceTags({
  business,
  accentColor,
  showClosedInTags = false,
}: {
  business: BusinessTagsSource;
  accentColor?: string | null;
  showClosedInTags?: boolean;
}) {
  const storefrontMode = resolveStorefrontMode(business);

  return (
    <>
      {showClosedInTags && business.active === false && (
        <Badge variant="secondary">Closed</Badge>
      )}
      <StorefrontModeBadge mode={storefrontMode} accentColor={accentColor} />
      {storefrontMode === "ORDERING" && business.pickupEnabled && (
        <ServiceTag accentColor={accentColor}>Pickup</ServiceTag>
      )}
      {storefrontMode === "ORDERING" && business.deliveryEnabled && (
        <ServiceTag accentColor={accentColor}>Delivery</ServiceTag>
      )}
      {business.eventLocationEnabled && (
        <ServiceTag accentColor={accentColor}>
          <Truck className="mr-1 h-3 w-3" />
          Food Truck
        </ServiceTag>
      )}
    </>
  );
}

/** Business type + capability tags for directory cards and storefront sidebar. */
export function BusinessTags({
  business,
  accentColor,
  variant,
  listingLayout = "footer",
  showClosedInTags,
  className,
}: BusinessTagsProps) {
  const tags = (
    <>
      <BusinessTypeBadge type={business.type} />
      <BusinessServiceTags
        business={business}
        accentColor={accentColor}
        showClosedInTags={showClosedInTags ?? variant === "storefront"}
      />
    </>
  );

  if (variant === "storefront") {
    return (
      <div className={cn("mb-2 flex flex-wrap justify-center gap-2", className)}>
        {tags}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        listingLayout === "footer" && "mt-auto border-t border-border/40 pt-4",
        className,
      )}
    >
      {tags}
    </div>
  );
}
