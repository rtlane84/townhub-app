import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { STOREFRONT_MODE_OPTIONS } from "@workspace/api-zod";
import type { StorefrontMode } from "@workspace/api-client-react";

type Props = {
  value: StorefrontMode;
  onChange: (value: StorefrontMode) => void;
  idPrefix?: string;
};

export function StorefrontModeSelector({ value, onChange, idPrefix = "storefront-mode" }: Props) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as StorefrontMode)} className="space-y-3">
      {STOREFRONT_MODE_OPTIONS.map((option) => (
        <div key={option.value} className="flex items-start gap-3 rounded-lg border border-border p-3">
          <RadioGroupItem value={option.value} id={`${idPrefix}-${option.value}`} className="mt-0.5" />
          <Label htmlFor={`${idPrefix}-${option.value}`} className="cursor-pointer space-y-1 font-normal">
            <span className="block text-sm font-medium">{option.label}</span>
            <span className="block text-xs text-muted-foreground">{option.description}</span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
