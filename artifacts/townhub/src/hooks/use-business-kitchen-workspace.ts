import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderCustomDateRange, OrderDateFilterPreset } from "@/lib/business-order-filters";
import type { KitchenFulfillmentFilter, KitchenPaymentFilter } from "@/lib/kitchen-display";
import {
  DEFAULT_KITCHEN_WORKSPACE,
  readKitchenWorkspace,
  writeKitchenWorkspace,
  type KitchenWorkspaceState,
} from "@/lib/business-order-workspace";

export function useBusinessKitchenWorkspace(businessId: number) {
  const [workspace, setWorkspace] = useState<KitchenWorkspaceState>(() =>
    businessId ? readKitchenWorkspace(businessId) : { ...DEFAULT_KITCHEN_WORKSPACE },
  );
  const scrollRestoredRef = useRef(false);
  const businessIdRef = useRef(businessId);

  useEffect(() => {
    if (businessIdRef.current === businessId) return;
    businessIdRef.current = businessId;
    scrollRestoredRef.current = false;
    setWorkspace(businessId ? readKitchenWorkspace(businessId) : { ...DEFAULT_KITCHEN_WORKSPACE });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    writeKitchenWorkspace(businessId, workspace);
  }, [businessId, workspace]);

  useEffect(() => {
    if (!businessId || scrollRestoredRef.current) return;
    scrollRestoredRef.current = true;
    if (workspace.scrollY > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: workspace.scrollY, behavior: "auto" }));
    }
  }, [businessId, workspace.scrollY]);

  useEffect(() => {
    if (!businessId) return;

    let timeoutId = 0;
    const saveScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setWorkspace((current) => {
          if (current.scrollY === window.scrollY) return current;
          return { ...current, scrollY: window.scrollY };
        });
      }, 150);
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", saveScroll);
      window.clearTimeout(timeoutId);
      setWorkspace((current) => ({ ...current, scrollY: window.scrollY }));
    };
  }, [businessId]);

  const patchWorkspace = useCallback((patch: Partial<KitchenWorkspaceState>) => {
    setWorkspace((current) => ({ ...current, ...patch }));
  }, []);

  const setSearchQuery = useCallback(
    (searchQuery: string) => patchWorkspace({ searchQuery }),
    [patchWorkspace],
  );
  const setDatePreset = useCallback(
    (datePreset: OrderDateFilterPreset) => patchWorkspace({ datePreset }),
    [patchWorkspace],
  );
  const setCustomRange = useCallback(
    (customRange: OrderCustomDateRange) => patchWorkspace({ customRange }),
    [patchWorkspace],
  );
  const setFulfillmentFilter = useCallback(
    (fulfillmentFilter: KitchenFulfillmentFilter) => patchWorkspace({ fulfillmentFilter }),
    [patchWorkspace],
  );
  const setPaymentFilter = useCallback(
    (paymentFilter: KitchenPaymentFilter) => patchWorkspace({ paymentFilter }),
    [patchWorkspace],
  );
  const setFiltersExpanded = useCallback(
    (filtersExpanded: boolean) => patchWorkspace({ filtersExpanded }),
    [patchWorkspace],
  );

  const clearFilters = useCallback(() => {
    setWorkspace((current) => ({
      ...DEFAULT_KITCHEN_WORKSPACE,
      scrollY: current.scrollY,
    }));
  }, []);

  const saveMobileBoardScrollLeft = useCallback((mobileBoardScrollLeft: number) => {
    setWorkspace((current) =>
      current.mobileBoardScrollLeft === mobileBoardScrollLeft
        ? current
        : { ...current, mobileBoardScrollLeft },
    );
  }, []);

  return {
    ...workspace,
    setSearchQuery,
    setDatePreset,
    setCustomRange,
    setFulfillmentFilter,
    setPaymentFilter,
    setFiltersExpanded,
    saveMobileBoardScrollLeft,
    clearFilters,
  };
}
