import { useState, useMemo } from "react";
import { useAuth } from "@clerk/react";
import {
  useListAdminBusinesses,
  useCreateBusiness,
  useUpdateBusiness,
  useDeleteBusiness,
  useListUsers,
  useAssignBusinessOwner,
  useListSubscriptionPlans,
  useGetBusinessSubscription,
  getListAdminBusinessesQueryKey,
  getListBusinessesQueryKey,
  getGetBusinessBySlugQueryKey,
  getGetBusinessSubscriptionQueryKey,
  getGetBusinessSubscriptionQueryOptions,
  ApiError,
  BusinessType,
} from "@workspace/api-client-react";
import { planAssignmentLabel } from "@/lib/subscription-plans";
import {
  formatBillingIntervalLabel,
  subscriptionStatusDisplayLabel,
} from "@/lib/subscription-display";
import { resolveApiUrl } from "@/lib/api-base-url";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { StreetAddressFields } from "@/components/street-address-fields";
import {
  BUSINESS_TYPE_OPTIONS,
  formatBusinessTypeLabel,
} from "@workspace/api-zod";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { archiveBusinessCopy, deactivateBusinessCopy } from "@/lib/confirm-action-copy";

const BUSINESS_TYPES = BUSINESS_TYPE_OPTIONS;

interface BizForm {
  name: string;
  slug: string;
  type: string;
  description: string;
  address: string;
  phone: string;
  active: boolean;
  featured: boolean;
}

const EMPTY_FORM: BizForm = {
  name: "", slug: "", type: "GENERAL", description: "", address: "", phone: "",
  active: true, featured: false,
};

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function BusinessSubscriptionSummary({ businessId }: { businessId: number }) {
  const { data: subscription, error, isLoading } = useGetBusinessSubscription(businessId, {
    query: {
      queryKey: getGetBusinessSubscriptionQueryKey(businessId),
      retry: false,
    },
  });

  if (isLoading) {
    return <Skeleton className="mt-1.5 h-5 w-36" data-testid={`subscription-loading-${businessId}`} />;
  }

  if (error) {
    const noSubscription = error instanceof ApiError && error.status === 404;
    return (
      <Badge
        variant="outline"
        className="mt-1.5 text-[11px] font-normal text-muted-foreground"
        data-testid={`subscription-plan-${businessId}`}
      >
        {noSubscription ? "No subscription" : "Plan unavailable"}
      </Badge>
    );
  }

  if (!subscription) return null;

  const interval = formatBillingIntervalLabel(subscription.billingInterval);
  const details = [
    subscriptionStatusDisplayLabel(subscription),
    interval === "Not set" ? null : interval,
  ].filter((value): value is string => value != null);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <Badge variant="outline" data-testid={`subscription-plan-${businessId}`}>
        Plan: {subscription.plan?.name ?? `#${subscription.planId}`}
      </Badge>
      <span>{details.join(" · ")}</span>
    </div>
  );
}

