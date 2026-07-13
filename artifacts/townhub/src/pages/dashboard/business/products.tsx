import { useMemo, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { ImageField } from "@/components/image-field";
import { ProductOptionsSection } from "@/components/product-options/product-options-section";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { deleteItemCopy } from "@/lib/confirm-action-copy";

interface ProductForm {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  available: boolean;
  prepTimeMinutes: string;
  taxable: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  available: true,
  prepTimeMinutes: "",
  taxable: true,
};

export default function BusinessProducts() {
  const { selectedBusinessId } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [modifierGroupIds, setModifierGroupIds] = useState<number[]>([]);
  const [specialPick, setSpecialPick] = useState("");
  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<number | null>(null);

  const { data: products, isLoading } = useListProducts(businessId, {
    query: { enabled: !!businessId, queryKey: getListProductsQueryKey(businessId) },
  });

  const { data: categories } = useListCategories(businessId, {
    query: { enabled: !!businessId, queryKey: getListCategoriesQueryKey(businessId) },
  });

  const specials = useMemo(
    () => (products ?? []).filter((product) => product.featured),
    [products],
  );
  const nonSpecials = useMemo(
    () => (products ?? []).filter((product) => !product.featured),
    [products],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(businessId) });

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => { invalidate(); setSheetOpen(false); toast({ title: "Item created" }); },
      onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
    },
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: (_data, vars) => {
        invalidate();
        if (vars.data.featured !== undefined && Object.keys(vars.data).length === 1) {
          toast({
            title: vars.data.featured ? "Added as special of the day" : "Removed from special of the day",
          });
          return;
        }
        if (vars.data.available !== undefined && Object.keys(vars.data).length === 1) {
          toast({
            title: vars.data.available ? "Marked available" : "Marked unavailable",
          });
          return;
        }
        setSheetOpen(false);
        toast({ title: "Item updated" });
      },
      onError: (_err, vars) => {
        invalidate();
        if (vars.data.available !== undefined && Object.keys(vars.data).length === 1) {
          toast({ title: "Couldn't update availability", variant: "destructive" });
          return;
        }
        toast({ title: "Failed to update item", variant: "destructive" });
      },
    },
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onMutate: (vars) => { setDeletingId(vars.id); setDeleteTarget(null); },
      onSettled: () => { setDeletingId(null); },
      onSuccess: () => { invalidate(); toast({ title: "Item deleted" }); },
      onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModifierGroupIds([]);
    setSheetOpen(true);
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
      prepTimeMinutes: p.prepTimeMinutes ? String(p.prepTimeMinutes) : "",
      taxable: p.taxable !== false,
    });
    setModifierGroupIds(p.modifierGroupIds ?? p.assignedModifierGroups?.map((g) => g.id) ?? []);
    setSheetOpen(true);
  }

  function buildPayload() {
    const existingFeatured =
      editingId != null
        ? (products?.find((product) => product.id === editingId)?.featured ?? false)
        : false;
    return {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      imageUrl: form.imageUrl || undefined,
      available: form.available,
      featured: existingFeatured,
      prepTimeMinutes: form.prepTimeMinutes ? parseInt(form.prepTimeMinutes) : undefined,
      taxable: form.taxable,
      modifierGroupIds,
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

  function setSpecial(productId: number, featured: boolean) {
    updateProduct.mutate({ businessId, id: productId, data: { featured } });
  }

  function setProductAvailable(productId: number, available: boolean) {
    if (togglingAvailabilityId === productId) return;
    setTogglingAvailabilityId(productId);
    queryClient.setQueryData(
      getListProductsQueryKey(businessId),
      (current: typeof products) =>
        current?.map((product) =>
          product.id === productId ? { ...product, available } : product,
        ),
    );
    updateProduct.mutate(
      { businessId, id: productId, data: { available } },
      {
        onSettled: () => {
          setTogglingAvailabilityId((current) => (current === productId ? null : current));
        },
      },
    );
  }

  function addSpecialFromPicker(value: string) {
    setSpecialPick("");
    const id = parseInt(value, 10);
    if (!Number.isFinite(id)) return;
    setSpecial(id, true);
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <BusinessDashboardLayout>
      <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl font-bold text-platform-heading">Items</h1>
            <p className="mt-1 text-muted-foreground">Manage what you offer on your storefront</p>
          </div>
          <Button onClick={openCreate} className="shrink-0 self-start sm:self-auto" data-testid="button-add-product">
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="font-serif text-xl text-platform-heading">Special of the day</CardTitle>
                <CardDescription>
                  Highlight one or more items at the top of your public storefront.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                {specials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No special selected yet. Pick an item below to feature it today.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {specials.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/5 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">${product.price.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-full"
                          onClick={() => setSpecial(product.id, false)}
                          disabled={updateProduct.isPending}
                          data-testid={`button-remove-special-${product.id}`}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {nonSpecials.length > 0 ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Add an item</label>
                    <Select value={specialPick || undefined} onValueChange={addSpecialFromPicker}>
                      <SelectTrigger data-testid="select-special-of-the-day">
                        <SelectValue placeholder="Choose an item…" />
                      </SelectTrigger>
                      <SelectContent>
                        {nonSpecials.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : products?.length ? (
                  <p className="text-xs text-muted-foreground">All items are already marked as the special.</p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="font-serif text-xl text-platform-heading">All items</CardTitle>
            <CardDescription>Your full catalog — edit availability, pricing, and details here.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !products?.length ? (
              <div className="py-16 text-center text-muted-foreground">
                <p className="font-serif text-lg">No items yet</p>
                <p className="mt-1 text-sm">Add your first item to start building your shop.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex min-w-0 items-start gap-3 px-4 py-3"
                    data-testid={`row-product-${product.id}`}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.description ?? "No description"}
                        {product.categoryId && categories && (
                          <> · {categories.find((c) => c.id === product.categoryId)?.name}</>
                        )}
                      </p>
                      {(!product.available ||
                        product.featured ||
                        (product.assignedModifierGroups?.length ?? 0) > 0) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {product.featured && (
                            <Badge className="shrink-0 bg-amber-500/15 text-xs text-amber-800 hover:bg-amber-500/15">
                              Special of the day
                            </Badge>
                          )}
                          {!product.available && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              Unavailable
                            </Badge>
                          )}
                          {(product.assignedModifierGroups?.length ?? 0) > 0 && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {product.assignedModifierGroups!.length} option group
                              {product.assignedModifierGroups!.length === 1 ? "" : "s"}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="whitespace-nowrap text-sm font-semibold text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`product-available-${product.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          {product.available ? "Available" : "Unavailable"}
                        </label>
                        <Switch
                          id={`product-available-${product.id}`}
                          checked={product.available}
                          disabled={togglingAvailabilityId === product.id}
                          onCheckedChange={(available) => setProductAvailable(product.id, available)}
                          data-testid={`switch-product-available-${product.id}`}
                          aria-label={`${product.name} availability`}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <LoadingButton
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                          loading={deletingId === product.id}
                          disabled={deleteProduct.isPending}
                          aria-label="Delete product"
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-6 pb-4 pt-[calc(1.5rem+var(--safe-area-top,0px))]">
              <SheetTitle className="font-serif text-2xl">
                {editingId ? "Edit Item" : "Add Item"}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-8 px-6 py-6">
              <section className="space-y-4">
                <h3 className="font-serif text-lg font-semibold">Details</h3>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Item name" data-testid="input-product-name" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe this item…" rows={3} data-testid="input-product-description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Price ($) *</label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" data-testid="input-product-price" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Prep Time (min)</label>
                    <Input type="number" value={form.prepTimeMinutes} onChange={(e) => setForm((f) => ({ ...f, prepTimeMinutes: e.target.value }))} placeholder="15" data-testid="input-product-prep-time" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Category</label>
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
                  businessId={businessId > 0 ? businessId : undefined}
                />
                <div className="space-y-1.5 rounded-2xl bg-muted/35 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Available for ordering</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        Turn this off when the item is temporarily sold out or unavailable.
                      </p>
                    </div>
                    <Switch
                      checked={form.available}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))}
                      data-testid="switch-product-available"
                      aria-label="Available for ordering"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.available ? "Available" : "Unavailable"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.taxable} onCheckedChange={(v) => setForm((f) => ({ ...f, taxable: v }))} data-testid="switch-product-taxable" />
                  <label className="text-sm font-medium">Charge sales tax on this item</label>
                </div>
              </section>

              <ProductOptionsSection
                businessId={businessId}
                assignedIds={modifierGroupIds}
                onChange={setModifierGroupIds}
              />
            </div>

            <SheetFooter className="mt-auto gap-2 border-t px-6 py-4 sm:gap-0">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <LoadingButton onClick={handleSubmit} disabled={!form.name.trim() || !form.price} loading={isPending} loadingText="Saving…" data-testid="button-save-product">
                {editingId ? "Save Changes" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        copy={deleteTarget ? deleteItemCopy(deleteTarget.name) : null}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProduct.mutate({ businessId, id: deleteTarget.id });
        }}
        loading={deleteProduct.isPending}
        loadingText="Deleting…"
      />
    </BusinessDashboardLayout>
  );
}
