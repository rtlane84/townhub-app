import { useState } from "react";
import {
  useListModifierGroups,
  getListModifierGroupsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { selectionTypeLabel } from "@/lib/format-option-price";

interface ProductOptionsSectionProps {
  businessId: number;
  assignedIds: number[];
  onChange: (ids: number[]) => void;
}

export function ProductOptionsSection({
  businessId,
  assignedIds,
  onChange,
}: ProductOptionsSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>([]);

  const { data: allGroups } = useListModifierGroups(businessId, {
    query: { enabled: !!businessId, queryKey: getListModifierGroupsQueryKey(businessId) },
  });

  const assignedGroups = (allGroups ?? []).filter((g) => assignedIds.includes(g.id));

  function openPicker() {
    setDraftIds(assignedIds);
    setPickerOpen(true);
  }

  function toggleDraft(id: number, checked: boolean) {
    setDraftIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));
  }

  function applyPicker() {
    onChange(draftIds);
    setPickerOpen(false);
  }

  function removeAssigned(id: number) {
    onChange(assignedIds.filter((v) => v !== id));
  }

  return (
    <section className="space-y-4 rounded-xl border bg-muted/10 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">Product Options</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Attach option groups customers can pick when ordering this item.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={openPicker} data-testid="button-assign-option-group">
          <Plus className="h-3.5 w-3.5 mr-1" /> Attach options
        </Button>
      </div>

      {assignedGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No options attached yet.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Create groups on the{" "}
            <Link href="/dashboard/business/product-options" className="text-primary underline-offset-2 hover:underline">
              Product Options
            </Link>{" "}
            page, then attach them here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {assignedGroups.map((group) => (
            <li
              key={group.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-background px-3 py-3"
              data-testid={`assigned-option-group-${group.id}`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{group.name}</span>
                  <Badge variant={group.required ? "default" : "secondary"} className="text-[10px]">
                    {group.required ? "Required" : "Optional"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  {selectionTypeLabel(group.selectionType)} · {group.choices.length} choice{group.choices.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAssigned(group.id)}
                aria-label={`Remove ${group.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">Attach product options</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 py-4">
            {!allGroups?.length ? (
              <p className="text-sm text-muted-foreground">
                No option groups yet.{" "}
                <Link href="/dashboard/business/product-options" className="text-primary underline-offset-2 hover:underline">
                  Create your first group
                </Link>
                .
              </p>
            ) : (
              allGroups.map((group) => {
                const checked = draftIds.includes(group.id);
                return (
                  <label
                    key={group.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      checked ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleDraft(group.id, v === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.required ? "Required" : "Optional"} · {selectionTypeLabel(group.selectionType)}
                        {" · "}
                        {group.choices.length} choice{group.choices.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancel</Button>
            <Button onClick={applyPicker}>Save attachments</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
