import { useState } from "react";
import {
  useListPublicPricingPlans,
  getListPublicPricingPlansQueryKey,
  useChangeBusinessSubscriptionPlan,
  getGetMySubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  formatPlanAmount,
  isComplimentaryPricingPlan,
  pricingPlanCtaLabel,
} from "@/lib/subscription-display";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  businessId: number;
  currentPlanId?: number;
  currentInterval?: "monthly" | "yearly" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangePlanDialog({
  businessId,
  currentPlanId,
  currentInterval,
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useListPublicPricingPlans({
    query: { enabled: open, queryKey: getListPublicPricingPlansQueryKey() },
  });

  const changePlan = useChangeBusinessSubscriptionPlan();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(currentPlanId ?? null);
  const [interval, setInterval] = useState<"monthly" | "yearly">(currentInterval ?? "monthly");

  const paidPlans = plans.filter((plan) => !isComplimentaryPricingPlan(plan));

  async function handleConfirm() {
    if (!selectedPlanId) return;
    try {
      const result = await changePlan.mutateAsync({
        id: businessId,
        data: { planId: selectedPlanId, interval },
      });

      if (result.mode === "checkout" && result.url) {
        window.location.href = result.url;
        return;
      }

      await queryClient.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey(businessId) });
      toast({ title: "Plan updated", description: "Your subscription has been updated." });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Unable to change plan",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Change plan</DialogTitle>
          <DialogDescription>
            Switch plans or billing interval. Upgrades and downgrades are prorated through Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-2">
          {(["monthly", "yearly"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={interval === value ? "default" : "outline"}
              onClick={() => setInterval(value)}
            >
              {value === "monthly" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading plans…</p>
        ) : paidPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No paid plans are available to switch to right now.
          </p>
        ) : (
          <div className="space-y-2">
            {paidPlans.map((plan) => {
              const price =
                interval === "yearly" && plan.yearlyPrice != null && plan.yearlyPrice > 0
                  ? formatPlanAmount(plan.yearlyPrice, "year")
                  : formatPlanAmount(plan.monthlyPrice);
              const isCurrent = plan.id === currentPlanId && interval === currentInterval;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={cn(
                    "w-full text-left rounded-xl border-2 p-4 transition-all",
                    selectedPlanId === plan.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{plan.name}</span>
                        {plan.isRecommended && (
                          <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px]">Current</Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm">{price}</span>
                      {selectedPlanId === plan.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton
            onClick={() => void handleConfirm()}
            loading={changePlan.isPending}
            loadingText="Updating…"
            disabled={!selectedPlanId || paidPlans.length === 0}
          >
            {selectedPlanId && paidPlans.find((p) => p.id === selectedPlanId)?.trialDays
              ? pricingPlanCtaLabel(paidPlans.find((p) => p.id === selectedPlanId)!)
              : "Confirm change"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
