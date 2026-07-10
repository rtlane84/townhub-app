import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useUpdateBusiness, getGetMyBusinessQueryKey, getGetBusinessBySlugQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { SettingsSection, SettingsToggleRow } from "@/components/settings-section";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  resolveOrderingAvailabilityMode,
  isOrderingStorefrontMode,
  isPaymentMode,
  normalizeOptionalTime,
  normalizeWebsiteUrl,
  BUSINESS_TYPE_OPTIONS,
  ORDERING_AVAILABILITY_MODES,
} from "@workspace/api-zod";
import type { BusinessDayHours, PaymentMode, BusinessType, StorefrontMode, OrderingAvailabilityMode } from "@workspace/api-client-react";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { PaymentModeSelector } from "@/components/payment-mode-selector";
import { BusinessStripePaymentsCard } from "@/components/business-stripe-payments-card";
import { StorefrontModeSelector } from "@/components/storefront-mode-selector";
import { TimePicker, coerceFormTime } from "@/components/time-picker";
import { ImageField } from "@/components/image-field";
import { StorefrontUrlField } from "@/components/storefront-url-field";
import { AddAnotherBusinessButton } from "@/components/add-another-business-link";
import { Building2, ImageIcon, Layers, MousePointerClick, ShoppingBag, Truck } from "lucide-react";

type FormState = {
  name: string;
  type: BusinessType;
  description: string;
  address: string;
  phone: string;
  websiteUrl: string;
  showWebsiteCard: boolean;
  structuredHours: BusinessDayHours[];
  logoUrl: string;
  heroImageUrl: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMode: PaymentMode;
  storefrontMode: StorefrontMode;
  orderingAvailabilityMode: OrderingAvailabilityMode;
  orderingEnabled: boolean;
  deliveryFee: string;
  minimumOrderForDelivery: string;
  deliveryRadiusMiles: string;
  pickupInstructions: string;
  deliveryInstructions: string;
  orderCutoffTime: string;
  defaultPrepMinutes: string;
  deliveryBufferMinutes: string;
  accentColor: string;
  buttonColor: string;
  bannerText: string;
  taxEnabled: boolean;
  taxRatePercent: string;
  taxLabel: string;
};

