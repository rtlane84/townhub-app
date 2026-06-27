import { useState, useEffect } from "react";
import { useGetMyBusiness, useUpdateBusiness, getGetMyBusinessQueryKey, getGetBusinessBySlugQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BUSINESS_TYPE_OPTIONS,
} from "@workspace/api-zod";
import type { BusinessDayHours, PaymentMode, BusinessType } from "@workspace/api-client-react";
import { ColorPickerField, ColorPreviewSwatches } from "@/components/color-picker-field";
import { PaymentModeSelector } from "@/components/payment-mode-selector";
import { ImageField } from "@/components/image-field";

type FormState = {
  name: string; type: BusinessType; description: string; address: string; phone: string;
  structuredHours: BusinessDayHours[];
  logoUrl: string; heroImageUrl: string;
  pickupEnabled: boolean; deliveryEnabled: boolean; paymentMode: PaymentMode;
  deliveryFee: string; minimumOrder: string; minimumOrderForDelivery: string;
  deliveryRadiusMiles: string; deliveryNotes: string;
  pickupInstructions: string; deliveryInstructions: string;
  orderCutoffTime: string;
  notificationEmail: string;
  notificationPhone: string;
  notifyNewOrdersByEmail: boolean;
  notifyNewOrdersBySms: boolean;
  notifyAppointmentRequestsByEmail: boolean;
  notifyAppointmentRequestsBySms: boolean;
  accentColor: string; buttonColor: string; bannerText: string;
};

const EMPTY: FormState = {
  name: "", type: "GENERAL", description: "", address: "", phone: "",
  structuredHours: defaultWeeklyHours(),
  logoUrl: "", heroImageUrl: "",
  pickupEnabled: true, deliveryEnabled: false, paymentMode: "ONLINE_ONLY",
  deliveryFee: "", minimumOrder: "", minimumOrderForDelivery: "",
  deliveryRadiusMiles: "", deliveryNotes: "",
  pickupInstructions: "", deliveryInstructions: "",
  orderCutoffTime: "", notificationEmail: "", notificationPhone: "",
  notifyNewOrdersByEmail: true, notifyNewOrdersBySms: false,
  notifyAppointmentRequestsByEmail: true, notifyAppointmentRequestsBySms: false,
  accentColor: "", buttonColor: "", bannerText: "",
};

export default function BusinessSettings() {
  const { data: business, isLoading } = useGetMyBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({ ...EMPTY });

  useEffect(() => {
    if (business) {
      const b = business as unknown as Record<string, unknown>;
      setForm({
        name: business.name ?? "",
        type: business.type ?? "GENERAL",
        description: business.description ?? "",
        address: business.address ?? "",
        phone: business.phone ?? "",
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
        orderCutoffTime: business.orderCutoffTime ?? "",
        notificationEmail: String(b.notificationEmail ?? b.orderNotificationEmail ?? ""),
        notificationPhone: String(b.notificationPhone ?? ""),
        notifyNewOrdersByEmail: b.notifyNewOrdersByEmail !== false,
        notifyNewOrdersBySms: b.notifyNewOrdersBySms === true,
        notifyAppointmentRequestsByEmail: b.notifyAppointmentRequestsByEmail !== false,
        notifyAppointmentRequestsBySms: b.notifyAppointmentRequestsBySms === true,
        accentColor: String(b.accentColor ?? ""),
        buttonColor: String(b.buttonColor ?? ""),
        bannerText: String(b.bannerText ?? ""),
      });
    }
  }, [business]);

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: (updated) => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
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

    updateBusiness.mutate({
      id: business.id,
      data: {
        name: form.name.trim() || business.name,
        type: form.type,
        description: opt(form.description),
        address: opt(form.address),
        phone: opt(form.phone),
        structuredHours: normalizeWeeklyHours(form.structuredHours),
        logoUrl: opt(form.logoUrl),
        heroImageUrl: opt(form.heroImageUrl),
        pickupEnabled: form.pickupEnabled,
        deliveryEnabled: form.deliveryEnabled,
        deliveryFee: optNum(form.deliveryFee),
        minimumOrder: optNum(form.minimumOrder),
        paymentMode: form.paymentMode,
        orderCutoffTime: opt(form.orderCutoffTime),
        minimumOrderForDelivery: optNum(form.minimumOrderForDelivery),
        deliveryRadiusMiles: optNum(form.deliveryRadiusMiles),
        deliveryNotes: opt(form.deliveryNotes),
        pickupInstructions: opt(form.pickupInstructions),
        deliveryInstructions: opt(form.deliveryInstructions),
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

  const isSalon = form.type === "SALON";

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
          <Button onClick={handleSave} disabled={updateBusiness.isPending} data-testid="button-save-settings">
            {updateBusiness.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Business Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {field("Business Name", "name")}
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
              <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ImageField
                  surface="business-logo"
                  value={form.logoUrl}
                  onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
                  testId="business-logo"
                />
                <ImageField
                  surface="business-hero"
                  value={form.heroImageUrl}
                  onChange={(heroImageUrl) => setForm((f) => ({ ...f, heroImageUrl }))}
                  testId="business-hero"
                />
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
                    description="Primary buttons on your storefront, including Book Appointment."
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
                    Choose how customers can pay for orders from your business.
                  </p>
                  <PaymentModeSelector
                    value={form.paymentMode}
                    onChange={(paymentMode) => setForm((f) => ({ ...f, paymentMode }))}
                    idPrefix="business-settings-payment"
                  />
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                  {field("Delivery fee ($)", "deliveryFee", { type: "number", placeholder: "0.00" })}
                  {field("Minimum order ($)", "minimumOrder", { type: "number", placeholder: "0.00" })}
                  {field("Min. for delivery ($)", "minimumOrderForDelivery", { type: "number", placeholder: "0.00" })}
                  {field("Delivery radius (mi)", "deliveryRadiusMiles", { type: "number", placeholder: "5" })}
                </div>
                <div className="mt-4 space-y-4">
                  {field("Order cutoff time", "orderCutoffTime", { placeholder: "3pm same day" })}
                  {field("Pickup instructions", "pickupInstructions", { multiline: true, placeholder: "Come to the side entrance on Oak St." })}
                  {field("Delivery instructions", "deliveryInstructions", { multiline: true, placeholder: "We deliver within 5 miles. Call when en route." })}
                  {field("Delivery notes", "deliveryNotes", { multiline: true, placeholder: "Free delivery on orders over $30!" })}
                </div>
              </CardContent>
            </Card>

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
                  {isSalon && notifyToggle("Email me for appointment requests", "Receive an email when a customer requests an appointment", "notifyAppointmentRequestsByEmail")}
                  {isSalon && notifyToggle("Text me for appointment requests", "Urgent SMS alert for new appointment requests", "notifyAppointmentRequestsBySms")}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
