import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  useGetBusinessFeatureAccess,
  getGetBusinessFeatureAccessQueryKey,
  type BusinessFeatureAccessEntry,
} from "@workspace/api-client-react";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { LockedFeatureModal } from "@/components/locked-feature-modal";

type BusinessFeatureAccessContextValue = {
  isLoading: boolean;
  bypassRestrictions: boolean;
  planName: string | null;
  hasFeature: (featureKey: string | null) => boolean;
  getFeature: (featureKey: string) => BusinessFeatureAccessEntry | undefined;
  openLockedFeature: (featureKey: string) => void;
};

const BusinessFeatureAccessContext = createContext<BusinessFeatureAccessContextValue | null>(null);

export function BusinessFeatureAccessProvider({ children }: { children: ReactNode }) {
  const { selectedBusinessId } = useSelectedBusiness();
  const businessId = selectedBusinessId ?? 0;
  const [lockedFeatureKey, setLockedFeatureKey] = useState<string | null>(null);

  const { data, isLoading } = useGetBusinessFeatureAccess(businessId, {
    query: {
      enabled: businessId > 0,
      queryKey: getGetBusinessFeatureAccessQueryKey(businessId),
    },
  });

  const hasFeature = useCallback(
    (featureKey: string | null) => {
      if (!featureKey) return true;
      if (isLoading) return true;
      if (data?.bypassRestrictions) return true;
      return data?.features.find((feature) => feature.key === featureKey)?.enabled ?? false;
    },
    [data, isLoading],
  );

  const getFeature = useCallback(
    (featureKey: string) => data?.features.find((feature) => feature.key === featureKey),
    [data],
  );

  const openLockedFeature = useCallback((featureKey: string) => {
    setLockedFeatureKey(featureKey);
  }, []);

  const value = useMemo(
    (): BusinessFeatureAccessContextValue => ({
      isLoading,
      bypassRestrictions: data?.bypassRestrictions ?? false,
      planName: data?.planName ?? null,
      hasFeature,
      getFeature,
      openLockedFeature,
    }),
    [data, hasFeature, getFeature, isLoading, openLockedFeature],
  );

  const lockedFeature = lockedFeatureKey ? getFeature(lockedFeatureKey) : undefined;

  return (
    <BusinessFeatureAccessContext.Provider value={value}>
      {children}
      <LockedFeatureModal
        open={lockedFeatureKey !== null}
        onOpenChange={(open) => !open && setLockedFeatureKey(null)}
        feature={lockedFeature}
        featureKey={lockedFeatureKey}
        planName={data?.planName ?? null}
      />
    </BusinessFeatureAccessContext.Provider>
  );
}

export function useBusinessFeatureAccess() {
  const context = useContext(BusinessFeatureAccessContext);
  if (!context) {
    throw new Error("useBusinessFeatureAccess must be used within BusinessFeatureAccessProvider");
  }
  return context;
}
