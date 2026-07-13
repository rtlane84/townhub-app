import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
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
  normalizeWebsiteUrl,
  BUSINESS_TYPE_OPTIONS,
  ORDERING_AVAILABILITY_MODES,
  resolveOrderClosingBufferMinutes,
} from "@workspace/api-zod";
import type { BusinessDayHours, PaymentMode, BusinessType, StorefrontMode, OrderingAvailabilityMode } from "@workspace/api-client-react";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { PaymentModeSelector } from "@/components/payment-mode-selector";
import { BusinessStripePaymentsCard } from "@/components/business-stripe-payments-card";
import { StorefrontModeSelector } from "@/components/storefront-mode-selector";
import { ImageField } from "@/components/image-field";
import { StorefrontUrlField } from "@/components/storefront-url-field";
import { AddAnotherBusinessButton } from "@/components/add-another-business-link";
import { Building2, Check, Clock, ImageIcon, Layers, MousePointerClick, ShoppingBag, Truck, CheckCircle, RotateCcw, Save, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDERING_AVAILABILITY_OPTION_COPY: Record<
  OrderingAvailabilityMode,
  { label: string; description: string }
> = {
  ALWAYS: {
    label: "Always",
    description: "Customers can order whenever your business is active.",
  },
  BUSINESS_HOURS: {
    label: "Business hours",
    description: "Customers can order only during today's business hours.",
  },
  MOBILE_LOCATION_SCHEDULE: {
    label: "Scheduled mobile location",
    description: "Customers can order only while an active scheduled location is open.",
  },
  MANUAL: {
    label: "Manual",
    description: "Turn online ordering on or off yourself.",
  },
};

type FormState = {
  name: string;
  type: BusinessType;
  description: string;
  address: string;
  phone: string;
  websiteUrl: string;
  showWebsiteCard: boolean;
  structuredHours: BusinessDayHours[];
  hoursEnabled: boolean;
  logoUrl: string;
  heroImageUrl: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMode: PaymentMode;
  storefrontMode: StorefrontMode;
  orderingAvailabilityMode: OrderingAvailabilityMode;
  orderingEnabled: boolean;
  orderClosingBufferMinutes: string;
  deliveryFee: string;
  minimumOrderForDelivery: string;
  deliveryRadiusMiles: string;
  pickupInstructions: string;
  deliveryInstructions: string;
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
  hoursEnabled: true,
  logoUrl: "",
  heroImageUrl: "",
  pickupEnabled: true,
  deliveryEnabled: false,
  paymentMode: "ONLINE_ONLY",
  storefrontMode: "ORDERING",
  orderingAvailabilityMode: "ALWAYS",
  orderingEnabled: true,
  orderClosingBufferMinutes: "0",
  deliveryFee: "",
  minimumOrderForDelivery: "",
  deliveryRadiusMiles: "",
  pickupInstructions: "",
  deliveryInstructions: "",
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
  const [form, setFormState] = useState<FormState>({ ...EMPTY });
  const [isDirty, setIsDirty] = useState(false);
  const lastSyncedId = useRef<number | null>(null);
  const stripeReturn = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("stripe") === "return";
  }, []);

  const setForm = (
    updater: FormState | ((prev: FormState) => FormState),
  ) => {
    setFormState(updater);
    setIsDirty(true);
  };

  const hydrateFromBusiness = (biz: NonNullable<typeof business>) => {
    const b = biz as unknown as Record<string, unknown>;
    const deliveryInstructions = String(b.deliveryInstructions ?? "");
    const deliveryNotes = String(b.deliveryNotes ?? "");
    setFormState({
      name: biz.name ?? "",
      type: biz.type ?? "GENERAL",
      description: biz.description ?? "",
      address: biz.address ?? "",
      phone: biz.phone ?? "",
      websiteUrl: biz.websiteUrl ?? "",
      showWebsiteCard: biz.showWebsiteCard === true,
      structuredHours: parseStructuredHours(biz.structuredHours) ?? defaultWeeklyHours(),
      hoursEnabled: biz.hoursEnabled !== false,
      logoUrl: biz.logoUrl ?? "",
      heroImageUrl: biz.heroImageUrl ?? "",
      pickupEnabled: biz.pickupEnabled ?? true,
      deliveryEnabled: biz.deliveryEnabled ?? false,
      deliveryFee: biz.deliveryFee != null ? String(biz.deliveryFee) : "",
      minimumOrderForDelivery: b.minimumOrderForDelivery != null ? String(b.minimumOrderForDelivery) : "",
      deliveryRadiusMiles: b.deliveryRadiusMiles != null ? String(b.deliveryRadiusMiles) : "",
      pickupInstructions: String(b.pickupInstructions ?? ""),
      deliveryInstructions: deliveryInstructions || deliveryNotes,
      paymentMode: resolvePaymentMode(biz),
      storefrontMode: resolveStorefrontMode(biz),
      orderingAvailabilityMode: resolveOrderingAvailabilityMode(biz),
      orderingEnabled: biz.orderingEnabled !== false,
      orderClosingBufferMinutes:
        biz.orderClosingBufferMinutes != null ? String(biz.orderClosingBufferMinutes) : "0",
      defaultPrepMinutes: biz.defaultPrepMinutes != null ? String(biz.defaultPrepMinutes) : "15",
      deliveryBufferMinutes:
        biz.deliveryBufferMinutes != null ? String(biz.deliveryBufferMinutes) : "15",
      accentColor: String(b.accentColor ?? ""),
      buttonColor: String(b.buttonColor ?? ""),
      bannerText: String(b.bannerText ?? ""),
      taxEnabled: b.taxEnabled === true,
      taxRatePercent: b.taxRatePercent != null ? String(b.taxRatePercent) : "",
      taxLabel: String(b.taxLabel ?? "Sales Tax"),
    });
    lastSyncedId.current = biz.id;
    setIsDirty(false);
  };

  useEffect(() => {
    if (!business) return;
    if (isDirty && lastSyncedId.current === business.id) return;
    hydrateFromBusiness(business);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate only when business identity/data changes while clean
  }, [business, isDirty]);

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: (updated) => {
        if (selectedBusinessId != null) {
          queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey({ businessId: selectedBusinessId }) });
        }
        if (updated?.slug) {
          queryClient.invalidateQueries({ queryKey: getGetBusinessBySlugQueryKey(updated.slug) });
        }
        if (updated) {
          hydrateFromBusiness(updated as NonNullable<typeof business>);
        } else {
          setIsDirty(false);
        }
        toast({ title: "Settings saved" });
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Please try again.";
        toast({ title: "Failed to save settings", description: message, variant: "destructive" });
      },
    },
  });

  function handleDiscard() {
    if (!business) return;
    hydrateFromBusiness(business);
  }

  function handleSave() {
    if (!business) return;
    const opt = (value: string) => value.trim() || undefined;
    const optNum = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const n = parseFloat(trimmed);
      return Number.isNaN(n) ? undefined : n;
    };
    const clearable = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
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
        structuredHours: form.hoursEnabled ? normalizeWeeklyHours(form.structuredHours) : undefined,
        hoursEnabled: form.hoursEnabled,
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
              orderClosingBufferMinutes: resolveOrderClosingBufferMinutes(
                form.orderClosingBufferMinutes,
              ),
              defaultPrepMinutes: optNum(form.defaultPrepMinutes),
              deliveryBufferMinutes: optNum(form.deliveryBufferMinutes),
              minimumOrderForDelivery: optNum(form.minimumOrderForDelivery),
              deliveryRadiusMiles: optNum(form.deliveryRadiusMiles),
              deliveryNotes: null,
              pickupInstructions: opt(form.pickupInstructions),
              deliveryInstructions: opt(form.deliveryInstructions),
              taxEnabled: form.taxEnabled,
              taxRatePercent: form.taxEnabled ? optNum(form.taxRatePercent) : undefined,
              taxLabel: form.taxLabel.trim() || "Sales Tax",
            }
          : {}),
        accentColor: clearable(form.accentColor),
        buttonColor: clearable(form.buttonColor),
        bannerText: clearable(form.bannerText),
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
      <div className="mx-auto max-w-2xl space-y-6 pb-28">
        <DashboardPageHeader
          title="Settings"
          description="Profile, public page, and how customers order from your storefront."
          action={
            <div className="flex items-center gap-2">
              {!isDirty ? (
                <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Saved
                </span>
              ) : null}
              <LoadingButton
                onClick={handleSave}
                disabled={!isDirty}
                loading={updateBusiness.isPending}
                loadingText="Saving…"
                className="rounded-full"
                data-testid="button-save-settings"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </LoadingButton>
            </div>
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
              <Field
                label="Business hours"
                hint="Weekly open/closed times. Turn this off if you only follow a mobile schedule."
              >
                <SettingsToggleRow
                  label="Show business hours"
                  description="When off, hours are hidden on your storefront. Mobile businesses often use Mobile Schedule instead."
                  checked={form.hoursEnabled}
                  onCheckedChange={(hoursEnabled) => setForm((f) => ({ ...f, hoursEnabled }))}
                  data-testid="switch-hoursEnabled"
                />
                {form.hoursEnabled ? (
                  <div className="pt-3">
                    <WeeklyHoursPicker
                      value={form.structuredHours}
                      onChange={(structuredHours) => setForm((f) => ({ ...f, structuredHours }))}
                    />
                  </div>
                ) : (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Customers won&apos;t see weekly hours. Manage stops under Mobile Schedule if you travel.
                  </p>
                )}
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
              <Field
                label="Storefront banner"
                hint="Optional notice across the top of your public storefront — not the marketplace homepage."
              >
                <div className="overflow-hidden rounded-[1.25rem] ring-1 ring-black/[0.06]">
                  <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-3.5 py-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Megaphone className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Live preview</span>
                  </div>
                  {form.bannerText.trim() ? (
                    <div className="bg-gradient-to-r from-primary via-primary to-primary/90 px-4 py-3 text-center text-sm font-medium tracking-tight text-primary-foreground">
                      {form.bannerText.trim()}
                    </div>
                  ) : (
                    <div className="bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                      No banner — leave blank to hide
                    </div>
                  )}
                  <div className="border-t border-border/50 bg-card p-3">
                    <Input
                      value={form.bannerText}
                      onChange={(e) => setForm((f) => ({ ...f, bannerText: e.target.value }))}
                      placeholder="Spring hours now in effect!"
                      data-testid="input-bannerText"
                    />
                  </div>
                </div>
              </Field>
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
                  onChange={(e) => {
                    const websiteUrl = e.target.value;
                    setForm((f) => ({
                      ...f,
                      websiteUrl,
                      // Auto-enable the storefront card once a URL is entered.
                      ...(websiteUrl.trim() && !f.websiteUrl.trim()
                        ? { showWebsiteCard: true }
                        : !websiteUrl.trim()
                          ? { showWebsiteCard: false }
                          : {}),
                    }));
                  }}
                  placeholder="https://www.yourbusiness.com"
                  data-testid="input-websiteUrl"
                />
              </Field>
              <SettingsToggleRow
                label="Show website on storefront"
                description={
                  form.websiteUrl.trim()
                    ? "Display a card linking to your external site."
                    : "Add a website URL above — the card only appears when a URL is set."
                }
                checked={form.showWebsiteCard}
                onCheckedChange={(showWebsiteCard) => setForm((f) => ({ ...f, showWebsiteCard }))}
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
                  description="Choose how customers place orders, when ordering is available, and how they pay."
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
                    hint="Choose when customers are allowed to place new orders."
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
                            {ORDERING_AVAILABILITY_OPTION_COPY[mode].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {ORDERING_AVAILABILITY_OPTION_COPY[form.orderingAvailabilityMode].description}
                    </p>
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
                      Set today&apos;s stop under Mobile Schedule. Ordering is only available while a location is open.
                    </p>
                  ) : null}
                  {form.orderingAvailabilityMode === "BUSINESS_HOURS" ||
                  form.orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE" ? (
                    <Field
                      label="Stop accepting new orders"
                      hint="Prevents new ASAP orders shortly before today's business hours or active mobile location ends."
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={240}
                          step={1}
                          value={form.orderClosingBufferMinutes}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, orderClosingBufferMinutes: e.target.value }))
                          }
                          placeholder="0"
                          className="max-w-[7rem]"
                          data-testid="input-orderClosingBufferMinutes"
                        />
                        <span className="text-sm text-muted-foreground">minutes before closing</span>
                      </div>
                    </Field>
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
                    description="Charge tax on taxable items at checkout."
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
                </SettingsSection>

                <SettingsSection
                  icon={Clock}
                  title="Order timing"
                  description={
                    form.deliveryEnabled
                      ? "How long customers should expect to wait for pickup or delivery."
                      : "How long customers should expect to wait for pickup."
                  }
                >
                  {textField("Minimum prep time (minutes)", "defaultPrepMinutes", {
                    type: "number",
                    placeholder: "15",
                    hint:
                      "The minimum time needed to prepare any order. If a menu item requires more time, we'll automatically use the longer time.",
                  })}
                  {form.deliveryEnabled
                    ? textField("Delivery buffer (minutes)", "deliveryBufferMinutes", {
                        type: "number",
                        placeholder: "15",
                        hint:
                          "Extra time added only to delivery orders for packing, driver dispatch, and travel.",
                      })
                    : null}
                  <div
                    className="space-y-3 rounded-2xl bg-muted/35 px-4 py-3.5"
                    data-testid="order-timing-summary"
                  >
                    <p className="text-sm font-medium text-foreground">How order timing works</p>
                    <ul className="space-y-2">
                      {[
                        "Every order starts with your minimum prep time.",
                        "If a menu item takes longer, we'll automatically use that instead.",
                        ...(form.deliveryEnabled
                          ? ["Delivery orders add your delivery buffer."]
                          : []),
                        "Larger orders may automatically receive a few extra preparation minutes.",
                      ].map((line) => (
                        <li key={line} className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SettingsSection>

                {form.pickupEnabled || form.deliveryEnabled ? (
                  <SettingsSection
                    icon={Truck}
                    title="Fulfillment"
                    description={
                      form.deliveryEnabled
                        ? "Fees, delivery area, and instructions shown at checkout and on your storefront."
                        : "Instructions shown at checkout and on your storefront."
                    }
                  >
                    {form.deliveryEnabled ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {textField("Delivery fee ($)", "deliveryFee", { type: "number", placeholder: "0.00" })}
                          {textField("Min. for delivery ($)", "minimumOrderForDelivery", {
                            type: "number",
                            placeholder: "0.00",
                            hint: "Customers must reach this amount to choose delivery.",
                          })}
                        </div>
                        <Field
                          label="Delivery area (miles)"
                          hint="Shown to customers as your normal delivery area."
                        >
                          <Input
                            type="number"
                            value={form.deliveryRadiusMiles}
                            onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusMiles: e.target.value }))}
                            placeholder="5"
                            data-testid="input-deliveryRadiusMiles"
                          />
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Orders outside this area are not automatically blocked.
                          </p>
                        </Field>
                      </>
                    ) : null}
                    {form.pickupEnabled
                      ? textField("Pickup instructions", "pickupInstructions", {
                          multiline: true,
                          placeholder: "Come to the side entrance on Oak St.",
                          hint: "Shown at checkout when customers choose pickup.",
                        })
                      : null}
                    {form.deliveryEnabled
                      ? textField("Delivery instructions", "deliveryInstructions", {
                          multiline: true,
                          placeholder: "We deliver within 5 miles. Call when en route.",
                          hint: "Shown at checkout and on your storefront.",
                        })
                      : null}
                  </SettingsSection>
                ) : null}

                {business ? (
                  <BusinessStripePaymentsCard businessId={business.id} stripeReturn={stripeReturn} />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>

      {isDirty ? (
        <div className="fixed bottom-[calc(1rem+var(--native-bottom-tab-height,0px)+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-[1.25rem] border-0 bg-card/95 px-4 py-3 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md md:bottom-4 md:left-auto md:right-10">
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={handleDiscard}
              disabled={updateBusiness.isPending}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Discard
            </Button>
            <LoadingButton
              size="sm"
              onClick={handleSave}
              loading={updateBusiness.isPending}
              loadingText="Saving…"
              className="rounded-full"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save
            </LoadingButton>
          </div>
        </div>
      ) : null}
    </BusinessDashboardLayout>
  );
}
