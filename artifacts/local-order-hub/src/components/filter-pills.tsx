import { cn } from "@/lib/utils";

type FilterPillsProps<T extends string> = {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  testIdPrefix: string;
};

export function FilterPills<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  testIdPrefix,
}: FilterPillsProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              value === option
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
            data-testid={`${testIdPrefix}-${option.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
