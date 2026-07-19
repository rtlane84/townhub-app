import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateHighlight,
  useUpdateHighlight,
  useDeleteHighlight,
  getListHighlightsQueryKey,
} from "@workspace/api-client-react";
import type { Highlight, HighlightInput } from "@workspace/api-client-react";
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
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { ImageField } from "@/components/image-field";
import { resolveApiUrl } from "@/lib/api-base-url";
import { usePlatformBranding } from "@/components/theme-provider";
import { formatCivilDateInTimeZone } from "@workspace/api-zod";

const ADMIN_HIGHLIGHTS_KEY = ["admin", "highlights"];

type HighlightFormState = {
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  buttonText: string;
  buttonUrl: string;
  active: boolean;
  sortOrder: number;
};

const BLANK: HighlightFormState = {
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

function useAdminHighlights(getToken: () => Promise<string | null>) {
  return useQuery<Highlight[]>({
    queryKey: ADMIN_HIGHLIGHTS_KEY,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(resolveApiUrl("/api/admin/highlights"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load highlights");
      return res.json() as Promise<Highlight[]>;
    },
  });
}

export default function AdminHighlights() {
  const { timezone } = usePlatformBranding();
  const today = formatCivilDateInTimeZone(new Date(), timezone);
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: highlights = [], isLoading } = useAdminHighlights(getToken);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [form, setForm] = useState<HighlightFormState>({ ...BLANK, startDate: today, endDate: today });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ADMIN_HIGHLIGHTS_KEY });
    void queryClient.invalidateQueries({ queryKey: getListHighlightsQueryKey() });
  }

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
    // Send null (not undefined) so partial updates actually clear nullable fields.
    const clearable = (value: string | undefined | null) => {
      const trimmed = (value ?? "").trim();
      return trimmed.length > 0 ? trimmed : null;
    };
    const data: HighlightInput = {
      ...form,
      title: form.title.trim(),
      description: clearable(form.description),
      imageUrl: clearable(form.imageUrl),
      buttonText: clearable(form.buttonText),
      buttonUrl: clearable(form.buttonUrl),
    };
    if (editing) {
      updateHighlight.mutate({ id: editing.id, data });
    } else {
      createHighlight.mutate({ data });
    }
  }

  function f(key: keyof HighlightFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: key === "sortOrder" ? parseInt(e.target.value, 10) || 0 : e.target.value }));
  }

  const pending = createHighlight.isPending || updateHighlight.isPending;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Spotlight</h1>
            <p className="text-muted-foreground mt-1">
              Optional homepage promos, announcements, and important community content. Only shown when live — leave empty if your town doesn&apos;t need it.
            </p>
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
                <p>No spotlights yet. Create one when you have a promo or announcement to feature.</p>
              </div>
            ) : (
              <div className="divide-y">
                {highlights.map((h) => {
                  const isLive = h.active && h.startDate <= today && h.endDate >= today;
                  return (
                    <div key={h.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium">{h.title}</span>
                          {isLive && <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Live</Badge>}
                          {!h.active && <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                          {h.active && !isLive && (
                            <Badge variant="outline" className="text-amber-700 border-amber-200">
                              {h.endDate < today ? "Expired" : "Scheduled"}
                            </Badge>
                          )}
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Spotlight" : "Add Spotlight"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={f("title")} placeholder="Mother’s Day preorders open" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description ?? ""} onChange={f("description")} rows={2} />
            </div>
            <ImageField
              surface="highlight"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
              testId="highlight-image"
            />
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
                <Input value={form.buttonText ?? ""} onChange={f("buttonText")} placeholder="Shop Now" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Button URL</label>
                <Input value={form.buttonUrl ?? ""} onChange={f("buttonUrl")} placeholder="/businesses" />
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
            <LoadingButton onClick={handleSave} disabled={!form.title || !form.startDate || !form.endDate} loading={pending} loadingText="Saving…">
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this highlight?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <LoadingButton
              variant="destructive"
              onClick={() => deleteId !== null && deleteHighlight.mutate({ id: deleteId })}
              loading={deleteHighlight.isPending}
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
