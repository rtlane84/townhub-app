import {
  useGetMyBusiness,
  useGetMySubscription,
  useListSubscriptionPlans,
  getGetMySubscriptionQueryKey,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  TRIALING: { label: "Free Trial", icon: Clock, variant: "secondary" as const, color: "text-amber-600" },
  ACTIVE: { label: "Active", icon: CheckCircle2, variant: "default" as const, color: "text-green-600" },
  PAST_DUE: { label: "Past Due", icon: AlertCircle, variant: "destructive" as const, color: "text-red-600" },
  CANCELED: { label: "Canceled", icon: AlertCircle, variant: "outline" as const, color: "text-muted-foreground" },
  PAUSED: { label: "Paused", icon: Clock, variant: "secondary" as const, color: "text-amber-600" },
};

export default function BusinessBilling() {
  const { data: business, isLoading: bizLoading } = useGetMyBusiness();
  const { data: subscription, isLoading: subLoading } = useGetMySubscription(
    business?.id ?? 0,
    { query: { enabled: !!business?.id, queryKey: getGetMySubscriptionQueryKey(business?.id ?? 0) } },
  );
  const { data: plans = [] } = useListSubscriptionPlans({});

  const isLoading = bizLoading || subLoading;
  const status = subscription?.status as keyof typeof STATUS_CONFIG | undefined;
  const cfg = status ? STATUS_CONFIG[status] : null;
  const StatusIcon = cfg?.icon ?? CreditCard;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Your subscription plan and billing status</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !subscription ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No subscription yet</p>
              <p className="text-sm mt-1">Contact the platform administrator to set up your billing plan.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Subscription Status</CardTitle>
                  {cfg && (
                    <Badge variant={cfg.variant} className="gap-1">
                      <StatusIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscription.plan && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Current Plan</span>
                    <span className="font-semibold">{subscription.plan.name}</span>
                  </div>
                )}
                {subscription.plan && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Monthly Price</span>
                    <span className="font-semibold text-primary">
                      {subscription.plan.monthlyPrice === 0 ? "Free" : `$${subscription.plan.monthlyPrice.toFixed(2)}/mo`}
                    </span>
                  </div>
                )}
                {status === "TRIALING" && subscription.trialEndsAt && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">Trial Ends</span>
                    <span className="text-amber-600 font-medium">
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscription.currentPeriodEnd && subscription.plan?.monthlyPrice !== 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">Next Billing Date</span>
                    <span className="text-muted-foreground">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {subscription.plan?.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Plan Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{subscription.plan.description}</p>
                  {subscription.plan.trialDays > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{subscription.plan.trialDays}-day free trial included</span>
                    </div>
                  )}
                  {subscription.plan.transactionFeePercent != null && subscription.plan.transactionFeePercent > 0 && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <span>· {(subscription.plan.transactionFeePercent * 100).toFixed(1)}% transaction fee per order</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {plans.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Available Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plans.filter((p) => p.isActive).map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          p.id === subscription.planId ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{p.name}</span>
                            {p.id === subscription.planId && (
                              <Badge variant="outline" className="text-primary border-primary text-xs">Current</Badge>
                            )}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                        </div>
                        <span className="font-semibold text-sm">
                          {p.monthlyPrice === 0 ? "Free" : `$${p.monthlyPrice.toFixed(2)}/mo`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    To change your plan, contact the platform administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
