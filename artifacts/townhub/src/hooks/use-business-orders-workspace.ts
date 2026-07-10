import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderCustomDateRange, OrderDateFilterPreset } from "@/lib/business-order-filters";
import type { KitchenFulfillmentFilter, KitchenPaymentFilter } from "@/lib/kitchen-display";
import {
  DEFAULT_ORDERS_WORKSPACE,
  readOrdersWorkspace,
  writeOrdersWorkspace,
  type OrdersWorkspaceState,
} from "@/lib/business-order-workspace";

export function useBusinessOrdersWorkspace(businessId: number) {
  const [workspace, setWorkspace] = useState<OrdersWorkspaceState>(() =>
    businessId ? readOrdersWorkspace(businessId) : { ...DEFAULT_ORDERS_WORKSPACE },
  );
  const scrollRestoredRef = useRef(false);
  const businessIdRef = useRef(businessId);

  useEffect(() => {
    if (businessIdRef.current === businessId) return;
    businessIdRef.current = businessId;
    scrollRestoredRef.current = false;
    setWorkspace(businessId ? readOrdersWorkspace(businessId) : { ...DEFAULT_ORDERS_WORKSPACE });
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    writeOrdersWorkspace(businessId, workspace);
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

  const patchWorkspace = useCallback((patch: Partial<OrdersWorkspaceState>) => {
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
  const setStatusFilter = useCallback(
    (statusFilter: string) => patchWorkspace({ statusFilter }),
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

  const applyWorkspacePatch = useCallback((patch: Partial<OrdersWorkspaceState>) => {
    patchWorkspace(patch);
  }, [patchWorkspace]);

  const clearFilters = useCallback(() => {
    setWorkspace((current) => ({
      ...DEFAULT_ORDERS_WORKSPACE,
      scrollY: current.scrollY,
    }));
  }, []);

  return {
    ...workspace,
    setSearchQuery,
    setDatePreset,
    setCustomRange,
    setStatusFilter,
    setFulfillmentFilter,
    setPaymentFilter,
    setFiltersExpanded,
    applyWorkspacePatch,
    clearFilters,
  };
}
