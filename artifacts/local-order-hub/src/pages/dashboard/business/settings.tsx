import { useState, useEffect, useMemo } from "react";
import { useUpdateBusiness, getGetMyBusinessQueryKey, getGetBusinessBySlugQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { WeeklyHoursPicker } from "@/components/weekly-hours-picker";
import {
  defaultWeeklyHours,
  normalizeWeeklyHours,
  parseStructuredHours,
  resolvePaymentMode,
  resolveStorefrontMode,
  acceptsAppointmentRequests,
  isOrderingStorefrontMode,
  isPaymentMode,
  normalizeOptionalTime,
  normalizeWebsiteUrl,
  BUSINESS_TYPE_OPTIONS,
} from "@workspace/api-zod";
import type { BusinessDayHours, PaymentMode, BusinessType, StorefrontMode } from "@workspace/api-client-react";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { PaymentModeSelector } from "@/components/payment-mode-selector";
import { BusinessStripePaymentsCard } from "@/components/business-stripe-payments-card";
import { StorefrontModeSelector } from "@/components/storefront-mode-selector";
import { TimePicker, coerceFormTime } from "@/components/time-picker";
import { ImageField } from "@/components/image-field";
import { StorefrontUrlField } from "@/components/storefront-url-field";
import { AddAnotherBusinessButton } from "@/components/add-another-business-link";

type FormState = {
  name: string; type: BusinessType; description: string; address: string; phone: string;
  websiteUrl: string; showWebsiteCard: boolean;
  structuredHours: BusinessDayHours[];
  logoUrl: string; heroImageUrl: string;
  pickupEnabled: boolean; deliveryEnabled: boolean; paymentMode: PaymentMode;
  storefrontMode: StorefrontMode;
  deliveryFee: string; minimumOrder: string; minimumOrderForDelivery: string;
  deliveryRadiusMiles: string; deliveryNotes: string;
  pickupInstructions: string; deliveryInstructions: string;
  orderCutoffTime: string;
  defaultPrepMinutes: string;
  notificationEmail: string;
  notificationPhone: string;
  notifyNewOrdersByEmail: boolean;
  notifyNewOrdersBySms: boolean;
  notifyAppointmentRequestsByEmail: boolean;
  notifyAppointmentRequestsBySms: boolean;
  accentColor: string; buttonColor: string; bannerText: string;
  taxEnabled: boolean; taxRatePercent: string; taxLabel: string;
};

const EMPTY: FormState = {
  name: "", type: "GENERAL", description: "", address: "", phone: "",
  websiteUrl: "", showWebsiteCard: false,
  structuredHours: defaultWeeklyHours(),
  logoUrl: "", heroImageUrl: "",
  pickupEnabled: true, deliveryEnabled: false, paymentMode: "ONLINE_ONLY",
  storefrontMode: "ORDERING",
  deliveryFee: "", minimumOrder: "", minimumOrderForDelivery: "",
  deliveryRadiusMiles: "", deliveryNotes: "",
  pickupInstructions: "", deliveryInstructions: "",
  orderCutoffTime: "", defaultPrepMinutes: "15", notificationEmail: "", notificationPhone: "",
  notifyNewOrdersByEmail: true, notifyNewOrdersBySms: false,
  notifyAppointmentRequestsByEmail: true, notifyAppointmentRequestsBySms: false,
  accentColor: "", buttonColor: "", bannerText: "",
  taxEnabled: false, taxRatePercent: "", taxLabel: "Sales Tax",
};

export default function BusinessSettings() {
  const { selectedBusinessId, business, ownedBusinesses, isLoading } = useSelectedBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const stripeReturn = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("stripe") === "return";
  }, []);

  useEffect(() => {
    if (business) {
      const b = business as unknown as Record<string, unknown>;
      setForm({
        name: business.name ?? "",
        type: business.type ?? "GENERAL",
        description: business.description ?? "",
        address: business.address ?? "",
        phone: business.phone ?? "",
        websiteUrl: business.websiteUrl ?? "",
        showWebsiteCard: business.showWebsiteCard === true,
        structuredHours: parseStructuredHours(business.structuredHours) ?? defaultWeeklyHours(),
        logoUrl: business.logoUrl ?? "",
        heroImageUrl: business.heroImageUrl ?? "",
        pickupEnabled: business.pickupEnabled ?? true,
        deliveryEnabled: business.deliveryEnabled ?? false,
        deliveryFee: business.deliveryFee != null ? String(business.deliveryFee) : "",
        minimumOrder: business.minimumOrder != null ? String(business.minimumOrder) : "",
        minimumOrderForDelivery: b.minimumOrderForDelivery != null ? String(b.minimumOrderForDelivery) : "",
        deliveryRadiusMiles: b.deliveryRadiusMiles != null ? String(b.deliveryRadiusMiles) : "",
        deliveryNotes: String(b.deliveryNotes ?? ""),
        pickupInstructions: String(b.pickupInstructions ?? ""),
        deliveryInstructions: String(b.deliveryInstructions ?? ""),
        paymentMode: resolvePaymentMode(business),
        storefrontMode: resolveStorefrontMode(business),
        orderCutoffTime: coerceFormTime(business.orderCutoffTime),
        defaultPrepMinutes:
          business.defaultPrepMinutes != null ? String(business.defaultPrepMinutes) : "15",
        notificationEmail: String(b.notificationEmail ?? b.orderNotificationEmail ?? ""),
        notificationPhone: String(b.notificationPhone ?? ""),
        notifyNewOrdersByEmail: b.notifyNewOrdersByEmail !== false,
        notifyNewOrdersBySms: b.notifyNewOrdersBySms === true,
        notifyAppointmentRequestsByEmail: b.notifyAppointmentRequestsByEmail !== false,
        notifyAppointmentRequestsBySms: b.notifyAppointmentRequestsBySms === true,
        accentColor: String(b.accentColor ?? ""),
        buttonColor: String(b.buttonColor ?? ""),
        bannerText: String(b.bannerText ?? ""),
        taxEnabled: b.taxEnabled === true,
        taxRatePercent: b.taxRatePercent != null ? String(b.taxRatePercent) : "",
        taxLabel: String(b.taxLabel ?? "Sales Tax"),
      });
    }
  }, [business]);

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: (updated) => {
        if (selectedBusinessId != null) {
          queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey({ businessId: selectedBusinessId }) });
        }
        if (updated?.slug) {
          queryClient.invalidateQueries({ queryKey: getGetBusinessBySlugQueryKey(updated.slug) });
        }
        toast({ title: "Settings saved" });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Please try again.";
        toast({ title: "Failed to save settings", description: message, variant: "destructive" });
      },
    },
  });

  function handleSave() {
    if (!business) return;
    const opt = (value: string) => value.trim() || undefined;
    const optNum = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const n = parseFloat(trimmed);
      return Number.isNaN(n) ? undefined : n;
    };

    const orderingMode = isOrderingStorefrontMode({
      type: form.type,
      storefrontMode: form.storefrontMode,
    });
    const paymentMode = isPaymentMode(form.paymentMode)
      ? form.paymentMode
      : resolvePaymentMode(business);

    updateBusiness.mutate({
      id: business.id,
      data: {
        name: form.name.trim() || business.name,
        type: form.type,
        description: opt(form.description),
        address: opt(form.address),
        phone: opt(form.phone),
        websiteUrl: normalizeWebsiteUrl(form.websiteUrl) ?? undefined,
        showWebsiteCard: form.showWebsiteCard,
        structuredHours: normalizeWeeklyHours(form.structuredHours),
        logoUrl: form.logoUrl.trim(),
        heroImageUrl: form.heroImageUrl.trim(),
        storefrontMode: form.storefrontMode,
        ...(orderingMode
          ? {
              pickupEnabled: form.pickupEnabled,
              deliveryEnabled: form.deliveryEnabled,
              deliveryFee: optNum(form.deliveryFee),
              minimumOrder: optNum(form.minimumOrder),
              paymentMode,
              orderCutoffTime: normalizeOptionalTime(form.orderCutoffTime) || undefined,
              defaultPrepMinutes: optNum(form.defaultPrepMinutes),
              minimumOrderForDelivery: optNum(form.minimumOrderForDelivery),
              deliveryRadiusMiles: optNum(form.deliveryRadiusMiles),
              deliveryNotes: opt(form.deliveryNotes),
              pickupInstructions: opt(form.pickupInstructions),
              deliveryInstructions: opt(form.deliveryInstructions),
              taxEnabled: form.taxEnabled,
              taxRatePercent: form.taxEnabled ? optNum(form.taxRatePercent) : undefined,
              taxLabel: form.taxLabel.trim() || "Sales Tax",
            }
          : {}),
        notificationEmail: opt(form.notificationEmail),
        notificationPhone: opt(form.notificationPhone),
        notifyNewOrdersByEmail: form.notifyNewOrdersByEmail,
        notifyNewOrdersBySms: form.notifyNewOrdersBySms,
        notifyAppointmentRequestsByEmail: form.notifyAppointmentRequestsByEmail,
        notifyAppointmentRequestsBySms: form.notifyAppointmentRequestsBySms,
        accentColor: opt(form.accentColor),
        buttonColor: opt(form.buttonColor),
        bannerText: opt(form.bannerText),
      },
    });
  }

  function field(label: string, key: keyof FormState, opts?: { type?: string; placeholder?: string; multiline?: boolean }) {
    const value = String(form[key]);
    return (
      <div>
        <label className="text-sm font-medium mb-1.5 block">{label}</label>
        {opts?.multiline ? (
          <Textarea value={value} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={opts.placeholder} rows={2} data-testid={`input-${key}`} />
        ) : (
          <Input type={opts?.type ?? "text"} value={value} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={opts?.placeholder} data-testid={`input-${key}`} />
        )}
      </div>
    );
  }

  function notifyToggle(
    label: string,
    desc: string,
    key: "notifyNewOrdersByEmail" | "notifyNewOrdersBySms" | "notifyAppointmentRequestsByEmail" | "notifyAppointmentRequestsBySms",
  ) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Switch checked={!!form[key]} onCheckedChange={(val) => setForm((f) => ({ ...f, [key]: val }))} data-testid={`switch-${key}`} />
      </div>
    );
  }

  const acceptsAppointments = acceptsAppointmentRequests({ type: form.type, storefrontMode: form.storefrontMode });
  const isOrderingMode = isOrderingStorefrontMode({ type: form.type, storefrontMode: form.storefrontMode });

  function toggle(label: string, desc: string, key: "pickupEnabled" | "deliveryEnabled") {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <Switch checked={!!form[key]} onCheckedChange={(val) => setForm((f) => ({ ...f, [key]: val }))} data-testid={`switch-${key}`} />
      </div>
    );
  }

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your business profile</p>
          </div>
          <LoadingButton onClick={handleSave} loading={updateBusiness.isPending} loadingText="Saving…" data-testid="button-save-settings">
            Save Changes
          </LoadingButton>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your businesses</CardTitle>
                <CardDescription>
                  Run multiple locations or brands from one account. Each business has its own storefront and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You currently manage{" "}
                  <span className="font-medium text-foreground">
                    {ownedBusinesses.length} business{ownedBusinesses.length === 1 ? "" : "es"}
                  </span>
                  . Approved applications are added here automatically.
                </p>
                <AddAnotherBusinessButton />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Business Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {field("Business Name", "name")}
                {business?.slug ? <StorefrontUrlField slug={business.slug} /> : null}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Type</label>
                  <Select value={form.type} onValueChange={(type) => setForm((f) => ({ ...f, type: type as BusinessType }))}>
                    <SelectTrigger data-testid="select-business-type">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field("Description", "description", { multiline: true, placeholder: "Tell customers what makes your business special" })}
                {field("Address", "address", { placeholder: "123 Main St, Anytown, MN 55101" })}
                {field("Phone", "phone", { placeholder: "(555) 555-0100" })}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Website</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Optional external website link for your public storefront.
                  </p>
                  <Input
                    type="url"
                    value={form.websiteUrl}
                    onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    placeholder="https://www.yourbusiness.com"
                    data-testid="input-websiteUrl"
                  />
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">Show website card</p>
                    <p className="text-xs text-muted-foreground">Display a link to your website on your public page</p>
                  </div>
                  <Switch
                    checked={form.showWebsiteCard}
                    onCheckedChange={(showWebsiteCard) => setForm((f) => ({ ...f, showWebsiteCard }))}
                    disabled={!form.websiteUrl.trim()}
                    data-testid="switch-showWebsiteCard"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Business Hours</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set open/closed and times for each day of the week.
                  </p>
                  <WeeklyHoursPicker
                    value={form.structuredHours}
                    onChange={(structuredHours) => setForm((f) => ({ ...f, structuredHours }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Branding</CardTitle>
                <CardDescription>
                  Logo and storefront hero banner shown on your public business page and in the directory.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageField
                  surface="business-logo"
                  value={form.logoUrl}
                  onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
                  testId="business-logo"
                  businessId={business?.id}
                />
                <Separator />
                <ImageField
                  surface="business-hero"
                  value={form.heroImageUrl}
                  onChange={(heroImageUrl) => setForm((f) => ({ ...f, heroImageUrl }))}
                  testId="business-hero"
                  businessId={business?.id}
                />
                <Separator />
                {field("Homepage Banner Text", "bannerText", { placeholder: "🌸 Spring hours now in effect!" })}
                <div className="grid md:grid-cols-2 gap-6">
                  <ColorPickerField
                    id="accentColor"
                    label="Accent Color"
                    description="Highlights on your public storefront — badges, prices, and accents."
                    value={form.accentColor}
                    onChange={(accentColor) => setForm((f) => ({ ...f, accentColor }))}
                    placeholder="#e57a44"
                  />
                  <ColorPickerField
                    id="buttonColor"
                    label="Button Color"
                    description="Primary buttons on your storefront, including Request Appointment."
                    value={form.buttonColor}
                    onChange={(buttonColor) => setForm((f) => ({ ...f, buttonColor }))}
                    placeholder="#b35b1d"
                  />
                </div>
                <ColorPreviewSwatches
                  items={[
                    { key: "accent", label: "Accent", value: form.accentColor },
                    { key: "button", label: "Button", value: form.buttonColor },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storefront</CardTitle>
                <CardDescription>
                  Choose how customers interact with your public business page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StorefrontModeSelector
                  value={form.storefrontMode}
                  onChange={(storefrontMode) =>
                    setForm((f) => ({
                      ...f,
                      storefrontMode,
                      ...(storefrontMode === "ORDERING" && !isPaymentMode(f.paymentMode)
                        ? { paymentMode: business ? resolvePaymentMode(business) : "ONLINE_ONLY" }
                        : {}),
                    }))
                  }
                  idPrefix="business-settings-storefront"
                />
                {!isOrderingMode && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Switch to online ordering to configure pickup, delivery, and payment options.
                  </p>
                )}
              </CardContent>
            </Card>

            {isOrderingMode && (
            <>
            <Card>
              <CardHeader><CardTitle className="text-base">Ordering Options</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 divide-y divide-border">
                  {toggle("Pickup enabled", "Customers can pick up their orders", "pickupEnabled")}
                  {toggle("Delivery enabled", "You offer delivery to customers", "deliveryEnabled")}
                </div>
                <Separator className="my-4" />
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Payment options</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose how customers can pay for orders from your business. Online card payments require a connected Stripe account below.
                  </p>
                  <PaymentModeSelector
                    value={form.paymentMode}
                    onChange={(paymentMode) => setForm((f) => ({ ...f, paymentMode }))}
                    idPrefix="business-settings-payment"
                  />
                </div>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Sales tax</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Apply a simple sales tax rate to taxable items at checkout. Tax is calculated on the server when orders are placed.
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-medium">Enable sales tax</p>
                      <p className="text-xs text-muted-foreground">Charge tax on taxable items using the rate below</p>
                    </div>
                    <Switch
                      checked={form.taxEnabled}
                      onCheckedChange={(taxEnabled) => setForm((f) => ({ ...f, taxEnabled }))}
                      data-testid="switch-taxEnabled"
                    />
                  </div>
                  {form.taxEnabled ? (
                    <div className="grid grid-cols-2 gap-4">
                      {field("Tax rate (%)", "taxRatePercent", { type: "number", placeholder: "6.00" })}
                      {field("Tax label", "taxLabel", { placeholder: "Sales Tax" })}
                    </div>
                  ) : null}
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                  {field("Delivery fee ($)", "deliveryFee", { type: "number", placeholder: "0.00" })}
                  {field("Minimum order ($)", "minimumOrder", { type: "number", placeholder: "0.00" })}
                  {field("Min. for delivery ($)", "minimumOrderForDelivery", { type: "number", placeholder: "0.00" })}
                  {field("Delivery radius (mi)", "deliveryRadiusMiles", { type: "number", placeholder: "5" })}
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Order cutoff time</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Optional — last time customers can place orders for same-day pickup or delivery.
                    </p>
                    <TimePicker
                      value={form.orderCutoffTime}
                      onChange={(orderCutoffTime) => setForm((f) => ({ ...f, orderCutoffTime }))}
                      optional
                      data-testid="input-orderCutoffTime"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Default prep time (minutes)</label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Used for ASAP estimates when items do not specify their own prep time.
                    </p>
                    <Input
                      type="number"
                      min={1}
                      value={form.defaultPrepMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, defaultPrepMinutes: e.target.value }))}
                      placeholder="15"
                      data-testid="input-defaultPrepMinutes"
                    />
                  </div>
                  {field("Pickup instructions", "pickupInstructions", { multiline: true, placeholder: "Come to the side entrance on Oak St." })}
                  {field("Delivery instructions", "deliveryInstructions", { multiline: true, placeholder: "We deliver within 5 miles. Call when en route." })}
                  {field("Delivery notes", "deliveryNotes", { multiline: true, placeholder: "Free delivery on orders over $30!" })}
                </div>
              </CardContent>
            </Card>

            {business ? (
              <BusinessStripePaymentsCard businessId={business.id} stripeReturn={stripeReturn} />
            ) : null}
            </>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Owner Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Alerts are sent by the platform when you receive new orders or appointment requests.
                  Configure where you want email and SMS notifications delivered.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {field("Notification email", "notificationEmail", { type: "email", placeholder: "owner@yourbusiness.com" })}
                  {field("Notification phone (SMS)", "notificationPhone", { type: "tel", placeholder: "+15555550100" })}
                </div>
                <Separator />
                <div className="space-y-1 divide-y divide-border">
                  {notifyToggle("Email me for new orders", "Receive an email when a customer places an order", "notifyNewOrdersByEmail")}
                  {notifyToggle("Text me for new orders", "Urgent SMS alert for new orders", "notifyNewOrdersBySms")}
                  {acceptsAppointments && notifyToggle("Email me for appointment requests", "Receive an email when a customer requests an appointment", "notifyAppointmentRequestsByEmail")}
                  {acceptsAppointments && notifyToggle("Text me for appointment requests", "Urgent SMS alert for new appointment requests", "notifyAppointmentRequestsBySms")}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