export default function AdminBusinesses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { getToken } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [removeDialog, setRemoveDialog] = useState<{
    id: number;
    name: string;
    hadActiveSubscription: boolean;
    loading: boolean;
  } | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subBusinessId, setSubBusinessId] = useState<number | null>(null);
  const [subPlanId, setSubPlanId] = useState<string>("");
  const [subBillingInterval, setSubBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [subLoadingCurrent, setSubLoadingCurrent] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [assignBusinessId, setAssignBusinessId] = useState<number | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [form, setForm] = useState<BizForm>(EMPTY_FORM);
  const [deactivatePending, setDeactivatePending] = useState(false);

  const { data: businesses, isLoading } = useListAdminBusinesses();
  const { data: users } = useListUsers();
  const { data: plans = [] } = useListSubscriptionPlans({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey() });

  const ownerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users ?? []) {
      map.set(u.id, u.name?.trim() || u.email);
    }
    return map;
  }, [users]);

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
      onMutate: (vars) => { setDeletingId(vars.id); },
      onSettled: () => { setDeletingId(null); },
      onSuccess: () => {
        invalidate();
        setRemoveDialog(null);
        toast({ title: "Business archived" });
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : "Failed to remove business";
        toast({ title: "Failed to remove business", description: message, variant: "destructive" });
      },
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
      active: b.active ?? true, featured: b.featured ?? false,
    });
    setDialogOpen(true);
  }

  function openAssign(businessId: number, currentOwnerId: string | null) {
    setAssignBusinessId(businessId);
    setAssignOwnerId(currentOwnerId ?? "");
    setAssignDialogOpen(true);
  }

  async function openChangePlan(businessId: number) {
    setSubBusinessId(businessId);
    setSubPlanId("");
    setSubBillingInterval("monthly");
    setSubDialogOpen(true);
    setSubLoadingCurrent(true);

    try {
      const subscription = await queryClient.fetchQuery(
        getGetBusinessSubscriptionQueryOptions(businessId, {
          query: {
            queryKey: getGetBusinessSubscriptionQueryKey(businessId),
            retry: false,
          },
        }),
      );
      setSubPlanId(String(subscription.planId));
      setSubBillingInterval(subscription.billingInterval === "yearly" ? "yearly" : "monthly");
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        toast({
          title: "Could not load current plan",
          description: "You can still select a plan manually.",
          variant: "destructive",
        });
      }
    } finally {
      setSubLoadingCurrent(false);
    }
  }

  async function openRemoveDialog(businessId: number, businessName: string) {
    setRemoveDialog({ id: businessId, name: businessName, hadActiveSubscription: false, loading: true });
    try {
      const token = await getToken();
      const res = await fetch(resolveApiUrl(`/api/admin/businesses/${businessId}/subscription`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let hadActiveSubscription = false;
      if (res.ok) {
        const sub = (await res.json()) as { status?: string };
        hadActiveSubscription = ["TRIAL", "TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status ?? "");
      }
      setRemoveDialog({ id: businessId, name: businessName, hadActiveSubscription, loading: false });
    } catch {
      setRemoveDialog({ id: businessId, name: businessName, hadActiveSubscription: false, loading: false });
    }
  }

  function confirmRemoveBusiness() {
    if (!removeDialog) return;
    deleteBusiness.mutate({ id: removeDialog.id });
  }

  async function handleSavePlan() {
    if (!subBusinessId || !subPlanId) return;
    setSubSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(resolveApiUrl(`/api/admin/businesses/${subBusinessId}/subscription`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: parseInt(subPlanId, 10),
          status: "ACTIVE",
          billingInterval: subBillingInterval,
        }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const body = ct.includes("application/json") ? await res.json() : { error: `Server error (${res.status})` };
      if (!res.ok) {
        toast({ title: "Failed to assign plan", description: String(body.error ?? "Unknown error"), variant: "destructive" });
        return;
      }
      const updatedBusiness = businesses?.find((business) => business.id === subBusinessId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListBusinessesQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: getGetBusinessSubscriptionQueryKey(subBusinessId),
        }),
        ...(updatedBusiness
          ? [
              queryClient.invalidateQueries({
                queryKey: getGetBusinessBySlugQueryKey(updatedBusiness.slug),
              }),
            ]
          : []),
      ]);
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
      name: form.name,
      slug: form.slug,
      type: form.type as BusinessType,
      description: form.description,
      address: form.address,
      phone: form.phone,
      active: form.active,
      featured: form.featured,
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
                        {biz.ownerId ? (
                          <> · Owner: {ownerLabelById.get(biz.ownerId) ?? "assigned"}</>
                        ) : (
                          <> · No owner</>
                        )}
                      </p>
                      <BusinessSubscriptionSummary businessId={biz.id} />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Change plan" onClick={() => void openChangePlan(biz.id)}>
                        <Layers className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Assign owner" onClick={() => openAssign(biz.id, biz.ownerId ?? null)} data-testid={`button-assign-owner-${biz.id}`}>
                        <UserPlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(biz)} data-testid={`button-edit-business-${biz.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <LoadingButton
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => openRemoveDialog(biz.id, biz.name)}
                        loading={deletingId === biz.id}
                        disabled={deleteBusiness.isPending}
                        title="Archive business"
                        aria-label="Archive business"
                        data-testid={`button-delete-business-${biz.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </LoadingButton>
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Address</label>
              <StreetAddressFields
                value={form.address}
                onChange={(address) => setForm((f) => ({ ...f, address }))}
                streetPlaceholder="123 Main St"
                data-testid="admin-business-address"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Platform controls</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Store hours, ordering, fulfillment, and payments are managed in Business Hub settings.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Switch
                    id="admin-business-active"
                    checked={form.active}
                    onCheckedChange={(v) => {
                      if (!v && form.active) {
                        setDeactivatePending(true);
                        return;
                      }
                      setForm((f) => ({ ...f, active: v }));
                    }}
                    aria-label="Business active"
                  />
                  <div>
                    <label htmlFor="admin-business-active" className="text-sm font-medium">Active</label>
                    <p className="text-xs text-muted-foreground">Visible and available on the marketplace.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Switch
                    id="admin-business-featured"
                    checked={form.featured}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                    aria-label="Business featured"
                  />
                  <div>
                    <label htmlFor="admin-business-featured" className="text-sm font-medium">Featured</label>
                    <p className="text-xs text-muted-foreground">Eligible for featured placement on the homepage.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <LoadingButton onClick={handleSubmit} disabled={!form.name.trim() || !form.slug.trim()} loading={isPending} loadingText="Saving…" data-testid="button-save-business">
              {editingId ? "Save" : "Create"}
            </LoadingButton>
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
            <p className="text-sm text-muted-foreground">
              Select a plan to assign to this business. Paid plans stay incomplete until the owner
              completes Stripe checkout; complimentary and beta plans unlock immediately.
            </p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Plan</label>
              <Select value={subPlanId} onValueChange={setSubPlanId}>
                <SelectTrigger disabled={subLoadingCurrent}>
                  <SelectValue placeholder={subLoadingCurrent ? "Loading current plan…" : "Choose a plan…"} />
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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Billing interval</label>
              <Select value={subBillingInterval} onValueChange={(v) => setSubBillingInterval(v as "monthly" | "yearly")}>
                <SelectTrigger disabled={subLoadingCurrent}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
            <LoadingButton onClick={() => void handleSavePlan()} disabled={!subPlanId || subLoadingCurrent} loading={subSaving} loadingText="Saving…">
              Assign Plan
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive business dialog */}
      <Dialog open={removeDialog != null} onOpenChange={(open) => !open && setRemoveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {removeDialog?.loading ? "Checking business…" : "Archive business?"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3 text-sm text-muted-foreground">
            {removeDialog?.loading ? (
              <p>Checking subscription status…</p>
            ) : removeDialog ? (
              archiveBusinessCopy(removeDialog.name, removeDialog.hadActiveSubscription).body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)} disabled={deleteBusiness.isPending}>
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={confirmRemoveBusiness}
              disabled={removeDialog?.loading}
              loading={deleteBusiness.isPending}
              loadingText="Archiving…"
            >
              Archive business
            </LoadingButton>
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
                {assignOwnerId ? null : <SelectItem value="__none">No owner</SelectItem>}
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <LoadingButton
              disabled={!assignOwnerId}
              loading={assignOwner.isPending}
              loadingText="Assigning…"
              onClick={() => assignBusinessId && assignOwner.mutate({ id: assignBusinessId, data: { ownerId: assignOwnerId } })}
              data-testid="button-confirm-assign-owner"
            >
              Assign
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deactivatePending}
        onOpenChange={setDeactivatePending}
        copy={deactivateBusinessCopy(form.name)}
        onConfirm={() => {
          setForm((f) => ({ ...f, active: false }));
          setDeactivatePending(false);
        }}
      />
    </AdminDashboardLayout>
  );
}
