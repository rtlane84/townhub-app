import { useState } from "react";
import { useAuth } from "@clerk/react";
import {
  useListBusinesses,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
  useListUsers,
  useAssignBusinessOwner,
  useListSubscriptionPlans,
  getListBusinessesQueryKey,
  BusinessType,
} from "@workspace/api-client-react";
import { planAssignmentLabel } from "@/lib/subscription-plans";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, UserPlus, Star, Layers } from "lucide-react";
import { WeeklyHoursPicker } from "@/components/weekly-hours-picker";
import {
  defaultWeeklyHours,
  normalizeWeeklyHours,
  parseStructuredHours,
  resolvePaymentMode,
  BUSINESS_TYPE_OPTIONS,
  formatBusinessTypeLabel,
} from "@workspace/api-zod";
import type { BusinessDayHours, PaymentMode } from "@workspace/api-client-react";
import { PaymentModeSelector } from "@/components/payment-mode-selector";

const BUSINESS_TYPES = BUSINESS_TYPE_OPTIONS;

interface BizForm {
  name: string;
  slug: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  structuredHours: BusinessDayHours[];
  active: boolean;
  featured: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  paymentMode: PaymentMode;
  deliveryFee: string;
  minimumOrder: string;
  ownerId: string;
}

const EMPTY_FORM: BizForm = {
  name: "", slug: "", type: "GENERAL", description: "", address: "", phone: "",
  structuredHours: defaultWeeklyHours(),
  active: true, featured: false, pickupEnabled: true, deliveryEnabled: false, paymentMode: "ONLINE_ONLY",
  deliveryFee: "", minimumOrder: "", ownerId: "",
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AdminBusinesses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { getToken } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subBusinessId, setSubBusinessId] = useState<number | null>(null);
  const [subPlanId, setSubPlanId] = useState<string>("");
  const [subSaving, setSubSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assignBusinessId, setAssignBusinessId] = useState<number | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [form, setForm] = useState<BizForm>(EMPTY_FORM);

  const { data: businesses, isLoading } = useListBusinesses();
  const { data: users } = useListUsers();
  const { data: plans = [] } = useListSubscriptionPlans({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey() });

  const createBusiness = useCreateBusiness({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Business created" }); },
      onError: () => toast({ title: "Failed to create business", variant: "destructive" }),
    },
  });

  const updateBusiness = useUpdateBusiness({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Business updated" }); },
      onError: () => toast({ title: "Failed to update business", variant: "destructive" }),
    },
  });

  const deleteBusiness = useDeleteBusiness({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Business deleted" }); },
      onError: () => toast({ title: "Failed to delete business", variant: "destructive" }),
    },
  });

  const assignOwner = useAssignBusinessOwner({
    mutation: {
      onSuccess: () => { invalidate(); setAssignDialogOpen(false); toast({ title: "Owner assigned" }); },
      onError: () => toast({ title: "Failed to assign owner", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(b: NonNullable<typeof businesses>[0]) {
    setEditingId(b.id);
    setForm({
      name: b.name, slug: b.slug, type: b.type, description: b.description ?? "",
      address: b.address ?? "", phone: b.phone ?? "",
      structuredHours: parseStructuredHours(b.structuredHours) ?? defaultWeeklyHours(),
      active: b.active ?? true, featured: b.featured ?? false, pickupEnabled: b.pickupEnabled ?? true,
      deliveryEnabled: b.deliveryEnabled ?? false, paymentMode: resolvePaymentMode(b),
      deliveryFee: b.deliveryFee != null ? String(b.deliveryFee) : "",
      minimumOrder: b.minimumOrder != null ? String(b.minimumOrder) : "",
      ownerId: b.ownerId ?? "",
    });
    setDialogOpen(true);
  }

  function openAssign(businessId: number, currentOwnerId: string | null) {
    setAssignBusinessId(businessId);
    setAssignOwnerId(currentOwnerId ?? "");
    setAssignDialogOpen(true);
  }

  function openChangePlan(businessId: number) {
    setSubBusinessId(businessId);
    setSubPlanId("");
    setSubDialogOpen(true);
  }

  async function handleSavePlan() {
    if (!subBusinessId || !subPlanId) return;
    setSubSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/businesses/${subBusinessId}/subscription`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ planId: parseInt(subPlanId, 10), status: "ACTIVE" }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const body = ct.includes("application/json") ? await res.json() : { error: `Server error (${res.status})` };
      if (!res.ok) {
        toast({ title: "Failed to assign plan", description: String(body.error ?? "Unknown error"), variant: "destructive" });
        return;
      }
      toast({ title: "Plan assigned", description: "Subscription updated successfully." });
      setSubDialogOpen(false);
    } catch {
      toast({ title: "Network error", description: "Could not reach server.", variant: "destructive" });
    } finally {
      setSubSaving(false);
    }
  }

  function buildPayload() {
    return {
      ...form,
      type: form.type as BusinessType,
      structuredHours: normalizeWeeklyHours(form.structuredHours),
      deliveryFee: form.deliveryFee ? parseFloat(form.deliveryFee) : undefined,
      minimumOrder: form.minimumOrder ? parseFloat(form.minimumOrder) : undefined,
      ownerId: form.ownerId || undefined,
    };
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim()) return;
    if (editingId) {
      updateBusiness.mutate({ id: editingId, data: buildPayload() });
    } else {
      createBusiness.mutate({ data: buildPayload() });
    }
  }

  const isPending = createBusiness.isPending || updateBusiness.isPending;

  return (
    <AdminDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Businesses</h1>
            <p className="text-muted-foreground mt-1">Manage all businesses on the platform</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-business">
            <Plus className="h-4 w-4 mr-2" /> Add Business
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !businesses?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-serif text-lg">No businesses yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {businesses.map((biz) => (
                  <div key={biz.id} className="flex items-center gap-4 px-4 py-3" data-testid={`row-business-${biz.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{biz.name}</p>
                        {biz.featured && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {!biz.active && <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {biz.type.replace(/_/g, " ")} · /{biz.slug}
                        {biz.ownerId && <> · owner assigned</>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Change plan" onClick={() => openChangePlan(biz.id)}>
                        <Layers className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Assign owner" onClick={() => openAssign(biz.id, biz.ownerId ?? null)} data-testid={`button-assign-owner-${biz.id}`}>
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(biz)} data-testid={`button-edit-business-${biz.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteBusiness.mutate({ id: biz.id })}
                        disabled={deleteBusiness.isPending}
                        data-testid={`button-delete-business-${biz.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "Edit Business" : "Add Business"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editingId ? f.slug : slugify(e.target.value) }))}
                  data-testid="input-business-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Slug *</label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} data-testid="input-business-slug" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Address</label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Business Hours</label>
              <WeeklyHoursPicker
                value={form.structuredHours}
                onChange={(structuredHours) => setForm((f) => ({ ...f, structuredHours }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                <label className="text-sm">Active</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
                <label className="text-sm">Featured</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.pickupEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, pickupEnabled: v }))} />
                <label className="text-sm">Pickup</label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Payment options</label>
              <PaymentModeSelector
                value={form.paymentMode}
                onChange={(paymentMode) => setForm((f) => ({ ...f, paymentMode }))}
                idPrefix="admin-business-payment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.slug.trim()} data-testid="button-save-business">
              {isPending ? "Saving..." : editingId ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change plan dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Change Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Select a plan to assign to this business. The subscription status will be set to Active.</p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Plan</label>
              <Select value={subPlanId} onValueChange={setSubPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan…" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {planAssignmentLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={!subPlanId || subSaving}>
              {subSaving ? "Saving…" : "Assign Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign owner dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Assign Business Owner</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Select User</label>
            <Select value={assignOwnerId || "__none"} onValueChange={(v) => setAssignOwnerId(v === "__none" ? "" : v)}>
              <SelectTrigger data-testid="select-assign-owner">
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No owner</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!assignOwnerId || assignOwner.isPending}
              onClick={() => assignBusinessId && assignOwner.mutate({ id: assignBusinessId, data: { ownerId: assignOwnerId } })}
              data-testid="button-confirm-assign-owner"
            >
              {assignOwner.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
