import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBusinessFeatureAccess } from "@/hooks/business-feature-access";
import { LockedBadge, lockedSurfaceClass } from "@/components/locked-feature-ui";

interface LockedFeatureSectionProps {
  featureKey: string;
  children: ReactNode;
  className?: string;
}

/** Greys out dashboard content and opens the upgrade modal when locked. */
export function LockedFeatureSection({ featureKey, children, className }: LockedFeatureSectionProps) {
  const { hasFeature, openLockedFeature } = useBusinessFeatureAccess();
  const locked = !hasFeature(featureKey);

  if (!locked) {
    return <div className={cn("space-y-8", className)}>{children}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      <div className={cn("space-y-4", lockedSurfaceClass(true))} aria-hidden>
        {children}
      </div>
      <div className="absolute top-3 right-3 z-10">
        <LockedBadge />
      </div>
      <button
        type="button"
        className="absolute inset-0 z-20 rounded-xl cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => openLockedFeature(featureKey)}
        aria-label="Feature locked — view upgrade options"
      />
    </div>
  );
}
