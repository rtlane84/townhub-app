import { Link } from "wouter";
import { Lock, Store } from "lucide-react";
import type { BusinessFeatureAccessEntry } from "@workspace/api-client-react";
import { STOREFRONT_MODE_OPTIONS, type StorefrontMode } from "@workspace/api-zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { businessHubFeatureMeta } from "@/lib/business-hub-features";

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: BusinessFeatureAccessEntry;
  featureKey: string | null;
  planName: string | null;
}

export function LockedFeatureModal({
  open,
  onOpenChange,
  feature,
  featureKey,
  planName,
}: LockedFeatureModalProps) {
  const fallback = featureKey ? businessHubFeatureMeta(featureKey) : null;
  const name = feature?.name ?? fallback?.label ?? "Feature";
  const description =
    feature?.description ??
    fallback?.description ??
    "Upgrade your plan to unlock this capability for your business.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Lock className="h-4 w-4 text-muted-foreground" />
            {name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground leading-relaxed">{description}</p>
          <p className="text-foreground">
            This feature isn&apos;t included in your current plan.
          </p>
          {planName && (
            <p className="text-muted-foreground">
              Current plan: <span className="font-medium text-foreground">{planName}</span>
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled title="Billing integration coming soon">
            Upgrade Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureLockedPageProps {
  featureKey: string;
  feature?: BusinessFeatureAccessEntry;
  planName: string | null;
}

export function FeatureLockedPage({ featureKey, feature, planName }: FeatureLockedPageProps) {
  const fallback = businessHubFeatureMeta(featureKey);
  const name = feature?.name ?? fallback.label;
  const description = feature?.description ?? fallback.description;

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-5">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="font-serif text-2xl font-bold mb-2">{name}</h1>
      <p className="text-muted-foreground leading-relaxed mb-4">{description}</p>
      <p className="text-sm text-foreground mb-2">
        This feature isn&apos;t included in your current plan.
      </p>
      {planName && (
        <p className="text-sm text-muted-foreground mb-6">
          Current plan: <span className="font-medium text-foreground">{planName}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button disabled title="Billing integration coming soon">
          Upgrade Plan
        </Button>
        <Link href="/dashboard/business">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

interface StorefrontModeRestrictedPageProps {
  sectionLabel: string;
  currentMode: StorefrontMode;
}

function storefrontModeLabel(mode: StorefrontMode): string {
  return STOREFRONT_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export function StorefrontModeRestrictedPage({
  sectionLabel,
  currentMode,
}: StorefrontModeRestrictedPageProps) {
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-5">
        <Store className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="font-serif text-2xl font-bold mb-2">{sectionLabel}</h1>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This section isn&apos;t available for your current storefront mode.
      </p>
      <p className="text-sm text-foreground mb-6">
        Current mode:{" "}
        <span className="font-medium">{storefrontModeLabel(currentMode)}</span>
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/dashboard/business/settings">
          <Button>Change storefront mode</Button>
        </Link>
        <Link href="/dashboard/business">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
