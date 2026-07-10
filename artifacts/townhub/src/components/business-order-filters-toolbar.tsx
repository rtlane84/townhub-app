import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/filter-pills";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

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

type SharedFilterProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  searchPlaceholder: string;
  datePreset: OrderDateFilterPreset;
  onDatePresetChange: (preset: OrderDateFilterPreset) => void;
  customRange: OrderCustomDateRange;
  onCustomRangeChange: (range: OrderCustomDateRange) => void;
  fulfillmentFilter: KitchenFulfillmentFilter;
  onFulfillmentFilterChange: (filter: KitchenFulfillmentFilter) => void;
  paymentFilter: KitchenPaymentFilter;
  onPaymentFilterChange: (filter: KitchenPaymentFilter) => void;
  filtersExpanded: boolean;
  onFiltersExpandedChange: (expanded: boolean) => void;
  activeFilterCount: number;
  filterSummary: string;
  filtersActive: boolean;
  onClearFilters: () => void;
  testIdPrefix: string;
  className?: string;
};

type BusinessOrderFiltersToolbarProps =
  | (SharedFilterProps & {
      variant: "orders";
      statusFilter: string;
      onStatusFilterChange: (status: string) => void;
    })
  | (SharedFilterProps & {
      variant: "kitchen";
    });

function FiltersToggleLabel({ activeFilterCount }: { activeFilterCount: number }) {
  if (activeFilterCount > 0) {
    return (
      <>
        Filters
        <span className="text-muted-foreground font-normal">
          ({activeFilterCount} active)
        </span>
      </>
    );
  }
  return <>Filters</>;
}

export function BusinessOrderFiltersToolbar(props: BusinessOrderFiltersToolbarProps) {
  const {
    variant,
    searchQuery,
    onSearchQueryChange,
    searchPlaceholder,
    datePreset,
    onDatePresetChange,
    customRange,
    onCustomRangeChange,
    fulfillmentFilter,
    onFulfillmentFilterChange,
    paymentFilter,
    onPaymentFilterChange,
    filtersExpanded,
    onFiltersExpandedChange,
    activeFilterCount,
    filterSummary,
    filtersActive,
    onClearFilters,
    testIdPrefix,
    className,
  } = props;

  const statusValue =
    variant === "orders"
      ? ((props.statusFilter === "all" || STATUS_OPTIONS.includes(props.statusFilter as StatusFilter)
          ? props.statusFilter
          : "all") as StatusFilter)
      : "all";

  return (
    <div
      className={cn("rounded-xl border bg-card p-3 md:p-4 space-y-3", className)}
      data-testid={`${testIdPrefix}-toolbar`}
    >
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          data-testid={`${testIdPrefix}-search-input`}
          aria-label={searchPlaceholder}
        />
      </div>

      <Collapsible open={filtersExpanded} onOpenChange={onFiltersExpandedChange}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between h-10"
            aria-expanded={filtersExpanded}
            data-testid={`${testIdPrefix}-filters-toggle`}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
              <FiltersToggleLabel activeFilterCount={activeFilterCount} />
            </span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform duration-200", filtersExpanded && "rotate-180")}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent
          className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
          data-testid={`${testIdPrefix}-advanced-filters`}
        >
          <div className="space-y-4 pt-3">
            <FilterPills
              label="Date"
              options={DATE_PRESETS}
              labels={ORDER_DATE_FILTER_LABELS}
              value={datePreset}
              onChange={onDatePresetChange}
              testIdPrefix={`${testIdPrefix}-date-filter`}
            />

            {datePreset === "custom" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Custom date range · From</span>
                  <Input
                    type="date"
                    value={customRange.from ?? ""}
                    onChange={(event) =>
                      onCustomRangeChange({ ...customRange, from: event.target.value || undefined })
                    }
                    data-testid={`${testIdPrefix}-date-filter-custom-from`}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Custom date range · To</span>
                  <Input
                    type="date"
                    value={customRange.to ?? ""}
                    onChange={(event) =>
                      onCustomRangeChange({ ...customRange, to: event.target.value || undefined })
                    }
                    data-testid={`${testIdPrefix}-date-filter-custom-to`}
                  />
                </label>
              </div>
            ) : null}

            {variant === "orders" ? (
              <FilterPills
                label="Status"
                options={STATUS_OPTIONS}
                labels={STATUS_FILTER_LABELS}
                value={statusValue}
                onChange={props.onStatusFilterChange}
                testIdPrefix={`${testIdPrefix}-status-filter`}
              />
            ) : null}

            <FilterPills
              label="Payment"
              options={KITCHEN_PAYMENT_FILTERS}
              labels={KITCHEN_PAYMENT_FILTER_LABELS}
              value={paymentFilter}
              onChange={onPaymentFilterChange}
              testIdPrefix={`${testIdPrefix}-payment-filter`}
            />

            <FilterPills
              label="Fulfillment"
              options={KITCHEN_FULFILLMENT_FILTERS}
              labels={KITCHEN_FULFILLMENT_FILTER_LABELS}
              value={fulfillmentFilter}
              onChange={onFulfillmentFilterChange}
              testIdPrefix={`${testIdPrefix}-fulfillment-filter`}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <p className="text-xs text-muted-foreground" data-testid={`${testIdPrefix}-filter-summary`}>
                {filterSummary}
              </p>
              {filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs"
                  onClick={onClearFilters}
                  data-testid={`${testIdPrefix}-clear-filters`}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
