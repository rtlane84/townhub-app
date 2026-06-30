import { useState } from "react";
import {
  useGetMe,
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

interface CategoryForm {
  name: string;
  sortOrder: number;
}

export default function BusinessCategories() {
  const { data: me } = useGetMe();
  const businessId = me?.businessId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>({ name: "", sortOrder: 0 });

  const { data: categories, isLoading } = useListCategories(businessId, {
    query: { enabled: !!businessId, queryKey: getListCategoriesQueryKey(businessId) },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(businessId) });

  const createCategory = useCreateCategory({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Category created" }); },
      onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
    },
  });

  const updateCategory = useUpdateCategory({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Category updated" }); },
      onError: () => toast({ title: "Failed to update category", variant: "destructive" }),
    },
  });

  const deleteCategory = useDeleteCategory({
    mutation: {
      onMutate: (vars) => { setDeletingId(vars.id); },
      onSettled: () => { setDeletingId(null); },
      onSuccess: () => { invalidate(); toast({ title: "Category deleted" }); },
      onError: () => toast({ title: "Failed to delete category", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", sortOrder: (categories?.length ?? 0) + 1 });
    setDialogOpen(true);
  }

  function openEdit(cat: NonNullable<typeof categories>[0]) {
    setEditingId(cat.id);
    setForm({ name: cat.name, sortOrder: cat.sortOrder ?? 0 });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateCategory.mutate({ businessId, id: editingId, data: form });
    } else {
      createCategory.mutate({ businessId, data: form });
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground mt-1">Organize your products into categories</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !categories?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-serif text-lg">No categories yet</p>
                <p className="text-sm mt-1">Add a category to organize your products.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-category-${cat.id}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">Sort order: {cat.sortOrder}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)} data-testid={`button-edit-category-${cat.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <LoadingButton
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteCategory.mutate({ businessId, id: cat.id })}
                        loading={deletingId === cat.id}
                        disabled={deleteCategory.isPending}
                        aria-label="Delete category"
                        data-testid={`button-delete-category-${cat.id}`}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Bouquets"
                data-testid="input-category-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                data-testid="input-category-sort-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <LoadingButton onClick={handleSubmit} disabled={!form.name.trim()} loading={isPending} loadingText="Saving…" data-testid="button-save-category">
              {editingId ? "Save Changes" : "Create"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessDashboardLayout>
  );
}
