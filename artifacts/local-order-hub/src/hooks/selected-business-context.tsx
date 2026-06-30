import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import {
  useGetMe,
  useGetMyBusiness,
  useListMyBusinesses,
  getGetMeQueryKey,
  getGetMyBusinessQueryKey,
  getListMyBusinessesQueryKey,
  type Business,
  type OwnedBusinessSummary,
  type UserProfile,
} from "@workspace/api-client-react";
import {
  readStoredBusinessId,
  resolveSelectedBusinessId,
  writeStoredBusinessId,
} from "@/lib/business-selection";

type SelectedBusinessContextValue = {
  selectedBusinessId: number | null;
  business: Business | undefined;
  ownedBusinesses: OwnedBusinessSummary[];
  me: UserProfile | undefined;
  isLoading: boolean;
  selectBusiness: (businessId: number) => void;
};

const SelectedBusinessContext = createContext<SelectedBusinessContextValue | null>(null);

export function SelectedBusinessProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const [storedBusinessId, setStoredBusinessId] = useState<number | null>(() => readStoredBusinessId());

  const { data: ownedBusinesses = [], isPending: ownedPending } = useListMyBusinesses({
    query: {
      enabled: !!isSignedIn,
      queryKey: getListMyBusinessesQueryKey(),
    },
  });

  const ownedIds = useMemo(() => ownedBusinesses.map((b) => b.id), [ownedBusinesses]);

  const { data: meWithoutSelection, isPending: meBasePending } = useGetMe(undefined, {
    query: {
      enabled: !!isSignedIn && ownedIds.length > 0,
      queryKey: getGetMeQueryKey(),
    },
  });

  const selectedBusinessId = useMemo(
    () => resolveSelectedBusinessId(ownedIds, storedBusinessId, meWithoutSelection?.businessId ?? null),
    [ownedIds, storedBusinessId, meWithoutSelection?.businessId],
  );

  useEffect(() => {
    if (!ownedIds.length) return;
    if (storedBusinessId != null && !ownedIds.includes(storedBusinessId) && selectedBusinessId != null) {
      writeStoredBusinessId(selectedBusinessId);
      setStoredBusinessId(selectedBusinessId);
    }
  }, [ownedIds, selectedBusinessId, storedBusinessId]);

  const meParams = selectedBusinessId != null ? { businessId: selectedBusinessId } : undefined;
  const { data: me, isPending: mePending } = useGetMe(meParams, {
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetMeQueryKey(meParams),
    },
  });

  const businessParams = selectedBusinessId != null ? { businessId: selectedBusinessId } : undefined;
  const { data: business, isPending: businessPending } = useGetMyBusiness(businessParams, {
    query: {
      enabled: !!isSignedIn && selectedBusinessId != null,
      queryKey: getGetMyBusinessQueryKey(businessParams),
    },
  });

  const selectBusiness = useCallback(
    (businessId: number) => {
      if (!ownedIds.includes(businessId)) return;
      writeStoredBusinessId(businessId);
      setStoredBusinessId(businessId);
      void queryClient.invalidateQueries();
    },
    [ownedIds, queryClient],
  );

  const isLoading =
    !!isSignedIn &&
    (ownedPending || meBasePending || mePending || (selectedBusinessId != null && businessPending));

  const value = useMemo(
    (): SelectedBusinessContextValue => ({
      selectedBusinessId,
      business,
      ownedBusinesses,
      me,
      isLoading,
      selectBusiness,
    }),
    [selectedBusinessId, business, ownedBusinesses, me, isLoading, selectBusiness],
  );

  return (
    <SelectedBusinessContext.Provider value={value}>{children}</SelectedBusinessContext.Provider>
  );
}

export function useSelectedBusiness(): SelectedBusinessContextValue {
  const ctx = useContext(SelectedBusinessContext);
  if (!ctx) {
    throw new Error("useSelectedBusiness must be used within SelectedBusinessProvider");
  }
  return ctx;
}
