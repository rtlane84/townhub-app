import { useState } from "react";
import {
  useListModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  getListModifierGroupsQueryKey,
  type ModifierGroup,
} from "@workspace/api-client-react";
import { BusinessDashboardLayout } from "@/components/dashboard-layout";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ProductOptionGroupCard } from "@/components/product-options/product-option-group-card";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { deleteItemOptionGroupCopy } from "@/lib/confirm-action-copy";
import {
  ProductOptionGroupSheet,
  EMPTY_GROUP_FORM,
  emptyChoice,
  formToPayload,
  newClientKey,
  type GroupForm,
} from "@/components/product-options/product-option-group-sheet";

function groupToForm(group: ModifierGroup): GroupForm {
  return {
    name: group.name,
    description: group.description ?? "",
    selectionType: group.selectionType,
    required: group.required,
    maxSelections: String(group.maxSelections ?? 3),
    active: group.active,
    sortOrder: String(group.sortOrder ?? 0),
    choices: group.choices.map((c) => ({
      clientKey: newClientKey(),
      name: c.name,
      priceAdjustment: String(c.priceAdjustment),
      active: c.active,
    })),
  };
}

export default function BusinessProductOptions() {
  const { selectedBusinessId } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GroupForm>(EMPTY_GROUP_FORM);

  const { data: groups, isLoading } = useListModifierGroups(businessId, {
    query: { enabled: !!businessId, queryKey: getListModifierGroupsQueryKey(businessId) },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListModifierGroupsQueryKey(businessId) });

  const createGroup = useCreateModifierGroup({
    mutation: {
      onSuccess: () => {
        invalidate();
        setSheetOpen(false);
        toast({ title: "Option group created" });
      },
      onError: () => toast({ title: "Failed to create option group", variant: "destructive" }),
    },
  });

  const updateGroup = useUpdateModifierGroup({
    mutation: {
      onSuccess: () => {
        invalidate();
        setSheetOpen(false);
        setSavingId(null);
        toast({ title: "Option group updated" });
      },
      onError: () => {
        setSavingId(null);
        toast({ title: "Failed to update option group", variant: "destructive" });
      },
    },
  });

  const deleteGroup = useDeleteModifierGroup({
    mutation: {
      onMutate: (vars) => { setDeletingId(vars.id); setDeleteTarget(null); },
      onSettled: () => { setDeletingId(null); },
      onSuccess: () => { invalidate(); toast({ title: "Option group deleted" }); },
      onError: () => toast({ title: "Failed to delete option group", variant: "destructive" }),
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_GROUP_FORM,
      choices: [emptyChoice()],
      sortOrder: String((groups?.length ?? 0) + 1),
    });
    setSheetOpen(true);
  }

  function openEdit(group: ModifierGroup) {
    setEditingId(group.id);
    setForm(groupToForm(group));
    setSheetOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || form.choices.every((c) => !c.name.trim())) return;
    const payload = formToPayload(form);
    if (editingId) {
      updateGroup.mutate({ businessId, id: editingId, data: payload });
    } else {
      createGroup.mutate({ businessId, data: payload });
    }
  }

  function handleAddChoice(group: ModifierGroup, name: string, priceAdjustment: number) {
    setSavingId(group.id);
    updateGroup.mutate({
      businessId,
      id: group.id,
      data: {
        choices: [
          ...group.choices.map((c, i) => ({
            name: c.name,
            priceAdjustment: c.priceAdjustment,
            active: c.active,
            sortOrder: i,
          })),
          { name, priceAdjustment, active: true, sortOrder: group.choices.length },
        ],
      },
    });
  }

  const isPending = createGroup.isPending || updateGroup.isPending;

  return (
    <BusinessDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">Item Options</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              Create reusable option groups — sizes, add-ons, customizations — then attach them to items.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0" data-testid="button-add-option-group">
            <Plus className="h-4 w-4 mr-2" /> New Group
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : !groups?.length ? (
          <div className="text-center py-20 rounded-xl border border-dashed bg-muted/20">
            <p className="font-serif text-xl font-semibold">No option groups yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Start with common groups like Size or Add-ons. You can reuse them across many items.
            </p>
            <Button onClick={openCreate} className="mt-6">
              <Plus className="h-4 w-4 mr-2" /> Create your first group
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {groups.map((group) => (
              <ProductOptionGroupCard
                key={group.id}
                group={group}
                deleting={deletingId === group.id}
                saving={savingId === group.id && updateGroup.isPending}
                onEdit={() => openEdit(group)}
                onDelete={() => setDeleteTarget({ id: group.id, name: group.name })}
                onAddChoice={(name, priceAdjustment) => handleAddChoice(group, name, priceAdjustment)}
              />
            ))}
          </div>
        )}
      </div>

      <ProductOptionGroupSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingId ? "Edit option group" : "New option group"}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        pending={isPending}
      />

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        copy={deleteTarget ? deleteItemOptionGroupCopy(deleteTarget.name) : null}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteGroup.mutate({ businessId, id: deleteTarget.id });
        }}
        loading={deleteGroup.isPending}
        loadingText="Deleting…"
      />
    </BusinessDashboardLayout>
  );
}
