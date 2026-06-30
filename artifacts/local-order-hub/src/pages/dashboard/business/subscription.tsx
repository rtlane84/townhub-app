import {
  useGetMySubscription,
  getGetMySubscriptionQueryKey,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, CreditCard, Layers, Sparkles } from "lucide-react";
import { subscriptionStatusLabel, formatPlanAmount } from "@/lib/subscription-display";

export default function BusinessSubscription() {
  const { business, isLoading: bizLoading } = useSelectedBusiness();
  const { data: subscription, isLoading: subLoading } = useGetMySubscription(
    business?.id ?? 0,
    { query: { enabled: !!business?.id, queryKey: getGetMySubscriptionQueryKey(business?.id ?? 0) } },
  );

  const isLoading = bizLoading || subLoading;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Your plan, enabled features, and billing status
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !subscription ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No subscription yet</p>
              <p className="text-sm mt-1">Contact the platform administrator to assign a plan.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base">Current plan</CardTitle>
                  <Badge variant="outline">
                    {subscriptionStatusLabel(subscription.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscription.plan && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b gap-4">
                      <span className="text-sm font-medium">Plan</span>
                      <span className="font-semibold text-right">{subscription.plan.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b gap-4">
                      <span className="text-sm font-medium">Monthly price</span>
                      <span className="font-semibold text-primary">
                        {formatPlanAmount(subscription.plan.monthlyPrice)}
                      </span>
                    </div>
                    {subscription.plan.yearlyPrice != null && subscription.plan.yearlyPrice > 0 && (
                      <div className="flex items-center justify-between py-2 border-b gap-4">
                        <span className="text-sm font-medium">Yearly price</span>
                        <span className="font-semibold">
                          {formatPlanAmount(subscription.plan.yearlyPrice, "year")}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {subscription.startedAt && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">Started</span>
                    <span>{new Date(subscription.startedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.renewalAt && (
                  <div className="flex items-center justify-between py-2 border-b gap-4">
                    <span className="text-sm font-medium">Renewal date</span>
                    <span>{new Date(subscription.renewalAt).toLocaleDateString()}</span>
                  </div>
                )}
                {subscription.trialEndsAt && ["TRIAL", "TRIALING"].includes(subscription.status) && (
                  <div className="flex items-center justify-between py-2 gap-4">
                    <span className="text-sm font-medium">Trial ends</span>
                    <span className="text-amber-600 font-medium">
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscription.notes && (
                  <p className="text-sm text-muted-foreground pt-2">{subscription.notes}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Enabled features
                </CardTitle>
                <CardDescription>
                  Capabilities included with your current plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscription.features && subscription.features.length > 0 ? (
                  <ul className="space-y-2">
                    {subscription.features.map((feature) => (
                      <li key={feature.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-medium">{feature.name}</span>
                          {feature.description && (
                            <span className="block text-muted-foreground text-xs mt-0.5">
                              {feature.description}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No feature mappings configured yet for this plan.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </CardTitle>
                <CardDescription>
                  Stripe Billing integration is coming soon. Plan changes and invoices will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  To change your plan today, contact the platform administrator.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
