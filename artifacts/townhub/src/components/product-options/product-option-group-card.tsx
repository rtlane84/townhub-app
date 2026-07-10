import { useState } from "react";
import type { ModifierGroup, ModifierChoice } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  formatOptionPriceAdjustment,
  selectionTypeDetail,
} from "@/lib/format-option-price";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSE_THRESHOLD = 6;

interface ProductOptionGroupCardProps {
  group: ModifierGroup;
  deleting?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddChoice: (name: string, priceAdjustment: number) => void;
}

function ChoiceRow({ choice }: { choice: ModifierChoice }) {
  const priceLabel = formatOptionPriceAdjustment(choice.priceAdjustment);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{choice.name}</p>
        {priceLabel && (
          <p className="text-xs font-medium text-primary mt-0.5">{priceLabel}</p>
        )}
      </div>
      {!choice.active && (
        <Badge variant="secondary" className="text-[10px] shrink-0">Hidden</Badge>
      )}
    </div>
  );
}

export function ProductOptionGroupCard({
  group,
  deleting = false,
  saving = false,
  onEdit,
  onDelete,
  onAddChoice,
}: ProductOptionGroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingChoice, setAddingChoice] = useState(false);
  const [newChoiceName, setNewChoiceName] = useState("");
  const [newChoicePrice, setNewChoicePrice] = useState("0");

  const shouldCollapse = group.choices.length > COLLAPSE_THRESHOLD;
  const displayedChoices =
    shouldCollapse && !expanded
      ? group.choices.slice(0, COLLAPSE_THRESHOLD)
      : group.choices;
  const hiddenCount = group.choices.length - COLLAPSE_THRESHOLD;

  function submitNewChoice() {
    const name = newChoiceName.trim();
    if (!name) return;
    onAddChoice(name, parseFloat(newChoicePrice) || 0);
    setNewChoiceName("");
    setNewChoicePrice("0");
    setAddingChoice(false);
  }

  return (
    <Card className="flex flex-col shadow-sm" data-testid={`option-group-card-${group.id}`}>
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-lg font-semibold leading-tight">{group.name}</h3>
              <Badge
                variant={group.required ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-wide"
              >
                {group.required ? "Required" : "Optional"}
              </Badge>
              {!group.active && (
                <Badge variant="outline" className="text-[10px]">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {group.required ? "Required" : "Optional"} · {selectionTypeDetail(group.selectionType)}
            </p>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={`Edit ${group.name}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <LoadingButton
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              loading={deleting}
              disabled={deleting}
              aria-label={`Delete ${group.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </LoadingButton>
          </div>
        </div>
        {group.description && (
          <p className="text-xs text-muted-foreground">{group.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3">
        {group.choices.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center">
            No choices yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2">
            {displayedChoices.map((choice) => (
              <ChoiceRow key={choice.id} choice={choice} />
            ))}
            {shouldCollapse && hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                <ChevronDown
                  className={cn("h-4 w-4 mr-1 transition-transform", expanded && "rotate-180")}
                />
                {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
              </Button>
            )}
          </div>
        )}

        {addingChoice ? (
          <div className="rounded-lg border bg-background p-3 space-y-2 mt-2">
            <Input
              value={newChoiceName}
              onChange={(e) => setNewChoiceName(e.target.value)}
              placeholder="Choice name"
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                value={newChoicePrice}
                onChange={(e) => setNewChoicePrice(e.target.value)}
                placeholder="Price +$"
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setAddingChoice(false)}>Cancel</Button>
              <LoadingButton
                onClick={submitNewChoice}
                loading={saving}
                disabled={!newChoiceName.trim()}
                loadingText="Adding…"
              >
                Add
              </LoadingButton>
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="pt-0">
        {!addingChoice && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAddingChoice(true)}
            disabled={saving}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Choice
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
