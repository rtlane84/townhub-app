import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/filter-pills";
import {
  ORDER_DATE_FILTER_LABELS,
  type OrderCustomDateRange,
  type OrderDateFilterPreset,
} from "@/lib/business-order-filters";
import {
  KITCHEN_FULFILLMENT_FILTER_LABELS,
  KITCHEN_FULFILLMENT_FILTERS,
  KITCHEN_PAYMENT_FILTER_LABELS,
  KITCHEN_PAYMENT_FILTERS,
  type KitchenFulfillmentFilter,
  type KitchenPaymentFilter,
} from "@/lib/kitchen-display";

const DATE_PRESETS: OrderDateFilterPreset[] = ["today", "last7", "month", "custom", "all"];

interface KitchenDisplayToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  datePreset: OrderDateFilterPreset;
  onDatePresetChange: (preset: OrderDateFilterPreset) => void;
  customRange: OrderCustomDateRange;
  onCustomRangeChange: (range: OrderCustomDateRange) => void;
  fulfillmentFilter: KitchenFulfillmentFilter;
  onFulfillmentFilterChange: (filter: KitchenFulfillmentFilter) => void;
  paymentFilter: KitchenPaymentFilter;
  onPaymentFilterChange: (filter: KitchenPaymentFilter) => void;
  filterSummary: string;
  filtersActive: boolean;
  onClearFilters: () => void;
}

export function KitchenDisplayToolbar({
  searchQuery,
  onSearchQueryChange,
  datePreset,
  onDatePresetChange,
  customRange,
  onCustomRangeChange,
  fulfillmentFilter,
  onFulfillmentFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  filterSummary,
  filtersActive,
  onClearFilters,
}: KitchenDisplayToolbarProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 print:hidden" data-testid="kitchen-display-toolbar">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search order #, customer, phone, or email"
          className="pl-9"
          data-testid="kitchen-search-input"
        />
      </div>

      <FilterPills
        label="Date"
        options={DATE_PRESETS}
        labels={ORDER_DATE_FILTER_LABELS}
        value={datePreset}
        onChange={onDatePresetChange}
        testIdPrefix="kitchen-date-filter"
      />

      {datePreset === "custom" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">From</span>
            <Input
              type="date"
              value={customRange.from ?? ""}
              onChange={(event) => onCustomRangeChange({ ...customRange, from: event.target.value || undefined })}
              data-testid="kitchen-date-filter-custom-from"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">To</span>
            <Input
              type="date"
              value={customRange.to ?? ""}
              onChange={(event) => onCustomRangeChange({ ...customRange, to: event.target.value || undefined })}
              data-testid="kitchen-date-filter-custom-to"
            />
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FilterPills
          label="Fulfillment"
          options={KITCHEN_FULFILLMENT_FILTERS}
          labels={KITCHEN_FULFILLMENT_FILTER_LABELS}
          value={fulfillmentFilter}
          onChange={onFulfillmentFilterChange}
          testIdPrefix="kitchen-fulfillment-filter"
        />
        <FilterPills
          label="Payment"
          options={KITCHEN_PAYMENT_FILTERS}
          labels={KITCHEN_PAYMENT_FILTER_LABELS}
          value={paymentFilter}
          onChange={onPaymentFilterChange}
          testIdPrefix="kitchen-payment-filter"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>{filterSummary}</p>
        {filtersActive ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClearFilters} data-testid="kitchen-clear-filters">
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
