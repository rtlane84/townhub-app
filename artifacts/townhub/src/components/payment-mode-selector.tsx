import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PAYMENT_MODE_OPTIONS } from "@workspace/api-zod";
import type { PaymentMode } from "@workspace/api-client-react";

type Props = {
  value: PaymentMode;
  onChange: (value: PaymentMode) => void;
  idPrefix?: string;
};

export function PaymentModeSelector({ value, onChange, idPrefix = "payment-mode" }: Props) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMode)} className="space-y-3">
      {PAYMENT_MODE_OPTIONS.map((option) => (
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
