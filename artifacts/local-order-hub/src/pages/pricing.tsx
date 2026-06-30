import { Link } from "wouter";
import { useListPublicPricingPlans, getListPublicPricingPlansQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Layers, Loader2, Sparkles } from "lucide-react";
import { formatPlanAmount, pricingPlanCtaLabel } from "@/lib/subscription-display";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const { data: plans = [], isLoading } = useListPublicPricingPlans({
    query: { queryKey: getListPublicPricingPlansQueryKey() },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <Layers className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Pricing</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
          Plans that grow with your business
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Choose a plan with the capabilities you need today. Features and pricing update automatically
          as the platform evolves — no redeploy required.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium">Pricing is being configured</h2>
          <p className="text-muted-foreground mt-1">Check back soon or contact us to get started.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          plans.length >= 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 max-w-4xl mx-auto",
        )}>
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.isRecommended && "border-primary shadow-md ring-1 ring-primary/20",
              )}
            >
              {plan.isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="font-serif text-2xl">{plan.name}</CardTitle>
                  {plan.isBeta && (
                    <Badge variant="secondary" className="text-xs">Founding / Beta</Badge>
                  )}
                </div>
                {plan.description && (
                  <CardDescription className="leading-relaxed">{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1 space-y-5">
                <div>
                  <div className="text-4xl font-bold text-primary">
                    {formatPlanAmount(plan.monthlyPrice)}
                  </div>
                  {plan.yearlyPrice != null && plan.yearlyPrice > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      or {formatPlanAmount(plan.yearlyPrice, "year")}
                    </p>
                  )}
                  {plan.trialDays > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Includes {plan.trialDays}-day trial
                    </p>
                  )}
                </div>

                {plan.features.length > 0 && (
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature.key} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
                )}
              </CardContent>
              <CardFooter>
                <Link href="/list-your-business" className="w-full">
                  <Button className="w-full" variant={plan.isRecommended ? "default" : "outline"}>
                    {pricingPlanCtaLabel(plan)}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground mt-10">
        Paid plans use secure Stripe checkout after your business is approved.{" "}
        <Link href="/help" className="text-primary hover:underline">Visit Help Center</Link>
        {" "}to learn how listing works.
      </p>
    </div>
  );
}
