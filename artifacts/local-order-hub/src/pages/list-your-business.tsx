import { useState } from "react";
import { useUser, SignInButton } from "@clerk/react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Building2 } from "lucide-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const BUSINESS_TYPES = [
  { value: "RESTAURANT", label: "Restaurant / Food Service" },
  { value: "BAKERY", label: "Bakery" },
  { value: "GROCERY", label: "Grocery / Market" },
  { value: "FLORIST", label: "Florist" },
  { value: "GARDEN", label: "Garden / Nursery" },
  { value: "RETAIL", label: "Retail Shop" },
  { value: "CAFE", label: "Café / Coffee Shop" },
  { value: "GENERAL", label: "Other / General" },
];

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

export default function ListYourBusiness() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceedStep1() {
    return form.name.trim().length > 0 && form.type.length > 0;
  }

  async function handleSubmit() {
    if (!canProceedStep1()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/businesses/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          address: form.address.trim() || undefined,
          phone: form.phone.trim() || undefined,
          hours: form.hours.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      // Invalidate queries so nav and dashboard update immediately
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setDone(true);
      setTimeout(() => setLocation("/dashboard/business"), 2000);
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
          <h2 className="font-serif text-2xl font-bold">You're listed!</h2>
          <p className="text-muted-foreground">
            <strong>{form.name}</strong> is now on LocalOrderHub. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
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
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

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

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Location & Contact</CardTitle>
              <CardDescription>Help customers find and reach you. All fields optional — you can add these later.</CardDescription>
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

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Listing…</>
                  ) : (
                    <><Store className="mr-2 h-4 w-4" /> List My Business</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          You can update all details from your Business Dashboard after listing.
        </p>
      </div>
    </div>
  );
}
