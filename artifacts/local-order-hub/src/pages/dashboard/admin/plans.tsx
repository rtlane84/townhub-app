import { useState } from "react";
import {
  useListSubscriptionPlans,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
  getListSubscriptionPlansQueryKey,
} from "@workspace/api-client-react";
import type { SubscriptionPlan, SubscriptionPlanInput } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Layers, CheckCircle2 } from "lucide-react";

const BLANK: SubscriptionPlanInput = {
  name: "",
  description: "",
  monthlyPrice: 0,
  setupFee: undefined,
  transactionFeePercent: undefined,
  trialDays: 0,
  isActive: true,
  isDefault: false,
};

export default function AdminPlans() {
  const { data: plans = [], isLoading } = useListSubscriptionPlans({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<SubscriptionPlanInput>({ ...BLANK });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSubscriptionPlansQueryKey() });

  const createPlan = useCreateSubscriptionPlan({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Plan created" }); setOpen(false); },
      onError: () => toast({ title: "Failed to create plan", variant: "destructive" }),
    },
  });

  const updatePlan = useUpdateSubscriptionPlan({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Plan updated" }); setOpen(false); },
      onError: () => toast({ title: "Failed to update plan", variant: "destructive" }),
    },
  });

  const deletePlan = useDeleteSubscriptionPlan({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Plan deleted" }); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete plan", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK });
    setOpen(true);
  }

  function openEdit(p: SubscriptionPlan) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      monthlyPrice: p.monthlyPrice,
      setupFee: p.setupFee ?? undefined,
      transactionFeePercent: p.transactionFeePercent ?? undefined,
      trialDays: p.trialDays,
      isActive: p.isActive,
      isDefault: p.isDefault,
    });
    setOpen(true);
  }

  function handleSave() {
    if (editing) {
      updatePlan.mutate({ id: editing.id, data: form });
    } else {
      createPlan.mutate({ data: form });
    }
  }

  function numField(key: keyof SubscriptionPlanInput, value: number | undefined) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
      setForm((prev) => ({ ...prev, [key]: v }));
    };
  }

  const pending = createPlan.isPending || updatePlan.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Subscription Plans</h1>
            <p className="text-muted-foreground mt-1">Manage billing plans for businesses on the platform</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Plan
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-3 p-8 text-center text-muted-foreground">Loading…</div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No plans yet. Add a plan to start managing business subscriptions.</p>
            </div>
          ) : (
            plans.map((p) => (
              <Card key={p.id} className="relative">
                <CardContent className="pt-6 pb-5 px-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        {p.isDefault && (
                          <Badge className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Default
                          </Badge>
                        )}
                      </div>
                      {!p.isActive && <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-primary mb-1">
                    {p.monthlyPrice === 0
                      ? <span>Free</span>
                      : <>{`$${p.monthlyPrice.toFixed(2)}`}<span className="text-base font-normal text-muted-foreground">/mo</span></>
                    }
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {p.trialDays > 0 && <div>✓ {p.trialDays}-day free trial</div>}
                    {p.setupFee != null && p.setupFee > 0 && <div>· ${p.setupFee.toFixed(2)} setup fee</div>}
                    {p.transactionFeePercent != null && p.transactionFeePercent > 0 && (
                      <div>· {(p.transactionFeePercent * 100).toFixed(1)}% transaction fee</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Plan Name *</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Starter" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Monthly Price ($) *</label>
                <Input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(e) => setForm((p) => ({ ...p, monthlyPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Setup Fee ($)</label>
                <Input type="number" min="0" step="0.01" value={form.setupFee ?? ""} onChange={numField("setupFee", form.setupFee)} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Transaction Fee (%)</label>
                <Input type="number" min="0" max="100" step="0.01" value={form.transactionFeePercent != null ? String(form.transactionFeePercent) : ""} onChange={numField("transactionFeePercent", form.transactionFeePercent)} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Trial Days</label>
                <Input type="number" min="0" value={form.trialDays} onChange={(e) => setForm((p) => ({ ...p, trialDays: parseInt(e.target.value, 10) || 0 }))} />
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Default plan for new businesses</label>
              <Switch checked={!!form.isDefault} onCheckedChange={(v) => setForm((p) => ({ ...p, isDefault: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={pending || !form.name}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this plan?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Businesses on this plan will lose their subscription association.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId !== null && deletePlan.mutate({ id: deleteId })} disabled={deletePlan.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
