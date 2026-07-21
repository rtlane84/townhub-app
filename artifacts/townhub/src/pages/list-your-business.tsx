import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { BusinessPlansSection } from "@/components/business-plans-section";
import { NativeAwareSignIn } from "@/components/native-aware-sign-in";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAsyncAction } from "@/hooks/use-async-action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Store,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  CreditCard,
  Check,
  Clock,
  Info,
  ChevronDown,
  MapPin,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isComplimentaryPricingPlan } from "@/lib/subscription-display";
import { usePlatformBranding } from "@/components/theme-provider";
import { WeeklyHoursPicker } from "@/components/weekly-hours-picker";
import { StreetAddressFields } from "@/components/street-address-fields";
import {
  defaultWeeklyHours,
  normalizeWeeklyHours,
  BUSINESS_TYPE_OPTIONS,
  formatBusinessTypeLabel,
  slugifyBusinessName,
} from "@workspace/api-zod";
import type { BusinessDayHours, BusinessSlugAvailability } from "@workspace/api-client-react";
import { useListMyBusinesses, getListMyBusinessesQueryKey } from "@workspace/api-client-react";
import { buildPublicStorefrontDisplayUrl } from "@/lib/storefront-url";
import {
  STOREFRONT_URL_APPLY_HELP,
  STOREFRONT_URL_SUPPORT_NOTE,
} from "@/components/storefront-url-field";
import { resolveApiUrl } from "@/lib/api-base-url";
import { isStoreDistribution } from "@/lib/distribution-channel";

const BUSINESS_TYPES = BUSINESS_TYPE_OPTIONS;

const STEPS = [
  { id: 1 as const, label: "Your business", hint: "Name & category" },
  { id: 2 as const, label: "Contact info", hint: "Optional details" },
  { id: 3 as const, label: "Review & submit", hint: "Choose a plan" },
];

interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number | null;
  setupFee: number | null;
  transactionFeePercent: number | null;
  trialDays: number;
  isDefault: boolean;
}

interface MyApplication {
  id: number;
  name: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  businessId: number | null;
}

interface FormState {
  name: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  structuredHours: BusinessDayHours[];
}

const EMPTY: FormState = {
  name: "",
  type: "",
  description: "",
  address: "",
  phone: "",
  structuredHours: defaultWeeklyHours(),
};

type SlugAvailabilityState =
  | { status: "idle" }
  | { status: "checking"; slug: string }
  | { status: "ready"; slug: string; result: BusinessSlugAvailability };

function formatPrice(price: number, interval: "month" | "year" = "month") {
  if (price === 0) return "Free";
  return `$${price.toFixed(2)}/${interval === "year" ? "yr" : "mo"}`;
}

function formatSubmittedDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors",
                step > s.id && "bg-primary border-primary text-primary-foreground",
                step === s.id && "border-primary text-primary bg-primary/10",
                step < s.id && "border-muted-foreground/30 text-muted-foreground",
              )}
              aria-current={step === s.id ? "step" : undefined}
            >
              {step > s.id ? <Check className="h-4 w-4" /> : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  step > s.id ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        {STEPS.map((s) => (
          <div key={s.id} className={cn("min-w-0", step === s.id ? "text-foreground" : "text-muted-foreground")}>
            <p className="text-xs font-medium truncate">{s.label}</p>
            <p className="text-[10px] hidden sm:block truncate">{s.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatHappensNext({ storeDistribution }: { storeDistribution: boolean }) {
  return (
    <Alert className="bg-muted/40 border-border/60">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm font-medium">What happens after you apply</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground space-y-1 mt-1">
        <p>1. You submit this short form (about 2 minutes).</p>
        <p>2. Our team reviews your application — usually within a few business days.</p>
        <p>3. If approved, you&apos;ll get access to your Business Hub to finish setup and go live.</p>
        <p className="pt-1">
          {storeDistribution
            ? "If approved, subscription setup instructions are sent to your account email."
            : "No payment is charged until your plan trial ends (if applicable)."}
        </p>
        <p className="pt-1">
          <a href="#plans" className="underline font-medium hover:text-foreground">
            Compare business plans and pricing
          </a>
        </p>
      </AlertDescription>
    </Alert>
  );
}

export default function ListYourBusiness() {
  const { platformName } = usePlatformBranding();
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { data: ownedBusinesses = [] } = useListMyBusinesses({
    query: { enabled: !!isSignedIn, queryKey: getListMyBusinessesQueryKey() },
  });
  const hasExistingBusinesses = ownedBusinesses.length > 0;
  const storeDistribution = isStoreDistribution();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [existingApp, setExistingApp] = useState<MyApplication | null>(null);
  const [appLoading, setAppLoading] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityState>({ status: "idle" });
  const [acceptedBusinessSellerAgreement, setAcceptedBusinessSellerAgreement] = useState(false);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  useEffect(() => {
    if (window.location.hash === "#plans") {
      requestAnimationFrame(() => {
        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  const previewSlug = slugifyBusinessName(form.name);

  function effectiveStorefrontSlug() {
    if (slugAvailability.status === "ready" && !slugAvailability.result.available) {
      return slugAvailability.result.suggestedSlug ?? slugAvailability.slug;
    }
    return previewSlug || "business";
  }

  function set(key: keyof Omit<FormState, "structuredHours">, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceedStep1() {
    if (!form.name.trim() || !form.type) return false;
    if (!previewSlug) return false;
    if (slugAvailability.status === "checking") return false;
    if (slugAvailability.status === "idle") return false;
    return true;
  }

  function canSubmitApplication() {
    return canProceedStep1() && acceptedBusinessSellerAgreement;
  }

  const loadExistingApplication = useCallback(async () => {
    setAppLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(resolveApiUrl("/api/businesses/my-application"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 404) {
        setExistingApp(null);
        return;
      }
      if (!res.ok) return;
      const app = (await res.json()) as MyApplication;
      setExistingApp(app);
    } catch {
      // ignore — user can still apply
    } finally {
      setAppLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn) void loadExistingApplication();
  }, [isSignedIn, loadExistingApplication]);

  useEffect(() => {
    if (!previewSlug) {
      setSlugAvailability({ status: "idle" });
      return;
    }

    setSlugAvailability({ status: "checking", slug: previewSlug });
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(resolveApiUrl(`/api/businesses/slug-availability?slug=${encodeURIComponent(previewSlug)}`), {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("availability check failed");
          const result = (await res.json()) as BusinessSlugAvailability;
          setSlugAvailability({ status: "ready", slug: previewSlug, result });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setSlugAvailability({ status: "ready", slug: previewSlug, result: { slug: previewSlug, available: true } });
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [previewSlug]);

  useEffect(() => {
    if (step === 3) {
      setPlansLoading(true);
      fetch(resolveApiUrl("/api/subscription-plans"))
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

  const submitApplication = useCallback(async () => {
    setError("");
    const token = await getToken();
    const res = await fetch(resolveApiUrl("/api/businesses/apply"), {
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
        structuredHours: normalizeWeeklyHours(form.structuredHours),
        planId: selectedPlanId ?? undefined,
        billingInterval: selectedPlan && !isComplimentaryPricingPlan(selectedPlan) ? billingInterval : undefined,
        acceptBusinessSellerAgreement: true,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Something went wrong. Please try again.");
      throw new Error(body.error ?? "Submit failed");
    }
    setExistingApp(null);
    setDone(true);
  }, [form, getToken, selectedPlanId, selectedPlan, billingInterval]);

  const { run: runSubmit, pending: submitting } = useAsyncAction(submitApplication);

  function handleSubmit() {
    void runSubmit().catch(() => {
      setError((prev) => prev || "Network error — please try again.");
    });
  }

  if (!isLoaded || (isSignedIn && appLoading && !reapplying)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="py-10 sm:py-16 px-4">
        <div id="apply" className="max-w-md mx-auto space-y-6 scroll-mt-24">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Store className="h-8 w-8 text-primary" />
              <span className="font-serif text-2xl font-bold text-primary">{platformName}</span>
            </div>
            <h1 className="font-serif text-3xl font-bold">Apply to list your business</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Join {platformName} and reach local customers online. Applying is free — our team
              reviews every listing before it goes live.
            </p>
          </div>

          <ul className="text-sm text-muted-foreground space-y-2 bg-muted/40 rounded-lg p-4 border border-border/60">
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Free to apply — no credit card needed now</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Short form, about 2 minutes</li>
            <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> We&apos;ll notify you when you&apos;re approved</li>
          </ul>

          <NativeAwareSignIn
            size="lg"
            label="Sign in to start your application"
            emailLabel="Sign in with email to apply"
          >
            Sign in to start your application <ArrowRight className="ml-2 h-4 w-4" />
          </NativeAwareSignIn>
          <p className="text-xs text-center text-muted-foreground">
            New here? The button above lets you create a free account first.{" "}
            <a href="#plans" className="underline font-medium hover:text-foreground">
              Compare business plans below
            </a>
          </p>
        </div>

        <BusinessPlansSection
          promptSignIn
          className="container mx-auto max-w-6xl mt-16 pt-10 border-t"
        />
      </div>
    );
  }

  if (existingApp?.status === "PENDING" && !done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-4">
          <Clock className="h-16 w-16 text-primary mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Application under review</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We received your application for <strong>{existingApp.name}</strong> on{" "}
            {formatSubmittedDate(existingApp.createdAt)}.
          </p>
          <p className="text-sm text-muted-foreground">
            Our team is reviewing it now. You&apos;ll be notified when a decision is made,
            then you can set up your storefront in the Business Hub.
          </p>
          <Button variant="outline" onClick={() => setLocation("/businesses")} className="mt-2">
            Browse local businesses
          </Button>
        </div>
      </div>
    );
  }

  if (existingApp?.status === "REJECTED" && !reapplying && !done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-5">
          <div className="text-center space-y-3">
            <h2 className="font-serif text-2xl font-bold">Application not approved</h2>
            <p className="text-muted-foreground text-sm">
              Your previous application for <strong>{existingApp.name}</strong> was not approved.
            </p>
          </div>
          {existingApp.reviewNote && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm">Note from our team</AlertTitle>
              <AlertDescription className="text-sm">{existingApp.reviewNote}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground text-center">
            You can update your details and submit again.
          </p>
          <Button className="w-full" onClick={() => setReapplying(true)}>
            Submit a new application <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Application submitted</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Thanks! We received your application for <strong>{form.name}</strong>.
          </p>
          <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 border text-left space-y-2">
            <p className="font-medium text-foreground">What happens next</p>
            <p>Our team will review your listing — usually within a few business days.</p>
            <p>When approved, you&apos;ll get access to your Business Hub to add products, photos, and hours.</p>
            <p>We&apos;ll reach out using the email on your account.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/businesses")} className="mt-2">
            Browse local businesses
          </Button>
        </div>
      </div>
    );
  }

  const typeLabel = form.type ? formatBusinessTypeLabel(form.type) : "";

  return (
    <div className="min-h-[70vh] py-10 sm:py-16 px-4">
      <div className="max-w-xl mx-auto space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <Building2 className="h-7 w-7 text-primary mx-auto" />
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {hasExistingBusinesses ? "Add another business" : "List your business"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {hasExistingBusinesses
              ? "Submit a new application for an additional location or brand on your account."
              : `Step ${step} of 3 — ${STEPS[step - 1]!.label}`}
          </p>
          {hasExistingBusinesses && (
            <p className="text-xs text-muted-foreground">
              Step {step} of 3 — {STEPS[step - 1]!.label}
            </p>
          )}
        </div>

        {hasExistingBusinesses && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle className="text-sm">You already manage {ownedBusinesses.length} business{ownedBusinesses.length === 1 ? "" : "es"}</AlertTitle>
            <AlertDescription className="text-sm">
              Approved applications are added to the same account. You can switch between businesses in the Business Hub.
              {" "}
              <button type="button" className="underline font-medium" onClick={() => setLocation("/dashboard/business")}>
                Go to Business Hub
              </button>
            </AlertDescription>
          </Alert>
        )}

        <StepIndicator step={step} />

        {step === 1 && <WhatHappensNext storeDistribution={storeDistribution} />}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Tell us about your business</CardTitle>
              <CardDescription>
                Only your business name and category are required. You can add more details later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Business name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Main Street Bakery"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="organization"
                />
                {form.name.trim() && (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Storefront URL</p>
                      <p className="font-mono text-sm text-foreground mt-1 break-all">
                        {buildPublicStorefrontDisplayUrl(
                          slugAvailability.status === "ready" && !slugAvailability.result.available
                            ? slugAvailability.result.suggestedSlug ?? previewSlug
                            : previewSlug || "business",
                        )}
                      </p>
                    </div>
                    {slugAvailability.status === "checking" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking availability…
                      </p>
                    )}
                    {slugAvailability.status === "ready" && slugAvailability.result.available && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        URL available
                      </p>
                    )}
                    {slugAvailability.status === "ready" && !slugAvailability.result.available && (
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        URL already taken — if approved, your storefront will use{" "}
                        <span className="font-mono">{slugAvailability.result.suggestedSlug}</span>.
                      </p>
                    )}
                    {!previewSlug && (
                      <p className="text-xs text-destructive">
                        Enter a business name that can be used for a storefront URL.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{STOREFRONT_URL_APPLY_HELP}</p>
                    <p className="text-xs text-muted-foreground/80">{STOREFRONT_URL_SUPPORT_NOTE}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">
                  What type of business is this? <span className="text-destructive">*</span>
                </Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Choose the closest match…" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This helps us set up the right storefront tools for you.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Short description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="A sentence or two about what you offer…"
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
                Continue to contact info <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <BusinessPlansSection className="max-w-6xl mx-auto pt-4" />
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">How can customers reach you?</CardTitle>
              <CardDescription>
                All fields on this step are optional. Skip anything you&apos;re not sure about — you can
                edit everything in your Business Hub after approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Street address
                </Label>
                <StreetAddressFields
                  value={form.address}
                  onChange={(address) => set("address", address)}
                  streetPlaceholder="123 Main St"
                  data-testid="apply-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">
                  Shown on your public listing so customers can call or order.
                </p>
              </div>

              <Collapsible open={hoursOpen} onOpenChange={setHoursOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between">
                    <span>Add business hours (optional)</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", hoursOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    Set when you&apos;re open each week. You can change this anytime after approval.
                  </p>
                  <WeeklyHoursPicker
                    value={form.structuredHours}
                    onChange={(structuredHours) => setForm((f) => ({ ...f, structuredHours }))}
                  />
                </CollapsibleContent>
              </Collapsible>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue to review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                onClick={() => setStep(3)}
              >
                Skip contact details for now
              </button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Review and submit
              </CardTitle>
              <CardDescription>
                Check your details, pick a plan, and send your application for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Your application</p>
                <p><span className="text-muted-foreground">Business:</span> {form.name.trim()}</p>
                <p><span className="text-muted-foreground">Category:</span> {typeLabel}</p>
                <p className="break-all">
                  <span className="text-muted-foreground">Storefront URL:</span>{" "}
                  <span className="font-mono">{buildPublicStorefrontDisplayUrl(effectiveStorefrontSlug())}</span>
                </p>
                {form.description.trim() && (
                  <p className="text-muted-foreground line-clamp-2">{form.description.trim()}</p>
                )}
                {(form.address.trim() || form.phone.trim()) && (
                  <div className="pt-1 space-y-0.5 text-xs text-muted-foreground">
                    {form.address.trim() && <p>{form.address.trim()}</p>}
                    {form.phone.trim() && <p>{form.phone.trim()}</p>}
                  </div>
                )}
              </div>

              {plansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Plans are being set up. You can still apply — we&apos;ll assign a plan when you&apos;re approved.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label>Choose a plan</Label>
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
                                  {plan.trialDays}-day free trial
                                </Badge>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-sm">{formatPrice(plan.monthlyPrice)}</span>
                            {plan.yearlyPrice != null && plan.yearlyPrice > 0 && (
                              <span className="text-xs text-muted-foreground">
                                / {formatPrice(plan.yearlyPrice, "year")}
                              </span>
                            )}
                            {selectedPlanId === plan.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlan && !isComplimentaryPricingPlan(selectedPlan) && (
                <div className="space-y-2">
                  <Label>Billing interval</Label>
                  <div className="flex gap-2">
                    {(["monthly", "yearly"] as const).map((interval) => (
                      <Button
                        key={interval}
                        type="button"
                        size="sm"
                        variant={billingInterval === interval ? "default" : "outline"}
                        onClick={() => setBillingInterval(interval)}
                        disabled={interval === "yearly" && !(selectedPlan.yearlyPrice != null && selectedPlan.yearlyPrice > 0)}
                      >
                        {interval === "monthly" ? "Monthly" : "Yearly"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  checked={acceptedBusinessSellerAgreement}
                  onChange={(event) => setAcceptedBusinessSellerAgreement(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  I have authority to act for this business and agree to the{" "}
                  <Link href="/business-seller-agreement" className="font-medium text-primary underline underline-offset-2">
                    Business Seller Agreement
                  </Link>{" "}
                  and the{" "}
                  <Link href="/terms-of-service" className="font-medium text-primary underline underline-offset-2">
                    TownHub Terms of Service
                  </Link>.
                </span>
              </label>

              {selectedPlan && selectedPlan.trialDays > 0 && !isComplimentaryPricingPlan(selectedPlan) && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {storeDistribution
                    ? `Your ${selectedPlan.trialDays}-day free trial starts after you complete the setup instructions sent after approval.`
                    : `Your ${selectedPlan.trialDays}-day free trial starts after you complete Stripe checkout in Business Hub. Nothing is charged until then.`}
                </p>
              )}

              {selectedPlan && !isComplimentaryPricingPlan(selectedPlan) && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {storeDistribution
                    ? "After approval, follow the subscription setup instructions sent to your account email. Applying does not charge your card."
                    : "After approval, complete subscription checkout in Business Hub to activate paid features. Applying does not charge your card."}
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={submitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <LoadingButton
                  className="flex-1"
                  onClick={handleSubmit}
                  loading={submitting}
                  loadingText="Submitting…"
                  disabled={!canSubmitApplication()}
                >
                  <Store className="mr-2 h-4 w-4" /> Submit application
                </LoadingButton>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Applications are reviewed before a listing goes live on {platformName}. No card is charged by applying.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
