import { useMemo, useState } from "react";
import type { Product, ProductOptionGroup } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type SelectedCartOption = {
  optionId: number;
  groupName: string;
  optionName: string;
  priceAdjustment: number;
};

interface ProductOptionsDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    selectedOptionIds: number[];
    selectedOptions: SelectedCartOption[];
    unitPrice: number;
  }) => void | Promise<void>;
  loading?: boolean;
}

function formatAdjustment(amount: number) {
  if (amount === 0) return "";
  const sign = amount > 0 ? "+" : "";
  return ` (${sign}$${amount.toFixed(2)})`;
}

function groupAllowsMultiple(group: ProductOptionGroup) {
  return (group.maxSelections ?? 1) > 1;
}

export function ProductOptionsDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: ProductOptionsDialogProps) {
  const groups = product?.optionGroups ?? [];
  const [selectedByGroup, setSelectedByGroup] = useState<Record<number, number[]>>({});

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    let total = product.price;
    for (const group of groups) {
      for (const id of selectedByGroup[group.id] ?? []) {
        const opt = group.options.find((o) => o.id === id);
        if (opt) total += opt.priceAdjustment;
      }
    }
    return total;
  }, [product, groups, selectedByGroup]);

  function resetSelections() {
    setSelectedByGroup({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetSelections();
    onOpenChange(next);
  }

  function toggleOption(group: ProductOptionGroup, optionId: number, checked: boolean) {
    setSelectedByGroup((prev) => {
      const current = prev[group.id] ?? [];
      if (groupAllowsMultiple(group)) {
        const next = checked
          ? [...current, optionId]
          : current.filter((id) => id !== optionId);
        if (next.length > (group.maxSelections ?? 1)) return prev;
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: checked ? [optionId] : [] };
    });
  }

  function validate(): string | null {
    for (const group of groups) {
      const selected = (selectedByGroup[group.id] ?? []).filter((id) =>
        group.options.some((o) => o.id === id && o.available),
      );
      const min = group.required ? Math.max(group.minSelections ?? 1, 1) : (group.minSelections ?? 0);
      if (group.required && selected.length === 0) {
        return `Please choose an option for ${group.name}`;
      }
      if (selected.length < min) {
        return `Choose at least ${min} option(s) for ${group.name}`;
      }
      if (selected.length > (group.maxSelections ?? 1)) {
        return `Choose at most ${group.maxSelections} option(s) for ${group.name}`;
      }
    }
    return null;
  }

  async function handleConfirm() {
    if (!product) return;
    const error = validate();
    if (error) {
      window.alert(error);
      return;
    }

    const selectedOptionIds: number[] = [];
    const selectedOptions: SelectedCartOption[] = [];
    for (const group of groups) {
      for (const id of selectedByGroup[group.id] ?? []) {
        const opt = group.options.find((o) => o.id === id);
        if (!opt?.available) continue;
        selectedOptionIds.push(id);
        selectedOptions.push({
          optionId: id,
          groupName: group.name,
          optionName: opt.name,
          priceAdjustment: opt.priceAdjustment,
        });
      }
    }

    await onConfirm({ selectedOptionIds, selectedOptions, unitPrice });
    resetSelections();
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Base price ${product.price.toFixed(2)} · Total ${unitPrice.toFixed(2)}
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {groups.map((group) => {
            const multiple = groupAllowsMultiple(group);
            const selected = selectedByGroup[group.id] ?? [];
            const availableOptions = group.options.filter((o) => o.available);

            return (
              <div key={group.id} className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">
                    {group.name}
                    {group.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {multiple
                      ? `Choose up to ${group.maxSelections}`
                      : "Choose one"}
                  </p>
                </div>

                {multiple ? (
                  <div className="space-y-2">
                    {availableOptions.map((opt) => {
                      const checked = selected.includes(opt.id);
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggleOption(group, opt.id, v === true)}
                          />
                          <span className="text-sm flex-1">
                            {opt.name}
                            {formatAdjustment(opt.priceAdjustment)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <RadioGroup
                    value={selected[0] ? String(selected[0]) : ""}
                    onValueChange={(v) => toggleOption(group, parseInt(v, 10), true)}
                    className="space-y-2"
                  >
                    {availableOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          selected.includes(opt.id) ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <RadioGroupItem value={String(opt.id)} id={`opt-${group.id}-${opt.id}`} />
                        <span className="text-sm flex-1">
                          {opt.name}
                          {formatAdjustment(opt.priceAdjustment)}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={loading} loadingText="Adding…" onClick={() => void handleConfirm()}>
            Add to cart · ${unitPrice.toFixed(2)}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildCartLineKey(productId: number, selectedOptionIds: number[]) {
  if (selectedOptionIds.length === 0) return String(productId);
  return `${productId}:${[...selectedOptionIds].sort((a, b) => a - b).join("-")}`;
}

export { buildCartLineKey };
