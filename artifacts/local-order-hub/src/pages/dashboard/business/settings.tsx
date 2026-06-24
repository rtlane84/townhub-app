import { useState, useEffect } from "react";
import { useGetMyBusiness, useUpdateBusiness, getGetMyBusinessQueryKey } from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type FormState = {
  name: string; description: string; address: string; phone: string; hours: string;
  logoUrl: string; heroImageUrl: string;
  pickupEnabled: boolean; deliveryEnabled: boolean; payAtPickupEnabled: boolean;
  deliveryFee: string; minimumOrder: string; minimumOrderForDelivery: string;
  deliveryRadiusMiles: string; deliveryNotes: string;
  pickupInstructions: string; deliveryInstructions: string;
  orderCutoffTime: string;
  orderNotificationEmail: string;
  accentColor: string; buttonColor: string; bannerText: string;
};

const EMPTY: FormState = {
  name: "", description: "", address: "", phone: "", hours: "",
  logoUrl: "", heroImageUrl: "",
  pickupEnabled: true, deliveryEnabled: false, payAtPickupEnabled: false,
  deliveryFee: "", minimumOrder: "", minimumOrderForDelivery: "",
  deliveryRadiusMiles: "", deliveryNotes: "",
  pickupInstructions: "", deliveryInstructions: "",
  orderCutoffTime: "", orderNotificationEmail: "",
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
        description: business.description ?? "",
        address: business.address ?? "",
        phone: business.phone ?? "",
        hours: business.hours ?? "",
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
        payAtPickupEnabled: business.payAtPickupEnabled ?? false,
        orderCutoffTime: business.orderCutoffTime ?? "",
        orderNotificationEmail: String(b.orderNotificationEmail ?? ""),
        accentColor: String(b.accentColor ?? ""),
        buttonColor: String(b.buttonColor ?? ""),
        bannerText: String(b.bannerText ?? ""),
      });
    }
  }, [business]);

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyBusinessQueryKey() });
        toast({ title: "Settings saved" });
      },
      onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
    },
  });

  function handleSave() {
    if (!business) return;
    updateBusiness.mutate({
      id: business.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        hours: form.hours || undefined,
        logoUrl: form.logoUrl || undefined,
        heroImageUrl: form.heroImageUrl || undefined,
        pickupEnabled: form.pickupEnabled,
        deliveryEnabled: form.deliveryEnabled,
        deliveryFee: form.deliveryFee ? parseFloat(form.deliveryFee) : undefined,
        minimumOrder: form.minimumOrder ? parseFloat(form.minimumOrder) : undefined,
        payAtPickupEnabled: form.payAtPickupEnabled,
        orderCutoffTime: form.orderCutoffTime || undefined,
        minimumOrderForDelivery: form.minimumOrderForDelivery ? parseFloat(form.minimumOrderForDelivery) : null,
        deliveryRadiusMiles: form.deliveryRadiusMiles ? parseFloat(form.deliveryRadiusMiles) : null,
        deliveryNotes: form.deliveryNotes || null,
        pickupInstructions: form.pickupInstructions || null,
        deliveryInstructions: form.deliveryInstructions || null,
        orderNotificationEmail: form.orderNotificationEmail || null,
        accentColor: form.accentColor || null,
        buttonColor: form.buttonColor || null,
        bannerText: form.bannerText || null,
      } as never,
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

  function toggle(label: string, desc: string, key: "pickupEnabled" | "deliveryEnabled" | "payAtPickupEnabled") {
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
                {field("Description", "description", { multiline: true, placeholder: "Tell customers what makes your business special" })}
                {field("Address", "address", { placeholder: "123 Main St, Anytown, MN 55101" })}
                {field("Phone", "phone", { placeholder: "(555) 555-0100" })}
                {field("Hours", "hours", { placeholder: "Mon-Fri 9am-5pm, Sat 10am-4pm" })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {field("Logo URL", "logoUrl", { placeholder: "https://..." })}
                {field("Hero Image URL", "heroImageUrl", { placeholder: "https://..." })}
                {field("Homepage Banner Text", "bannerText", { placeholder: "🌸 Spring hours now in effect!" })}
                <div className="grid grid-cols-2 gap-4">
                  {field("Accent Color", "accentColor", { placeholder: "#e57a44" })}
                  {field("Button Color", "buttonColor", { placeholder: "#b35b1d" })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ordering Options</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 divide-y divide-border">
                  {toggle("Pickup enabled", "Customers can pick up their orders", "pickupEnabled")}
                  {toggle("Delivery enabled", "You offer delivery to customers", "deliveryEnabled")}
                  {toggle("Pay at pickup", "Customers can pay when they arrive", "payAtPickupEnabled")}
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
              <CardHeader><CardTitle className="text-base">Order Notifications</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Get an email whenever a new order arrives.</p>
                {field("Notification email", "orderNotificationEmail", { type: "email", placeholder: "orders@yourbusiness.com" })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
