import type { ModifierGroupInput, ModifierSelectionType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus, Trash2 } from "lucide-react";

export type ChoiceForm = {
  clientKey: string;
  name: string;
  priceAdjustment: string;
  active: boolean;
};

export type GroupForm = {
  name: string;
  description: string;
  selectionType: ModifierSelectionType;
  required: boolean;
  maxSelections: string;
  active: boolean;
  sortOrder: string;
  choices: ChoiceForm[];
};

let nextKey = 0;
export function newClientKey() {
  nextKey += 1;
  return `k-${nextKey}`;
}

export function emptyChoice(): ChoiceForm {
  return { clientKey: newClientKey(), name: "", priceAdjustment: "0", active: true };
}

export const EMPTY_GROUP_FORM: GroupForm = {
  name: "",
  description: "",
  selectionType: "SINGLE",
  required: false,
  maxSelections: "3",
  active: true,
  sortOrder: "0",
  choices: [emptyChoice()],
};

export function formToPayload(form: GroupForm): ModifierGroupInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    selectionType: form.selectionType,
    required: form.required,
    maxSelections:
      form.selectionType === "MULTIPLE"
        ? Math.max(parseInt(form.maxSelections, 10) || 1, 1)
        : undefined,
    active: form.active,
    sortOrder: parseInt(form.sortOrder, 10) || 0,
    choices: form.choices
      .filter((c) => c.name.trim())
      .map((c, i) => ({
        name: c.name.trim(),
        priceAdjustment: parseFloat(c.priceAdjustment) || 0,
        active: c.active,
        sortOrder: i,
      })),
  };
}

interface ProductOptionGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  form: GroupForm;
  onFormChange: (form: GroupForm) => void;
  onSubmit: () => void;
  pending?: boolean;
}

export function ProductOptionGroupSheet({
  open,
  onOpenChange,
  title,
  form,
  onFormChange,
  onSubmit,
  pending = false,
}: ProductOptionGroupSheetProps) {
  function updateChoice(index: number, patch: Partial<ChoiceForm>) {
    onFormChange({
      ...form,
      choices: form.choices.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-serif text-2xl">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Group name *</label>
              <Input
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="e.g. Size, Toppings, Sauces"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Optional note for your team"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Selection type</label>
                <Select
                  value={form.selectionType}
                  onValueChange={(v) =>
                    onFormChange({ ...form, selectionType: v as ModifierSelectionType })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single Choice</SelectItem>
                    <SelectItem value="MULTIPLE">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sort order</label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => onFormChange({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.required}
                  onCheckedChange={(required) => onFormChange({ ...form, required })}
                />
                <label className="text-sm font-medium">Required</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(active) => onFormChange({ ...form, active })}
                />
                <label className="text-sm font-medium">Active</label>
              </div>
            </div>
            {form.selectionType === "MULTIPLE" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Maximum selections</label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxSelections}
                  onChange={(e) => onFormChange({ ...form, maxSelections: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Choices</p>
                <p className="text-xs text-muted-foreground">Add price adjustments for extras.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onFormChange({ ...form, choices: [...form.choices, emptyChoice()] })
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {form.choices.map((choice, i) => (
                <div key={choice.clientKey} className="flex gap-2 items-start rounded-lg border p-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={choice.name}
                      onChange={(e) => updateChoice(i, { name: e.target.value })}
                      placeholder="Choice name"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={choice.priceAdjustment}
                      onChange={(e) => updateChoice(i, { priceAdjustment: e.target.value })}
                      placeholder="Price adjustment (+$)"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 mt-1"
                    onClick={() =>
                      onFormChange({
                        ...form,
                        choices: form.choices.filter((_, ci) => ci !== i),
                      })
                    }
                    disabled={form.choices.length <= 1}
                    aria-label="Remove choice"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton
            onClick={onSubmit}
            disabled={!form.name.trim()}
            loading={pending}
            loadingText="Saving…"
          >
            Save group
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
