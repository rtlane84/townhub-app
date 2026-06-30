import { useState } from "react";
import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { ImageField } from "@/components/image-field";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  available: boolean;
  featured: boolean;
  prepTimeMinutes: string;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  available: true,
  featured: false,
  prepTimeMinutes: "",
};

export default function BusinessProducts() {
  const { selectedBusinessId } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const { data: products, isLoading } = useListProducts(businessId, {
    query: { enabled: !!businessId, queryKey: getListProductsQueryKey(businessId) },
  });

  const { data: categories } = useListCategories(businessId, {
    query: { enabled: !!businessId, queryKey: getListCategoriesQueryKey(businessId) },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(businessId) });

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Product created" }); },
      onError: () => toast({ title: "Failed to create product", variant: "destructive" }),
    },
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Product updated" }); },
      onError: () => toast({ title: "Failed to update product", variant: "destructive" }),
    },
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onMutate: (vars) => { setDeletingId(vars.id); },
      onSettled: () => { setDeletingId(null); },
      onSuccess: () => { invalidate(); toast({ title: "Product deleted" }); },
      onError: () => toast({ title: "Failed to delete product", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: NonNullable<typeof products>[0]) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      categoryId: p.categoryId ? String(p.categoryId) : "",
      imageUrl: p.imageUrl ?? "",
      available: p.available ?? true,
      featured: p.featured ?? false,
      prepTimeMinutes: p.prepTimeMinutes ? String(p.prepTimeMinutes) : "",
    });
    setDialogOpen(true);
  }

  function buildPayload() {
    return {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      imageUrl: form.imageUrl || undefined,
      available: form.available,
      featured: form.featured,
      prepTimeMinutes: form.prepTimeMinutes ? parseInt(form.prepTimeMinutes) : undefined,
    };
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.price) return;
    if (editingId) {
      updateProduct.mutate({ businessId, id: editingId, data: buildPayload() });
    } else {
      createProduct.mutate({ businessId, data: buildPayload() });
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">Manage what you offer</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !products?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-serif text-lg">No products yet</p>
                <p className="text-sm mt-1">Add your first product to start taking orders.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 px-4 py-3" data-testid={`row-product-${product.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.featured && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        {!product.available && (
                          <Badge variant="secondary" className="text-xs shrink-0">Unavailable</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.description ?? "No description"}
                        {product.categoryId && categories && (
                          <> · {categories.find((c) => c.id === product.categoryId)?.name}</>
                        )}
                      </p>
                    </div>
                    <span className="font-semibold text-primary shrink-0">${product.price.toFixed(2)}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <LoadingButton
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteProduct.mutate({ businessId, id: product.id })}
                        loading={deletingId === product.id}
                        disabled={deleteProduct.isPending}
                        aria-label="Delete product"
                        data-testid={`button-delete-product-${product.id}`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Product name" data-testid="input-product-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe this product…" rows={2} data-testid="input-product-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Price ($) *</label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" data-testid="input-product-price" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Prep Time (min)</label>
                <Input type="number" value={form.prepTimeMinutes} onChange={(e) => setForm((f) => ({ ...f, prepTimeMinutes: e.target.value }))} placeholder="15" data-testid="input-product-prep-time" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Category</label>
              <Select value={form.categoryId || "__none"} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "__none" ? "" : v }))}>
                <SelectTrigger data-testid="select-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No category</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ImageField
              surface="product"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
              testId="product-image"
            />
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.available} onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))} data-testid="switch-product-available" />
                <label className="text-sm font-medium">Available</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} data-testid="switch-product-featured" />
                <label className="text-sm font-medium">Featured</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <LoadingButton onClick={handleSubmit} disabled={!form.name.trim() || !form.price} loading={isPending} loadingText="Saving…" data-testid="button-save-product">
              {editingId ? "Save Changes" : "Create"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BusinessDashboardLayout>
  );
}