const EMPTY: FormState = {
  name: "",
  type: "GENERAL",
  description: "",
  address: "",
  phone: "",
  websiteUrl: "",
  showWebsiteCard: false,
  structuredHours: defaultWeeklyHours(),
  logoUrl: "",
  heroImageUrl: "",
  pickupEnabled: true,
  deliveryEnabled: false,
  paymentMode: "ONLINE_ONLY",
  storefrontMode: "ORDERING",
  orderingAvailabilityMode: "ALWAYS",
  orderingEnabled: true,
  deliveryFee: "",
  minimumOrderForDelivery: "",
  deliveryRadiusMiles: "",
  pickupInstructions: "",
  deliveryInstructions: "",
  orderCutoffTime: "",
  defaultPrepMinutes: "15",
  deliveryBufferMinutes: "15",
  accentColor: "",
  buttonColor: "",
  bannerText: "",
  taxEnabled: false,
  taxRatePercent: "",
  taxLabel: "Sales Tax",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

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
    if (!business) return;
    const b = business as unknown as Record<string, unknown>;
    const deliveryInstructions = String(b.deliveryInstructions ?? "");
    const deliveryNotes = String(b.deliveryNotes ?? "");
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
      minimumOrderForDelivery: b.minimumOrderForDelivery != null ? String(b.minimumOrderForDelivery) : "",
      deliveryRadiusMiles: b.deliveryRadiusMiles != null ? String(b.deliveryRadiusMiles) : "",
      pickupInstructions: String(b.pickupInstructions ?? ""),
      // Prefer instructions; fall back to legacy storefront-only notes so nothing is lost.
      deliveryInstructions: deliveryInstructions || deliveryNotes,
      paymentMode: resolvePaymentMode(business),
      storefrontMode: resolveStorefrontMode(business),
      orderingAvailabilityMode: resolveOrderingAvailabilityMode(business),
      orderingEnabled: business.orderingEnabled !== false,
      orderCutoffTime: coerceFormTime(business.orderCutoffTime),
      defaultPrepMinutes: business.defaultPrepMinutes != null ? String(business.defaultPrepMinutes) : "15",
      deliveryBufferMinutes:
        business.deliveryBufferMinutes != null ? String(business.deliveryBufferMinutes) : "15",
      accentColor: String(b.accentColor ?? ""),
      buttonColor: String(b.buttonColor ?? ""),
      bannerText: String(b.bannerText ?? ""),
      taxEnabled: b.taxEnabled === true,
      taxRatePercent: b.taxRatePercent != null ? String(b.taxRatePercent) : "",
      taxLabel: String(b.taxLabel ?? "Sales Tax"),
    });
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
              paymentMode,
              orderingAvailabilityMode: form.orderingAvailabilityMode,
              orderingEnabled: form.orderingEnabled,
              orderCutoffTime: normalizeOptionalTime(form.orderCutoffTime) || undefined,
              defaultPrepMinutes: optNum(form.defaultPrepMinutes),
              deliveryBufferMinutes: optNum(form.deliveryBufferMinutes),
              minimumOrderForDelivery: optNum(form.minimumOrderForDelivery),
              deliveryRadiusMiles: optNum(form.deliveryRadiusMiles),
              // Collapse legacy deliveryNotes into instructions; clear the duplicate field.
              deliveryNotes: null,
              pickupInstructions: opt(form.pickupInstructions),
              deliveryInstructions: opt(form.deliveryInstructions),
              taxEnabled: form.taxEnabled,
              taxRatePercent: form.taxEnabled ? optNum(form.taxRatePercent) : undefined,
              taxLabel: form.taxLabel.trim() || "Sales Tax",
            }
          : {}),
        accentColor: opt(form.accentColor),
        buttonColor: opt(form.buttonColor),
        bannerText: opt(form.bannerText),
      },
    });
  }

  function textField(
    label: string,
    key: keyof FormState,
    opts?: { type?: string; placeholder?: string; multiline?: boolean; hint?: string },
  ) {
    const value = String(form[key]);
    return (
      <Field label={label} hint={opts?.hint}>
        {opts?.multiline ? (
          <Textarea
            value={value}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={opts.placeholder}
            rows={2}
            data-testid={`input-${key}`}
          />
        ) : (
          <Input
            type={opts?.type ?? "text"}
            value={value}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={opts?.placeholder}
            data-testid={`input-${key}`}
          />
        )}
      </Field>
    );
  }

  const isOrderingMode = isOrderingStorefrontMode({ type: form.type, storefrontMode: form.storefrontMode });

  return (
    <BusinessDashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6 pb-10">
        <DashboardPageHeader
          title="Settings"
          description="Profile, public page, and how customers order from your storefront."
          action={
            <LoadingButton
              onClick={handleSave}
              loading={updateBusiness.isPending}
              loadingText="Saving…"
              className="rounded-full"
              data-testid="button-save-settings"
            >
              Save
            </LoadingButton>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-[1.75rem]" />
            ))}
          </div>
        ) : (
          <>
            <SettingsSection
              icon={Layers}
              title="Your businesses"
              description="Each location has its own storefront and settings. Approved applications appear here automatically."
            >
              <p className="text-sm text-muted-foreground">
                You manage{" "}
                <span className="font-medium text-foreground">
                  {ownedBusinesses.length} business{ownedBusinesses.length === 1 ? "" : "es"}
                </span>
                .
              </p>
              <AddAnotherBusinessButton />
            </SettingsSection>

            <SettingsSection
              icon={Building2}
              title="Profile"
              description="Basics shown in the directory and on your public page."
            >
              {textField("Business name", "name")}
              {business?.slug ? <StorefrontUrlField slug={business.slug} /> : null}
              <Field
                label="Category"
                hint="Used for directory filters. How customers interact is set under Customer experience."
              >
                <Select
                  value={form.type}
                  onValueChange={(type) => setForm((f) => ({ ...f, type: type as BusinessType }))}
                >
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
              </Field>
              {textField("Description", "description", {
                multiline: true,
                placeholder: "Tell customers what makes your business special",
              })}
              {textField("Address", "address", { placeholder: "123 Main St, Anytown, MN 55101" })}
              {textField("Phone", "phone", { placeholder: "(555) 555-0100" })}
              <Field label="Business hours" hint="Open/closed and times for each day.">
                <WeeklyHoursPicker
                  value={form.structuredHours}
                  onChange={(structuredHours) => setForm((f) => ({ ...f, structuredHours }))}
                />
              </Field>
            </SettingsSection>

            <SettingsSection
              icon={ImageIcon}
              title="Public presence"
              description="What shoppers see on your storefront (web and iOS) and in the directory."
            >
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
              {textField("Storefront banner", "bannerText", {
                placeholder: "Spring hours now in effect!",
                hint: "Optional notice at the top of your public storefront — not the marketplace homepage.",
              })}
              <div className="grid gap-6 md:grid-cols-2">
                <ColorPickerField
                  id="accentColor"
                  label="Accent color"
                  description="Badges, prices, and highlights on your storefront."
                  value={form.accentColor}
                  onChange={(accentColor) => setForm((f) => ({ ...f, accentColor }))}
                  placeholder="#e57a44"
                />
                <ColorPickerField
                  id="buttonColor"
                  label="Button color"
                  description="Primary buttons, including Request Appointment."
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
              <Separator />
              <Field
                label="External website"
                hint="Optional link to your own site from the storefront."
              >
                <Input
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://www.yourbusiness.com"
                  data-testid="input-websiteUrl"
                />
              </Field>
              <SettingsToggleRow
                label="Show website on storefront"
                description="Display a card linking to your external site."
                checked={form.showWebsiteCard}
                onCheckedChange={(showWebsiteCard) => setForm((f) => ({ ...f, showWebsiteCard }))}
                disabled={!form.websiteUrl.trim()}
                data-testid="switch-showWebsiteCard"
              />
            </SettingsSection>

            <SettingsSection
              icon={MousePointerClick}
              title="Customer experience"
              description="How visitors interact with your public page — browse, request appointments, or order online."
            >
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
              {!isOrderingMode ? (
                <p className="text-xs text-muted-foreground">
                  Switch to online ordering to configure pickup, delivery, payments, and tax.
                </p>
              ) : null}
            </SettingsSection>

            {isOrderingMode ? (
              <>
                <SettingsSection
                  icon={ShoppingBag}
                  title="Ordering"
                  description="When checkout is available, how customers pay, and sales tax."
                >
                  <SettingsToggleRow
                    label="Pickup"
                    description="Customers can pick up orders."
                    checked={form.pickupEnabled}
                    onCheckedChange={(pickupEnabled) => setForm((f) => ({ ...f, pickupEnabled }))}
                    data-testid="switch-pickupEnabled"
                  />
                  <SettingsToggleRow
                    label="Delivery"
                    description="You offer delivery."
                    checked={form.deliveryEnabled}
                    onCheckedChange={(deliveryEnabled) => setForm((f) => ({ ...f, deliveryEnabled }))}
                    data-testid="switch-deliveryEnabled"
                  />

                  <Separator />

                  <Field
                    label="When can customers order?"
                    hint="Food trucks can require an active scheduled location; restaurants can use business hours."
                  >
                    <Select
                      value={form.orderingAvailabilityMode}
                      onValueChange={(orderingAvailabilityMode) =>
                        setForm((f) => ({
                          ...f,
                          orderingAvailabilityMode: orderingAvailabilityMode as OrderingAvailabilityMode,
                        }))
                      }
                    >
                      <SelectTrigger data-testid="select-orderingAvailabilityMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDERING_AVAILABILITY_MODES.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode === "ALWAYS"
                              ? "Always (when business is active)"
                              : mode === "BUSINESS_HOURS"
                                ? "During business hours"
                                : mode === "MOBILE_LOCATION_SCHEDULE"
                                  ? "When a scheduled location is active"
                                  : "Manual on/off"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {form.orderingAvailabilityMode === "MANUAL" ? (
                    <SettingsToggleRow
                      label="Accepting orders"
                      description="Turn online ordering on or off."
                      checked={form.orderingEnabled}
                      onCheckedChange={(orderingEnabled) => setForm((f) => ({ ...f, orderingEnabled }))}
                      data-testid="switch-orderingEnabled"
                    />
                  ) : null}
                  {form.orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE" ? (
                    <p className="text-xs text-muted-foreground">
                      Manage today&apos;s location under Mobile Schedule. Checkout is blocked when no schedule window is active.
                    </p>
                  ) : null}

                  <Separator />

                  <Field
                    label="Payment options"
                    hint="Online card payments require a connected Stripe account below."
                  >
                    <PaymentModeSelector
                      value={form.paymentMode}
                      onChange={(paymentMode) => setForm((f) => ({ ...f, paymentMode }))}
                      idPrefix="business-settings-payment"
                    />
                  </Field>

                  <Separator />

                  <SettingsToggleRow
                    label="Sales tax"
                    description="Charge tax on taxable items at checkout (calculated on the server)."
                    checked={form.taxEnabled}
                    onCheckedChange={(taxEnabled) => setForm((f) => ({ ...f, taxEnabled }))}
                    data-testid="switch-taxEnabled"
                  />
                  {form.taxEnabled ? (
                    <div className="grid grid-cols-2 gap-4">
                      {textField("Tax rate (%)", "taxRatePercent", { type: "number", placeholder: "6.00" })}
                      {textField("Tax label", "taxLabel", { placeholder: "Sales Tax" })}
                    </div>
                  ) : null}

                  <Separator />

                  <Field
                    label="Same-day order cutoff"
                    hint="Optional — last time customers can place orders for same-day pickup or delivery."
                  >
                    <TimePicker
                      value={form.orderCutoffTime}
                      onChange={(orderCutoffTime) => setForm((f) => ({ ...f, orderCutoffTime }))}
                      optional
                      data-testid="input-orderCutoffTime"
                    />
                  </Field>
                  {textField("Default prep time (minutes)", "defaultPrepMinutes", {
                    type: "number",
                    placeholder: "15",
                    hint: "Base for ASAP estimates. Uses the longer of this and each item’s prep time.",
                  })}
                  {form.deliveryEnabled
                    ? textField("Delivery buffer (minutes)", "deliveryBufferMinutes", {
                        type: "number",
                        placeholder: "15",
                        hint: "Extra time added on top of prep for ASAP delivery estimates (drive / dispatch).",
                      })
                    : null}
                </SettingsSection>

                <SettingsSection
                  icon={Truck}
                  title="Fulfillment"
                  description="Fees, delivery rules, and instructions shown at checkout and on your storefront."
                >
                  <div className="grid grid-cols-2 gap-4">
                    {textField("Delivery fee ($)", "deliveryFee", { type: "number", placeholder: "0.00" })}
                    {textField("Min. for delivery ($)", "minimumOrderForDelivery", {
                      type: "number",
                      placeholder: "0.00",
                      hint: "Enforced at checkout.",
                    })}
                  </div>
                  {textField("Delivery area (miles)", "deliveryRadiusMiles", {
                    type: "number",
                    placeholder: "5",
                    hint: "Shown on your storefront for customers — not enforced by the app.",
                  })}
                  {textField("Pickup instructions", "pickupInstructions", {
                    multiline: true,
                    placeholder: "Come to the side entrance on Oak St.",
                    hint: "Shown at checkout when customers choose pickup.",
                  })}
                  {textField("Delivery instructions", "deliveryInstructions", {
                    multiline: true,
                    placeholder: "We deliver within 5 miles. Call when en route.",
                    hint: "Shown at checkout and on your storefront.",
                  })}
                </SettingsSection>

                {business ? (
                  <BusinessStripePaymentsCard businessId={business.id} stripeReturn={stripeReturn} />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
