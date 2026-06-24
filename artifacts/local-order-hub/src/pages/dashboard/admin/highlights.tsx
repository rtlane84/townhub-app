import { useState } from "react";
import {
  useListHighlights,
  useCreateHighlight,
  useUpdateHighlight,
  useDeleteHighlight,
  getListHighlightsQueryKey,
} from "@workspace/api-client-react";
import type { Highlight, HighlightInput } from "@workspace/api-client-react";
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
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";

const BLANK: HighlightInput = {
  title: "",
  description: "",
  imageUrl: "",
  startDate: "",
  endDate: "",
  buttonText: "",
  buttonUrl: "",
  active: true,
  sortOrder: 0,
};

export default function AdminHighlights() {
  const today = new Date().toISOString().slice(0, 10);
  // Fetch all highlights including inactive — use the public route but show all in admin view
  const { data: highlights = [], isLoading } = useListHighlights({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [form, setForm] = useState<HighlightInput>({ ...BLANK, startDate: today, endDate: today });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListHighlightsQueryKey() });

  const createHighlight = useCreateHighlight({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Highlight created" }); setOpen(false); },
      onError: () => toast({ title: "Failed to create highlight", variant: "destructive" }),
    },
  });

  const updateHighlight = useUpdateHighlight({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Highlight updated" }); setOpen(false); },
      onError: () => toast({ title: "Failed to update highlight", variant: "destructive" }),
    },
  });

  const deleteHighlight = useDeleteHighlight({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Highlight deleted" }); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete highlight", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...BLANK, startDate: today, endDate: today });
    setOpen(true);
  }

  function openEdit(h: Highlight) {
    setEditing(h);
    setForm({
      title: h.title,
      description: h.description ?? "",
      imageUrl: h.imageUrl ?? "",
      startDate: h.startDate,
      endDate: h.endDate,
      buttonText: h.buttonText ?? "",
      buttonUrl: h.buttonUrl ?? "",
      active: h.active,
      sortOrder: h.sortOrder,
    });
    setOpen(true);
  }

  function handleSave() {
    const data: HighlightInput = {
      ...form,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      buttonText: form.buttonText || undefined,
      buttonUrl: form.buttonUrl || undefined,
    };
    if (editing) {
      updateHighlight.mutate({ id: editing.id, data });
    } else {
      createHighlight.mutate({ data });
    }
  }

  function f(key: keyof HighlightInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: key === "sortOrder" ? parseInt(e.target.value, 10) || 0 : e.target.value }));
  }

  const pending = createHighlight.isPending || updateHighlight.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Highlights</h1>
            <p className="text-muted-foreground mt-1">Seasonal promotions and featured content on the homepage</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Highlight
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : highlights.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No highlights yet. Create one to appear on the homepage.</p>
              </div>
            ) : (
              <div className="divide-y">
                {highlights.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{h.title}</span>
                        {!h.active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {h.startDate} → {h.endDate}
                        {h.buttonText ? ` · "${h.buttonText}"` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Highlight" : "Add Highlight"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={f("title")} placeholder="Spring Collection is Here!" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={f("description")} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Image URL</label>
              <Input value={form.imageUrl} onChange={f("imageUrl")} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Start Date *</label>
                <Input type="date" value={form.startDate} onChange={f("startDate")} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">End Date *</label>
                <Input type="date" value={form.endDate} onChange={f("endDate")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Button Label</label>
                <Input value={form.buttonText} onChange={f("buttonText")} placeholder="Shop Now" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Button URL</label>
                <Input value={form.buttonUrl} onChange={f("buttonUrl")} placeholder="/businesses" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
              <Input type="number" value={String(form.sortOrder)} onChange={f("sortOrder")} placeholder="0" />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium">Active</label>
              <Switch checked={!!form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={pending || !form.title || !form.startDate || !form.endDate}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this highlight?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId !== null && deleteHighlight.mutate({ id: deleteId })} disabled={deleteHighlight.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}
