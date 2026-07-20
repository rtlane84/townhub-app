import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STOREFRONT_MODE_OPTIONS } from "@workspace/api-zod";
import type { StorefrontMode } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Props = {
  value: StorefrontMode;
  onChange: (value: StorefrontMode) => void;
  idPrefix?: string;
  /** When false, Online ordering mode cannot be selected. */
  onlineOrderingAllowed?: boolean;
  /** When false, Appointment requests mode cannot be selected. */
  appointmentRequestsAllowed?: boolean;
};

export function StorefrontModeSelector({
  value,
  onChange,
  idPrefix = "storefront-mode",
  onlineOrderingAllowed = true,
  appointmentRequestsAllowed = true,
}: Props) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as StorefrontMode)} className="space-y-3">
      {STOREFRONT_MODE_OPTIONS.map((option) => {
        const locked =
          (option.value === "ORDERING" && !onlineOrderingAllowed) ||
          (option.value === "APPOINTMENT" && !appointmentRequestsAllowed);
        return (
          <div
            key={option.value}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border p-3",
              locked && "opacity-60",
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={`${idPrefix}-${option.value}`}
              className="mt-0.5"
              disabled={locked}
            />
            <Label
              htmlFor={`${idPrefix}-${option.value}`}
              className={cn("space-y-1 font-normal", locked ? "cursor-not-allowed" : "cursor-pointer")}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.description}</span>
              {locked ? (
                <span className="block text-xs text-amber-700 dark:text-amber-400">
                  Not included in your current plan — upgrade to unlock.
                </span>
              ) : null}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}
