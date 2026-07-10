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
  const swatchColor = normalizeHex(value) ?? "transparent";
  const pickerValue = normalizeHex(value) ?? "#ffffff";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0"
          style={{ backgroundColor: swatchColor }}
          aria-hidden
        />
        <div className="flex-1">
          <Input
            id={id}
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 p-1 cursor-pointer"
            data-testid={`color-picker-${id}`}
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
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
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
      <p className="text-sm font-medium mb-3">Preview</p>
      <div className="flex gap-3 flex-wrap">
        {visible.map(({ key, label, value }) => (
          <div key={key} className="text-center">
            <div
              className="w-12 h-12 rounded-xl border border-border shadow-sm mb-1"
              style={{ backgroundColor: normalizeHex(value) ?? undefined }}
            />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
