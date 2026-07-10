import { useState } from "react";
import {
  useListSubscriptionFeatures,
  useCreateSubscriptionFeature,
  useUpdateSubscriptionFeature,
  useDeleteSubscriptionFeature,
  getListSubscriptionFeaturesQueryKey,
} from "@workspace/api-client-react";
import type { SubscriptionFeature, SubscriptionFeatureInput } from "@workspace/api-client-react";
import { AdminDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";

const BLANK: SubscriptionFeatureInput = {
  key: "",
  name: "",
  description: "",
  category: "",
  sortOrder: 0,
  isActive: true,
};

export default function AdminFeatures() {
  const { data: features = [], isLoading } = useListSubscriptionFeatures({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionFeature | null>(null);
  const [form, setForm] = useState<SubscriptionFeatureInput>({ ...BLANK });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListSubscriptionFeaturesQueryKey() });

  const createFeature = useCreateSubscriptionFeature({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Feature created" }); setOpen(false); },
      onError: () => toast({ title: "Failed to create feature", variant: "destructive" }),
    },
  });

  const updateFeature = useUpdateSubscriptionFeature({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Feature updated" }); setOpen(false); },
      onError: () => toast({ title: "Failed to update feature", variant: "destructive" }),
    },
  });

  const deleteFeature = useDeleteSubscriptionFeature({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Feature deleted" }); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete feature", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK });
    setOpen(true);
  }

  function openEdit(feature: SubscriptionFeature) {
    setEditing(feature);
    setForm({
      key: feature.key,
      name: feature.name,
      description: feature.description ?? "",
      category: feature.category ?? "",
      sortOrder: feature.sortOrder,
      isActive: feature.isActive,
    });
    setOpen(true);
  }

  function handleSave() {
    if (editing) {
      updateFeature.mutate({ id: editing.id, data: form });
    } else {
      createFeature.mutate({ data: form });
    }
  }

  const pending = createFeature.isPending || updateFeature.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif text-3xl font-bold">Subscription Features</h1>
            <p className="text-muted-foreground mt-1">
              Manage the feature catalog assigned to plans — no code changes required
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Feature
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-2 p-8 text-center text-muted-foreground">Loading…</div>
          ) : features.length === 0 ? (
            <div className="col-span-2 p-12 text-center text-muted-foreground border border-dashed rounded-xl">
              <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No features yet. Add capabilities that plans can enable.</p>
            </div>
          ) : (
            features.map((feature) => (
              <Card key={feature.id}>
                <CardContent className="pt-6 pb-5 px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold">{feature.name}</h3>
                        {!feature.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{feature.key}</p>
                      {feature.category && (
                        <Badge variant="secondary" className="mt-2 text-xs">{feature.category}</Badge>
                      )}
                      {feature.description && (
                        <p className="text-sm text-muted-foreground mt-2">{feature.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(feature)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(feature.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
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
            <DialogTitle>{editing ? "Edit Feature" : "Add Feature"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Key *</label>
              <Input
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                placeholder="online_ordering"
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, and underscores only.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Display name *</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <Input value={form.category ?? ""} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sort order</label>
                <Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={!!form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <LoadingButton onClick={handleSave} disabled={!form.key || !form.name} loading={pending} loadingText="Saving…">
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this feature?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">It will be removed from all plan mappings.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <LoadingButton
              variant="destructive"
              onClick={() => deleteId !== null && deleteFeature.mutate({ id: deleteId })}
              loading={deleteFeature.isPending}
              loadingText="Deleting…"
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
