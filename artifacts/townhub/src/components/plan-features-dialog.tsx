import { useEffect, useMemo, useState } from "react";
import {
  useListSubscriptionFeatures,
  useGetSubscriptionPlanFeatures,
  useSetSubscriptionPlanFeatures,
  getListSubscriptionPlansQueryKey,
  getGetSubscriptionPlanFeaturesQueryKey,
  getListSubscriptionFeaturesQueryKey,
} from "@workspace/api-client-react";
import type { SubscriptionPlan } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PlanFeaturesDialogProps {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanFeaturesDialog({ plan, open, onOpenChange }: PlanFeaturesDialogProps) {
  const planId = plan?.id ?? 0;

  const { data: catalogData, isLoading: catalogLoading } = useListSubscriptionFeatures({
    query: { enabled: open, queryKey: getListSubscriptionFeaturesQueryKey() },
  });
  const { data: planFeaturesData, isLoading: planFeaturesLoading } = useGetSubscriptionPlanFeatures(
    planId,
    { query: { enabled: open && planId > 0, queryKey: getGetSubscriptionPlanFeaturesQueryKey(planId) } },
  );

  const catalog = catalogData ?? [];
  const assignedFeatureIdsKey = useMemo(
    () => (planFeaturesData ?? []).map((feature) => feature.id).join(","),
    [planFeaturesData],
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      return;
    }
    if (planFeaturesLoading) return;
    setSelectedIds(assignedFeatureIdsKey ? assignedFeatureIdsKey.split(",").map(Number) : []);
  }, [open, planId, planFeaturesLoading, assignedFeatureIdsKey]);

  const saveFeatures = useSetSubscriptionPlanFeatures({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubscriptionPlansQueryKey() });
        if (plan) {
          queryClient.invalidateQueries({ queryKey: getGetSubscriptionPlanFeaturesQueryKey(plan.id) });
        }
        toast({ title: "Plan features updated" });
        onOpenChange(false);
      },
      onError: () => toast({ title: "Failed to update plan features", variant: "destructive" }),
    },
  });

  const loading = catalogLoading || planFeaturesLoading;

  function toggleFeature(featureId: number, checked: boolean) {
    setSelectedIds((prev) =>
      checked ? [...prev, featureId] : prev.filter((id) => id !== featureId),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Features for {plan?.name ?? "plan"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading features…</p>
        ) : catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No features in the catalog yet. Add features first, then assign them to plans.
          </p>
        ) : (
          <div className="space-y-3 py-2">
            {catalog.map((feature) => (
              <div
                key={feature.id}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40"
              >
                <Checkbox
                  id={`plan-feature-${planId}-${feature.id}`}
                  checked={selectedIds.includes(feature.id)}
                  onCheckedChange={(checked) => toggleFeature(feature.id, checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`plan-feature-${planId}-${feature.id}`}
                  className="min-w-0 cursor-pointer"
                >
                  <span className="font-medium text-sm block">{feature.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{feature.key}</span>
                  {feature.description && (
                    <span className="text-xs text-muted-foreground block mt-1">{feature.description}</span>
                  )}
                </label>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton
            onClick={() => plan && saveFeatures.mutate({ id: plan.id, data: { featureIds: selectedIds } })}
            disabled={!plan}
            loading={saveFeatures.isPending}
            loadingText="Saving…"
          >
            Save features
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
