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

export default function BusinessSettings() {
  const { data: business, isLoading } = useGetMyBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    hours: "",
    logoUrl: "",
    heroImageUrl: "",
    pickupEnabled: true,
    deliveryEnabled: false,
    deliveryFee: "",
    minimumOrder: "",
    payAtPickupEnabled: false,
    orderCutoffTime: "",
  });

  useEffect(() => {
    if (business) {
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
        payAtPickupEnabled: business.payAtPickupEnabled ?? false,
        orderCutoffTime: business.orderCutoffTime ?? "",
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
        ...form,
        deliveryFee: form.deliveryFee ? parseFloat(form.deliveryFee) : undefined,
        minimumOrder: form.minimumOrder ? parseFloat(form.minimumOrder) : undefined,
      },
    });
  }

  function field(label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string; multiline?: boolean }) {
    const value = String(form[key]);
    return (
      <div>
        <label className="text-sm font-medium mb-1.5 block">{label}</label>
        {opts?.multiline ? (
          <Textarea
            value={value}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={opts.placeholder}
            rows={3}
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
      </div>
    );
  }

  function toggle(label: string, description: string, key: "pickupEnabled" | "deliveryEnabled" | "payAtPickupEnabled") {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={!!form[key]}
          onCheckedChange={(val) => setForm((f) => ({ ...f, [key]: val }))}
          data-testid={`switch-${key}`}
        />
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
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
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
                </div>
                <div className="mt-4">
                  {field("Order cutoff time", "orderCutoffTime", { placeholder: "e.g. 3pm same day" })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </BusinessDashboardLayout>
  );
}
