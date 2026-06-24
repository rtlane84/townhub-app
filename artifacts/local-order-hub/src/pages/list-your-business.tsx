import { useState, useEffect } from "react";
import { useUser, useAuth, SignInButton } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Building2, CreditCard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES = [
  { value: "FOOD_VENDOR", label: "Restaurant / Food Service" },
  { value: "FLORIST", label: "Florist" },
  { value: "GARDEN_MARKET", label: "Garden / Nursery" },
  { value: "RETAIL_STORE", label: "Retail Shop" },
  { value: "BUILDING_SUPPLY", label: "Building Supply" },
  { value: "SERVICE_PROVIDER", label: "Service Provider" },
  { value: "FUNERAL_SERVICE", label: "Funeral Service" },
  { value: "GENERAL", label: "Other / General" },
];

interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  setupFee: number | null;
  transactionFeePercent: number | null;
  trialDays: number;
  isDefault: boolean;
}

interface FormState {
  name: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
}

const EMPTY: FormState = {
  name: "",
  type: "",
  description: "",
  address: "",
  phone: "",
  hours: "",
};

function slugPreview(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatPrice(price: number) {
  return price === 0 ? "Free" : `$${price.toFixed(2)}/mo`;
}

export default function ListYourBusiness() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceedStep1() {
    return form.name.trim().length > 0 && form.type.length > 0;
  }

  useEffect(() => {
    if (step === 3) {
      setPlansLoading(true);
      fetch("/api/subscription-plans")
        .then((r) => r.json())
        .then((data: Plan[]) => {
          setPlans(data);
          const def = data.find((p) => p.isDefault) ?? data[0];
          if (def && selectedPlanId === null) setSelectedPlanId(def.id);
        })
        .catch(() => {})
        .finally(() => setPlansLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/businesses/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          hours: form.hours.trim() || undefined,
          planId: selectedPlanId ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            <span className="font-serif text-2xl font-bold text-primary">LocalOrderHub</span>
          </div>
          <h1 className="font-serif text-3xl font-bold">List Your Business</h1>
          <p className="text-muted-foreground">
            Create a free listing and start accepting orders from local customers today.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" className="w-full">
              Sign In to Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SignInButton>
          <p className="text-xs text-muted-foreground">
            Don't have an account? Clicking above will let you sign up for free.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Application Submitted!</h2>
          <p className="text-muted-foreground">
            Your application for <strong>{form.name}</strong> has been received.
            Our team will review it and get back to you shortly.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll gain access to your Business Hub once an admin approves your listing.
          </p>
          <Button variant="outline" onClick={() => setLocation("/businesses")} className="mt-2">
            Browse Local Businesses
          </Button>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="min-h-[70vh] py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold">List Your Business</h1>
          <p className="text-muted-foreground">
            Get your business in front of local customers. Takes about 2 minutes.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                step >= s ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Basic Information</CardTitle>
              <CardDescription>Tell us about your business.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Business Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Main Street Bakery"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                {form.name.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Your storefront URL: <span className="font-mono text-foreground">/{slugPreview(form.name)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Business Type <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe your business and what makes it special…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                disabled={!canProceedStep1()}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Location & Contact */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Location & Contact</CardTitle>
              <CardDescription>Help customers find and reach you. All fields optional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, Springfield"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  placeholder="e.g. Mon–Sat 8am–6pm, Sun 10am–4pm"
                  value={form.hours}
                  onChange={(e) => set("hours", e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Choose a plan */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Choose a Plan
              </CardTitle>
              <CardDescription>
                Select the plan that fits your business. You can change it later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {plansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No plans available yet. You can still apply — an admin will assign a plan on approval.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{plan.name}</span>
                            {plan.isDefault && (
                              <Badge variant="secondary" className="text-xs">Recommended</Badge>
                            )}
                            {plan.trialDays > 0 && (
                              <Badge variant="outline" className="text-xs text-primary border-primary/40">
                                {plan.trialDays}-day trial
                              </Badge>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                          )}
                          {plan.transactionFeePercent != null && plan.transactionFeePercent > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {plan.transactionFeePercent}% transaction fee
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-sm">{formatPrice(plan.monthlyPrice)}</span>
                          {selectedPlanId === plan.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPlan && selectedPlan.trialDays > 0 && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  Your <strong>{selectedPlan.trialDays}-day free trial</strong> starts on approval.
                  No payment required until the trial ends.
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={submitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    <><Store className="mr-2 h-4 w-4" /> Submit Application</>
                  )}
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Your listing will be reviewed by our team before going live.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
