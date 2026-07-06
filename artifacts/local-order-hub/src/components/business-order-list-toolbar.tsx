import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/filter-pills";
import {
  ORDER_DATE_FILTER_LABELS,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "@/lib/business-order-filters";

const DATE_PRESETS: OrderDateFilterPreset[] = ["today", "last7", "month", "custom", "all"];

const ALL_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELED",
] as const;

type StatusFilter = "all" | (typeof ALL_STATUSES)[number];

const STATUS_OPTIONS: readonly StatusFilter[] = ["all", ...ALL_STATUSES];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

interface BusinessOrderListToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  datePreset: OrderDateFilterPreset;
  onDatePresetChange: (preset: OrderDateFilterPreset) => void;
  customRange: OrderCustomDateRange;
  onCustomRangeChange: (range: OrderCustomDateRange) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  filterSummary: string;
  filtersActive: boolean;
  onClearFilters: () => void;
}

export function BusinessOrderListToolbar({
  searchQuery,
  onSearchQueryChange,
  datePreset,
  onDatePresetChange,
  customRange,
  onCustomRangeChange,
  statusFilter,
  onStatusFilterChange,
  filterSummary,
  filtersActive,
  onClearFilters,
}: BusinessOrderListToolbarProps) {
  const statusValue = (statusFilter === "all" || STATUS_OPTIONS.includes(statusFilter as StatusFilter)
    ? statusFilter
    : "all") as StatusFilter;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4" data-testid="order-list-toolbar">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search orders..."
          className="pl-9"
          data-testid="order-search-input"
        />
      </div>

      <FilterPills
        label="Date"
        options={DATE_PRESETS}
        labels={ORDER_DATE_FILTER_LABELS}
        value={datePreset}
        onChange={onDatePresetChange}
        testIdPrefix="date-filter"
      />

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

      <FilterPills
        label="Status"
        options={STATUS_OPTIONS}
        labels={STATUS_FILTER_LABELS}
        value={statusValue}
        onChange={onStatusFilterChange}
        testIdPrefix="filter"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p data-testid="order-list-count">{filterSummary}</p>
        {filtersActive ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClearFilters}
            data-testid="clear-order-filters"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
