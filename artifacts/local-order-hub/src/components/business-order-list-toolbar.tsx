import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  ORDER_DATE_FILTER_LABELS,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "@/lib/business-order-filters";
import { cn } from "@/lib/utils";

const DATE_PRESETS: OrderDateFilterPreset[] = ["today", "last7", "month", "custom", "all"];

interface BusinessOrderListToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  datePreset: OrderDateFilterPreset;
  onDatePresetChange: (preset: OrderDateFilterPreset) => void;
  customRange: OrderCustomDateRange;
  onCustomRangeChange: (range: OrderCustomDateRange) => void;
  dateSummary: string;
}

export function BusinessOrderListToolbar({
  searchQuery,
  onSearchQueryChange,
  datePreset,
  onDatePresetChange,
  customRange,
  onCustomRangeChange,
  dateSummary,
}: BusinessOrderListToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search order #, customer, phone, or email"
          className="pl-9"
          data-testid="order-search-input"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onDatePresetChange(preset)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                datePreset === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
              data-testid={`date-filter-${preset}`}
            >
              {ORDER_DATE_FILTER_LABELS[preset]}
            </button>
          ))}
        </div>
      </div>

      {datePreset === "custom" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">From</span>
            <Input
              type="date"
              value={customRange.from ?? ""}
              onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value || undefined })}
              data-testid="date-filter-custom-from"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">To</span>
            <Input
              type="date"
              value={customRange.to ?? ""}
              onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value || undefined })}
              data-testid="date-filter-custom-to"
            />
          </label>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{dateSummary}</p>
    </div>
  );
}
