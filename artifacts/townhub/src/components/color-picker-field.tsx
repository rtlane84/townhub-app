import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHex } from "@/lib/theme-colors";

type Props = {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ColorPickerField({
  id,
  label,
  description,
  value,
  onChange,
  placeholder = "#000000",
}: Props) {
  const normalized = normalizeHex(value);
  const swatchColor = normalized ?? "transparent";
  // Native <input type="color"> requires a valid #rrggbb value. Keep it as a
  // write-only control when empty so we don't pretend the value is #ffffff.
  const pickerValue = normalized ?? "#000000";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-lg border border-border shadow-sm"
          style={{ backgroundColor: swatchColor }}
          aria-hidden
        />
        <div className="flex-1">
          <Input
            id={id}
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 cursor-pointer p-1"
            data-testid={`color-picker-${id}`}
            aria-label={`${label} color picker`}
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-28 font-mono text-sm"
          maxLength={7}
          data-testid={`color-input-${id}`}
          aria-label={`${label} hex value`}
        />
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function ColorPreviewSwatches({
  items,
}: {
  items: Array<{ key: string; label: string; value: string }>;
}) {
  const visible = items.filter((item) => normalizeHex(item.value));
  if (visible.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-sm font-medium">Preview</p>
      <div className="flex flex-wrap gap-3">
        {visible.map(({ key, label, value }) => (
          <div key={key} className="text-center">
            <div
              className="mb-1 h-12 w-12 rounded-xl border border-border shadow-sm"
              style={{ backgroundColor: normalizeHex(value) ?? undefined }}
            />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
